/**
 * Symptom-collector Live tools only.
 * Keep booking / health tools in `tools.js`; wire this module from the symptoms Live page only.
 */

// Ported from DHSPL-Tatvacare/pm-agents-pwa prod@0770b5f.
// The patient preview must not invoke production booking tools.
const executeToolCalls = async (calls) =>
  calls.map((call) => ({
    id: call.id,
    name: call.name,
    response: {
      error: "Live booking tools are not connected in this preview.",
    },
  }));

/** Wire names for Gemini `function_declaration.name` (symptom intake). Single canonical name per tool. */
export const SymptomCollectorToolName = Object.freeze({
  DURATION_QUICK_REPLIES: "get_symptom_duration_quick_replies",
  MEDICAL_HISTORY_QUICK_REPLIES: "get_symptom_medical_history_quick_replies",
  SEVERITY_QUICK_REPLIES: "get_symptom_severity_quick_replies",
  VITALS_AND_DOCTOR_QUESTIONS_QUICK_REPLIES:
    "get_symptom_vitals_doctor_quick_replies",
  /** Signals intake complete after the spoken summary; client ends the active UI. */
  END_OF_CONVERSATION: "end_of_symptom_conversation",
});

/** All symptom-collector tool wire names (for routing / UI guards). */
const SYMPTOM_COLLECTOR_TOOL_WIRE_NAMES = new Set(
  Object.values(SymptomCollectorToolName),
);

function normalizeSymptomCollectorToolName(name) {
  if (name == null) {
    return "";
  }
  return String(name).trim();
}

export function isSymptomCollectorLiveToolName(name) {
  return SYMPTOM_COLLECTOR_TOOL_WIRE_NAMES.has(
    normalizeSymptomCollectorToolName(name),
  );
}

function symptomDurationQuickRepliesResponse() {
  return {
    success: true,
    shortcutOptions: [
      { label: "Today", text: "Today", key: "symptom_duration" },
      { label: "1-2 Day(s)", text: "1-2 days", key: "symptom_duration" },
      { label: "3-5 Day(s)", text: "3-5 days", key: "symptom_duration" },
    ],
  };
}

function symptomMedicalHistoryQuickRepliesResponse() {
  return {
    success: true,
    shortcutOptions: [
      { label: "Skip", text: "Skip", key: "symptom_medical_history" },
    ],
  };
}

function symptomSeverityQuickRepliesResponse() {
  return {
    success: true,
    shortcutOptions: [
      { label: "Mild", text: "Mild", key: "symptom_severity" },
      { label: "Moderate", text: "Moderate", key: "symptom_severity" },
      { label: "Severe", text: "Severe", key: "symptom_severity" },
    ],
  };
}

function symptomVitalsDoctorQuickRepliesResponse() {
  return {
    success: true,
    shortcutOptions: [
      { label: "Skip", text: "Skip", key: "symptom_vitals_doctor" },
    ],
  };
}

function symptomEndOfConversationResponse() {
  return { success: true, conversationEnded: true };
}

function executeSymptomCollectorTool(functionCall) {
  const toolName = normalizeSymptomCollectorToolName(functionCall.name);
  switch (toolName) {
    case SymptomCollectorToolName.DURATION_QUICK_REPLIES:
      return symptomDurationQuickRepliesResponse();
    case SymptomCollectorToolName.MEDICAL_HISTORY_QUICK_REPLIES:
      return symptomMedicalHistoryQuickRepliesResponse();
    case SymptomCollectorToolName.SEVERITY_QUICK_REPLIES:
      return symptomSeverityQuickRepliesResponse();
    case SymptomCollectorToolName.VITALS_AND_DOCTOR_QUESTIONS_QUICK_REPLIES:
      return symptomVitalsDoctorQuickRepliesResponse();
    case SymptomCollectorToolName.END_OF_CONVERSATION:
      return symptomEndOfConversationResponse();
    default:
      return {
        error: `Unknown symptom collector tool: ${functionCall.name ?? "(missing name)"}`,
      };
  }
}

export const symptomDurationQuickRepliesToolDefinition = {
  name: SymptomCollectorToolName.DURATION_QUICK_REPLIES,
  description:
    "Symptom intake ONLY — never call for appointments. Invoke in the same turn when you verbally ask how long the current symptom has been present (started / since when / how many days) AND the patient has not already stated clear duration for that symptom. The client renders quick replies from the JSON (shortcutOptions). Ask your duration question aloud to the patient; user chip taps arrive as spoken text.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      symptom_context: {
        type: "string",
        description:
          "Which symptom duration is being asked about (short phrase).",
      },
    },
    additionalProperties: false,
  },
};

