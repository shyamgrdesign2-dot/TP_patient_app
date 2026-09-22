import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { getCredentialType, verifyDemoCredential } from "../services/demoAuth";
import {
  Button,
  Icon,
  BrandLogo,
  Field,
  ChoiceGroup,
  Notice,
  ErrorText,
  PageHeader,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
export function Welcome() {
  const { brand, signIn } = useApp();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      tag: "YOUR HOSPITAL, WITH YOU",
      title: (
        <>
          Good health.
          <br />
          Closer than ever.
        </>
      ),
      text: "Book your next visit, find your records and care for your family. All in one comforting place.",
    },
    {
      tag: "CARE FOR YOUR WHOLE FAMILY",
      title: (
        <>
          Your people.
          <br />
          Our priority.
        </>
      ),
      text: "A single home for every family member’s appointments, reports and health journey.",
    },
    {
      tag: "EVERY STEP, CONNECTED",
      title: (
        <>
          Less to manage.
          <br />
          More peace of mind.
        </>
      ),
      text: "From your first appointment to your follow-up, stay connected with your hospital.",
    },
  ];
  return (
    <div className={s.welcome}>
      <div className={s.welcomeBrand}>
        <BrandLogo />
        <Button variant="link" size="sm" onClick={() => navigate("/login")}>
          Sign in
        </Button>
      </div>
      <div className={s.welcomeVisual}>
        <img
          src="/images/care.jpg"
          alt="A caring conversation with a healthcare professional"
        />
        <span className={s.floatingTag}>
          <Icon name="heart" bulk /> Care that knows you
        </span>
        <span className={s.floatingTag2}>
          <Icon name="shield-tick" bulk /> Your family, connected
        </span>
      </div>
      <div className={s.welcomeContent} key={slide}>
        <span className={s.eyebrow}>{slides[slide].tag}</span>
        <h1>{slides[slide].title}</h1>
        <p>{slides[slide].text}</p>
      </div>
      <div className={s.slideControls} aria-label="Introduction slides">
        {slides.map((item, i) => (
          <button
            key={i}
            aria-label={`Introduction ${i + 1}`}
            aria-current={i === slide ? "step" : undefined}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>
      <Button
        fullWidth
        size="lg"
        onClick={() => (slide < 2 ? setSlide(slide + 1) : navigate("/login"))}
      >
        {slide < 2 ? "Continue" : "Get started"}
        <Icon name="arrow-right" />
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => {
          signIn();
          navigate("/");
        }}
      >
        Explore the sample app
      </Button>
      <p className={s.footnote}>
        {brand.hospitalName} · Your health, connected
      </p>
    </div>
  );
}
export function Login() {
  const { brand, signIn } = useApp();
  const navigate = useNavigate();
  const [method, setMethod] = useState("Mobile OTP");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [consent, setConsent] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => {
    if (!countdown) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
  function submit(e) {
    e.preventDefault();
    run(async () => {
      if (method === "Mobile OTP" && !sent) {
        if (!/^[6-9]\d{9}$/.test(phone))
          throw new Error("Enter a valid 10-digit Indian mobile number.");
        setSent(true);
        setCountdown(30);
        return;
      }
      if (method === "Mobile OTP") {
        if (code !== "123456") throw new Error("Use the demo code 123456.");
      } else {
        await verifyDemoCredential(code);
      }
      signIn();
      navigate("/");
    });
  }
  return (
    <div className={s.auth}>
      <PageHeader
        title=""
        action={
          <Button variant="link" onClick={() => navigate("/welcome")}>
            About the app
          </Button>
        }
      />
      <div className={s.authBrand}>
        <BrandLogo />
        <div className={s.authIcon}>
          <Icon name={sent ? "message-text" : "heart"} size={48} bulk />
        </div>
        <span className={s.eyebrow}>WELCOME TO YOUR CARE</span>
        <h1>
          {sent
            ? "A little check.\nThen you’re in."
            : "Your health,\nin good hands."}
        </h1>
        <p>
          {sent
            ? `Enter the sample code for +91 ${phone}.`
            : "Sign in or create your patient account."}
        </p>
      </div>
      <ChoiceGroup
        label="Sign-in method"
        options={["Mobile OTP", "Quick PIN", "Password"]}
        value={method}
        onChange={(value) => {
          setMethod(value);
          setSent(false);
          setCode("");
        }}
      />
      <form className={s.stack} onSubmit={submit}>
        {method === "Mobile OTP" && !sent ? (
          <Field
            label="Mobile number"
            leftAddon="+91"
            inputMode="tel"
            maxLength={10}
            autoComplete="tel-national"
            placeholder="Enter your mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
          />
        ) : (
          <Field
            label={
              method === "Mobile OTP"
                ? "6-digit demo code"
                : method === "Quick PIN"
                  ? "Your quick PIN"
                  : "Your password"
            }
            type={method === "Mobile OTP" ? "text" : "password"}
            inputMode={method === "Password" ? "text" : "numeric"}
            maxLength={method === "Password" ? 100 : 6}
            autoComplete={
              method === "Mobile OTP" ? "one-time-code" : "current-password"
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        )}
        <ErrorText>{error}</ErrorText>
        <Button fullWidth size="lg" type="submit" loading={busy}>
          {method === "Mobile OTP" && !sent
            ? "Continue with mobile number"
            : "Sign in to demo"}
          <Icon name="arrow-right" />
        </Button>
        {sent && (
          <div className={s.inlineMeta}>
            <Button
              variant="link"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(30);
                setCode("");
              }}
            >
              {countdown ? `Resend in ${countdown}s` : "Resend demo code"}
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setSent(false);
                setCode("");
              }}
            >
              Change number
            </Button>
          </div>
        )}
      </form>
      <Notice>
        Preview mode · No SMS is sent.{" "}
        {method === "Mobile OTP"
          ? "Use code 123456 to explore the sample patient account."
          : "Set a demo PIN or password in Settings first, or use Mobile OTP."}
      </Notice>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => {
          signIn();
          navigate("/");
        }}
      >
        Continue with sample profile
      </Button>
      <p className={s.footnote}>
        Live sign-in and account creation will use the hospital’s patient
        authentication service.
      </p>
    </div>
  );
}
