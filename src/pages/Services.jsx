import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import {
  money,
  formatDate,
  dateKey,
  packages,
  doctors,
} from "../services/data";
import { locations } from "../config/brand";
import { download } from "../services/files";
import {
  Button,
  Badge,
  Avatar,
  Icon,
  PageHeader,
  SectionTitle,
  MemberContext,
  Field,
  ChoiceGroup,
  Empty,
  Sheet,
  Notice,
  ErrorText,
  Status,
  Row,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
export function Billing() {
  const { state, activeMember, dispatch, notify, brand } = useApp();
  const [tab, setTab] = useState("All");
  const [bill, setBill] = useState(null);
  const [method, setMethod] = useState("UPI");
  const [paid, setPaid] = useState(false);
  const { busy, error, run } = useAction();
  const bills = state.bills.filter((b) => b.memberId === activeMember.id);
  const due = bills
    .filter((b) => b.status === "Unpaid")
    .reduce((sum, b) => sum + b.amount, 0);
  function receipt(b) {
    download(
      `${b.id}-receipt.txt`,
      `${brand.hospitalName}\nDEMO RECEIPT — NO MONEY WAS CHARGED\n\nInvoice: ${b.id}\nPatient: ${activeMember.name}\n${b.title}\n${b.items.map(([name, amount]) => `${name}: ${money(amount)}`).join("\n")}\nTotal: ${money(b.amount)}\nPayment: ${b.method}\nReference: ${b.transaction}`,
    );
  }
  return (
    <div className={s.page}>
      <PageHeader
        title="Bills & payments"
        subtitle="A clear view of your care costs."
      />
      <MemberContext />
      <div className={s.balanceCard}>
        <span className={s.eyebrow}>TOTAL OUTSTANDING</span>
        <h1>{money(due)}</h1>
        <p>{due ? "Pay at your convenience." : "You’re all caught up."}</p>
        <Icon name="receipt-2" size={64} bulk />
      </div>
      <ChoiceGroup
        label="Payment status"
        options={["All", "Unpaid", "Paid"]}
        value={tab}
        onChange={setTab}
      />
      <div className={s.stack}>
        {bills
          .filter((b) => tab === "All" || b.status === tab)
          .map((b) => (
            <button
              className={s.billCard}
              key={b.id}
              onClick={() => {
                setBill(b);
                setPaid(false);
              }}
            >
              <div className={s.inlineMeta}>
                <small>
                  {b.id} · {formatDate(b.date)}
                </small>
                <Status status={b.status} />
              </div>
              <div className={s.billRow}>
                <div>
                  <h3>{b.title}</h3>
                  <small>{activeMember.name}</small>
                </div>
                <strong>{money(b.amount)}</strong>
              </div>
              <span className={s.inlineLink}>
                {b.status === "Paid" ? "View receipt" : "Review & pay"}
                <Icon name="arrow-right" size={16} />
              </span>
            </button>
          ))}
      </div>
      {!bills.filter((b) => tab === "All" || b.status === tab).length && (
        <Empty
          icon="receipt-2"
          title="No bills to show"
          description="Bills shared by your hospital will appear here."
        />
      )}
      <Sheet
        open={!!bill}
        onClose={() => setBill(null)}
        title={
          paid
            ? "Payment demo complete"
            : bill?.status === "Paid"
              ? "Payment receipt"
              : "Review your bill"
        }
      >
        {bill && (
          <>
            {paid ? (
              <div className={s.successHero}>
                <Icon name="tick-circle" size={56} bulk />
                <h2>All settled.</h2>
                <p>{money(bill.amount)} · Demo transaction</p>
                <Notice>
                  No money was charged. This is a payment-flow preview.
                </Notice>
              </div>
            ) : (
              <>
                <div className={s.inlineMeta}>
                  <span>{bill.id}</span>
                  <Status status={bill.status} />
                </div>
                <h2>{bill.title}</h2>
                <p>For {activeMember.name}</p>
                <dl className={s.details}>
                  {bill.items.map(([name, amount]) => (
                    <div className={s.invoiceLine} key={name}>
                      <dt>{name}</dt>
                      <dd>{money(amount)}</dd>
                    </div>
                  ))}
                </dl>
                <div className={s.total}>
                  <strong>Total</strong>
                  <strong>{money(bill.amount)}</strong>
                </div>
              </>
            )}
            {bill.status === "Unpaid" && !paid ? (
              <>
                <ChoiceGroup
                  label="Payment method"
                  options={["UPI", "Card", "Net banking"]}
                  value={method}
                  onChange={setMethod}
                />
                <Notice>
                  Demo checkout. A live payment gateway must verify the payment
                  before the hospital invoice is marked paid.
                </Notice>
                <Button
                  fullWidth
                  loading={busy}
                  onClick={() =>
                    run(() => {
                      dispatch({ type: "PAY_DEMO", id: bill.id, method });
                      setPaid(true);
                      notify("Demo payment recorded. No money charged.");
                    })
                  }
                >
                  Simulate payment · {money(bill.amount)}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                fullWidth
                onClick={() =>
                  receipt(state.bills.find((b) => b.id === bill.id))
                }
              >
                <Icon name="document-download" />
                Download demo receipt
              </Button>
            )}
            <ErrorText>{error}</ErrorText>
          </>
        )}
      </Sheet>
    </div>
  );
}
export function Packages() {
  const { state, activeMember, dispatch, notify } = useApp();
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(dateKey(1));
  const [collection, setCollection] = useState("At hospital");
  const { busy, error, run } = useAction();
  const requests = state.requests.filter(
    (r) => r.memberId === activeMember.id && r.kind === "Health package",
  );
  return (
    <div className={s.page}>
      <PageHeader
        title="A healthier tomorrow"
        subtitle="Thoughtful health checks for every stage of life."
      />
      <MemberContext />
      {packages.map((p, i) => (
        <article className={s.packageCard} key={p.id} data-index={i}>
          <div className={s.packageCardArt}>
            <Icon name={p.icon} size={44} bulk />
            <span className={s.eyebrow}>{p.tag}</span>
          </div>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <Badge color="neutral">{p.tests}</Badge>
          <div className={s.packagePrice}>
            <strong>{money(p.price)}</strong>
            <s>{money(p.oldPrice)}</s>
            <Button
              variant="tonal"
              onClick={() => {
                setSelected(p);
                setCollection("At hospital");
              }}
            >
              View package
            </Button>
          </div>
        </article>
      ))}
      {!!requests.length && (
        <>
          <SectionTitle>Your requests</SectionTitle>
          {requests.map((r) => (
            <div className={s.softCard} key={r.id}>
              <div className={s.inlineMeta}>
                <strong>{r.title}</strong>
                <Status status={r.status} />
              </div>
              <p>
                {formatDate(r.date)} · {r.collection}
              </p>
            </div>
          ))}
        </>
      )}
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.shortName || "Health package"}
      >
        {selected && (
          <>
            <p>{selected.description}</p>
            <h3>What’s included</h3>
            <ul className={s.checkList}>
              {selected.includes.map((item) => (
                <li key={item}>
                  <Icon name="tick-circle" size={18} bulk />
                  {item}
                </li>
              ))}
            </ul>
            <Field
              label="Preferred date"
              type="date"
              min={dateKey(1)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <ChoiceGroup
              label="Collection preference"
              options={
                selected.collection
                  ? ["At hospital", "Home collection"]
                  : ["At hospital"]
              }
              value={collection}
              onChange={setCollection}
            />
            <div className={s.total}>
              <span>Package price</span>
              <strong>{money(selected.price)}</strong>
            </div>
            <Notice>
              The care team will confirm availability and any preparation
              instructions. This preview creates a local demo request.
            </Notice>
            <ErrorText>{error}</ErrorText>
            <Button
              loading={busy}
              fullWidth
              onClick={() =>
                run(() => {
                  if (date < dateKey(1))
                    throw new Error("Choose tomorrow or a later date.");
                  dispatch({
                    type: "REQUEST",
                    request: {
                      id: crypto.randomUUID(),
                      kind: "Health package",
                      title: selected.shortName,
                      date,
                      collection,
                      memberId: activeMember.id,
                    },
                  });
                  setSelected(null);
                  notify("Demo package request saved.");
                })
              }
            >
              Request this package
            </Button>
          </>
        )}
      </Sheet>
    </div>
  );
}
export function Vaccines() {
  const { state, activeMember, dispatch, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dateKey(1));
  const { error, run } = useAction();
  const vaccines = state.vaccines.filter((v) => v.memberId === activeMember.id);
  return (
    <div className={s.page}>
      <PageHeader
        title="Vaccinations"
        subtitle="Keep track of your preventive care."
      />
      <MemberContext />
      <div className={s.softCard}>
        <Icon name="shield-tick" size={36} bulk />
        <h2>
          A little protection.
          <br />A lot of peace of mind.
        </h2>
        <p>
          Your care team can help you understand which vaccines are right for
          you.
        </p>
        <Button variant="tonal" onClick={() => setOpen(true)}>
          Request vaccine consultation
        </Button>
      </div>
      <SectionTitle>Your vaccination record</SectionTitle>
      {vaccines.length ? (
        vaccines.map((v) => (
          <div className={s.detailCard} key={v.id}>
            <div className={s.inlineMeta}>
              <h3>{v.name}</h3>
              <Status status={v.status} />
            </div>
            <p>
              {v.status === "Recorded" ? "Recorded on" : "Review from"}{" "}
              {formatDate(v.date, { year: "numeric" })}
            </p>
            <small>{v.note}</small>
          </div>
        ))
      ) : (
        <Empty
          icon="shield-tick"
          title="No vaccination records yet"
          description="Your hospital’s vaccination records will appear here."
        />
      )}
      {state.requests
        .filter(
          (r) => r.memberId === activeMember.id && r.kind === "Vaccination",
        )
        .map((r) => (
          <Notice key={r.id}>
            Consultation requested for {formatDate(r.date)}. Awaiting
            confirmation.
          </Notice>
        ))}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Vaccine consultation"
      >
        <p>
          The care team will review your vaccination history and confirm a
          consultation.
        </p>
        <Field
          label="Preferred date"
          type="date"
          min={dateKey(1)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <ErrorText>{error}</ErrorText>
        <Button
          onClick={() =>
            run(() => {
              if (date < dateKey(1)) throw new Error("Choose a future date.");
              dispatch({
                type: "REQUEST",
                request: {
                  id: crypto.randomUUID(),
                  kind: "Vaccination",
                  title: "Vaccine consultation",
                  memberId: activeMember.id,
                  date,
                },
              });
              setOpen(false);
              notify("Demo consultation request saved.");
            })
          }
        >
          Request consultation
        </Button>
      </Sheet>
    </div>
  );
}
export function HomeCare() {
  const { state, activeMember, dispatch, notify } = useApp();
  const [service, setService] = useState(null);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(dateKey(1));
  const { error, run } = useAction();
  const services = [
    ["Nursing care", "Professional support in the comfort of home.", "health"],
    ["Physiotherapy", "Support your recovery, at your own pace.", "activity"],
    [
      "Sample collection",
      "Get your prescribed tests done at home.",
      "clipboard-tick",
    ],
    [
      "Elder care",
      "Thoughtful, ongoing support for your loved ones.",
      "people",
    ],
  ];
  return (
    <div className={s.page}>
      <PageHeader
        title="Care, closer to home"
        subtitle="The comfort of home. The support you need."
      />
      <MemberContext />
      <img
        className={s.carePhoto}
        src="/images/care.jpg"
        alt="A health professional talking with a patient"
      />
      <div className={s.rowCard}>
        {services.map(([title, sub, icon]) => (
          <Row
            key={title}
            title={title}
            subtitle={sub}
            icon={icon}
            onClick={() => setService(title)}
          />
        ))}
      </div>
      <SectionTitle>Your home-care requests</SectionTitle>
      {state.requests.filter(
        (r) => r.memberId === activeMember.id && r.kind === "Home care",
      ).length ? (
        state.requests
          .filter(
            (r) => r.memberId === activeMember.id && r.kind === "Home care",
          )
          .map((r) => (
            <div className={s.softCard} key={r.id}>
              <div className={s.inlineMeta}>
                <strong>{r.title}</strong>
                <Status status={r.status} />
              </div>
              <p>{formatDate(r.date)}</p>
              <small>{r.address}</small>
            </div>
          ))
      ) : (
        <Empty
          icon="home-2"
          title="No requests yet"
          description="Choose a service and our care team will help with the next steps."
        />
      )}
      <Sheet
        open={!!service}
        onClose={() => setService(null)}
        title={service || "Home care"}
      >
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => {
              if (address.trim().length < 10)
                throw new Error("Enter a complete service address.");
              if (date < dateKey(1)) throw new Error("Choose a future date.");
              dispatch({
                type: "REQUEST",
                request: {
                  id: crypto.randomUUID(),
                  memberId: activeMember.id,
                  kind: "Home care",
                  title: service,
                  date,
                  address: address.trim(),
                },
              });
              setService(null);
              notify("Demo home-care request saved.");
            });
          }}
        >
          <Field
            label="Service address"
            autoGrow
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Field
            label="Preferred date"
            type="date"
            min={dateKey(1)}
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Notice>
            Availability, pricing and timing are confirmed by the hospital. This
            is a demo request.
          </Notice>
          <ErrorText>{error}</ErrorText>
          <Button type="submit">Request a callback</Button>
        </form>
      </Sheet>
    </div>
  );
}
export function Hospital() {
  const { state, brand } = useApp();
  const hospital = locations.find((l) => l.id === state.location);
  return (
    <div className={s.page}>
      <PageHeader title="Your hospital" />
      <div className={s.hospitalHero}>
        <Icon name="hospital" size={52} bulk />
        <h1>{brand.hospitalName}</h1>
        <p>
          {hospital.name}, {hospital.city}
        </p>
        <Badge color="success">Your selected location</Badge>
      </div>
      <div className={s.detailCard}>
        <h3>Getting here</h3>
        <p>{hospital.address}</p>
        <Button
          href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          fullWidth
        >
          <Icon name="routing" />
          Get directions
        </Button>
      </div>
      <div className={s.detailCard}>
        <h3>Opening hours</h3>
        <p>{hospital.hours}</p>
        <small>Illustrative location · Confirm hours with your hospital.</small>
      </div>
      <SectionTitle>Hospital contacts</SectionTitle>
      <div className={s.rowCard}>
        {[
          ["Reception & appointments", "call"],
          ["Billing & insurance", "receipt-2"],
          ["Patient support", "message-question"],
          ["Ambulance desk", "health"],
        ].map(([title, icon]) => (
          <div className={s.row} key={title}>
            <span className={s.rowIcon}>
              <Icon name={icon} />
            </span>
            <div className={s.grow}>
              <strong>{title}</strong>
              <small>Hospital number not configured</small>
            </div>
          </div>
        ))}
      </div>
      <Notice>
        Each hospital supplies its verified contact numbers, opening hours and
        ambulance availability.
      </Notice>
      <Button href="tel:112" variant="outline" theme="error" fullWidth>
        <Icon name="call-calling" />
        Emergency assistance · 112
      </Button>
    </div>
  );
}
export function Inpatient() {
  const { activeMember } = useApp();
  const navigate = useNavigate();
  const hasStay = activeMember.id === "mother";
  return (
    <div className={s.page}>
      <PageHeader
        title="Hospital stays"
        subtitle="Your inpatient care, kept together."
      />
      <MemberContext />
      {hasStay ? (
        <>
          <div className={s.softCard}>
            <div className={s.inlineMeta}>
              <span className={s.rowIcon}>
                <Icon name="hospital" size={28} bulk />
              </span>
              <Badge color="success">Discharged</Badge>
            </div>
            <h2>Your recent hospital stay</h2>
            <p>Jayanagar · Ward B · Bed 204</p>
            <small>
              {formatDate(dateKey(-24))} – {formatDate(dateKey(-21))}
            </small>
          </div>
          <div className={s.timeline}>
            {[
              ["Admission", "Hospital registration and room allocation"],
              ["Care updates", "Clinical records shared by your care team"],
              ["Discharge", "Your summary and follow-up plan are available"],
            ].map(([title, sub]) => (
              <div key={title} data-done="true">
                <span>
                  <Icon name="tick-circle" size={24} bulk />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate("/records?record=r5")}>
            View discharge summary
          </Button>
          <Button variant="outline" onClick={() => navigate("/billing")}>
            View hospital bills
          </Button>
          <Notice>
            Sample stay. Only records released for patient access by the
            hospital will be displayed in the connected app.
          </Notice>
        </>
      ) : (
        <Empty
          icon="hospital"
          title="No hospital stays"
          description="If you are admitted, your care updates, shared reports, discharge summary and bills will appear here."
        />
      )}
    </div>
  );
}
