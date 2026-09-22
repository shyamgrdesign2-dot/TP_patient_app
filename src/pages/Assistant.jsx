import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { doctors } from "../services/data";
import {
  Button,
  Avatar,
  Icon,
  PageHeader,
  MemberContext,
  Field,
  Sheet,
  Notice,
  PatientName,
  Empty,
} from "../components/ui";
import SpotlightCard from "../components/effects/SpotlightCard";
import EmbeddedCollector from "../components/symptom-collector/EmbeddedCollector";
import ChatBubble from "../components/symptom-collector/ChatBubble";
import {
  intake,
  shortcuts,
  visitNote,
} from "../components/symptom-collector/flow";
import shared from "../App.module.css";
import s from "../components/symptom-collector/Collector.module.css";

export default function Assistant() {
  const { activeMember, state } = useApp();
  const [params] = useSearchParams();
  const id = params.get("appointment");
  const appointment = state.appointments.find(
    (a) =>
      a.id === id && a.memberId === activeMember.id && a.status === "Confirmed",
  );
  if (id && !appointment)
    return (
      <div className={shared.page}>
        <PageHeader title="Symptom collector" />
        <Empty
          title="This visit isn’t available"
          description="Select a confirmed visit for the current patient from My visits."
        />
      </div>
    );
  if (appointment && import.meta.env.VITE_SYMPTOM_COLLECTOR_SESSION_ENDPOINT)
    return (
      <EmbeddedCollector
        key={`${activeMember.id}-${id}`}
        appointment={appointment}
      />
    );
  return (
    <Collector
      returnToQueue={params.get("return") === "queue"}
      key={`${activeMember.id}-${id || "new"}`}
      appointment={appointment}
    />
  );
}
function Collector({ appointment, returnToQueue }) {
  const { activeMember, state, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState(
    appointment?.symptomIntake ? "summary" : "intro",
  );
  const [answers, setAnswers] = useState(
    appointment?.symptomIntake?.answers || {},
  );
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [options, setOptions] = useState([]);
  const [restart, setRestart] = useState(false);
  const anchor = useRef(null);
  useEffect(() => {
    let cancelled = false;
    shortcuts(intake[step]).then((result) => {
      if (!cancelled) setOptions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [step]);
  useEffect(() => {
    if (view === "chat")
      anchor.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [step, view]);
  function answer(value) {
    if (!value.trim()) return;
    setAnswers((previous) => ({
      ...previous,
      [intake[step].key]: value.trim(),
    }));
    setDraft("");
    if (step === intake.length - 1) setView("summary");
    else setStep(step + 1);
  }
  function edit(index) {
    setStep(index);
    setDraft(
      answers[intake[index].key] === "Skip"
        ? ""
        : answers[intake[index].key] || "",
    );
    setView("chat");
  }
  return (
    <div className={`${shared.page} ${s.collector}`}>
      <PageHeader
        title="Symptom collector"
        action={
          view !== "intro" && (
            <Button variant="ghost" size="sm" onClick={() => setRestart(true)}>
              Restart
            </Button>
          )
        }
      />
      <MemberContext />
      {view === "intro" && (
        <>
          <SpotlightCard className={s.welcome}>
            <span className={s.symbol}>
              <Icon name="magic-star" size={38} bulk />
            </span>
            <span className={s.eyebrow}>BEFORE YOUR VISIT</span>
            <h2>Tell us how you’re feeling.</h2>
            <p>
              Gather your symptoms, health history and questions in one place,
              ready for your appointment.
            </p>
            <div className={s.steps}>
              <span>
                <Icon name="message-text" /> Share symptoms
              </span>
              <span>
                <Icon name="clipboard-tick" /> Review your summary
              </span>
              <span>
                <Icon name="calendar-2" />{" "}
                {appointment ? "Add to your visit" : "Choose your visit"}
              </span>
            </div>
            <Button fullWidth onClick={() => setView("chat")}>
              Start symptom collection <Icon name="chevron-right" />
            </Button>
          </SpotlightCard>
          <Notice>
            This is a guided demo of the existing symptom collector. Live AI and
            voice are not connected. It records what you share and does not
            diagnose.
          </Notice>
        </>
      )}
      {view === "chat" && (
        <>
          <div className={s.progress}>
            <span>{intake[step].title}</span>
            <span>
              {step + 1} / {intake.length}
            </span>
            <progress
              value={step + 1}
              max={intake.length}
              aria-label="Intake progress"
            />
          </div>
          <div className={s.transcript}>
            {intake.slice(0, step + 1).map((item, index) => (
              <div key={item.key}>
                <ChatBubble
                  message={{
                    kind: "assistant",
                    text:
                      index === 0
                        ? `Hi ${activeMember.name.split(" ")[0]}. ${item.question}`
                        : item.question,
                  }}
                />
                {index < step && (
                  <ChatBubble
                    message={{
                      kind: "user",
                      text:
                        answers[item.key] === "Skip"
                          ? "Not provided"
                          : answers[item.key],
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <form
            ref={anchor}
            className={s.composer}
            onSubmit={(event) => {
              event.preventDefault();
              answer(draft);
            }}
          >
            {options.length > 0 && (
              <div
                className={s.shortcuts}
                role="group"
                aria-label="Quick replies"
              >
                {options.map((option) => (
                  <Button
                    key={option.text}
                    variant="outline"
                    size="sm"
                    onClick={() => answer(option.text)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            <Field
              label={intake[step].title}
              autoGrow
              maxLength={600}
              placeholder="Type your answer…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className={s.composerActions}>
              {step > 0 && (
                <Button variant="ghost" onClick={() => edit(step - 1)}>
                  Previous
                </Button>
              )}
              <Button type="submit" disabled={!draft.trim()}>
                {step === intake.length - 1 ? "Review summary" : "Continue"}
                <Icon name="chevron-right" />
              </Button>
            </div>
          </form>
        </>
      )}
      {view === "summary" && (
        <>
          <div className={s.summaryHeading}>
            <Icon name="clipboard-tick" size={28} bulk />
            <div>
              <h2>Your visit summary</h2>
              <p>
                For <PatientName member={activeMember} />
              </p>
            </div>
          </div>
          {intake.map((item, index) => (
            <section className={s.summaryCard} key={item.key}>
              <div>
                <h3>{item.title}</h3>
                <Button
                  variant="link"
                  size="sm"
                  aria-label={`Edit ${item.title}`}
                  onClick={() => edit(index)}
                >
                  Edit
                </Button>
              </div>
              <p>
                {answers[item.key] === "Skip" || !answers[item.key]
                  ? "Not provided"
                  : answers[item.key]}
              </p>
            </section>
          ))}
          <Notice>
            {appointment
              ? "Review these details before saving them to this demo visit. They have not been sent to the hospital."
              : "Review these details before continuing. Your note will be included in the demo appointment you confirm."}
          </Notice>
          <Button
            fullWidth
            onClick={() => {
              if (!appointment) return setView("doctors");
              dispatch({
                type: "SAVE_SYMPTOMS",
                id: appointment.id,
                note: visitNote(answers),
                answers,
              });
              notify("Your symptoms were saved to this demo visit.");
              navigate(
                `/${returnToQueue ? "queue" : "appointments"}?visit=${encodeURIComponent(appointment.id)}`,
              );
            }}
          >
            {appointment
              ? returnToQueue
                ? "Save and continue to check-in"
                : "Save to my visit"
              : "Choose a doctor"}{" "}
            <Icon name="chevron-right" />
          </Button>
        </>
      )}
      {view === "doctors" && (
        <>
          <h2>Choose your doctor</h2>
          <p>
            Available at your selected hospital. Your summary will accompany
            your booking.
          </p>
          {doctors
            .filter((doctor) => doctor.locations.includes(state.location))
            .map((doctor) => (
              <button
                key={doctor.id}
                className={shared.assistantDoctor}
                onClick={() =>
                  navigate(`/book/${doctor.id}`, {
                    state: {
                      intakeNote: visitNote(answers),
                      intakeAnswers: answers,
                      memberId: activeMember.id,
                    },
                  })
                }
              >
                <Avatar src={doctor.image} name={doctor.name} size={44} />
                <span className={shared.grow}>
                  <strong>{doctor.name}</strong>
                  <small>{doctor.specialty}</small>
                </span>
                <Icon name="chevron-right" />
              </button>
            ))}
          <Button variant="ghost" onClick={() => setView("summary")}>
            Review my summary
          </Button>
        </>
      )}
      <Sheet
        open={restart}
        onClose={() => setRestart(false)}
        title="Restart symptom collection?"
        description="This will clear the details entered in this conversation."
        footer={
          <Button
            fullWidth
            onClick={() => {
              setAnswers({});
              setStep(0);
              setDraft("");
              setView("intro");
              setRestart(false);
            }}
          >
            Restart collection
          </Button>
        }
      >
        <Button variant="outline" fullWidth onClick={() => setRestart(false)}>
          Keep my details
        </Button>
      </Sheet>
    </div>
  );
}
