import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../state/AppContext";
import { Sheet, Button, Icon } from "../ui";
import {
  AGENT_NAME,
  VOICE_SCRIPT,
  createSession,
  greeting,
  respond,
  addMore,
  toSummary,
  toNote,
} from "./mockScript";
import s from "./MockCollector.module.css";

const A = (name) => `/collector/${name}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Placeholder for the hosted symptom collector: its entry, chat, voice and
// summary screens with sample behaviour, saved to this visit on submit.
export default function MockCollector({ appointment }) {
  const saved = appointment?.symptomIntake?.answers?.mock;
  const [screen, setScreen] = useState(saved ? "summary" : "entry");
  const [mode, setMode] = useState("chat");
  const [summary, setSummary] = useState(saved || null);
  const [session, setSession] = useState(createSession);
  const [messages, setMessages] = useState([]);
  return screen === "entry" ? (
    <Entry
      onStart={(next) => {
        setMode(next);
        setScreen("chat");
      }}
    />
  ) : screen === "chat" ? (
    <Chat
      mode={mode}
      session={session}
      setSession={setSession}
      messages={messages}
      setMessages={setMessages}
      onRestart={() => {
        setSession(createSession());
        setMessages([]);
      }}
      onSubmit={(data) => {
        setSummary(data);
        setScreen("submitted");
      }}
      appointment={appointment}
    />
  ) : (
    <Summary
      summary={summary}
      celebrate={screen === "submitted"}
      appointment={appointment}
      onEdit={() => {
        const next = addMore(session.done ? session : resume(summary));
        setSession(next.session);
        setMessages((m) => [
          ...(m.length ? m : [agentMsg(greeting().text)]),
          agentMsg(next.turn.text),
        ]);
        setMode("chat");
        setScreen("chat");
      }}
    />
  );
}

let uid = 0;
const agentMsg = (text, chips = []) => ({
  id: ++uid,
  from: "agent",
  text,
  chips,
});
const userMsg = (text) => ({ id: ++uid, from: "user", text });
// Rebuild an engine session from a saved summary so Add/Edit continues it.
const resume = (summary) => ({
  ...createSession(),
  symptoms: summary.symptoms,
  history: summary.medicalHistory,
  historyAsked: true,
  vitals: summary.vitals,
  questions: summary.questions,
  notes: summary.notes,
  done: true,
  stage: "end",
});

function Header({ title, onClose, action }) {
  return (
    <header className={s.chatHeader}>
      <Button
        variant="ghost"
        theme="neutral"
        className={s.headerBack}
        aria-label="Close"
        onClick={onClose}
      >
        <Icon name="close-plain" size={22} />
      </Button>
      <h1>{title}</h1>
      {action}
    </header>
  );
}

function Orb({ small = false }) {
  const [avatar, setAvatar] = useState(true);
  return (
    <div className={s.orb} data-small={small || undefined} aria-hidden="true">
      <span className={s.orbBg} />
      {avatar && (
        <img
          className={s.orbAvatar}
          src={A("mira.png")}
          alt=""
          onError={() => setAvatar(false)}
        />
      )}
    </div>
  );
}

function Secure({ inline = false }) {
  return (
    <p className={`${s.secure} ${inline ? s.secureInline : ""}`}>
      <img src={A("secure.svg")} alt="" width="16" height="16" />
      Your Data is Secured &amp; only doctor can access it
    </p>
  );
}

function Entry({ onStart }) {
  const navigate = useNavigate();
  return (
    <div className={s.root}>
      <div className={s.entryHeader}>
        <Button
          variant="ghost"
          theme="neutral"
          className={s.headerBack}
          aria-label="Go back"
          onClick={() => navigate(-1)}
        >
          <Icon name="arrow-left" size={22} />
        </Button>
        <h1>Add Symptoms</h1>
        <span className={s.language}>
          <img src={A("language.svg")} alt="" width="16" height="16" />
          English
        </span>
      </div>
      <div className={s.entryBody}>
        <Orb />
        <h2 className={s.greeting}>
          <span>Hi,</span> <span>I&apos;m {AGENT_NAME}</span>
        </h2>
        <p className={s.subcopy}>
          Tell me about your symptoms and I&apos;ll securely share them with the
          doctor for better &amp; faster care.
        </p>
      </div>
      <div className={s.entryActions}>
        <button className={s.chatField} onClick={() => onStart("chat")}>
          <span>Type your symptoms here</span>
        </button>
        <button className={s.speak} onClick={() => onStart("voice")}>
          <img src={A("speak.svg")} alt="" width="24" height="24" />
          Speak
        </button>
      </div>
      <Secure />
    </div>
  );
}

function Chat({
  mode,
  session,
  setSession,
  messages,
  setMessages,
  onRestart,
  onSubmit,
  appointment,
}) {
  const navigate = useNavigate();
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [popup, setPopup] = useState(null);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const feed = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const alive = useRef(true);
  // Re-armed on mount: React's development double-mount runs cleanup once.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const lastChips =
    !typing && messages.at(-1)?.from === "agent" ? messages.at(-1).chips : [];

  useEffect(() => {
    feed.current?.scrollTo({
      top: feed.current.scrollHeight,
      behavior: reduced() ? "auto" : "smooth",
    });
  }, [messages, typing]);

  // Agent turn with a short typing pause; in voice mode the words stream in.
  async function agentSays(turn) {
    setTyping(true);
    await wait(reduced() ? 0 : 900);
    if (!alive.current) return;
    setTyping(false);
    if (mode === "voice" && !reduced()) {
      const msg = agentMsg("", turn.chips);
      setMessages((m) => [...m, msg]);
      for (const word of turn.text.split(" ")) {
        await wait(70);
        if (!alive.current) return;
        setMessages((m) =>
          m.map((x) =>
            x.id === msg.id
              ? { ...x, text: x.text ? `${x.text} ${word}` : word }
              : x,
          ),
        );
      }
    } else setMessages((m) => [...m, agentMsg(turn.text, turn.chips)]);
  }

  async function patientSays(text) {
    if (!text.trim() || typing) return;
    setDraft("");
    if (mode === "voice" && !reduced()) {
      setListening(true);
      const msg = userMsg("");
      setMessages((m) => [...m, msg]);
      for (const word of text.split(" ")) {
        await wait(140);
        if (!alive.current) return;
        setMessages((m) =>
          m.map((x) =>
            x.id === msg.id
              ? { ...x, text: x.text ? `${x.text} ${word}` : word }
              : x,
          ),
        );
      }
      setListening(false);
    } else setMessages((m) => [...m, userMsg(text)]);
    const next = respond(sessionRef.current, text);
    setSession(next.session);
    sessionRef.current = next.session;
    if (next.turn) await agentSays(next.turn);
  }

  // Open with the greeting once; voice mode then plays the sample patient.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || messages.length) return;
    started.current = true;
    (async () => {
      await agentSays(greeting());
      if (mode !== "voice") return;
      for (const line of VOICE_SCRIPT) {
        await wait(reduced() ? 0 : 700);
        if (!alive.current || sessionRef.current.done) return;
        await patientSays(line);
      }
    })();
  }, []);

  function submit() {
    const summary = toSummary(sessionRef.current);
    onSubmit(summary);
    return summary;
  }

  return (
    <div className={s.root}>
      <Header
        title="Add Symptoms"
        onClose={() => (messages.length > 1 ? setPopup("quit") : navigate(-1))}
        action={
          messages.length > 2 && (
            <button className={s.endPill} onClick={() => setPopup("warning")}>
              <img src={A("end.svg")} alt="" width="16" height="16" />
              Restart/End
            </button>
          )
        }
      />
      <div className={s.feed} ref={feed} aria-live="polite">
        {messages.map((m) =>
          m.from === "agent" ? (
            <div className={s.agentRow} key={m.id}>
              <span className={s.agentTile} aria-hidden="true" />
              <p className={s.agentText}>{m.text}</p>
            </div>
          ) : (
            <p className={s.userBubble} key={m.id}>
              {m.text}
            </p>
          ),
        )}
        {typing && (
          <div className={s.agentRow} aria-label={`${AGENT_NAME} is typing`}>
            <span className={s.agentTile} aria-hidden="true" />
            <img src={A("typing.gif")} alt="" width="48" height="40" />
          </div>
        )}
      </div>
      {session.done ? (
        <div className={s.endDock}>
          <button
            className={s.addMore}
            onClick={async () => {
              setMessages((m) => [...m, userMsg("Add More Details")]);
              const next = addMore(sessionRef.current);
              setSession(next.session);
              sessionRef.current = next.session;
              await agentSays(next.turn);
            }}
          >
            Add More
          </button>
          <button className={s.submit} onClick={() => setPopup("confirm")}>
            Submit to Doctor
          </button>
          <Secure inline />
        </div>
      ) : mode === "voice" ? (
        <div className={s.voiceDock}>
          <button
            className={s.voiceButton}
            aria-label="End voice conversation"
            onClick={() => setPopup("quit")}
          >
            <img src={A("aa-close.svg")} alt="" width="70" height="70" />
          </button>
          <div
            className={s.wave}
            data-active={(listening || typing) && !muted}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
          <button
            className={s.voiceButton}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
          >
            <img
              src={A(muted ? "mute-mic.svg" : "aa-mic.svg")}
              alt=""
              width="70"
              height="70"
            />
          </button>
        </div>
      ) : (
        <div className={s.dock}>
          {!!lastChips?.length && !draft && (
            <div className={s.chips}>
              {lastChips.map((c, i) => (
                <button
                  key={c.label}
                  style={{ "--i": i }}
                  onClick={() => patientSays(c.text)}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          )}
          <form
            className={s.inputCard}
            onSubmit={(e) => {
              e.preventDefault();
              patientSays(draft);
            }}
          >
            <div className={s.inputField}>
              <input
                aria-label="Type your message"
                placeholder="Type your message here"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              {draft.trim() && (
                <button type="submit" aria-label="Send" className={s.send}>
                  <img src={A("bubble.svg")} alt="" width="32" height="32" />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      <Sheet
        open={popup === "warning"}
        onClose={() => setPopup(null)}
        title="What would you like to do?"
      >
        <p className={s.popupText}>
          You can restart the conversation from the beginning or submit your
          current details to the doctor.
        </p>
        <Button variant="outline" fullWidth onClick={() => setPopup("restart")}>
          Restart from Beginning
        </Button>
        <Button
          fullWidth
          disabled={!sessionRef.current.symptoms.length}
          onClick={() => {
            setPopup(null);
            submit();
          }}
        >
          Submit to Doctor
        </Button>
      </Sheet>
      <Sheet
        open={popup === "restart"}
        onClose={() => setPopup(null)}
        title="Are you sure you want to restart?"
      >
        <p className={s.popupText}>
          All the information you&apos;ve entered so far will be deleted and
          can&apos;t be recovered. You&apos;ll need to enter your symptoms again
          from scratch.
        </p>
        <div className={s.popupRow}>
          <Button
            variant="outline"
            onClick={() => {
              setPopup(null);
              started.current = false;
              onRestart();
              setTimeout(() => {
                started.current = true;
                agentSays(greeting());
              }, 0);
            }}
          >
            Yes, Restart
          </Button>
          <Button onClick={() => setPopup(null)}>Cancel</Button>
        </div>
      </Sheet>
      <Sheet
        open={popup === "quit"}
        onClose={() => setPopup(null)}
        title="Are you sure you want to quit?"
      >
        <p className={s.popupText}>
          If you quit, all progress in this session will be lost and you&apos;ll
          need to start over.
        </p>
        <div className={s.popupRow}>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Yes, Quit
          </Button>
          <Button onClick={() => setPopup(null)}>No, Stay</Button>
        </div>
      </Sheet>
      <Sheet
        open={popup === "confirm"}
        onClose={() => setPopup(null)}
        title="Submit to Doctor"
      >
        <p className={s.popupText}>
          Thanks for sharing everything so far! Is there anything else
          you&apos;d like to mention to the doctor, or can we go ahead &amp;
          submit your symptoms?
        </p>
        <Button variant="outline" fullWidth onClick={() => setPopup(null)}>
          No, I want to add/edit details
        </Button>
        <Button
          fullWidth
          onClick={() => {
            setPopup(null);
            submit();
          }}
        >
          Submit to Doctor
        </Button>
        {appointment && <Secure inline />}
      </Sheet>
    </div>
  );
}

// Days a duration answer spans, for the duration track (max 5).
function spanDays(duration = "") {
  if (/today/i.test(duration)) return 1;
  const n = [...duration.matchAll(/\d+/g)].map(Number);
  return Math.min(5, Math.max(1, n.at(-1) || 1));
}

function Summary({ summary, celebrate, appointment, onEdit }) {
  const navigate = useNavigate();
  const { dispatch, notify } = useApp();
  const [overlay, setOverlay] = useState(celebrate);
  const savedOnce = useRef(false);
  // Save once on arrival from submit; saving updates the visit, so the
  // overlay timer lives in its own effect.
  useEffect(() => {
    if (!celebrate || savedOnce.current) return;
    savedOnce.current = true;
    if (appointment)
      try {
        dispatch({
          type: "SAVE_SYMPTOMS",
          id: appointment.id,
          note: toNote(summary),
          answers: { mock: summary },
        });
      } catch (e) {
        notify(e.message, true);
      }
  }, [celebrate, appointment, summary, dispatch, notify]);
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setOverlay(false), reduced() ? 0 : 1000);
    return () => clearTimeout(t);
  }, [celebrate]);
  const vitals = Object.entries(summary.vitals || {});
  const label = (k) =>
    k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  let order = 0;
  const next = () => ({ "--i": order++ });
  return (
    <div className={s.root}>
      {overlay && (
        <div className={s.success} role="status">
          <img
            src={A("success-animation.gif")}
            alt=""
            width="250"
            height="250"
          />
          <p>
            Your symptoms has been
            <br />
            successfully shared with the Doctor!
          </p>
        </div>
      )}
      <Header
        title="Symptoms Shared to Doctor"
        onClose={() =>
          navigate(
            appointment
              ? `/appointments?visit=${encodeURIComponent(appointment.id)}`
              : "/",
          )
        }
      />
      <div className={s.summaryBody}>
        <div className={s.intro} style={next()}>
          <Orb small />
          <p>
            Thank you! Your symptoms has been successfully shared with the
            Doctor!
          </p>
        </div>
        {!!summary.symptoms.length && (
          <section className={s.card} style={next()}>
            <h2>
              <img src={A("symptoms.svg")} alt="" width="20" height="20" />
              Symptoms
            </h2>
            <ul>
              {summary.symptoms.map((x) => {
                const days = spanDays(x.duration);
                return (
                  <li key={x.name} style={next()}>
                    <div className={s.itemHead}>
                      <strong>{x.name}</strong>
                      {x.severity && (
                        <span
                          className={s.severity}
                          data-level={x.severity.toLowerCase()}
                        >
                          {x.severity}
                        </span>
                      )}
                    </div>
                    <small>
                      <em>Duration:</em> {x.duration || "Not shared"}
                      {x.severity && (
                        <>
                          {" "}
                          <b>|</b> <em>Severity:</em> {x.severity}
                        </>
                      )}
                    </small>
                    <span
                      className={s.track}
                      aria-label={`${days} of 5 days`}
                      role="img"
                    >
                      {Array.from({ length: 5 }, (_, d) => (
                        <i key={d} data-on={d < days} style={{ "--d": d }} />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {!!summary.medicalHistory.length && (
          <section className={s.card} style={next()}>
            <h2>
              <img
                src={A("medical-history.svg")}
                alt=""
                width="20"
                height="20"
              />
              Medical History
            </h2>
            <ul>
              {summary.medicalHistory.map((h) => (
                <li key={h.name} style={next()}>
                  <strong>{h.name}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!!vitals.length && (
          <section className={s.card} style={next()}>
            <h2>
              <img src={A("other.svg")} alt="" width="20" height="20" />
              Vitals &amp; Body Composition
            </h2>
            <dl className={s.vitals}>
              {vitals.map(([k, v]) => (
                <div key={k} style={next()}>
                  <dt>{label(k)}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {summary.notes && (
          <section className={s.card} style={next()}>
            <h2>
              <img src={A("other.svg")} alt="" width="20" height="20" />
              Notes
            </h2>
            <p className={s.notes}>{summary.notes}</p>
          </section>
        )}
        {!!summary.questions.length && (
          <section className={s.card} style={next()}>
            <h2>
              <img
                src={A("message-question.svg")}
                alt=""
                width="20"
                height="20"
              />
              Questions to Doctor
            </h2>
            <ul>
              {summary.questions.map((q) => (
                <li key={q} style={next()}>
                  <span className={s.question}>{q}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className={s.summaryBar}>
        <button className={s.submit} onClick={onEdit}>
          <img src={A("edit.svg")} alt="" width="20" height="20" />
          Add/Edit details
        </button>
        <button
          className={s.goHome}
          onClick={() =>
            navigate(
              appointment
                ? `/appointments?visit=${encodeURIComponent(appointment.id)}`
                : "/",
            )
          }
        >
          Go Home
        </button>
        <p className={s.note}>
          <b>Note:</b> You can still <b>edit</b> your details even after
          submitting, until your consultation begins.
        </p>
      </div>
    </div>
  );
}
