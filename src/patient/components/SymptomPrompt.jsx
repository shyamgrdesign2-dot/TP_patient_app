import { useApp } from "../state/AppContext";
import { needsSymptoms } from "../services/symptomReminders";
import { Button, Icon } from "./ui";
import s from "./VisitExperience.module.css";
export default function SymptomPrompt({ visit, onOpen }) {
  const { openAgent } = useApp();
  if (!visit || !needsSymptoms(visit)) return null;
  return (
    <section className={s.symptomNudge} aria-label="Symptoms not shared">
      <h3>Prepare for your consultation</h3>
      <p>
        Your symptoms haven’t been shared yet. Tell the collector how you feel
        through a guided conversation.
      </p>
      <Button
        className={s.aiAction}
        fullWidth
        onClick={() => {
          onOpen?.();
          openAgent({ kind: "symptoms", appointmentId: visit.id });
        }}
      >
        <Icon name="add-plain" /> Add symptoms
      </Button>
    </section>
  );
}
