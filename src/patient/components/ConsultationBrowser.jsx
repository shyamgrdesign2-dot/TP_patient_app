import { useEffect, useState } from "react";
import { ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { doctors } from "../../shared/data";
import { openConsultationInTab } from "../services/videoCall";
import { Button, Icon, Sheet } from "./ui";
import v from "./VisitExperience.module.css";

// The web stand-in for the phone's in-app browser: the hospital's
// consultation page inside a full-height sheet, with camera and microphone
// allowed so the lobby and the call work in place. Natively, Capacitor's
// Browser plugin opens the same link instead (see services/videoCall.js).
export default function ConsultationBrowser({ visit, onClose }) {
  const doctor = visit && doctors.find((d) => d.id === visit.doctorId);
  const [loaded, setLoaded] = useState(false);
  // Closing the sheet drops the patient out of the call, so the close button,
  // the overlay and Escape all ask first.
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setLeaving(false);
  }, [visit?.id]);
  return (
    <>
    <Sheet
      open={!!visit}
      onClose={() => setLeaving(true)}
      title="Video consultation"
      description={doctor ? `${doctor.name} · ${doctor.specialty}` : undefined}
      documentView
    >
      {visit && (
        <div className={v.browser}>
          {!loaded && (
            <p className={v.browserLoading} role="status">
              <Icon name="video" family="video-audio-image" size={20} bulk />
              Opening the consultation lobby…
            </p>
          )}
          <iframe
            className={v.browserFrame}
            src={visit.joinUrl}
            title={`Video consultation with ${doctor?.name || "your doctor"}`}
            allow="camera; microphone; autoplay; display-capture; fullscreen; speaker-selection"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setLoaded(true)}
          />
          <div className={v.browserFoot}>
            <span>Trouble with video or audio?</span>
            <Button variant="ghost" size="sm" onClick={() => openConsultationInTab(visit.joinUrl)}>
              <Icon name="export" size={16} /> Open in browser
            </Button>
          </div>
        </div>
      )}
    </Sheet>
    <ConfirmDialog
      open={leaving}
      onOpenChange={setLeaving}
      title="Leave the video consultation?"
      description="If the call is in progress you will drop off. You can rejoin from My visits while the consultation is still open."
      withCallout={false}
      primaryLabel="Stay"
      onPrimary={() => setLeaving(false)}
      secondaryLabel="Leave"
      secondaryTheme="error"
      onSecondary={() => {
        setLeaving(false);
        onClose();
      }}
    />
    </>
  );
}
