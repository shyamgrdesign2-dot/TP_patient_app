import { useApp } from "../state/AppContext";
import { hospitalCallHref, whatsappHref } from "../../shared/brand";
import { readAdminConfig } from "../../shared/hospitalConfig";
import { Button, Icon } from "./ui";
import s from "../App.module.css";

// Hospital desks patients can reach, as set in the admin console
// (App configuration → Contacts). The callback row appears when the
// hospital lets patients request a call back.
const DESKS = [
  ["bookingPhone", "Appointments & front desk", "call", "Call"],
  ["whatsappPhone", "WhatsApp", "whatsapp", "Chat"],
  ["billingPhone", "Billing & insurance", "receipt-2", "Call"],
  ["supportPhone", "Patient support", "message-question", "Call"],
  ["ambulancePhone", "Ambulance desk", "emergency", "Call"],
];

export default function HospitalContacts({
  showEmpty = false,
  desks = ["bookingPhone", "whatsappPhone", "billingPhone"],
  title,
}) {
  const { brand, state, activeMember, dispatch, notify } = useApp();
  const numbers = { ...brand, supportPhone: readAdminConfig().support?.phone };
  const rows = DESKS.filter(
    ([key]) =>
      desks.includes(key) && (showEmpty || hospitalCallHref(numbers[key])),
  );
  const pending = (state.callbackRequests || []).some(
    (r) => r.memberId === activeMember.id && r.status === "Requested",
  );
  if (!rows.length && !brand.callbackEnabled) return null;
  return (
    <>
      {title && <h3 className={s.contactsTitle}>{title}</h3>}
      <div className={s.rowCard}>
        {rows.map(([key, label, icon, verb]) => {
          const href =
            key === "whatsappPhone"
              ? whatsappHref(numbers[key])
              : hospitalCallHref(numbers[key]);
          return (
            <div className={s.row} key={key}>
              <span className={s.rowIcon}>
                <Icon name={icon} />
              </span>
              <div className={s.grow}>
                <strong>{label}</strong>
                <small>{href ? numbers[key] : "Number not configured"}</small>
              </div>
              <Button
                variant="tonal"
                size="sm"
                href={href}
                disabled={!href}
                {...(key === "whatsappPhone" && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
                aria-label={`${verb} ${label.toLowerCase()}`}
              >
                {verb}
              </Button>
            </div>
          );
        })}
        {brand.callbackEnabled && (
          <div className={s.row}>
            <span className={s.rowIcon}>
              <Icon name="call-incoming" />
            </span>
            <div className={s.grow}>
              <strong>Request a callback</strong>
              <small>
                {pending
                  ? "Requested. We'll call you back shortly."
                  : "The front desk calls you back"}
              </small>
            </div>
            <Button
              variant="tonal"
              size="sm"
              disabled={pending}
              onClick={() => {
                try {
                  dispatch({
                    type: "CALLBACK_REQUEST",
                    request: { memberId: activeMember.id },
                  });
                  notify("We'll call you back shortly.");
                } catch (error) {
                  notify(error.message, true);
                }
              }}
            >
              {pending ? "Requested" : "Request"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
