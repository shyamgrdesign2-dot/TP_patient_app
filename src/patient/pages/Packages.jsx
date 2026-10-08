import { useMemo, useRef, useState } from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { SegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import { dateKey, formatDate, money } from "../../shared/data";
import { listedCatalog, packagesEnabled } from "../../shared/catalog";
import { readAdminConfig } from "../../shared/hospitalConfig";
import { locations } from "../../shared/brand";
import DatePicker from "../components/DatePicker";
import {
  Button,
  Icon,
  PageHeader,
  MemberContext,
  Sheet,
  Field,
  Notice,
  Empty,
  ErrorText,
  Status,
  Tag,
  SectionTitle,
  useAction,
} from "../components/ui";
import shared from "../App.module.css";
import own from "./Packages.module.css";
const s = { ...shared, ...own };

const TABS = [
  ["packages", "Packages", "health"],
  ["vaccines", "Vaccines", "shield-tick"],
  ["bookings", "Bookings", "calendar-tick"],
];
const PAY_NOTE = "Pay at the hospital. Online payment coming soon.";

// Clinics synced from Tatva Practice plus any the hospital added in admin.
export const clinicList = () => [
  ...locations,
  ...(readAdminConfig().clinics || []),
];
const testCount = (p) =>
  `${p.includes?.length || 0} ${p.includes?.length === 1 ? "test" : "tests"}`;
// "3 doses at 0, 1 and 6 months" -> "3 doses"; free-text schedules fall back.
const doseCount = (v) => {
  const n = /(\d+)\s+doses?/i.exec(v.schedule || "")?.[1];
  return n ? `${n} ${n === "1" ? "dose" : "doses"}` : "As your doctor advises";
};
const kindOf = (item) => (item.protects !== undefined ? "vaccine" : "package");
const discount = (item) =>
  Number(item.mrp) > Number(item.price)
    ? Math.round((1 - Number(item.price) / Number(item.mrp)) * 100)
    : 0;
// Default covers: a brand-tinted gradient per category, vaccines in green.
const TONES = {
  "Lab & pathology": "slate",
  Radiology: "slate",
};
const toneOf = (item, kind) =>
  kind === "vaccine" ? "success" : TONES[item.category] || "brand";
const iconOf = (item, kind) =>
  kind === "vaccine" ? "shield-tick" : item.icon || "health";

// Find any listed package or vaccine by its ID.
export function findItem(id) {
  const { packages, vaccines } = listedCatalog();
  const pkg = packages.find((p) => p.id === id);
  if (pkg) return { kind: "package", item: pkg };
  const vac = vaccines.find((v) => v.id === id);
  return vac ? { kind: "vaccine", item: vac } : null;
}

// The hospital's uploaded cover, or a generated one (no external images).
export function ItemCover({ item, kind = kindOf(item), image, children }) {
  const src = image === undefined ? item.images?.[0] : image;
  return (
    <span
      className={s.cover}
      data-tone={toneOf(item, kind)}
      data-image={src ? "true" : undefined}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span className={s.coverArt} aria-hidden="true">
          <Icon name={iconOf(item, kind)} size={96} bulk />
        </span>
      )}
      {children}
    </span>
  );
}

export function PackageCard({
  item,
  kind = kindOf(item),
  onOpen,
  className = "",
}) {
  const off = discount(item);
  const vaccine = kind === "vaccine";
  return (
    <button
      type="button"
      className={`${s.itemCard} ${className}`}
      onClick={onOpen}
      aria-label={`${item.name}, ${money(item.price)}${vaccine ? " per dose" : ""}`}
    >
      <ItemCover item={item} kind={kind}>
        <span className={s.coverChip}>
          {vaccine ? "Vaccine" : item.category || "Health package"}
        </span>
        {off > 0 && <span className={s.coverDeal}>{off}% off</span>}
      </ItemCover>
      <span className={s.itemBody}>
        <span className={s.itemTitle}>
          <strong>{item.name}</strong>
          <small>
            {vaccine ? item.eligibility : item.audience || item.description}
          </small>
        </span>
        <span className={s.itemFoot}>
          <span className={s.itemMeta}>
            <Icon
              name={vaccine ? "calendar-tick" : "clipboard-tick"}
              size={14}
            />
            {vaccine ? doseCount(item) : testCount(item)}
          </span>
          <span className={s.itemPrice}>
            {off > 0 && (
              <s aria-label={`MRP ${money(item.mrp)}`}>{money(item.mrp)}</s>
            )}
            <strong>{money(item.price)}</strong>
            {vaccine && <small>/dose</small>}
          </span>
        </span>
      </span>
    </button>
  );
}

