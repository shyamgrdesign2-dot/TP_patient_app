import { Capacitor } from "@capacitor/core";

// Video consultations happen on the hospital's consultation page (a
// Cloudflare-hosted web app, e.g. https://pm-agents-pwa-uat.tatvacare.in/
// consultation/join?consultationId=…&token=…&role=patient). The link carries
// its own short-lived token, so there is no login: the patient joins the
// lobby and the call runs on that page.
//
// On a phone the link opens in the system in-app browser (SFSafariViewController
// / Chrome Custom Tabs via @capacitor/browser), which keeps the patient inside
// the app and grants camera and microphone like a normal browser tab. On the
// web the caller shows the page in an in-app browser sheet instead.
export async function openConsultation(url) {
  if (!url) throw new Error("The join link for this consultation is not available yet.");
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({
      url,
      presentationStyle: "fullscreen",
      toolbarColor: "#171725",
    });
    return "native";
  }
  return "web";
}

// Open the link in a regular browser tab (fallback when the page refuses to
// render inside the in-app sheet, or for desktop testing).
export function openConsultationInTab(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}
