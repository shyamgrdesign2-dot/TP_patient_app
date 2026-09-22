import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { doctors } from "../services/data";
import {
  Button,
  Badge,
  Avatar,
  Icon,
  PageHeader,
  MemberContext,
  Field,
  ChoiceGroup,
  Notice,
} from "../components/ui";
import s from "../App.module.css";
export default function Assistant() {
  const { activeMember, state } = useApp();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [step, setStep] = useState(0);
  return (
    <div className={s.page}>
      <PageHeader
        title="Your care assistant"
        subtitle="A simpler way to book your next visit."
      />
      <MemberContext />
      <div className={s.assistantHero}>
        <span className={s.agentIcon}>
          <Icon name="magic-star" size={36} bulk />
        </span>
        <h2>Let’s find your next step.</h2>
        <p>
          I can collect your reason for visiting and help you choose an
          appointment.
        </p>
        <Badge color="violet">Guided booking preview</Badge>
      </div>
      <Notice>
        This assistant helps with booking. It does not diagnose or recommend
        treatment. For urgent help, contact emergency services.
      </Notice>
      <div className={s.chatBubble}>
        <span className={s.chatAvatar}>
          <Icon name="magic-star" bulk size={16} />
        </span>
        <p>
          Hi {activeMember.name.split(" ")[0]}, what would you like to talk to a
          doctor about?
        </p>
      </div>
      {step === 0 ? (
        <>
          <Field
            label="Reason for your visit"
            autoGrow
            placeholder="For example, a routine check-up or a concern you’d like to discuss."
            maxLength={600}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <div className={s.chips}>
            {["Routine check-up", "Follow-up visit", "New health concern"].map(
              (t) => (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  onClick={() => setSymptoms(t)}
                >
                  {t}
                </Button>
              ),
            )}
          </div>
          <Button disabled={!symptoms.trim()} onClick={() => setStep(1)}>
            Continue <Icon name="arrow-right" />
          </Button>
        </>
      ) : (
        <>
          <div className={s.userBubble}>{symptoms}</div>
          <div className={s.chatBubble}>
            <span className={s.chatAvatar}>
              <Icon name="magic-star" bulk size={16} />
            </span>
            <p>
              How long has this been on your mind? This note can help your
              doctor prepare.
            </p>
          </div>
          {step === 1 ? (
            <>
              <ChoiceGroup
                label="Duration"
                options={[
                  "Today",
                  "A few days",
                  "A few weeks",
                  "Routine / not applicable",
                ]}
                value={duration}
                onChange={setDuration}
              />
              <Button disabled={!duration} onClick={() => setStep(2)}>
                Find available doctors
              </Button>
              <Button variant="ghost" onClick={() => setStep(0)}>
                Edit my reason
              </Button>
            </>
          ) : (
            <>
              <div className={s.userBubble}>{duration}</div>
              <div className={s.chatBubble}>
                <span className={s.chatAvatar}>
                  <Icon name="magic-star" bulk size={16} />
                </span>
                <p>
                  Thanks. Here are doctors at your selected hospital. Choose the
                  specialty you want; your visit note will carry through to
                  booking.
                </p>
              </div>
              {doctors
                .filter((d) => d.locations.includes(state.location))
                .map((d) => (
                  <button
                    className={s.assistantDoctor}
                    key={d.id}
                    onClick={() =>
                      navigate(
                        `/book/${d.id}?reason=${encodeURIComponent(`${symptoms} · ${duration}`)}`,
                      )
                    }
                  >
                    <Avatar src={d.image} name={d.name} size={44} />
                    <span className={s.grow}>
                      <strong>{d.name}</strong>
                      <small>{d.specialty}</small>
                    </span>
                    <Icon name="arrow-right" />
                  </button>
                ))}
              <Button variant="ghost" onClick={() => setStep(0)}>
                Start over
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