function Unavailable() {
  return (
    <div className={s.page}>
      <PageHeader title="Health packages & vaccines" />
      <Empty
        icon="health"
        title="Not available yet"
        description="Your hospital hasn’t opened health packages and vaccines in the app."
      />
    </div>
  );
}

export default function Packages() {
  const { state, activeMember } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([v]) => v === params.get("tab"))
    ? params.get("tab")
    : "packages";
  const setTab = (v) => setParams({ tab: v }, { replace: true });
  const { packages, vaccines } = useMemo(() => listedCatalog(), []);
  const pending = (state.packageRequests || []).filter(
    (r) => r.memberId === activeMember.id && r.status === "Requested",
  ).length;
  // Older links: ?item= opened a package, ?tab=requests the request list.
  if (params.get("item"))
    return <Navigate to={`/packages/${params.get("item")}`} replace />;
  if (params.get("tab") === "requests")
    return <Navigate to="/packages?tab=bookings" replace />;
  if (!packagesEnabled()) return <Unavailable />;
  const items = tab === "vaccines" ? vaccines : packages;
  return (
    <div className={s.page}>
      <PageHeader title="Health packages & vaccines" />
      {/* Patient and section stay pinned; only the list below scrolls. */}
      <div className={`${s.recordsTop} ${s.packagesTop}`}>
        <MemberContext />
        <SegmentedControl
          aria-label="Packages, vaccines and bookings"
          className={s.packageSegment}
          variant="block"
          radius={10}
          fullWidth
          value={tab}
          onValueChange={setTab}
          options={TABS.map(([value, label, icon]) => ({
            value,
            icon: <Icon name={icon} size={16} bulk={tab === value} />,
            label:
              value === "bookings" && pending > 0 ? (
                <span className={s.segmentLabel}>
                  {label}
                  <span
                    className={s.countDot}
                    aria-label={`${pending} awaiting confirmation`}
                  >
                    {pending}
                  </span>
                </span>
              ) : (
                label
              ),
          }))}
        />
      </div>
      {tab === "bookings" ? (
        <BookingsList />
      ) : (
        <>
          <div className={s.itemGrid}>
            {items.map((item) => (
              <PackageCard
                key={item.id}
                item={item}
                kind={tab === "vaccines" ? "vaccine" : "package"}
                onOpen={() => navigate(`/packages/${item.id}`)}
              />
            ))}
          </div>
          {!items.length && (
            <Empty
              icon={tab === "vaccines" ? "shield-tick" : "health"}
              title={
                tab === "vaccines"
                  ? "No vaccines listed yet"
                  : "No health packages listed yet"
              }
              description="Your hospital adds these. Check back soon."
            />
          )}
          <p className={s.payNote}>
            <Icon name="info-circle" size={14} /> {PAY_NOTE}
          </p>
        </>
      )}
    </div>
  );
}

