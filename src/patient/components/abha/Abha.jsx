import { useEffect, useRef, useState } from "react";
import { Toggle } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../../state/AppContext";
import { formatDate } from "../../../shared/data";
import {
  abhaAddress,
  maskAbha,
  ABHA_FACILITIES,
  ABHA_RECORD_TYPES,
  abhaRecords,
} from "../../services/abha";
import { Avatar, Button, Icon, Sheet, AbhaLogo, Notice } from "../ui";
import s from "./Abha.module.css";

const lastSync = (link) =>
  link?.lastSyncAt
    ? `Last synced ${formatDate(link.lastSyncAt.slice(0, 10))}, ${new Date(
        link.lastSyncAt,
      )
        .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
        .toUpperCase()}`
    : "Not synced yet";

// The patient's ABHA card: photo, name, ABHA number and ABHA address.
export function AbhaCard({ member, link, full = false, onOpen }) {
  const Tag = onOpen ? "button" : "div";
  const year = member.dob?.slice(0, 4);
  return (
    <Tag
      className={s.card}
      data-full={full || undefined}
      onClick={onOpen}
      aria-label={onOpen ? `ABHA card for ${member.name}` : undefined}
    >
      <div className={s.cardTop}>
        <span className={s.cardBrand}>
          <AbhaLogo linked />
          Ayushman Bharat Health Account
        </span>
        {onOpen && <Icon name="chevron-right" size={16} />}
      </div>
      <div className={s.cardBody}>
        <Avatar
          name={member.name}
          src={member.photo}
          size={full ? 64 : 48}
          shape="rounded"
          radius={12}
          color="primary"
        />
        <div className={s.grow}>
          <strong>{member.name}</strong>
          <span className={s.number}>
            {full ? link.identifier : maskAbha(link.identifier)}
          </span>
          <span className={s.address}>
            {link.address || abhaAddress(member)}
          </span>
        </div>
      </div>
      {full && (
        <dl className={s.facts}>
          <div>
            <dt>Gender</dt>
            <dd>{member.gender || "Not shared"}</dd>
          </div>
          <div>
            <dt>Year of birth</dt>
            <dd>{year || "Not shared"}</dd>
          </div>
          <div>
            <dt>Mobile</dt>
            <dd>{member.phone ? `XXXXXX${member.phone.slice(-4)}` : "—"}</dd>
          </div>
        </dl>
      )}
    </Tag>
  );
}

// Card details with the actions a linked ABHA offers.
export function AbhaCardSheet({ open, onClose, member, link, onSync, onView }) {
  const { dispatch, notify } = useApp();
  return (
    <Sheet open={open} onClose={onClose} title="Your ABHA card">
      {link && (
        <>
          <AbhaCard member={member} link={link} full />
          <div className={s.syncRow}>
            <div className={s.grow}>
              <strong>Auto-sync records</strong>
              <small>
                New records from linked facilities are added automatically.
              </small>
            </div>
            <Toggle
              ariaLabel="Auto-sync records from ABHA"
              checked={!!link.autoSync}
              onCheckedChange={(on) => {
                dispatch({
                  type: "ABHA_AUTOSYNC",
                  memberId: member.id,
                  on,
                });
                notify(on ? "Auto-sync turned on." : "Auto-sync turned off.");
              }}
            />
          </div>
          <Button fullWidth onClick={onSync}>
            <Icon name="rotate-right" family="arrow" size={18} />
            Sync records from ABHA
          </Button>
          <div className={s.actionRow}>
            <Button variant="outline" onClick={onView}>
              View ABHA records
            </Button>
            <Button
              variant="outline"
              onClick={() => notify("ABHA card downloaded.")}
            >
              <Icon name="document-download" size={18} />
              Download card
            </Button>
          </div>
          <p className={s.footnote}>{lastSync(link)}</p>
        </>
      )}
    </Sheet>
  );
}

// Consent, then fetch from each facility, then the result.
export function AbhaSyncSheet({ open, onClose, member, onDone }) {
  const { dispatch } = useApp();
  const [step, setStep] = useState("consent");
  const [types, setTypes] = useState(ABHA_RECORD_TYPES);
  const [range, setRange] = useState("1 year");
  const [facilities, setFacilities] = useState(
    ABHA_FACILITIES.map((f) => f.id),
  );
  const [progress, setProgress] = useState(0);
  const [added, setAdded] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (open) {
      setStep("consent");
      setProgress(0);
    }
  }, [open]);
  const toggle = (list, set, value) =>
    set(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );

  async function start() {
    setStep("fetching");
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    for (let i = 0; i < facilities.length; i++) {
      await new Promise((r) => setTimeout(r, reduced ? 0 : 700));
      if (!alive.current) return;
      setProgress(i + 1);
    }
    const records = abhaRecords(member.id, { types, facilities });
    const before = records.length;
    dispatch({ type: "ABHA_SYNC", memberId: member.id, records });
    setAdded(before);
    setStep("done");
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        step === "consent"
          ? "Sync records from ABHA"
          : step === "fetching"
            ? "Fetching your records"
            : "Sync complete"
      }
    >
      {step === "consent" && (
        <>
          <p className={s.lead}>
            Choose what to bring in. Your hospital receives a copy only for the
            records and time range you approve.
          </p>
          <fieldset className={s.group}>
            <legend>Record types</legend>
            {ABHA_RECORD_TYPES.map((t) => (
              <label key={t} className={s.check}>
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={() => toggle(types, setTypes, t)}
                />
                {t}
              </label>
            ))}
          </fieldset>
          <fieldset className={s.group}>
            <legend>Time range</legend>
            <div className={s.rangeRow}>
              {["6 months", "1 year", "All time"].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={s.range}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={s.group}>
            <legend>Facilities found on your ABHA</legend>
            {ABHA_FACILITIES.map((f) => (
              <label key={f.id} className={s.check}>
                <input
                  type="checkbox"
                  checked={facilities.includes(f.id)}
                  onChange={() => toggle(facilities, setFacilities, f.id)}
                />
                <span>
                  {f.name}
                  <small>{f.kind}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <Notice icon="shield-tick">
            You can revoke this consent anytime from your ABHA app.
          </Notice>
          <Button
            fullWidth
            disabled={!types.length || !facilities.length}
            onClick={start}
          >
            Approve and sync
          </Button>
        </>
      )}
      {step === "fetching" && (
        <div className={s.fetching} role="status">
          <span className={s.ring} aria-hidden="true" />
          <ul className={s.facilityList}>
            {ABHA_FACILITIES.filter((f) => facilities.includes(f.id)).map(
              (f, i) => (
                <li
                  key={f.id}
                  data-state={
                    i < progress
                      ? "done"
                      : i === progress
                        ? "active"
                        : "waiting"
                  }
                >
                  <Icon
                    name={i < progress ? "tick-circle" : "clock"}
                    size={18}
                    bulk={i < progress}
                  />
                  {f.name}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
      {step === "done" && (
        <div className={s.done}>
          <span className={s.doneIcon}>
            <Icon name="tick-circle" size={40} bulk />
          </span>
          <h3>
            {added
              ? `${added} ${added === 1 ? "record" : "records"} synced from ABHA`
              : "You're up to date"}
          </h3>
          <p>They're in Health records, marked "via ABHA".</p>
          <Button
            fullWidth
            onClick={() => {
              onClose();
              onDone?.();
            }}
          >
            View records
          </Button>
        </div>
      )}
    </Sheet>
  );
}
