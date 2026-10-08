export const needsSymptoms = (visit) =>
  visit.status === "Confirmed" &&
  !visit.symptomIntake &&
  visit.symptomCollectorStatus !== "completed";
