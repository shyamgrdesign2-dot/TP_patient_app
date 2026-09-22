import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox, ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import { sampleIdentity } from "../state/model";
import {
  Avatar,
  Badge,
  Button,
  PatientName,
  AbhaLogo,
  Icon,
  PageHeader,
  MemberContext,
  Sheet,
  Field,
  Notice,
  ErrorText,
  Row,
  useAction,
} from "../components/ui";
import s from "../App.module.css";

export default function LinkRecords({ initialMethod }) {
  const { state, activeMember, brand, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [step, setStep] = useState(0);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [consent, setConsent] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [attempts, setAttempts] = useState(0);
  const [unlink, setUnlink] = useState(null);
  const { error, setError, run } = useAction();
  const links = state.healthLinks?.[activeMember.id] || {};
  const hospitalLink = links.uhid?.hospitalId === brand.id ? links.uhid : null;
  const linkFor = (kind) => (kind === "uhid" ? hospitalLink : links.abha);
  const label = method === "uhid" ? "UHID" : "ABHA number";
  function start(kind) {
    setMethod(kind);
    setStep(0);
    setIdentifier("");
    setOtp("");
    setConsent(false);
    setSentAt(0);
    setAttempts(0);
    setError("");
  }
  useEffect(() => {
    setMethod(null);
    setUnlink(null);
    if (initialMethod) start(initialMethod);
  }, [activeMember.id, brand.id, initialMethod]);
  useEffect(() => {
    if (!sentAt || !method) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt, method]);
  function sendCode() {
    setSentAt(Date.now());
    setNow(Date.now());
    setOtp("");
    setAttempts(0);
    setError("");
    setStep(1);
  }
  function submit(event) {
    event.preventDefault();
    run(() => {
      if (step === 0) {
        const normalized = identifier.replace(/[^a-z0-9]/gi, "").toUpperCase();
        if (
          normalized !==
          sampleIdentity(activeMember, method)
            .replace(/[^a-z0-9]/gi, "")
            .toUpperCase()
        )
          throw new Error(
            `For this preview, use the sample ${label} shown below the field.`,
          );
        sendCode();
      } else if (step === 1) {
        if (Date.now() - sentAt >= 120000)
          throw new Error("This demo code has expired. Request a new code.");
        if (attempts >= 5)
          throw new Error("Too many attempts. Request a new code.");
        if (otp !== "123456") {
          setAttempts(attempts + 1);
          throw new Error("Incorrect demo code. Use 123456.");
        }
        setStep(2);
      } else {
        dispatch({
          type: "LINK_IDENTITY_DEMO",
          memberId: activeMember.id,
          method,
          identifier,
          hospitalId: brand.id,
          consent,
          otp,
          sentAt,
        });
        setStep(3);
        notify(
          `${method === "uhid" ? "UHID" : "ABHA"} demo link saved for ${activeMember.name.split(" ")[0]}.`,
        );
      }
    });
  }
  return (
    <div className={s.page}>
      <PageHeader title="Link health records" />
      <MemberContext />
      <div className={s.linkIntro}>
        <span className={s.linkEmblem}>
          <Icon name="link" size={32} />
        </span>
        <h2>Your health, brought together.</h2>
        <p>Choose how you’d like to connect your records.</p>
      </div>
      <div className={s.stack}>
        {[
          {
            kind: "uhid",
            title: "Hospital UHID",
            icon: "hospital",
            description:
              "Find it on a hospital bill, prescription or registration card.",
          },
          {
            kind: "abha",
            title: "ABHA account",
            icon: "shield-tick",
            description:
              "Use your 14-digit Ayushman Bharat Health Account number.",
          },
        ].map((item) => {
          const linked = linkFor(item.kind);
          return (
            <section className={s.identityCard} key={item.kind}>
              <div className={s.doctorRow}>
                <span className={s.rowIcon}>
                  <Icon name={item.icon} bulk size={24} />
                </span>
                <div className={s.grow}>
                  <h3>{item.title}</h3>
                  <small>
                    {item.kind === "uhid"
                      ? brand.hospitalName
                      : "Ayushman Bharat Digital Mission"}
                  </small>
                </div>
                {linked && (
                  <Badge color="success" size="sm">
                    Demo linked
                  </Badge>
                )}
              </div>
              <p>{linked ? linked.identifier : item.description}</p>
              {linked ? (
                <div className={s.twoColumns}>
                  <Button variant="tonal" onClick={() => navigate("/records")}>
                    View records
                  </Button>
                  <Button
                    variant="ghost"
                    theme="neutral"
                    onClick={() => setUnlink(item.kind)}
                  >
                    Unlink
                  </Button>
                </div>
              ) : (
                <Button
                  variant={item.kind === "uhid" ? "solid" : "tonal"}
                  fullWidth
                  rightIcon={<Icon name="chevron-right" size={18} />}
                  onClick={() => start(item.kind)}
                >
                  Link {item.kind === "uhid" ? "UHID" : "ABHA"}
                </Button>
              )}
            </section>
          );
        })}
      </div>
      <Notice icon="shield-tick">
        Demo verification only. No OTP is sent, no live records are fetched, and
        no hospital or ABDM account is connected.
      </Notice>
      <div className={s.rowCard}>
        <Row
          icon="call-calling"
          title="Can’t find your UHID?"
          subtitle="Your hospital’s registration desk can help."
          onClick={() => navigate("/hospital")}
        />
      </div>
      <Sheet
        open={!!method}
        onClose={() => setMethod(null)}
        title={
          step === 0
            ? `Link your ${method === "uhid" ? "UHID" : "ABHA"}`
            : step === 1
              ? "Verify your identity"
              : step === 2
                ? "Review & give consent"
                : "Your demo link is ready"
        }
        description={`For ${activeMember.name}`}
      >
        {step === 3 ? (
          <>
            <div className={s.linkSuccess}>
              <span className={s.linkEmblem}>
                <Icon name="tick-circle" size={36} bulk />
              </span>
              <h2>One step closer to connected care.</h2>
              <p>
                {label} {sampleIdentity(activeMember, method)} is linked in this
                preview.
              </p>
            </div>
            <Notice>
              No new medical records have been imported. Your sample records are
              unchanged.
            </Notice>
            <Button
              onClick={() => {
                setMethod(null);
                navigate("/records");
              }}
            >
              Go to health records
            </Button>
            <Button variant="ghost" onClick={() => setMethod(null)}>
              Done
            </Button>
          </>
        ) : (
          <form className={s.stack} onSubmit={submit}>
            <div className={s.identityPatient}>
              <Avatar name={activeMember.name} size={44} />
              <span>
                <strong>
                  <PatientName member={activeMember} />
                </strong>
                <small>
                  {activeMember.relation} · {brand.hospitalName}
                </small>
              </span>
            </div>
            {step === 0 && (
              <>
                <Field
                  label={label}
                  placeholder={sampleIdentity(activeMember, method)}
                  helperText={`Sample ${label}: ${sampleIdentity(activeMember, method)}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  maxLength={24}
                  inputMode={method === "abha" ? "numeric" : "text"}
                  autoComplete="off"
                />
                <Notice>
                  Use the sample identity above. Live linking will verify the
                  mobile number registered with{" "}
                  {method === "uhid" ? "your hospital" : "ABDM"}.
                </Notice>
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  Preview verification for mobile ending{" "}
                  <strong>{activeMember.phone.slice(-4)}</strong>.
                </p>
                <Field
                  label="Demo verification code"
                  helperText="No SMS was sent. Demo code: 123456. Valid for 2 minutes."
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <Button
                  variant="link"
                  disabled={now - sentAt < 30000}
                  onClick={sendCode}
                >
                  {now - sentAt < 30000
                    ? `Request new code in ${Math.ceil((30000 - now + sentAt) / 1000)}s`
                    : "Request new demo code"}
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <div className={s.softCard}>
                  <Badge color="success">Demo identity verified</Badge>
                  <h3>
                    <PatientName member={activeMember} />
                  </h3>
                  <p>
                    {label}: {sampleIdentity(activeMember, method)}
                  </p>
                </div>
                <Checkbox
                  checked={consent}
                  onCheckedChange={setConsent}
                  label={`I ${activeMember.relation === "Self" ? "consent" : "have permission"} to link this ${method === "uhid" ? "hospital identity" : "ABHA account"} to ${activeMember.name}’s profile for this demo.`}
                />
                <small>
                  In the live app, record sharing needs a separate, specific
                  consent. You can unlink this identity at any time.
                </small>
              </>
            )}
            <ErrorText>{error}</ErrorText>
            <Button type="submit" fullWidth>
              {step === 0
                ? "Continue to demo verification"
                : step === 1
                  ? "Verify demo code"
                  : "Confirm demo link"}
            </Button>
            {step > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                Back
              </Button>
            )}
          </form>
        )}
      </Sheet>
      <ConfirmDialog
        open={!!unlink}
        onOpenChange={(open) => !open && setUnlink(null)}
        title={`Unlink ${unlink === "uhid" ? "UHID" : "ABHA"}?`}
        description="This removes the demo connection for this profile. It does not delete medical records or your health account."
        primaryLabel="Keep linked"
        onPrimary={() => setUnlink(null)}
        secondaryLabel="Unlink identity"
        secondaryTone="destructive"
        onSecondary={() => {
          dispatch({
            type: "UNLINK_IDENTITY_DEMO",
            memberId: activeMember.id,
            method: unlink,
          });
          setUnlink(null);
          notify("Demo identity unlinked.");
        }}
      />
    </div>
  );
}
