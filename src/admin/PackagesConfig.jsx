import { useEffect, useRef, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  Toggle,
} from "@dhspl-tatvacare/tesseract-ui";
import { formatDate, money } from "../shared/data";
import { catalog } from "../shared/catalog";
import { Icon, Badge, Status } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { Drawer, Field, allClinics, readFileAsDataUrl } from "./AdminParts";
import s from "./Admin.module.css";

// Health check-up packages and vaccines. Tatva Practice has no sellable
// package or vaccine catalogue, so the hospital creates them here. Patients
// request a booking in the app; the hospital calls to confirm, and the bill
// and receipt come from Tatva Practice billing at the counter.
const PATIENT_KEY = "tatva-patient-demo-v1";
const CATEGORIES = [
  "Preventive care",
  "Lab & pathology",
  "Radiology",
  "Women's health",
  "Diabetes care",
  "Heart health",
];
const STATUS_NOTICE = {
  Confirmed: "Booking confirmed",
  Completed: "Booking completed",
  Cancelled: "Booking cancelled by the hospital",
};

function readPatientState() {
  try {
    const saved = JSON.parse(localStorage.getItem(PATIENT_KEY) || "null");
    return saved?.version === 1 ? saved : null;
  } catch {
    return null;
  }
}

const blankPackage = (clinics) => ({
  name: "",
  category: CATEGORIES[0],
  description: "",
  price: "",
  mrp: "",
  includes: [],
  audience: "",
  preparation: "",
  turnaround: "",
  homeCollection: false,
  clinics: clinics.map((c) => c.id),
  listed: true,
  icon: "health",
});
const blankVaccine = (clinics) => ({
  name: "",
  protects: "",
  brands: "",
  schedule: "",
  eligibility: "",
  price: "",
  notes: "",
  clinics: clinics.map((c) => c.id),
  listed: true,
});

