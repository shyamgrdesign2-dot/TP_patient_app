import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { getCredentialType, verifyDemoCredential } from "../services/demoAuth";
import { dateKey } from "../services/data";
import {
  Button,
  Icon,
  BrandLogo,
  Field,
  ChoiceGroup,
  ErrorText,
  useAction,
} from "../components/ui";
import s from "../Auth.module.css";
const Waves = lazy(() =>
  import("../components/effects/GradientWaves").then((module) => ({
    default: module.GradientWaves,
  })),
);
function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduce(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduce;
}
function AuthBackground({ waves = false, paused = false }) {
  const { brand } = useApp();
  const reduce = useReducedMotion();
  return (
    <div
      className={s.background}
      aria-hidden="true"
      data-paused={paused || reduce}
    >
      <div className={s.aurora} />
      {waves && !reduce && !paused && (
        <div className={s.waves}>
          <Suspense fallback={null}>
            <Waves
              horizonColor="#f7f8fc"
              waveColor={brand.primary}
              crestColor="#ffffff"
              brightness={1.05}
              opacity={0.6}
              speed={0.3}
              detail="low"
              mouseInteraction={false}
              grain={false}
            />
          </Suspense>
        </div>
      )}
      <div className={s.grid} />
    </div>
  );
}
const slides = [
  {
    key: "visit",
    tag: "YOUR NEXT VISIT, MADE SIMPLE",
    lines: ["Good care.", "One tap closer."],
    body: "Find your doctor, choose a time and keep every appointment close at hand.",
  },
  {
    key: "records",
    tag: "EVERY RECORD, TOGETHER",
    lines: ["Less searching.", "More peace of mind."],
    body: "Prescriptions, reports and visit summaries, all in one place when you need them.",
  },
  {
    key: "family",
    tag: "CARE FOR YOUR WHOLE FAMILY",
    lines: ["Your people.", "One caring place."],
    body: "Switch between family profiles and stay on top of the care that matters to you.",
  },
  {
    key: "queue",
    tag: "A CALMER HOSPITAL VISIT",
    lines: ["Check in.", "Know your turn."],
    body: "Check in when you arrive at the hospital, then keep your token and estimated wait close by.",
  },
  {
    key: "bills",
    tag: "THE DETAILS, TAKEN CARE OF",
    lines: ["Clear bills.", "One less worry."],
    body: "See new hospital bills, review the details and find your receipts in one place.",
  },
];
function StoryHero({ kind }) {
  return (
    <div className={s.heroStage} aria-hidden="true">
      <div className={s.heroGlow} />
      {kind === "visit" && (
        <>
          <div className={s.miniCard}>
            <span className={s.miniEyebrow}>
              <Icon name="calendar-2" bulk /> YOUR NEXT VISIT
            </span>
            <div className={s.miniDoctor}>
              <img src="/images/doctor-meera.jpg" alt="" />
              <div>
                <strong>Your trusted doctor</strong>
                <small>Care, on your schedule</small>
              </div>
            </div>
            <div className={s.miniFooter}>
              <span>Tomorrow · 10:30 AM</span>
              <Icon name="tick-circle" bulk />
            </div>
          </div>
          <span className={s.floatingPill}>
            <Icon name="tick-circle" bulk size={18} /> Appointment confirmed
          </span>
          <span className={s.floatingPillAlt}>
            <Icon name="location" bulk size={16} /> At your hospital
          </span>
        </>
      )}
      {kind === "records" && (
        <>
          <div className={`${s.miniCard} ${s.paperBack}`} />
          <div className={`${s.miniCard} ${s.report}`}>
            <span className={s.miniEyebrow}>
              <Icon name="document-text" bulk /> HEALTH RECORDS
            </span>
            <strong>Your health, connected.</strong>
            <div className={s.reportLines}>
              <i />
              <i />
              <i />
            </div>
            <div className={s.miniFooter}>
              <span>Ready when you are</span>
              <Icon name="shield-tick" bulk />
            </div>
          </div>
          <span className={s.floatingPill}>
            <Icon name="document-text" bulk size={18} /> A new report is ready
          </span>
        </>
      )}
      {kind === "family" && (
        <>
          <div className={`${s.miniCard} ${s.familyPreview}`}>
            <div className={s.people}>
              {["adult", "father", "mother"].map((person, i) => (
                <span key={person} style={{ "--person-delay": `${i * 110}ms` }}>
                  <img
                    src={`/images/welcome-${person}.jpg`}
                    alt=""
                    width="52"
                    height="52"
                  />
                </span>
              ))}
            </div>
            <strong>Your family, together.</strong>
            <small>A little care for everyone.</small>
            <div className={s.miniFooter}>
              <span>One account. Every profile.</span>
              <Icon name="people" bulk />
            </div>
          </div>
          <span className={s.floatingPill}>
            <Icon name="heart" bulk size={18} /> Always by their side
          </span>
        </>
      )}
      {kind === "queue" && (
        <>
          <div className={`${s.miniCard} ${s.queuePreview}`}>
            <span className={s.miniEyebrow}>
              <Icon name="timer" bulk /> YOUR PLACE IN LINE
            </span>
            <strong className={s.token}>A-012</strong>
            <small>Your token, always at hand</small>
            <div className={s.miniFooter}>
              <span>3 ahead · ~18 min wait</span>
              <Icon name="tick-circle" bulk />
            </div>
          </div>
          <span className={s.floatingPill}>
            <Icon name="location" bulk size={18} /> You’re checked in
          </span>
        </>
      )}
      {kind === "bills" && (
        <>
          <div className={`${s.miniCard} ${s.billPreview}`}>
            <span className={s.miniEyebrow}>
              <Icon name="bill" bulk /> YOUR HOSPITAL BILLS
            </span>
            <strong>Everything adds up.</strong>
            <div className={s.receiptRow}>
              <span>Consultation</span>
              <span>₹700</span>
            </div>
            <div className={s.receiptRow}>
              <span>Payment status</span>
              <b>Paid</b>
            </div>
            <div className={s.miniFooter}>
              <span>Your receipt is ready</span>
              <Icon name="document-text" bulk />
            </div>
          </div>
          <span className={s.floatingPill}>
            <Icon name="tick-circle" bulk size={18} /> All in one place
          </span>
        </>
      )}
    </div>
  );
}
export function Welcome() {
  const { brand } = useApp();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0),
    [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const reduce = useReducedMotion();
  const start = useRef(null);
  const isPaused = paused || reduce || !visible;
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(
      () => setSlide((i) => (i + 1) % slides.length),
      4600,
    );
    return () => clearTimeout(timer);
  }, [slide, isPaused]);
  function go(index) {
    setPaused(true);
    setSlide((index + slides.length) % slides.length);
  }
  const current = slides[slide];
  return (
    <div className={s.welcome} data-paused={isPaused}>
      <AuthBackground waves paused={isPaused} />
      <div className={s.storyProgress} aria-label="Introduction slides">
        {slides.map((item, i) => (
          <button
            key={item.key}
            aria-label={`Introduction ${i + 1}`}
            aria-current={i === slide ? "step" : undefined}
            onClick={() => go(i)}
          >
            <span>
              <i
                key={`${slide}-${isPaused}`}
                data-filled={i < slide}
                data-active={i === slide}
              />
            </span>
          </button>
        ))}
      </div>
      <div className={s.brandRow}>
        <BrandLogo />
      </div>
      <section
        className={s.story}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Discover your patient app"
        onFocus={() => setPaused(true)}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            go(slide + (e.key === "ArrowRight" ? 1 : -1));
          }
        }}
        onPointerDown={(e) => {
          setPaused(true);
          start.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x,
            dy = e.clientY - start.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
            go(slide + (dx < 0 ? 1 : -1));
          start.current = null;
        }}
      >
        <div key={current.key} className={s.storySlide}>
          <StoryHero kind={current.key} />
          <div className={s.storyCopy}>
            <span>{current.tag}</span>
            <h1>
              {current.lines.map((line, i) => (
                <span key={line}>
                  <b style={{ "--line-delay": `${i * 90}ms` }}>{line}</b>
                </span>
              ))}
            </h1>
            <p>{current.body}</p>
          </div>
        </div>
      </section>
      <div className={s.welcomeActions}>
        <Button fullWidth size="lg" onClick={() => navigate("/login")}>
          Get started
          <Icon name="chevron-right" size={18} />
        </Button>
        <small>{brand.hospitalName} · Your health, connected</small>
      </div>
    </div>
  );
}
export function Login() {
  const { signIn, findAccount } = useApp();
  const navigate = useNavigate();
  const [method, setMethod] = useState("Mobile OTP"),
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [countdown, setCountdown] = useState(0),
    [verified, setVerified] = useState(false),
    [setup, setSetup] = useState(false),
    [name, setName] = useState(""),
    [dob, setDob] = useState(""),
    [alternatives, setAlternatives] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => {
    if (!countdown) return;
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
  useEffect(() => {
    if (!verified) return;
    const timer = setTimeout(() => {
      if (method === "Mobile OTP" && !findAccount(phone)) {
        setVerified(false);
        setSetup(true);
        return;
      }
      signIn(method === "Mobile OTP" ? phone : undefined);
      navigate("/", { replace: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [verified]);
  function submit(event) {
    event.preventDefault();
    run(async () => {
      if (setup) {
        if (!name.trim() || !dob || dob > dateKey())
          throw new Error("Enter your name and a valid date of birth.");
        signIn(phone, { name, dob });
        navigate("/", { replace: true });
        return;
      }
      if (method === "Mobile OTP" && !sent) {
        if (!/^[6-9]\d{9}$/.test(phone))
          throw new Error("Enter a valid 10-digit Indian mobile number.");
        setSent(true);
        setCode("");
        setCountdown(30);
        return;
      }
      if (method === "Mobile OTP") {
        if (code !== "123456") throw new Error("Use the demo code 123456.");
      } else await verifyDemoCredential(code);
      setVerified(true);
    });
  }
  function back() {
    if (setup) {
      setSetup(false);
      setSent(false);
      setCode("");
      return;
    }
    if (sent) {
      setSent(false);
      setCode("");
    } else navigate("/welcome");
  }
  return (
    <div className={s.login}>
      <AuthBackground />
      <div className={s.brandRow}>
        <Button
          variant="ghost"
          theme="neutral"
          aria-label="Go back"
          onClick={back}
        >
          <Icon name="arrow-left3" size={22} />
        </Button>
        <BrandLogo />
      </div>
      <form className={s.loginForm} onSubmit={submit}>
        <div className={s.loginBody} key={`${method}-${sent}-${verified}`}>
          {setup ? (
            <>
              <span className={s.kicker}>LET’S MAKE THIS YOURS</span>
              <h1>
                Welcome.
                <br />
                What should we call you?
              </h1>
              <p>
                Your number is verified. Add a few details to start your care
                profile.
              </p>
              <Field
                label="Full name"
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Field
                label="Date of birth"
                type="date"
                autoComplete="bday"
                max={dateKey()}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
              <ErrorText>{error}</ErrorText>
              <p className={s.demoNote}>
                Preview only · Your profile is saved on this device.
              </p>
            </>
          ) : verified ? (
            <div className={s.verified} role="status">
              <span>
                <Icon name="tick-circle" size={40} bulk />
              </span>
              <h1>Verified</h1>
              <p>
                {method === "Mobile OTP" && !findAccount(phone)
                  ? "Let’s set up your care profile…"
                  : "Opening your care home…"}
              </p>
            </div>
          ) : (
            <>
              <span className={s.kicker}>YOUR CARE, CONNECTED</span>
              <h1>
                {sent ? (
                  "Enter the code"
                ) : method === "Mobile OTP" ? (
                  <>
                    Enter your
                    <br />
                    mobile number
                  </>
                ) : method === "Quick PIN" ? (
                  "Welcome back."
                ) : (
                  "Sign in securely."
                )}
              </h1>
              <p>
                {sent
                  ? `Use the demo code for +91 ${phone}.`
                  : method === "Mobile OTP"
                    ? "A quick verification to open your patient account."
                    : "Use the quick access you set up on this device."}
              </p>
              {method === "Mobile OTP" && !sent ? (
                <Field
                  label="Mobile number"
                  leftAddon="+91"
                  type="tel"
                  inputMode="tel"
                  maxLength={10}
                  autoComplete="tel-national"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  required
                />
              ) : method === "Mobile OTP" ? (
                <div className={s.otpWrap}>
                  <label htmlFor="signin-code">6-digit demo code</label>
                  <div className={s.otpControl}>
                    <input
                      id="signin-code"
                      aria-label="6-digit demo code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={6}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                    <div className={s.otpCells} aria-hidden="true">
                      {Array.from({ length: 6 }, (_, i) => (
                        <span
                          key={i}
                          data-filled={!!code[i]}
                          data-active={i === code.length}
                        >
                          {code[i] || ""}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Field
                  label={
                    method === "Quick PIN" ? "Your quick PIN" : "Your password"
                  }
                  type="password"
                  inputMode={method === "Quick PIN" ? "numeric" : undefined}
                  maxLength={method === "Quick PIN" ? 6 : 100}
                  autoComplete="current-password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              )}
              <ErrorText>{error}</ErrorText>
              {sent && (
                <div className={s.codeOptions}>
                  <Button
                    variant="link"
                    size="sm"
                    disabled={countdown > 0}
                    onClick={() => {
                      setCountdown(30);
                      setCode("");
                    }}
                  >
                    {countdown ? `Resend in ${countdown}s` : "Resend code"}
                  </Button>
                  <Button variant="link" size="sm" onClick={back}>
                    Change number
                  </Button>
                </div>
              )}
              <p className={s.demoNote}>
                Preview only · No SMS is sent.{" "}
                {method === "Mobile OTP"
                  ? "Use code 123456."
                  : "Local demo access only."}
              </p>
              {!sent && getCredentialType() && (
                <>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setAlternatives((v) => !v)}
                  >
                    Use another sign-in method
                  </Button>
                  {alternatives && (
                    <ChoiceGroup
                      label="Sign-in method"
                      options={["Mobile OTP", "Quick PIN", "Password"]}
                      value={method}
                      onChange={(v) => {
                        setMethod(v);
                        setCode("");
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
        {!verified && (
          <div className={s.loginActions}>
            <Button type="submit" fullWidth size="lg" loading={busy}>
              {setup
                ? "Create my profile"
                : method === "Mobile OTP" && !sent
                  ? "Send code"
                  : "Verify & sign in"}
              <Icon name="chevron-right" size={18} />
            </Button>
            <small>Your mobile number identifies your patient account.</small>
          </div>
        )}
      </form>
    </div>
  );
}
