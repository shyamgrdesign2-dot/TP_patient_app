const paths = {
  symptoms: [
    "/symptoms-collector",
    "/symptoms-collector-conversation",
    "/conversation",
  ],
};
export function validateAgentLink(link, origin, kind, mode) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error("The hospital returned an invalid agent link.");
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== origin ||
    url.username ||
    url.password ||
    !paths[kind]?.includes(url.pathname)
  )
    throw new Error("The hospital returned an unsupported agent link.");
  // prod@0770b5f enables the Gemini routes, with `type=chat|voice`.
  if (url.pathname === "/symptoms-collector")
    url.pathname = "/symptoms-collector-conversation";
  url.searchParams.set("type", mode);
  return url.href;
}
export async function openAgentSession({
  kind,
  mode,
  endpoint,
  origin,
  appointment,
  signal,
}) {
  if (!["chat", "voice"].includes(mode) || !paths[kind])
    throw new Error("Choose how you’d like to continue.");
  if (
    !endpoint?.startsWith("/api/") ||
    endpoint.includes("?") ||
    endpoint.includes("#") ||
    !origin?.startsWith("https://")
  )
    throw new Error("The hospital agent isn’t connected to this preview yet.");
  if (kind === "symptoms" && !appointment?.externalId)
    throw new Error(
      "This sample appointment has no hospital agent session. Open a hospital-connected appointment to share symptoms with the agent.",
    );
  const body = { appointmentId: appointment.externalId, mode };
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error("The hospital agent couldn’t connect. Please try again.");
  const data = await response.json();
  return {
    url: validateAgentLink(data.link, origin, kind, mode),
    statusUrl:
      typeof data.statusUrl === "string" && data.statusUrl.startsWith("/api/")
        ? data.statusUrl
        : null,
  };
}
export async function readAgentStatus(statusUrl, appointmentId, signal) {
  if (!statusUrl?.startsWith("/api/")) return false;
  const response = await fetch(statusUrl, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!response.ok) return false;
  const data = await response.json();
  return data.appointmentId === appointmentId && data.status === "completed";
}
