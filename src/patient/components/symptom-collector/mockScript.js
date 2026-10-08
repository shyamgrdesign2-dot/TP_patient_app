// Scripted stand-in for the hosted symptom collector (pm-agents-pwa, prod).
// Question order, copy and quick replies follow its system prompt and tools:
// symptoms -> per symptom duration, then severity -> history & allergies ->
// vitals & questions -> bullet summary -> Add More / Submit to Doctor.

export const AGENT_NAME = "Mira";

export const DURATION_CHIPS = [
  { label: "Today", text: "Today" },
  { label: "1-2 Day(s)", text: "1-2 days" },
  { label: "3-5 Day(s)", text: "3-5 days" },
];
export const SEVERITY_CHIPS = [
  { label: "Mild", text: "Mild" },
  { label: "Moderate", text: "Moderate" },
  { label: "Severe", text: "Severe" },
];
export const SYMPTOM_CHIPS = [
  { label: "Fever & dry cough", text: "I have fever and a dry cough" },
  { label: "Headache", text: "I have a headache" },
  { label: "Stomach pain", text: "I have stomach pain" },
];
export const HISTORY_CHIPS = [
  { label: "Skip", text: "Skip" },
  { label: "Diabetes", text: "I have type 2 diabetes, on metformin" },
  { label: "Penicillin allergy", text: "I'm allergic to penicillin" },
];
export const VITALS_CHIPS = [
  { label: "Skip", text: "Skip" },
  {
    label: "Temp & BP",
    text: "Temp 100.4°F, BP 130/85. Do I need a blood test?",
  },
];

// Sample patient for the auto-playing voice demo.
export const VOICE_SCRIPT = [
  "I've had a fever and a dry cough",
  "3-5 days",
  "Moderate",
  "1-2 days",
  "Mild",
  "I have type 2 diabetes, on metformin",
  "Temp 100.4°F, BP 130/85. Do I need a blood test?",
];

