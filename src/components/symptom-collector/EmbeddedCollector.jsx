import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageHeader, Notice, ErrorText, Icon } from "../ui";
import { openCollectorSession } from "../../services/collectorSession";
import shared from "../../App.module.css";
import s from "./Collector.module.css";

export default function EmbeddedCollector({ appointment }) {
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function open() {
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    try {
      const next = await openCollectorSession({
        endpoint: import.meta.env.VITE_SYMPTOM_COLLECTOR_SESSION_ENDPOINT,
        origin: import.meta.env.VITE_SYMPTOM_COLLECTOR_ORIGIN,
        appointment,
        signal: controller.current.signal,
      });
      setLink(next);
    } catch (cause) {
      if (cause.name !== "AbortError") setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`${shared.page} ${s.embedded}`}>
      <PageHeader title="Symptom collector" />
      {link ? (
        <>
          <iframe
            title="Hospital symptom collector"
            src={link}
            referrerPolicy="no-referrer"
            allow={`microphone ${import.meta.env.VITE_SYMPTOM_COLLECTOR_ORIGIN}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          />
          <div className={s.embedActions}>
            <Button
              variant="link"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open separately
            </Button>
            <Button
              variant="tonal"
              onClick={() =>
                navigate(
                  `/appointments?visit=${encodeURIComponent(appointment.id)}`,
                )
              }
            >
              Return to visit
            </Button>
          </div>
        </>
      ) : (
        <>
          <section className={s.summaryCard}>
            <Icon name="message-text" size={30} bulk />
            <h2>Prepare for your visit</h2>
            <p>
              Open your hospital’s symptom collector to share how you’re
              feeling, review your summary and submit it for this appointment.
            </p>
          </section>
          <ErrorText>{error}</ErrorText>
          <Button fullWidth loading={busy} onClick={open}>
            Open symptom collector
          </Button>
          <Notice>
            The hospital may ask you to verify your mobile number. Voice input
            asks for microphone access when you choose to speak.
          </Notice>
        </>
      )}
    </div>
  );
}