export default function PackagesConfig({ config, setConfig, flash }) {
  const [tab, setTab] = useState("packages");
  const [editing, setEditing] = useState(null);
  const clinics = allClinics(config);
  const { packages, vaccines } = catalog(config);
  const kind = tab === "vaccines" ? "vaccine" : "package";
  const items = tab === "vaccines" ? vaccines : packages;
  const listKey = tab === "vaccines" ? "vaccines" : "healthPackages";
  const saveList = (list) => setConfig({ ...config, [listKey]: list });
  const clinicNames = (ids = []) =>
    ids.length === clinics.length
      ? "All clinics"
      : clinics
          .filter((c) => ids.includes(c.id))
          .map((c) => c.name)
          .join(", ") || "No clinics";
  return (
    <>
      <header className={s.pageTitle}>
        <div>
          <h1>Packages & vaccines</h1>
          <p>
            Health check-up packages and vaccines patients can request in the
            app. Patients pay at the hospital counter.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              kind,
              item:
                kind === "vaccine"
                  ? blankVaccine(clinics)
                  : blankPackage(clinics),
            })
          }
        >
          <Icon name="add" size={18} />
          {kind === "vaccine" ? "Add vaccine" : "Add package"}
        </Button>
      </header>

      <section className={s.panel} data-flush>
        <div className={s.tabBar}>
          <Tabs value={tab} onValueChange={setTab} size="sm">
            <TabsList aria-label="Catalogue">
              <TabsTrigger value="packages">
                Health check-up packages ({packages.length})
              </TabsTrigger>
              <TabsTrigger value="vaccines">
                Vaccines ({vaccines.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {items.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>{kind === "vaccine" ? "Vaccine" : "Package"}</th>
                <th>{kind === "vaccine" ? "Who can take it" : "Includes"}</th>
                <th>{kind === "vaccine" ? "Price per dose" : "Price"}</th>
                <th>Clinics</th>
                <th>In the app</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={s.pkgNameCell}>
                      <span className={s.pkgThumb} aria-hidden="true">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt="" />
                        ) : (
                          <Icon
                            name={kind === "vaccine" ? "shield-tick" : item.icon || "health"}
                            size={18}
                            bulk
                          />
                        )}
                      </span>
                      <span className={s.msgCell}>
                        <strong>{item.name}</strong>
                        <span>
                          {kind === "vaccine"
                            ? item.protects
                            : `${item.category}${item.audience ? ` · ${item.audience}` : ""}`}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {kind === "vaccine"
                      ? item.eligibility
                      : `${item.includes?.length || 0} tests${item.homeCollection ? " · Home collection" : ""}`}
                  </td>
                  <td>
                    {money(item.price)}
                    {Number(item.mrp) > Number(item.price) && (
                      <small className={s.hint}> MRP {money(item.mrp)}</small>
                    )}
                  </td>
                  <td>{clinicNames(item.clinics)}</td>
                  <td>
                    <Toggle
                      ariaLabel={`Show ${item.name} in the app`}
                      checked={item.listed !== false}
                      onCheckedChange={(listed) => {
                        saveList(
                          items.map((x) =>
                            x.id === item.id ? { ...x, listed } : x,
                          ),
                        );
                        flash(
                          `${item.name} ${listed ? "shown in" : "hidden from"} the app`,
                        );
                      }}
                    />
                  </td>
                  <td className={s.rowActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing({ kind, item })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      theme="error"
                      onClick={() => {
                        saveList(items.filter((x) => x.id !== item.id));
                        flash(`${item.name} deleted`);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={s.empty}>
            <Icon
              name={kind === "vaccine" ? "shield-tick" : "health"}
              size={32}
              bulk
            />
            <strong>
              {kind === "vaccine" ? "No vaccines yet" : "No packages yet"}
            </strong>
            <small>
              {kind === "vaccine"
                ? "Add the vaccines your clinics give so patients can request them."
                : "Add a health check-up package so patients can request it in the app."}
            </small>
          </div>
        )}
      </section>

      <BookingRequests flash={flash} />

      <section className={s.panel}>
        <h2>Payments</h2>
        <div className={s.toggleRow}>
          <div>
            <strong>
              Online payment{" "}
              <Badge size="sm" variant="soft" color="neutral">
                Coming soon
              </Badge>
            </strong>
            <small>
              Coming soon — needs a payment gateway. Today patients pay at the
              hospital counter, and Tatva Practice billing issues the bill and
              receipt.
            </small>
          </div>
          <Toggle ariaLabel="Online payment" checked={false} disabled />
        </div>
      </section>

      {editing && (
        <ItemEditor
          kind={editing.kind}
          initial={editing.item}
          clinics={clinics}
          onClose={() => setEditing(null)}
          onDelete={
            editing.item.id
              ? () => {
                  saveList(items.filter((x) => x.id !== editing.item.id));
                  setEditing(null);
                  flash(`${editing.item.name} deleted`);
                }
              : undefined
          }
          onSave={(item) => {
            const exists = items.some((x) => x.id === item.id);
            saveList(
              exists
                ? items.map((x) => (x.id === item.id ? item : x))
                : [...items, item],
            );
            setEditing(null);
            flash(`${item.name} ${exists ? "saved" : "added"}`);
          }}
        />
      )}
    </>
  );
}