const KNOWN = [
  ["fever", "Fever"],
  ["dry cough", "Dry cough"],
  ["cough", "Cough"],
  ["headache", "Headache"],
  ["body ache", "Body ache"],
  ["stomach", "Stomach pain"],
  ["cold", "Cold"],
  ["sore throat", "Sore throat"],
  ["vomit", "Vomiting"],
  ["nausea", "Nausea"],
  ["dizz", "Dizziness"],
  ["rash", "Skin rash"],
  ["back pain", "Back pain"],
  ["chest pain", "Chest pain"],
];
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseSymptoms(text) {
  const lower = text.toLowerCase();
  const found = [];
  // Longer keys come first in KNOWN, so "dry cough" wins over "cough".
  for (const [key, name] of KNOWN)
    if (
      lower.includes(key) &&
      !found.some((f) => f.toLowerCase().includes(key))
    )
      found.push(name);
  if (found.length) return found;
  return text
    .replace(/^(i (have|am having|'ve had|have had)|i'm having|having)\s+/i, "")
    .split(/,| and |&/i)
    .map((s) => s.replace(/^(a|an|some)\s+/i, "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .map(title);
}

export function parseVitals(text) {
  const vitals = {};
  const bp = /(\d{2,3})\s*\/\s*(\d{2,3})/.exec(text);
  if (bp) vitals.bloodPressure = `${bp[1]}/${bp[2]} mmHg`;
  const temp = /(\d{2,3}(?:\.\d)?)\s*°?\s*([fc])\b/i.exec(text);
  if (temp) vitals.temperature = `${temp[1]} °${temp[2].toUpperCase()}`;
  const hr = /(\d{2,3})\s*bpm/i.exec(text);
  if (hr) vitals.heartRate = `${hr[1]} bpm`;
  const weight = /(\d{2,3})\s*kg/i.exec(text);
  if (weight) vitals.weight = `${weight[1]} kg`;
  const questions = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.endsWith("?"));
  return { vitals, questions };
}

const isSkip = (text) => /^\s*(skip|no|none|nothing)\b/i.test(text);

// Pure reducer over the conversation. Returns the next agent turn.
export function createSession() {
  return {
    stage: "symptoms",
    symptoms: [],
    index: 0,
    history: [],
    vitals: {},
    questions: [],
    done: false,
  };
}

export function greeting() {
  return {
    text: `Hi, I'm ${AGENT_NAME}, the doctor's AI assistant. Please share your symptoms with me so I can securely pass them along to the doctor for faster and better care.`,
    chips: SYMPTOM_CHIPS,
  };
}

export function respond(session, text) {
  const s = { ...session };
  if (s.stage === "symptoms" || s.stage === "more") {
    const names = parseSymptoms(text);
    const fresh = names
      .filter((n) => !s.symptoms.some((x) => x.name === n))
      .map((name) => ({ name }));
    if (!fresh.length && s.stage === "more") {
      s.notes = [s.notes, text].filter(Boolean).join(" ");
      return finish(s);
    }
    s.symptoms = [...s.symptoms, ...fresh];
    s.index = s.symptoms.length - fresh.length;
    s.stage = "duration";
    return ask(s);
  }
  if (s.stage === "duration") {
    s.symptoms = s.symptoms.map((x, i) =>
      i === s.index ? { ...x, duration: text } : x,
    );
    s.stage = "severity";
    return ask(s);
  }
  if (s.stage === "severity") {
    s.symptoms = s.symptoms.map((x, i) =>
      i === s.index ? { ...x, severity: title(text.trim()) } : x,
    );
    if (s.index < s.symptoms.length - 1) {
      s.index += 1;
      s.stage = "duration";
    } else s.stage = s.history.length || s.historyAsked ? "end" : "history";
    return s.stage === "end" ? finish(s) : ask(s);
  }
  if (s.stage === "history") {
    s.historyAsked = true;
    if (!isSkip(text))
      s.history = text
        .split(/;| and also | and /i)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({ name: title(t.replace(/^i (have|am|'m)\s+/i, "")) }));
    s.stage = "vitals";
    return ask(s);
  }
  if (s.stage === "vitals") {
    if (!isSkip(text)) {
      const { vitals, questions } = parseVitals(text);
      s.vitals = vitals;
      s.questions = questions;
    }
    return finish(s);
  }
  return { session: s, turn: null };
}

function ask(s) {
  const current = s.symptoms[s.index];
  if (s.stage === "duration")
    return {
      session: s,
      turn: {
        text:
          s.index === 0
            ? `I'm sorry you're dealing with that. How long have you had the ${current.name.toLowerCase()}?`
            : `And how long have you had the ${current.name.toLowerCase()}?`,
        chips: DURATION_CHIPS,
      },
    };
  if (s.stage === "severity")
    return {
      session: s,
      turn: {
        text: `How would you describe the severity of the ${current.name.toLowerCase()}?`,
        chips: SEVERITY_CHIPS,
      },
    };
  if (s.stage === "history")
    return {
      session: s,
      turn: {
        text: "Do you have any existing medical conditions, regular medicines or allergies the doctor should know about?",
        chips: HISTORY_CHIPS,
      },
    };
  return {
    session: s,
    turn: {
      text: "Could you share any vitals (BP, Temp, Heart Rate, Weight, Height) and any questions you have for the doctor?",
      chips: VITALS_CHIPS,
    },
  };
}

function finish(s) {
  s.stage = "end";
  s.done = true;
  const lines = s.symptoms.map(
    (x) =>
      `• ${x.name}${x.duration ? ` ${/today/i.test(x.duration) ? "since" : "for"} ${x.duration.toLowerCase()}` : ""}${x.severity ? `, ${x.severity.toLowerCase()}` : ""}`,
  );
  if (s.history.length)
    lines.push(`• History: ${s.history.map((h) => h.name).join(", ")}`);
  const v = Object.values(s.vitals);
  if (v.length) lines.push(`• Vitals: ${v.join(", ")}`);
  if (s.questions.length) lines.push(`• Question: ${s.questions.join(" ")}`);
  return {
    session: s,
    turn: {
      text: `Thank you. Here's what I'll share with the doctor:\n${lines.join("\n")}`,
      chips: [],
    },
  };
}

export function addMore(session) {
  return {
    session: { ...session, stage: "more", done: false },
    turn: {
      text: "Sure. What else would you like to add?",
      chips: [],
    },
  };
}

export function toSummary(s) {
  return {
    symptoms: s.symptoms,
    medicalHistory: s.history,
    vitals: s.vitals,
    notes: s.notes || "",
    questions: s.questions,
  };
}

export function toNote(summary) {
  const parts = [];
  if (summary.symptoms.length)
    parts.push(
      `Symptoms: ${summary.symptoms
        .map((x) => [x.name, x.duration, x.severity].filter(Boolean).join(", "))
        .join("; ")}`,
    );
  if (summary.medicalHistory.length)
    parts.push(
      `Medical history & allergies: ${summary.medicalHistory.map((h) => h.name).join("; ")}`,
    );
  const vitals = Object.values(summary.vitals);
  if (vitals.length) parts.push(`Vitals: ${vitals.join(", ")}`);
  if (summary.notes) parts.push(`Notes: ${summary.notes}`);
  if (summary.questions.length)
    parts.push(`Questions: ${summary.questions.join(" ")}`);
  return parts.join("\n") || "No details shared.";
}
