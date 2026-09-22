// Intake sequence follows pm-agents-pwa/src/systemPrompt.js, prod@0770b5f.
// This deterministic demo adapter replaces the live conversation transport.
import {
  SymptomCollectorToolName as Tool,
  executeSymptomCollectorLiveToolCalls,
} from "./tools";
export const intake = [
  {
    key: "symptoms",
    title: "Symptoms",
    question:
      "What symptoms or concerns would you like to discuss with the doctor?",
  },
  {
    key: "duration",
    title: "Duration",
    question: "How long have you had these symptoms?",
    tool: Tool.DURATION_QUICK_REPLIES,
  },
  {
    key: "severity",
    title: "Severity",
    question: "How would you describe their severity?",
    tool: Tool.SEVERITY_QUICK_REPLIES,
  },
  {
    key: "history",
    title: "Medical history & allergies",
    question:
      "Please share any medical conditions, medicines you take, or allergies.",
    tool: Tool.MEDICAL_HISTORY_QUICK_REPLIES,
  },
  {
    key: "vitals",
    title: "Vitals & questions",
    question:
      "Would you like to add any recent measurements, such as temperature or blood pressure, and any questions for your doctor?",
    tool: Tool.VITALS_AND_DOCTOR_QUESTIONS_QUICK_REPLIES,
  },
];
export async function shortcuts(step) {
  if (!step.tool) return [];
  const [result] = await executeSymptomCollectorLiveToolCalls([
    { id: step.key, name: step.tool },
  ]);
  return result.response.shortcutOptions || [];
}
export function visitNote(answers) {
  return intake
    .filter((step) => answers[step.key])
    .map(
      (step) =>
        `${step.title}: ${answers[step.key] === "Skip" ? "Not provided" : answers[step.key]}`,
    )
    .join("\n");
}
