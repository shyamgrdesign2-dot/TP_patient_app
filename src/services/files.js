function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("tatva-demo-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveFile(id, file) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function getFile(id) {
  const db = await openDB();
  const result = await new Promise((resolve, reject) => {
    const req = db.transaction("files").objectStore("files").get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}
export function download(name, content, type = "text/plain") {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function calendarFile(appointment, doctor, location) {
  const [h, m] = appointment.time.slice(0, 5).split(":").map(Number);
  const hour = (h % 12) + (appointment.time.includes("PM") ? 12 : 0);
  const start = new Date(
    `${appointment.date}T${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`,
  );
  const stamp = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tatva Practice//Patient App//EN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@tatva-patient-demo`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(+start + 1800000))}`,
    `SUMMARY:Consultation with ${doctor.name}`,
    `LOCATION:${location.name}`,
    "DESCRIPTION:Sample appointment from the Tatva Practice demo.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
