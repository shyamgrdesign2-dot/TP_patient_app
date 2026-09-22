// The patient BFF must authorize the visit and obtain the repository's
// `get-symptoms-collector-link` result. Never mint a JWT in the patient client.
export async function openCollectorSession({
  endpoint,
  origin,
  appointment,
  signal,
}) {
  if (
    !endpoint?.startsWith("/api/") ||
    endpoint.includes("?") ||
    endpoint.includes("#")
  )
    throw new Error(
      "The hospital’s symptom collector connection is not configured.",
    );
  if (!appointment.externalId)
    throw new Error(
      "This is a demo visit. A hospital appointment is needed to open the live symptom collector.",
    );
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: appointment.externalId }),
  });
  if (!response.ok)
    throw new Error(
      "We couldn’t open the symptom collector. Please try again.",
    );
  const data = await response.json();
  const url = new URL(data.link);
  if (
    url.protocol !== "https:" ||
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.pathname !== "/symptoms-collector"
  )
    throw new Error(
      "The hospital returned an unsupported symptom collector link.",
    );
  return url.href;
}
