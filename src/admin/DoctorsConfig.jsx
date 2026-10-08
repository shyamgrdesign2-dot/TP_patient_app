import { useRef, useState } from "react";
import { Toggle } from "@dhspl-tatvacare/tesseract-ui";
import { shiftRows } from "../shared/brand";
import { allDoctors, money } from "../shared/data";
import { Icon, Badge } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { Drawer, Field, InfoNote, PageTitle, allClinics, readFileAsDataUrl } from "./AdminParts";
import s from "./Admin.module.css";

const MAX_PHOTOS = 6;
const NOTE_MAX = 200;
const initials = (name) =>
  name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("");

// Clinics and the doctors patients can book at each. Clinics, doctors, their
// clinic links and availability come from Tatva Practice; here the hospital
// sets consultation fees (TP has none), shows or hides a doctor in the app,
// and adds clinic photos and a short note for patients.
export default function DoctorsConfig({ config, setConfig, flash }) {
  const clinics = allClinics(config);
  const [clinicId, setClinicId] = useState(clinics[0]?.id);
  const [editingFees, setEditingFees] = useState(null);
  const [editingExtras, setEditingExtras] = useState(false);
  const clinic = clinics.find((c) => c.id === clinicId) || clinics[0];
  const atClinic = allDoctors.filter((d) => d.locations.includes(clinic.id));
  const settings = (id) => config.doctors?.[id] || {};
  const saveDoctor = (id, patch) =>
    setConfig({ ...config, doctors: { ...config.doctors, [id]: { ...settings(id), ...patch } } });
  return (
    <>
      <PageTitle
        title="Doctors & clinics"
        sub="Clinics patients can visit and the doctors they can book at each."
      />
      <div className={s.clinicGrid} role="tablist" aria-label="Clinics">
        {clinics.map((c) => {
          const count = allDoctors.filter((d) => d.locations.includes(c.id)).length;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === clinic.id}
              className={s.clinicCard}
              onClick={() => setClinicId(c.id)}
            >
              <span className={s.clinicIcon}>
                <Icon name="hospital" family="building" size={22} bulk />
              </span>
              <span className={s.clinicText}>
                <strong>{c.name}</strong>
                <small>{c.address}</small>
                <span className={s.clinicCount}>
                  <Icon name="profile-2user" size={14} />
                  {count} {count === 1 ? "doctor" : "doctors"}
                </span>
              </span>
              {c.id === clinic.id && (
                <span className={s.clinicTick} aria-hidden="true">
                  <Icon name="tick-circle" size={20} bulk />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ClinicDetails clinic={clinic} onEdit={() => setEditingExtras(true)} />

      <section className={s.panel} data-flush>
        <div className={s.panelHead}>
          <div>
            <h2>Doctors at {clinic.name}</h2>
            <InfoNote>
              Doctors linked to this clinic in Tatva Practice appear here
              automatically. Add or remove doctors in Tatva Practice.
            </InfoNote>
          </div>
        </div>
        {atClinic.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Fees</th>
                <th>In the app</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {atClinic.map((d) => {
                const { fee, videoFee, active = true } = settings(d.id);
                const hasFee = Number.isFinite(fee);
                return (
                  <tr key={d.id}>
                    <td>
                      <span className={s.docCell}>
                        {d.image ? <img src={d.image} alt="" /> : <span className={s.initials}>{initials(d.name)}</span>}
                        <span>
                          <strong>{d.name}</strong>
                          <small>{d.qualification.split(" · ")[0]} · {d.experience} y exp</small>
                        </span>
                      </span>
                    </td>
                    <td>{d.specialty}</td>
                    <td>
                      {hasFee ? (
                        <span className={s.feeCell}>
                          <span>
                            <strong>{money(fee)}</strong> in clinic
                          </span>
                          <small>{money(Number.isFinite(videoFee) ? videoFee : fee)} video</small>
                        </span>
                      ) : (
                        <span className={s.notSet}>Not set</span>
                      )}
                    </td>
                    <td>
                      <Toggle
                        ariaLabel={`Show ${d.name} in the app`}
                        checked={active}
                        onCheckedChange={(on) => {
                          saveDoctor(d.id, { active: on });
                          flash(`${d.name} ${on ? "shown in" : "hidden from"} the app`);
                        }}
                      />
                    </td>
                    <td className={s.rowActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${hasFee ? "Edit" : "Add"} fees for ${d.name}`}
                        onClick={() => setEditingFees(d)}
                      >
                        <Icon name={hasFee ? "edit" : "add"} size={16} />
                        {hasFee ? "Edit fees" : "Add fees"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={s.empty}>
            <Icon name="profile-2user" size={32} bulk />
            <strong>No doctors at this clinic yet</strong>
            <small>Doctors linked to this clinic in Tatva Practice appear here automatically.</small>
          </div>
        )}
      </section>

      {editingFees && (
        <FeeEditor
          doctor={editingFees}
          initial={settings(editingFees.id)}
          onClose={() => setEditingFees(null)}
          onSave={(fees) => {
            saveDoctor(editingFees.id, fees);
            setEditingFees(null);
            flash(`${editingFees.name} fees saved`);
          }}
        />
      )}
      {editingExtras && (
        <ClinicExtrasEditor
          clinic={clinic}
          onClose={() => setEditingExtras(false)}
          onSave={(extras) => {
            setConfig({ ...config, clinicExtras: { ...config.clinicExtras, [clinic.id]: extras } });
            setEditingExtras(false);
            flash(`${clinic.name} app details saved`);
          }}
        />
      )}
    </>
  );
}

// What Tatva Practice holds for the clinic (read-only here), next to the
// app-facing extras the console adds.
function ClinicDetails({ clinic, onEdit }) {
  const shifts = shiftRows(clinic.shifts);
  return (
    <section className={s.panel} aria-label={`${clinic.name} clinic details`}>
      <div className={s.clinicDetails}>
        <div className={s.clinicSynced}>
          <div className={s.rowBetween}>
            <h2>{clinic.name} clinic</h2>
            <Badge color="neutral" size="sm">
              Synced from Tatva Practice
            </Badge>
          </div>
          <dl className={s.factGrid}>
            <div data-wide>
              <dt>Address</dt>
              <dd>{clinic.address}</dd>
            </div>
            <div>
              <dt>Pincode</dt>
              <dd>{clinic.pincode || "—"}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{[clinic.city, clinic.state].filter(Boolean).join(", ")}</dd>
            </div>
            <div>
              <dt>Contact number</dt>
              <dd>{clinic.phone || "—"}</dd>
            </div>
            <div>
              <dt>GSTIN</dt>
              <dd className={s.mono}>{clinic.gstin || "—"}</dd>
            </div>
            <div>
              <dt>Google Maps</dt>
              <dd>
                {clinic.mapsUrl ? (
                  <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer" className={s.inlineLink}>
                    Open in Maps <Icon name="export" size={14} />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div data-full>
              <dt>OPD timings</dt>
              <dd>
                {shifts.length
                  ? shifts.map(([days, times]) => (
                      <span key={days} className={s.shift}>
                        <b>{days}</b> {times}
                      </span>
                    ))
                  : clinic.hours}
              </dd>
            </div>
          </dl>
        </div>
        <div className={s.clinicExtras}>
          <div className={s.rowBetween}>
            <h3>In the patient app</h3>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Icon name="edit" size={16} /> Edit
            </Button>
          </div>
          {clinic.photos?.length ? (
            <div className={s.photoStrip}>
              {clinic.photos.slice(0, 4).map((src, i) => (
                <img key={i} src={src} alt={`${clinic.name} photo ${i + 1}`} />
              ))}
              {clinic.photos.length > 4 && <span>+{clinic.photos.length - 4}</span>}
            </div>
          ) : (
            <small className={s.hint}>No clinic photos yet.</small>
          )}
          <p className={s.patientNote}>
            {clinic.note || <span className={s.hint}>No note for patients yet, e.g. parking or entry.</span>}
          </p>
        </div>
      </div>
    </section>
  );
}

// Downscale a picked photo so it fits in local storage.
async function photoDataUrl(file) {
  const src = await readFileAsDataUrl(file, 8);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("That image could not be read."));
    i.src = src;
  });
  const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function ClinicExtrasEditor({ clinic, onClose, onSave }) {
  const [photos, setPhotos] = useState(clinic.photos || []);
  const [note, setNote] = useState(clinic.note || "");
  const [error, setError] = useState("");
  const file = useRef(null);
  return (
    <Drawer
      title={`${clinic.name} in the patient app`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ photos, note: note.trim() })}>Save</Button>
        </>
      }
    >
      <InfoNote>
        Name, address, contact, timings and GSTIN come from Tatva Practice.
        Photos and the note below are shown only in the patient app.
      </InfoNote>
      <Field label="Clinic photos" hint={`Up to ${MAX_PHOTOS} photos of the entrance, reception or waiting area.`}>
        <div className={s.photoGrid}>
          {photos.map((src, i) => (
            <span key={i} className={s.photoThumb}>
              <img src={src} alt={`Clinic photo ${i + 1}`} />
              <button
                type="button"
                className={s.photoRemove}
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              >
                <Icon name="close-plain" size={14} />
              </button>
            </span>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className={s.photoAdd} onClick={() => file.current?.click()}>
              <Icon name="gallery-add" size={22} />
              Add photos
            </button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={async (e) => {
            const picked = [...(e.target.files || [])].slice(0, MAX_PHOTOS - photos.length);
            e.target.value = "";
            try {
              setError("");
              const added = await Promise.all(picked.map(photoDataUrl));
              setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
            } catch (err) {
              setError(err.message);
            }
          }}
        />
        {error && <small className={s.hint} data-error>{error}</small>}
      </Field>
      <Field label="Note for patients" hint={`${note.length}/${NOTE_MAX} · e.g. parking, entry gate or the floor for OPD`}>
        <textarea
          className={s.input}
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Free parking in the basement. Use Gate 2 for the OPD."
        />
      </Field>
    </Drawer>
  );
}

function FeeEditor({ doctor, initial, onClose, onSave }) {
  const [fee, setFee] = useState(initial.fee ?? "");
  const [videoFee, setVideoFee] = useState(initial.videoFee ?? "");
  const valid = (v) => v !== "" && Number(v) >= 0 && Number.isFinite(Number(v));
  const ok = valid(fee) && (videoFee === "" || valid(videoFee));
  return (
    <Drawer
      title={`Fees for ${doctor.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!ok}
            onClick={() =>
              onSave({ fee: Number(fee), videoFee: videoFee === "" ? null : Number(videoFee) })
            }
          >
            Save fees
          </Button>
        </>
      }
    >
      <InfoNote>
        Tatva Practice has no fee setting, so patients see the fees set here
        when they book. They pay at the clinic. Without a fee, patients can
        still book and see “Fee payable at the clinic”.
      </InfoNote>
      <div className={s.grid2}>
        <Field label="In-clinic fee (₹)">
          <input className={s.input} type="number" min="0" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
        <Field label="Video consultation fee (₹)" hint="Leave blank to use the in-clinic fee">
          <input className={s.input} type="number" min="0" inputMode="numeric" value={videoFee} onChange={(e) => setVideoFee(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}