export const symptomSeverityQuickRepliesToolDefinition = {
  name: SymptomCollectorToolName.SEVERITY_QUICK_REPLIES,
  description:
    "Symptom intake ONLY — never call for appointments. Invoke in the same turn when you verbally ask about **severity** or **intensity** (mild / moderate / severe) of the **current symptom** AND the patient has **not** already stated clear severity for that symptom. The client renders chips **Mild**, **Moderate**, **Severe** via shortcutOptions. Ask your severity question aloud; treat chip text as the patient reply.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      symptom_context: {
        type: "string",
        description:
          "Which symptom severity is being asked about (short phrase).",
      },
    },
    additionalProperties: false,
  },
};

export const symptomMedicalHistoryQuickRepliesToolDefinition = {
  name: SymptomCollectorToolName.MEDICAL_HISTORY_QUICK_REPLIES,
  description:
    "Symptom intake ONLY — never call for appointments. Invoke in the **same assistant turn** when you ask about **past medical history** and/or **allergies** (after symptom details, before vitals combined ask) and the patient has **not** yet replied. The client shows a **Skip** chip; treat tap as the user saying they have nothing relevant to add.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      context: {
        type: "string",
        description:
          "Optional short note (e.g. focusing on allergies or chronic conditions).",
      },
    },
    additionalProperties: false,
  },
};

export const symptomVitalsDoctorQuickRepliesToolDefinition = {
  name: SymptomCollectorToolName.VITALS_AND_DOCTOR_QUESTIONS_QUICK_REPLIES,
  description:
    "Symptom intake ONLY — never call for bookings. Invoke in the **same assistant turn** when you send your **single combined** message requesting **vitals** (BP, Temperature, Heart Rate, Weight, Height) **and** **questions for the doctor** together (step after medical history; only once per conversation) and the patient has **not** answered yet. The client shows a **Skip** chip; treat tap as the user declining to share vitals and having no doctor question right now.",
  parametersJsonSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

export const symptomEndOfConversationToolDefinition = {
  name: SymptomCollectorToolName.END_OF_CONVERSATION,
  description:
    'Symptom intake ONLY — never for booking. Call **once per completed intake phase**, in the **same assistant turn** as your closing message for that phase. (**A**) Right after the **first** full symptom bullet summary (after vitals/doctor-question step). (**B**) When the patient adds more later (e.g. "Add More Details"): after you **finish** follow-up questions for **that** add-more round and have nothing essential left to ask, send a **short** confirmation and call this tool **again** in that same turn (full repeat of the long first summary is not required). Do **not** call before the phase is done; do **not** call twice in one turn.',
  parametersJsonSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

/** Passed as `settings.functionDeclarations` on the symptom Live screen. */
export const SYMPTOMS_LIVE_EXTRA_TOOL_DEFINITIONS = [
  symptomDurationQuickRepliesToolDefinition,
  symptomMedicalHistoryQuickRepliesToolDefinition,
  symptomSeverityQuickRepliesToolDefinition,
  symptomVitalsDoctorQuickRepliesToolDefinition,
  symptomEndOfConversationToolDefinition,
];

/**
 * Runs symptom-collector tools locally and delegates all other calls to `tools.js` `executeToolCalls`
 * (booking), preserving result order.
 */
export async function executeSymptomCollectorLiveToolCalls(functionCalls = []) {
  if (!Array.isArray(functionCalls) || functionCalls.length === 0) {
    return [];
  }

  const results = new Array(functionCalls.length);
  const bookingIndices = [];
  const bookingCalls = [];

  for (let i = 0; i < functionCalls.length; i++) {
    const fc = functionCalls[i];
    if (isSymptomCollectorLiveToolName(fc.name)) {
      results[i] = {
        id: fc.id,
        name: fc.name,
        response: executeSymptomCollectorTool(fc),
      };
    } else {
      bookingIndices.push(i);
      bookingCalls.push(fc);
    }
  }

  if (bookingCalls.length > 0) {
    const bookingResults = await executeToolCalls(bookingCalls);
    for (let j = 0; j < bookingIndices.length; j++) {
      results[bookingIndices[j]] = bookingResults[j];
    }
  }

  return results;
}
