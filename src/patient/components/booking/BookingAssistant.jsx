import MiraAvatar from "../MiraAvatar";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../state/AppContext";
import { dateKey, slots } from "../../../shared/data";
import { Button, Icon, Sheet } from "../ui";
import { MemberForm } from "../MemberForm";
import VisitSummary from "./VisitSummary";
import {
  useBookVisit,
  clinicFor,
  openSlotsFor,
  videoEnabled,
} from "./useBookVisit";
import { createSession, greeting, respond, voiceLine } from "./bookingScript";
import c from "../symptom-collector/MockCollector.module.css";
import shared from "../../App.module.css";
import s from "./Booking.module.css";

const A = (name) => `/collector/${name}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let uid = 0;
const agentMsg = (turn) => ({ id: ++uid, from: "agent", ...turn });
const userMsg = (text) => ({ id: ++uid, from: "user", text });

// "Book with assistant": the symptom collector's chat (same header, bubbles,
// typing indicator and voice dock) asking for the patient, visit type, day
// and time, then booking through the same action as the manual steps.
// Voice is simulated exactly as in the collector: a sample patient speaks.
export default function BookingAssistant({ doctor, intake, onManual }) {
  const { state, activeMember } = useApp();
  const navigate = useNavigate();
  const { book, confirming } = useBookVisit();
  const stateRef = useRef(state);
  stateRef.current = state;
  // Read through refs so a profile added mid-chat is known straight away.
  const ctx = useMemo(
    () => ({
      doctor,
      get members() {
        return stateRef.current.members;
      },
      activeMemberId: activeMember.id,
      videoEnabled: videoEnabled(),
      today: dateKey(),
      firstDay: 1,
      lastDay: 90,
      slots,
      openSlots: (date, memberId) =>
        openSlotsFor(stateRef.current, doctor, date, memberId),
    }),
    [doctor, activeMember.id],
  );
  const [session, setSession] = useState(() =>
    createSession(ctx, intake?.prefill),
  );
  const sessionRef = useRef(session);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [voice, setVoice] = useState(false);
  const voiceRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [quit, setQuit] = useState(false);
  const feed = useRef(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    feed.current?.scrollTo({
      top: feed.current.scrollHeight,
      behavior: reduced() ? "auto" : "smooth",
    });
  }, [messages, typing, session.stage]);

  const last = messages.at(-1);
  const lastAgent = !typing && last?.from === "agent" ? last : null;
  const chips = lastAgent?.chips || [];
  const atConfirm = session.stage === "confirm" && !!lastAgent;
  const update = (next) => {
    sessionRef.current = next;
    setSession(next);
  };

  async function stream(msg, text, pace) {
    setMessages((m) => [...m, { ...msg, text: "" }]);
    for (const word of text.split(" ")) {
      await wait(pace);
      if (!alive.current) return;
      setMessages((m) =>
        m.map((x) =>
          x.id === msg.id
            ? { ...x, text: x.text ? `${x.text} ${word}` : word }
            : x,
        ),
      );
    }
  }
  async function agentSays(turn) {
    setTyping(true);
    await wait(reduced() ? 0 : 700);
    if (!alive.current) return;
    setTyping(false);
    const msg = agentMsg(turn);
    if (voiceRef.current && !reduced()) await stream(msg, turn.text, 60);
    else setMessages((m) => [...m, msg]);
    return msg;
  }
  async function confirm() {
    const { memberId, date, time, type } = sessionRef.current;
    try {
      await book({ doctor, memberId, date, time, type, intake });
    } catch (e) {
      // Slot taken meanwhile, or another clash: say why and offer new times.
      const next = { ...sessionRef.current, time: null };
      const reply = respond(next, "", ctx, { clear: "time" });
      update(reply.session);
      await agentSays({
        ...reply.turn,
        text: `${e.message} ${reply.turn.text.replace(/^Sure\.\s*/, "")}`,
      });
    }
  }
  async function patientSays(text, set) {
    if (!text.trim() || typing || confirming) return;
    setDraft("");
    const msg = userMsg(text);
    if (voiceRef.current && !reduced()) {
      setListening(true);
      await stream(msg, text, 130);
      setListening(false);
    } else setMessages((m) => [...m, msg]);
    const reply = respond(sessionRef.current, text, ctx, set);
    update(reply.session);
    if (reply.confirm) return confirm();
    return agentSays(reply.turn);
  }
  // The sample patient answers each question until the summary is ready.
  // Booking itself always waits for a tap on Confirm appointment.
  async function playVoice(turn) {
    let current = turn;
    while (alive.current && voiceRef.current) {
      const line = voiceLine(sessionRef.current, current);
      if (!line) break;
      await wait(reduced() ? 0 : 700);
      if (!alive.current || !voiceRef.current) return;
      current = await patientSays(line.text, line.set);
    }
    voiceRef.current = false;
    setVoice(false);
  }
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const opening = greeting(ctx, sessionRef.current);
    update(opening.session);
    agentSays(opening.turn);
  }, []);

  function close() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/doctors");
  }
  const member = state.members.find((m) => m.id === session.memberId);
  const visit = {
    doctorId: doctor.id,
    location: clinicFor(doctor, state.location),
    date: session.date,
    time: session.time,
    type: session.type,
  };
  return (
    <div className={`${c.root} ${s.assistant}`}>
      <header className={c.chatHeader}>
        <Button
          variant="ghost"
          theme="neutral"
          className={c.headerBack}
          aria-label="Close"
          onClick={() => (messages.length > 1 ? setQuit(true) : close())}
        >
          <Icon name="close-plain" size={22} />
        </Button>
        <h1>Book a visit</h1>
        <button
          className={s.manualPill}
          onClick={() => onManual(sessionRef.current)}
        >
          Switch to manual
        </button>
      </header>
      <div className={c.feed} ref={feed} aria-live="polite">
        {messages.map((m) =>
          m.from === "agent" ? (
            <div className={c.agentRow} key={m.id}>
              <MiraAvatar size={32} />
              <div className={s.agentBody}>
                <p className={c.agentText}>{m.text}</p>
                {m.summary && m.id === lastAgent?.id && member && (
                  <VisitSummary
                    visit={visit}
                    member={member}
                    showDoctor
                    className={s.chatSummary}
                  />
                )}
              </div>
            </div>
          ) : (
            <p className={c.userBubble} key={m.id}>
              {m.text}
            </p>
          ),
        )}
        {typing && (
          <div className={c.agentRow} aria-label="Mira is typing">
            <MiraAvatar size={32} />
            <img src={A("typing.gif")} alt="" width="48" height="40" />
          </div>
        )}
      </div>
      {voice ? (
        <div className={c.voiceDock}>
          <button
            className={c.voiceButton}
            aria-label="End voice conversation"
            onClick={() => {
              voiceRef.current = false;
              setVoice(false);
            }}
          >
            <img src={A("aa-close.svg")} alt="" width="70" height="70" />
          </button>
          <div
            className={c.wave}
            data-active={(listening || typing) && !muted}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
          <button
            className={c.voiceButton}
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
        <div className={c.dock}>
          {atConfirm && lastAgent.summary && (
            <div className={s.confirmDock}>
              <button
                className={c.submit}
                disabled={confirming}
                onClick={confirm}
              >
                Confirm appointment
              </button>
              <button
                className={c.addMore}
                disabled={confirming}
                onClick={() => patientSays("I’d like to change something")}
              >
                Change something
              </button>
            </div>
          )}
          {!!chips.length && !draft && (
            <div
              className={`${c.chips} ${lastAgent.scroll ? s.chipsScroll : ""}`}
              role="group"
              aria-label="Quick replies"
            >
              {chips.map((chip, i) => (
                <button
                  key={chip.label}
                  style={{ "--i": Math.min(i, 6) }}
                  onClick={() =>
                    chip.action === "add-member"
                      ? setAdding(true)
                      : patientSays(chip.text, chip.set)
                  }
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}
          <form
            className={c.inputCard}
            onSubmit={(e) => {
              e.preventDefault();
              patientSays(draft);
            }}
          >
            <div className={c.inputField}>
              <input
                aria-label="Type your message"
                placeholder={
                  atConfirm
                    ? "Or tell me what to change"
                    : "Type your message here"
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              {draft.trim() ? (
                <button type="submit" aria-label="Send" className={c.send}>
                  <img src={A("bubble.svg")} alt="" width="32" height="32" />
                </button>
              ) : (
                !atConfirm && (
                  <button
                    type="button"
                    aria-label="Speak instead"
                    className={`${c.send} ${s.mic}`}
                    disabled={typing}
                    onClick={() => {
                      voiceRef.current = true;
                      setVoice(true);
                      playVoice(lastAgent);
                    }}
                  >
                    <Icon
                      name="microphone-2"
                      family="video-audio-image"
                      corner="rounded"
                      size={22}
                    />
                  </button>
                )
              )}
            </div>
          </form>
        </div>
      )}
      {confirming && (
        <div className={shared.confirmingOverlay} role="status">
          <span className={shared.confirmingRing} aria-hidden="true" />
          <p>Confirming your appointment…</p>
        </div>
      )}
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a family member"
      >
        {adding && (
          <MemberForm
            onClose={() => setAdding(false)}
            onSave={(profile) =>
              patientSays(`For ${profile.name.split(" ")[0]}`, {
                memberId: profile.id,
              })
            }
          />
        )}
      </Sheet>
      <Sheet
        open={quit}
        onClose={() => setQuit(false)}
        title="Leave this booking?"
      >
        <p className={c.popupText}>
          Your answers so far will be lost. You can also switch to manual
          booking and keep them.
        </p>
        <div className={c.popupRow}>
          <Button variant="outline" onClick={close}>
            Yes, leave
          </Button>
          <Button onClick={() => setQuit(false)}>Keep booking</Button>
        </div>
      </Sheet>
    </div>
  );
}
