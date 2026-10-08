import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { locations, hospitalCallHref } from "../../shared/brand";
import LocationSheet from "./LocationSheet";
import HospitalContacts from "./HospitalContacts";
import {
  PatientName,
  Icon,
  IconButton,
  Button,
  Sheet,
  FamilySheet,
  Empty,
  NotificationItem,
} from "./ui";
import shared from "../App.module.css";
import home from "../Home.module.css";
const s = { ...shared, ...home };

export default function PatientHeader() {
  const { state, activeMember, brand, dispatch } = useApp();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const hospital = locations.find((l) => l.id === state.location);
  const notices = state.notifications.filter(
    (n) => !n.memberId || n.memberId === activeMember.id,
  );
  const unread = notices.filter((n) => !n.read).length;
  return (
    <>
      <header className={s.patientHeader}>
        <div className={s.patientIdentity}>
          <div className={s.grow}>
            <button
              className={s.headerPatient}
              aria-label={`Care for ${activeMember.name}. Switch patient`}
              aria-haspopup="dialog"
              aria-expanded={sheet === "family"}
              onClick={() => setSheet("family")}
            >
              {/* Plain greeting: the ABHA mark is shown everywhere else. */}
              <span className={s.patientName}>
                Hello, {activeMember.name.split(" ")[0]}
              </span>
              <Icon name="chevron-down" size={16} />
            </button>
            <button
              className={s.headerLocation}
              aria-label={`${brand.hospitalName}, ${hospital.name}. Change location`}
              aria-haspopup="dialog"
              aria-expanded={sheet === "location"}
              onClick={() => setSheet("location")}
            >
              <Icon name="location" size={14} bulk />
              <span>{hospital.name}</span>
            </button>
          </div>
          <div className={s.headerActions}>
            <IconButton
              name="emergency"
              variant="tonal"
              theme="error"
              iconSize={24}
              iconColor="var(--tesseract-fg-error)"
              className={s.headerEmergency}
              label="Emergency hospital contacts"
              aria-haspopup="dialog"
              aria-expanded={sheet === "emergency"}
              onClick={() => setSheet("emergency")}
            />
            <IconButton
              name="notification-2"
              variant="ghost"
              theme="neutral"
              iconSize={24}
              iconColor="var(--tesseract-fg-secondary)"
              className={s.headerBell}
              label="Notifications"
              badge={unread}
              aria-haspopup="dialog"
              aria-expanded={sheet === "notifications"}
              onClick={() => setSheet("notifications")}
            />
          </div>
        </div>
      </header>
      <Sheet
        open={sheet === "emergency"}
        onClose={() => setSheet(null)}
        title="Emergency contacts"
        description={brand.hospitalName}
      >
        {[
          ["Hospital emergency", "emergencyPhone", "call-calling"],
          ["Hospital ambulance", "ambulancePhone", "emergency"],
        ].map(([label, key, icon]) => (
          <div className={s.emergencyContact} key={key}>
            <span className={s.rowIcon}>
              <Icon name={icon} bulk size={26} />
            </span>
            <div className={s.grow}>
              <strong>{label}</strong>
              <small>
                {hospitalCallHref(brand[key])
                  ? brand[key]
                  : "Number not configured"}
              </small>
            </div>
            <Button
              variant="tonal"
              size="sm"
              href={hospitalCallHref(brand[key])}
              disabled={!hospitalCallHref(brand[key])}
              aria-label={`Call ${label.toLowerCase()}`}
            >
              Call
            </Button>
          </div>
        ))}
        <HospitalContacts title="Hospital contacts" />
      </Sheet>
      <FamilySheet open={sheet === "family"} onClose={() => setSheet(null)} />
      <LocationSheet
        open={sheet === "location"}
        onClose={() => setSheet(null)}
      />
      <Sheet
        open={sheet === "notifications"}
        onClose={() => setSheet(null)}
        title="Your updates"
        description={
          unread
            ? `${unread} unread · For ${activeMember.name.split(" ")[0]}`
            : "You’re all caught up"
        }
        footer={
          <Button
            variant="tonal"
            fullWidth
            onClick={() => dispatch({ type: "READ_NOTICE", id: "all" })}
          >
            Mark all as read
          </Button>
        }
      >
        {notices.length ? (
          <div className={s.notificationList}>
            {notices.map((notice) => (
              <NotificationItem
                key={notice.id}
                notice={notice}
                onOpen={() => {
                  dispatch({ type: "READ_NOTICE", id: notice.id });
                  setSheet(null);
                  navigate(notice.route);
                }}
              />
            ))}
          </div>
        ) : (
          <Empty
            icon="notification-2"
            title="No updates yet"
            description="Your hospital updates will appear here."
          />
        )}
      </Sheet>
    </>
  );
}