// Swipeable photos the hospital uploaded; the generated cover when none.
function Gallery({ item, kind }) {
  const images = item.images?.length ? item.images : [null];
  const [index, setIndex] = useState(0);
  const track = useRef(null);
  const off = discount(item);
  return (
    <div className={s.gallery}>
      <div
        className={s.galleryTrack}
        ref={track}
        aria-label={`${item.name} photos`}
        onScroll={(e) =>
          setIndex(
            Math.round(
              e.currentTarget.scrollLeft / e.currentTarget.clientWidth,
            ),
          )
        }
      >
        {images.map((src, i) => (
          <div className={s.gallerySlide} key={src || i}>
            <ItemCover item={item} kind={kind} image={src}>
              {i === 0 && off > 0 && (
                <span className={s.coverDeal}>{off}% off</span>
              )}
            </ItemCover>
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className={s.galleryDots}>
          {images.map((src, i) => (
            <button
              key={src || i}
              type="button"
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-pressed={i === index}
              onClick={() =>
                track.current.scrollTo({
                  left: i * track.current.clientWidth,
                  behavior: "smooth",
                })
              }
            >
              <span />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PackageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const found = useMemo(() => findItem(id), [id]);
  const [booking, setBooking] = useState(0);
  if (!packagesEnabled()) return <Unavailable />;
  if (!found)
    return (
      <div className={s.page}>
        <PageHeader title="Package details" />
        <Empty
          icon="health"
          title="This package isn’t available"
          description="The hospital may have removed it. Browse what’s listed now."
          action="Browse packages"
          onAction={() => navigate("/packages")}
        />
      </div>
    );
  const { item, kind } = found;
  const vaccine = kind === "vaccine";
  const clinics = clinicList().filter(
    (c) => !item.clinics?.length || item.clinics.includes(c.id),
  );
  return (
    <div className={`${s.page} ${s.detailPage}`}>
      <PageHeader title={vaccine ? "Vaccine details" : "Package details"} />
      <Gallery item={item} kind={kind} />
      <section className={s.detailIntro}>
        <Tag color={vaccine ? "success" : "primary"}>
          {vaccine ? "Vaccine" : item.category || "Health package"}
        </Tag>
        <h2>{item.name}</h2>
        {(vaccine ? item.protects : item.description) && (
          <p className={s.bodyText}>
            {vaccine ? `Protects against ${item.protects}.` : item.description}
          </p>
        )}
        <div className={s.priceBlock}>
          <strong>{money(item.price)}</strong>
          {vaccine ? (
            <small>per dose</small>
          ) : (
            discount(item) > 0 && (
              <>
                <s>{money(item.mrp)}</s>
                <span className={s.saveTag}>
                  Save {money(Number(item.mrp) - Number(item.price))}
                </span>
              </>
            )
          )}
        </div>
        <div className={s.detailMeta}>
          <span>
            <Icon
              name={vaccine ? "calendar-tick" : "clipboard-tick"}
              size={16}
            />
            {vaccine ? doseCount(item) : testCount(item)}
          </span>
          {!vaccine && item.homeCollection && (
            <span>
              <Icon name="tick-circle" size={16} /> Home collection
            </span>
          )}
          <span>
            <Icon name="hospital" family="building" size={16} />
            {clinics.length} {clinics.length === 1 ? "clinic" : "clinics"}
          </span>
        </div>
      </section>
      {!vaccine && (
        <section className={s.detailSection}>
          <SectionTitle>What’s included · {testCount(item)}</SectionTitle>
          <ul className={s.checkList}>
            {(item.includes || []).map((t) => (
              <li key={t}>
                <Icon name="tick-circle" size={18} bulk /> {t}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={s.detailSection}>
        <SectionTitle>Good to know</SectionTitle>
        {vaccine ? (
          <dl className={s.factList}>
            <Fact label="Who can take it" value={item.eligibility} />
            <Fact label="Doses" value={item.schedule} />
            <Fact label="Brands" value={item.brands} />
            <Fact label="Before you come" value={item.notes} />
          </dl>
        ) : (
          <dl className={s.factList}>
            <Fact label="Who it’s for" value={item.audience} />
            <Fact label="Preparation" value={item.preparation} />
            <Fact label="Reports" value={item.turnaround} />
            <Fact
              label="Sample collection"
              value={
                item.homeCollection
                  ? "At the clinic or from home"
                  : "At the clinic"
              }
            />
          </dl>
        )}
      </section>
      <section className={s.detailSection}>
        <SectionTitle>Available at</SectionTitle>
        <div className={s.clinicTags}>
          {clinics.map((c) => (
            <span key={c.id}>
              <Icon name="hospital" family="building" size={14} /> {c.name}
            </span>
          ))}
        </div>
        <p className={s.payNote}>
          <Icon name="info-circle" size={14} /> {PAY_NOTE}
        </p>
      </section>
      <div className={s.detailCta}>
        <span className={s.ctaPrice}>
          <strong>{money(item.price)}</strong>
          <small>{vaccine ? "Per dose · " : ""}Pay at the hospital</small>
        </span>
        <Button onClick={() => setBooking(Date.now())}>Book now</Button>
      </div>
      <BookingSheet
        key={booking || "closed"}
        open={!!booking}
        item={item}
        kind={kind}
        clinics={clinics}
        onClose={() => setBooking(0)}
        onViewBookings={() => navigate("/packages?tab=bookings")}
      />
    </div>
  );
}

function BookingSheet({ open, item, kind, clinics, onClose, onViewBookings }) {
  const { activeMember, dispatch, notify } = useApp();
  const [sent, setSent] = useState(false);
  const [clinic, setClinic] = useState(clinics[0]?.id || "");
  const [date, setDate] = useState(dateKey(1));
  const [note, setNote] = useState("");
  const { error, run } = useAction();
  const clinicName = clinics.find((c) => c.id === clinic)?.name;
  function submit() {
    run(() => {
      dispatch({
        type: "PACKAGE_REQUEST",
        request: {
          memberId: activeMember.id,
          kind,
          itemId: item.id,
          itemName: item.name,
          price: Number(item.price) || 0,
          clinic,
          clinicName,
          date,
          note,
        },
      });
      notify("Booking request sent. The hospital will call to confirm.");
      setSent(true);
    });
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={sent ? "Booking request sent" : "Book now"}
      description={sent ? undefined : item.name}
      headerIcon={kind === "vaccine" ? "shield-tick" : item.icon || "health"}
      footer={
        sent ? (
          <Button fullWidth onClick={onViewBookings}>
            View my bookings
          </Button>
        ) : (
          <Button fullWidth disabled={!clinic} onClick={submit}>
            Send booking request
          </Button>
        )
      }
    >
      {!sent ? (
        <>
          <div className={s.fieldGroup}>
            <span className={s.fieldLabel}>For</span>
            <MemberContext />
          </div>
          <div
            className={s.patientPicker}
            role="radiogroup"
            aria-label="Clinic"
          >
            <h2 className={s.fieldLabel}>Clinic</h2>
            {clinics.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={clinic === c.id}
                className={s.patientOption}
                onClick={() => setClinic(c.id)}
              >
                <Icon name="hospital" family="building" size={20} />
                <span className={s.grow}>
                  <strong>{c.name}</strong>
                  {c.address && <small>{c.address}</small>}
                </span>
                <span className={s.radioMark} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className={s.fieldGroup}>
            <span className={s.fieldLabel}>Preferred date</span>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <Field
            label="Note for the hospital (optional)"
            placeholder="e.g. Morning slot preferred"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <ErrorText>{error}</ErrorText>
          <Notice icon="call">
            The hospital will call {activeMember.name.split(" ")[0]} to confirm
            the time. {PAY_NOTE}
          </Notice>
        </>
      ) : (
        <div className={s.sentState}>
          <span className={s.sentIcon} aria-hidden="true">
            <Icon name="tick-circle" size={32} bulk />
          </span>
          <h3 className={s.cardTitle}>We’ve sent your booking request</h3>
          <p className={s.bodyText}>
            {item.name} for {activeMember.name} at {clinicName},{" "}
            {formatDate(date, { weekday: "short" })}. The hospital will call to
            confirm your slot.
          </p>
          <p className={s.payNote}>
            <Icon name="info-circle" size={14} /> {PAY_NOTE}
          </p>
        </div>
      )}
    </Sheet>
  );
}

const BOOKING_HINT = {
  Requested: "The hospital will call to confirm your slot.",
  Confirmed: "Confirmed. Pay at the hospital counter on the day.",
  Completed: "Completed. Your reports and bill appear in the app.",
  Cancelled: "This booking was cancelled.",
};

// Old route: My bookings now lives in the Packages segmented control.
export function PackageBookings() {
  return <Navigate to="/packages?tab=bookings" replace />;
}

// The member's package and vaccine bookings, newest first.
function BookingsList() {
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const bookings = (state.packageRequests || []).filter(
    (r) => r.memberId === activeMember.id,
  );
  return (
    <>
      {!bookings.length ? (
        <Empty
          icon="clipboard-tick"
          title="No bookings yet"
          description="Book a health package or vaccine and the hospital will call to confirm."
          action="Browse packages"
          onAction={() => navigate("/packages")}
        />
      ) : (
        <div className={s.stack}>
          {bookings.map((r) => {
            const item = findItem(r.itemId)?.item;
            return (
              <article className={s.requestCard} key={r.id}>
                <div className={s.requestHead}>
                  <span className={s.requestThumb}>
                    <ItemCover
                      item={item || { name: r.itemName }}
                      kind={r.kind}
                    />
                  </span>
                  <span className={s.grow}>
                    <span className={s.requestKind}>
                      {r.kind === "vaccine" ? "Vaccine" : "Health package"}
                    </span>
                    <h3 className={s.cardTitle}>{r.itemName}</h3>
                  </span>
                  <Status status={r.status} />
                </div>
                <dl className={s.requestFacts}>
                  <div>
                    <dt>Clinic</dt>
                    <dd>{r.clinicName || r.clinic}</dd>
                  </div>
                  <div>
                    <dt>Preferred date</dt>
                    <dd>{formatDate(r.date, { weekday: "short" })}</dd>
                  </div>
                  {r.price ? (
                    <div>
                      <dt>Price</dt>
                      <dd>{money(r.price)}</dd>
                    </div>
                  ) : null}
                </dl>
                {r.note && <p className={s.bodyText}>“{r.note}”</p>}
                <div className={s.requestFoot}>
                  <span className={s.requestHint}>
                    {BOOKING_HINT[r.status]}
                  </span>
                  {r.status === "Requested" && (
                    <Button
                      variant="outline"
                      theme="error"
                      size="sm"
                      onClick={() => {
                        dispatch({ type: "PACKAGE_REQUEST_CANCEL", id: r.id });
                        notify("Booking cancelled.");
                      }}
                    >
                      Cancel booking
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className={s.payNote}>
        <Icon name="info-circle" size={14} /> {PAY_NOTE}
      </p>
    </>
  );
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