const MAX_IMAGES = 5;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Downscale a photo so a few of them fit in the saved config.
function shrinkImage(dataUrl, max = 1280) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Photos patients see on the card and the detail gallery. First is the cover.
function ImagesField({ images, onChange }) {
  const input = useRef(null);
  const [error, setError] = useState("");
  async function add(files) {
    const list = [...files];
    const room = MAX_IMAGES - images.length;
    const ok = list.filter((f) => IMAGE_TYPES.includes(f.type));
    setError(
      ok.length < list.length
        ? "Use PNG, JPG or WebP images."
        : ok.length > room
          ? `Up to ${MAX_IMAGES} images. The first ${room} were added.`
          : "",
    );
    try {
      const urls = await Promise.all(
        ok.slice(0, room).map((f) => readFileAsDataUrl(f, 8).then(shrinkImage)),
      );
      onChange((current) => [...current, ...urls].slice(0, MAX_IMAGES));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className={s.field}>
      <span className={s.label}>Images</span>
      <div className={s.pkgImages}>
        {images.map((src, i) => (
          <div className={s.pkgImage} key={`${i}-${src.slice(-24)}`}>
            <img src={src} alt={`Image ${i + 1}`} />
            {i === 0 ? (
              <span className={s.pkgCoverTag}>Cover</span>
            ) : (
              <button
                type="button"
                className={s.pkgMakeCover}
                onClick={() =>
                  onChange((current) => [
                    current[i],
                    ...current.filter((_, j) => j !== i),
                  ])
                }
              >
                Make cover
              </button>
            )}
            <button
              type="button"
              className={s.pkgRemove}
              aria-label={`Remove image ${i + 1}`}
              onClick={() =>
                onChange((current) => current.filter((_, j) => j !== i))
              }
            >
              <Icon name="close-plain" size={14} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            className={s.pkgAdd}
            onClick={() => input.current?.click()}
          >
            <Icon name="gallery" size={20} />
            {images.length ? "Add more" : "Add images"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        aria-label="Upload images"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <small className={s.hint} data-error={error ? "" : undefined}>
        {error ||
          `PNG, JPG or WebP, up to ${MAX_IMAGES}. The first image is the cover; without one the app shows a default cover.`}
      </small>
    </div>
  );
}

function ItemEditor({ kind, initial, clinics, onClose, onSave, onDelete }) {
  const [item, setItem] = useState(initial);
  const [test, setTest] = useState("");
  const setImages = (update) =>
    setItem((current) => ({ ...current, images: update(current.images || []) }));
  const set = (k) => (e) => setItem({ ...item, [k]: e.target.value });
  const isPackage = kind === "package";
  const ok =
    item.name.trim() &&
    Number(item.price) > 0 &&
    item.clinics.length > 0 &&
    (!isPackage || item.includes.length > 0);
  function addTest() {
    const name = test.trim();
    if (name && !item.includes.includes(name))
      setItem({ ...item, includes: [...item.includes, name] });
    setTest("");
  }
  const toggleClinic = (id) =>
    setItem({
      ...item,
      clinics: item.clinics.includes(id)
        ? item.clinics.filter((x) => x !== id)
        : [...item.clinics, id],
    });
  const noun = isPackage ? "package" : "vaccine";
  return (
    <Drawer
      title={initial.id ? `Edit ${noun}` : `Add ${noun}`}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <Button
              variant="ghost"
              theme="error"
              className={s.grow}
              onClick={onDelete}
            >
              Delete {noun}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ok}
            onClick={() =>
              onSave({
                ...item,
                id: item.id || `${noun}-${Date.now().toString(36)}`,
                name: item.name.trim(),
                price: Number(item.price),
                ...(isPackage
                  ? { mrp: item.mrp === "" ? "" : Number(item.mrp) }
                  : {}),
              })
            }
          >
            {initial.id ? "Save changes" : `Add ${noun}`}
          </Button>
        </>
      }
    >
      <Field label={isPackage ? "Package name" : "Vaccine name"}>
        <input
          className={s.input}
          value={item.name}
          onChange={set("name")}
          placeholder={
            isPackage ? "e.g. Full body check-up" : "e.g. Influenza (quadrivalent)"
          }
        />
      </Field>
      <ImagesField images={item.images || []} onChange={setImages} />
      {isPackage ? (
        <>
          <div className={s.grid2}>
            <Field label="Category">
              <select
                className={s.input}
                value={item.category}
                onChange={set("category")}
              >
                {[...new Set([...CATEGORIES, item.category].filter(Boolean))].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Who it's for">
              <input
                className={s.input}
                value={item.audience}
                onChange={set("audience")}
                placeholder="e.g. Adults 40+"
              />
            </Field>
          </div>
          <Field label="Short description">
            <textarea
              className={s.input}
              rows={2}
              value={item.description}
              onChange={set("description")}
            />
          </Field>
          <div className={s.grid2}>
            <Field label="Price (₹)">
              <input
                className={s.input}
                type="number"
                min="0"
                value={item.price}
                onChange={set("price")}
              />
            </Field>
            <Field label="MRP (₹)" hint="Optional. Shown struck through.">
              <input
                className={s.input}
                type="number"
                min="0"
                value={item.mrp}
                onChange={set("mrp")}
              />
            </Field>
          </div>
          <Field
            label="What's included"
            hint="Add each test or consultation in the package."
          >
            <div className={s.logoRow}>
              <input
                className={s.input}
                value={test}
                onChange={(e) => setTest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTest();
                  }
                }}
                placeholder="e.g. Lipid profile"
                aria-label="Test name"
              />
              <Button
                variant="tonal"
                disabled={!test.trim()}
                onClick={addTest}
              >
                Add
              </Button>
            </div>
          </Field>
          {item.includes.length > 0 && (
            <div className={s.chips}>
              {item.includes.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() =>
                    setItem({
                      ...item,
                      includes: item.includes.filter((x) => x !== t),
                    })
                  }
                >
                  {t}
                  <Icon name="close-plain" size={14} />
                </button>
              ))}
            </div>
          )}
          <div className={s.grid2}>
            <Field label="Preparation">
              <input
                className={s.input}
                value={item.preparation}
                onChange={set("preparation")}
                placeholder="e.g. 10–12 hours fasting"
              />
            </Field>
            <Field label="Report turnaround">
              <input
                className={s.input}
                value={item.turnaround}
                onChange={set("turnaround")}
                placeholder="e.g. Reports in 24 hours"
              />
            </Field>
          </div>
          <div className={s.toggleRow}>
            <div>
              <strong>Home sample collection</strong>
              <small>Patients can ask for samples to be collected at home</small>
            </div>
            <Toggle
              ariaLabel="Home sample collection"
              checked={item.homeCollection}
              onCheckedChange={(on) => setItem({ ...item, homeCollection: on })}
            />
          </div>
        </>
      ) : (
        <>
          <Field label="Protects against">
            <input
              className={s.input}
              value={item.protects}
              onChange={set("protects")}
              placeholder="e.g. Seasonal flu"
            />
          </Field>
          <div className={s.grid2}>
            <Field label="Brands">
              <input
                className={s.input}
                value={item.brands}
                onChange={set("brands")}
                placeholder="e.g. Vaxigrip Tetra"
              />
            </Field>
            <Field label="Price per dose (₹)">
              <input
                className={s.input}
                type="number"
                min="0"
                value={item.price}
                onChange={set("price")}
              />
            </Field>
          </div>
          <Field label="Doses and schedule">
            <input
              className={s.input}
              value={item.schedule}
              onChange={set("schedule")}
              placeholder="e.g. 3 doses at 0, 1 and 6 months"
            />
          </Field>
          <Field label="Who can take it">
            <input
              className={s.input}
              value={item.eligibility}
              onChange={set("eligibility")}
              placeholder="e.g. Everyone 6 months and older"
            />
          </Field>
          <Field label="Notes and precautions">
            <textarea
              className={s.input}
              rows={2}
              value={item.notes}
              onChange={set("notes")}
            />
          </Field>
        </>
      )}
      <Field label="Available at">
        <div className={s.chips} role="group" aria-label="Clinics">
          {clinics.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={item.clinics.includes(c.id)}
              onClick={() => toggleClinic(c.id)}
            >
              <Icon name="hospital" family="building" size={14} />
              {c.name}
            </button>
          ))}
        </div>
      </Field>
      <div className={s.toggleRow}>
        <div>
          <strong>Listed in the app</strong>
          <small>Patients can see and request this {noun}</small>
        </div>
        <Toggle
          ariaLabel="Listed in the app"
          checked={item.listed !== false}
          onCheckedChange={(listed) => setItem({ ...item, listed })}
        />
      </div>
    </Drawer>
  );
}

// Booking requests patients sent from the app. In this preview they are read
// from the patient app's saved state on this browser, and status changes are
// written back so the app shows them.
function BookingRequests({ flash }) {
  const [patient, setPatient] = useState(readPatientState);
  useEffect(() => {
    const refresh = (e) => {
      if (!e || e.key === PATIENT_KEY) setPatient(readPatientState());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const requests = patient?.packageRequests || [];
  const memberName = (id) =>
    patient?.members?.find((m) => m.id === id)?.name || "Patient";
  function setStatus(request, status) {
    try {
      const saved = readPatientState();
      if (!saved?.packageRequests?.some((r) => r.id === request.id))
        throw new Error("Request not found");
      const next = {
        ...saved,
        packageRequests: saved.packageRequests.map((r) =>
          r.id === request.id ? { ...r, status } : r,
        ),
        notifications: [
          {
            id: crypto.randomUUID(),
            type: "package",
            title: STATUS_NOTICE[status],
            body: `${request.itemName}${request.clinicName ? ` at ${request.clinicName}` : ""} on ${formatDate(request.date)}.`,
            route: "/packages?tab=bookings",
            memberId: request.memberId,
            requestId: request.id,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...(saved.notifications || []),
        ],
      };
      localStorage.setItem(PATIENT_KEY, JSON.stringify(next));
      setPatient(next);
      flash(`${request.itemName} marked ${status.toLowerCase()}`);
    } catch {
      setPatient(readPatientState());
      flash("Couldn't update this request. Refresh and try again.");
    }
  }
  return (
    <section className={s.panel} data-flush>
      <div className={s.panelHead}>
        <div>
          <h2>Booking requests</h2>
          <small className={s.hint}>
            Call the patient to confirm a slot, then update the status. They
            see it in the app.
          </small>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPatient(readPatientState())}
        >
          <Icon name="rotate-right" size={16} /> Refresh
        </Button>
      </div>
      {requests.length ? (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Requested</th>
              <th>Clinic & preferred date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={s.msgCell}>
                    <strong>{memberName(r.memberId)}</strong>
                    {r.note && <span>“{r.note}”</span>}
                  </span>
                </td>
                <td>
                  <span className={s.msgCell}>
                    <strong>{r.itemName}</strong>
                    <span>
                      {r.kind === "vaccine" ? "Vaccine" : "Health package"}
                      {r.price ? ` · ${money(r.price)}` : ""}
                    </span>
                  </span>
                </td>
                <td>
                  {r.clinicName || r.clinic} · {formatDate(r.date)}
                </td>
                <td>
                  <Status status={r.status} />
                </td>
                <td className={s.rowActions}>
                  {r.status === "Requested" && (
                    <Button size="sm" variant="tonal" onClick={() => setStatus(r, "Confirmed")}>
                      Confirm
                    </Button>
                  )}
                  {r.status === "Confirmed" && (
                    <Button size="sm" variant="tonal" onClick={() => setStatus(r, "Completed")}>
                      Mark completed
                    </Button>
                  )}
                  {["Requested", "Confirmed"].includes(r.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      theme="error"
                      onClick={() => setStatus(r, "Cancelled")}
                    >
                      Cancel
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={s.empty}>
          <Icon name="clipboard-tick" size={32} bulk />
          <strong>No booking requests yet</strong>
          <small>
            When patients request a package or vaccine in the app, it appears
            here.
          </small>
        </div>
      )}
    </section>
  );
}
