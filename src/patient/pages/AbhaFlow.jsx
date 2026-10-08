import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { abhaAddress } from "../services/abha";
import { Button, Icon, Sheet, AbhaLogo, ErrorText } from "../components/ui";
import s from "./AbhaFlow.module.css";

// Patient-side replica of the Tatva Practice "Create/ Link ABHA" drawer
// (Pm-Doctor-Portal src/components/abha): create via Aadhaar OTP or
// biometric, or link an existing ABHA by mobile, ABHA address or number.
// Sample flow: the verification code is 123456.
const CODE = "123456";
const DOMAIN = "@abdm";
const wait = (ms) =>
  new Promise((r) =>
    setTimeout(
      r,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms,
    ),
  );

function OtpBoxes({ value, onChange, invalid }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);
  return (
    <div className={s.otp} data-invalid={invalid || undefined}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(n) => (refs.current[i] = n)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          value={d.trim()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) {
              onChange(v.slice(0, 6));
              refs.current[Math.min(5, v.length - 1)]?.focus();
              return;
            }
            const next = digits.slice();
            next[i] = v || " ";
            onChange(next.join("").replace(/\s+$/, ""));
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d.trim() && i > 0)
              refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

function Resend() {
  const [left, setLeft] = useState(30);
  useEffect(() => {
    if (!left) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <p className={s.resend}>
      Didn’t receive OTP?{" "}
      <button type="button" disabled={left > 0} onClick={() => setLeft(30)}>
        {left
          ? `Resend OTP in 00:${String(left).padStart(2, "0")}`
          : "Resend OTP"}
      </button>
    </p>
  );
}

function AadhaarInput({ value, onChange, invalid }) {
  const refs = useRef([]);
  const parts = [value.slice(0, 4), value.slice(4, 8), value.slice(8, 12)];
  return (
    <div className={s.aadhaar}>
      <div className={s.aadhaarHead}>
        <span className={s.aadhaarArt} aria-hidden="true">
          <Icon name="personalcard" size={22} bulk />
        </span>
        Enter your Aadhaar number
      </div>
      <div className={s.aadhaarRow} data-invalid={invalid || undefined}>
        {parts.map((p, i) => (
          <input
            key={i}
            ref={(n) => (refs.current[i] = n)}
            inputMode="numeric"
            placeholder="X X X X"
            aria-label={`Aadhaar digits ${i * 4 + 1} to ${i * 4 + 4}`}
            maxLength={4}
            value={p}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              const next = parts.slice();
              next[i] = v;
              onChange(next.join(""));
              if (v.length === 4 && i < 2) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !p && i > 0)
                refs.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Terms({ checked, onChange, onView }) {
  return (
    <label className={s.terms}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        I agree with the terms and conditions{" "}
        <button type="button" onClick={onView}>
          View
        </button>
      </span>
    </label>
  );
}

function NavCard({ icon, label, onClick }) {
  return (
    <button type="button" className={s.navCard} onClick={onClick}>
      <span className={s.navIcon}>
        <Icon name={icon} size={20} bulk />
      </span>
      <span className={s.grow}>{label}</span>
      <Icon name="chevron-right" size={16} />
    </button>
  );
}

function Divider({ children }) {
  return (
    <div className={s.divider}>
      <span>{children}</span>
    </div>
  );
}

function Stepper({ steps }) {
  return (
    <ol className={s.stepper}>
      {steps.map((step, i) => (
        <li key={i}>
          <span className={s.stepDot}>{i + 1}</span>
          <div className={s.grow}>{step}</div>
        </li>
      ))}
    </ol>
  );
}

const LINK_METHODS = {
  mobile: {
    title: "Link using mobile number",
    sub: "By entering your mobile number below",
    icon: "call",
  },
  address: {
    title: "Link using ABHA address",
    sub: "By entering your ABHA address below",
    icon: "global",
  },
  number: {
    title: "Link using ABHA number",
    sub: "By entering your ABHA number below",
    icon: "personalcard",
  },
};

export default function AbhaFlow() {
  const navigate = useNavigate();
  const { activeMember, dispatch, notify } = useApp();
  const [history, setHistory] = useState(["create"]);
  const screen = history.at(-1);
  const go = (next) => setHistory((h) => [...h, next]);
  const back = () =>
    history.length > 1 ? setHistory((h) => h.slice(0, -1)) : navigate(-1);

  const [aadhaar, setAadhaar] = useState("");
  const [terms, setTerms] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);
  const [method, setMethod] = useState("otp");
  const [menu, setMenu] = useState(false);
  const [otp, setOtp] = useState("");
  const [mobile, setMobile] = useState(activeMember.phone || "");
  const [linkMethod, setLinkMethod] = useState("mobile");
  const [linkValue, setLinkValue] = useState("");
  const [address, setAddress] = useState(abhaAddress(activeMember));
  const [custom, setCustom] = useState("");
  const [availability, setAvailability] = useState(null);
  const [bio, setBio] = useState("idle");
  const [capture, setCapture] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setError("");
    setOtp("");
  }, [screen]);

  const found = [abhaAddress(activeMember)];
  const base = activeMember.name.toLowerCase().split(" ")[0];
  // Suggestions always satisfy the 8-18 character rule.
  const pad = (x) =>
    x.length >= 8 ? x : `${x}${"2026".slice(0, 8 - x.length)}`;
  const suggestions = [
    `${base}${activeMember.dob?.slice(2, 4) || "01"}${activeMember.dob?.slice(5, 7) || "01"}`,
    `${base}.${(activeMember.name.split(" ")[1] || "care").toLowerCase()}`,
    `${base}${activeMember.phone?.slice(-4) || "2026"}`,
  ].map((x) => pad(x).slice(0, 18));

  // Availability check with a short debounce, as in the portal.
  useEffect(() => {
    if (screen !== "create_address") return;
    if (!custom) return setAvailability(null);
    if (!/^[a-z0-9._]{8,18}$/i.test(custom)) return setAvailability("invalid");
    setAvailability("checking");
    const t = setTimeout(
      () =>
        setAvailability(
          `${custom.toLowerCase()}${DOMAIN}` === found[0]
            ? "taken"
            : "available",
        ),
      500,
    );
    return () => clearTimeout(t);
  }, [custom, screen]);

  const checkOtp = () => {
    if (otp.length < 6) return (setError("Please enter complete OTP"), false);
    if (otp !== CODE) return (setError("Invalid OTP. Try again!"), false);
    return true;
  };

  async function finish(finalAddress) {
    go("success");
    await wait(2200);
    try {
      dispatch({
        type: "ABHA_LINK",
        memberId: activeMember.id,
        address: finalAddress,
        mobile,
      });
      notify("ABHA created & linked successfully.");
      navigate(-1);
    } catch (e) {
      setError(e.message);
      setHistory(["create"]);
    }
  }

  async function primary() {
    setError("");
    if (screen === "create") {
      if (aadhaar.length !== 12) return setError("Invalid Aadhaar number!");
      if (method === "biometric") return go("biometric_verify");
      setBusy(true);
      await wait(700);
      setBusy(false);
      return go("verify_otp");
    }
    if (screen === "verify_otp") {
      if (!checkOtp()) return;
      if (!/^[6-9]\d{9}$/.test(mobile))
        return setError("Please enter valid mobile number");
      return go("abha_address");
    }
    if (screen === "biometric_verify") return go("abha_address");
    if (screen === "abha_address") return go("otp_code");
    if (screen === "create_address") {
      if (availability !== "available") return;
      setAddress(`${custom.toLowerCase()}${DOMAIN}`);
      return go("otp_code");
    }
    if (screen === "otp_code") return checkOtp() && finish(address);
    if (screen === "link") {
      if (!terms)
        return setError(
          "Please agree to the terms and conditions to continue.",
        );
      if (linkMethod === "mobile" && !/^[6-9]\d{9}$/.test(linkValue))
        return setError("Please enter a valid 10-digit mobile number.");
      if (linkMethod === "address" && !/^[a-z0-9._]{8,18}$/i.test(linkValue))
        return setError(
          "ABHA address must be between 8-18 characters. Please check and try again.",
        );
      if (linkMethod === "number" && linkValue.replace(/\D/g, "").length !== 14)
        return setError(
          "This ABHA number doesn’t look right. Please ensure it is 14 digits and try again.",
        );
      setBusy(true);
      await wait(700);
      setBusy(false);
      return go("mobile_otp");
    }
    if (screen === "mobile_otp") {
      if (!checkOtp()) return;
      return linkMethod === "address"
        ? finish(`${linkValue.toLowerCase()}${DOMAIN}`)
        : go("abha_address");
    }
  }

  const label = {
    create: busy
      ? "Sending OTP…"
      : method === "biometric"
        ? "Verify by biometric"
        : "Verify by OTP",
    verify_otp: "Next",
    biometric_verify: "Next",
    abha_address: "Link ABHA",
    create_address: "Create",
    otp_code: "Link ABHA",
    link: busy ? "Sending…" : "Next",
    mobile_otp: "Verify",
  }[screen];
  const disabled =
    busy ||
    (screen === "create" && (aadhaar.length !== 12 || !terms)) ||
    (screen === "biometric_verify" && bio !== "verified") ||
    (screen === "create_address" && availability !== "available") ||
    (["verify_otp", "otp_code", "mobile_otp"].includes(screen) &&
      otp.length < 6);

  async function getBiometric() {
    setCapture("discovering");
    await wait(900);
    setCapture("capturing");
    await wait(1400);
    setCapture("captured");
    await wait(700);
    setCapture(null);
    setBio("verifying");
    notify("Biometric captured successfully.");
    await wait(1200);
    setBio("verified");
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <button className={s.back} aria-label="Go back" onClick={back}>
          <Icon name="arrow-left3" size={22} />
        </button>
        <h1>
          Create / Link ABHA <AbhaLogo />
        </h1>
      </header>

      <div className={s.body} key={screen}>
        {screen === "create" && (
          <>
            <div className={s.titleBlock}>
              <h2>Create your ABHA</h2>
              <p>By entering your Aadhaar number below</p>
            </div>
            <AadhaarInput
              value={aadhaar}
              onChange={setAadhaar}
              invalid={!!error}
            />
            <ErrorText>{error}</ErrorText>
            <Terms
              checked={terms}
              onChange={setTerms}
              onView={() => setTermsOpen(true)}
            />
            <div className={s.methodRow}>
              <span>Verify using</span>
              <button
                type="button"
                className={s.methodToggle}
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Icon
                  name={method === "otp" ? "sms" : "finger-scan"}
                  size={16}
                />
                {method === "otp" ? "Aadhaar OTP" : "Biometric"}
                <Icon name="chevron-down" size={14} />
              </button>
              {menu && (
                <div className={s.menu} role="menu">
                  {[
                    ["otp", "Aadhaar OTP", "sms"],
                    ["biometric", "Biometric", "finger-scan"],
                  ].map(([k, l, ic]) => (
                    <button
                      key={k}
                      role="menuitemradio"
                      aria-checked={method === k}
                      onClick={() => {
                        setMethod(k);
                        setMenu(false);
                      }}
                    >
                      <Icon name={ic} size={16} />
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Divider>Or link existing ABHA</Divider>
            {Object.entries(LINK_METHODS).map(([k, m]) => (
              <NavCard
                key={k}
                icon={m.icon}
                label={m.title}
                onClick={() => {
                  setLinkMethod(k);
                  setLinkValue("");
                  go("link");
                }}
              />
            ))}
          </>
        )}

        {screen === "verify_otp" && (
          <>
            <div className={s.titleBlock}>
              <h2>Verify with OTP</h2>
              <p>
                OTP sent to Aadhaar registered mobile number ending with ******
                {(mobile || "0000").slice(-4)}.
              </p>
            </div>
            <Stepper
              steps={[
                <>
                  <OtpBoxes value={otp} onChange={setOtp} invalid={!!error} />
                  <Resend />
                </>,
                <>
                  <label className={s.fieldLabel} htmlFor="abha-mobile">
                    Enter mobile number you want to link with ABHA
                  </label>
                  <div className={s.phone}>
                    <Icon name="call" size={18} />
                    <span>+91</span>
                    <input
                      id="abha-mobile"
                      inputMode="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                </>,
              ]}
            />
            <ErrorText>{error}</ErrorText>
            <p className={s.hint}>Use code {CODE} for this preview.</p>
          </>
        )}

        {screen === "biometric_verify" && (
          <>
            <div className={s.titleBlock}>
              <h2>Verify with biometric</h2>
              <p>Get your fingerprint scanned to verify your Aadhaar.</p>
            </div>
            <Stepper
              steps={[
                <>
                  <label className={s.fieldLabel} htmlFor="abha-bio-mobile">
                    Enter mobile number you want to link with ABHA
                  </label>
                  <div className={s.phone}>
                    <Icon name="call" size={18} />
                    <span>+91</span>
                    <input
                      id="abha-bio-mobile"
                      inputMode="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                </>,
                bio === "idle" ? (
                  <Button variant="outline" onClick={getBiometric}>
                    <Icon name="finger-scan" size={18} />
                    Get biometric
                  </Button>
                ) : (
                  <span className={s.pill} data-tone="success">
                    <Icon name="tick-circle" size={16} bulk />
                    Biometric captured successfully
                  </span>
                ),
                <span
                  className={s.pill}
                  data-tone={bio === "verified" ? "success" : "neutral"}
                >
                  {bio === "verified"
                    ? "Aadhaar verified successfully"
                    : bio === "verifying"
                      ? "Verifying Aadhaar…"
                      : "Waiting for biometric"}
                </span>,
              ]}
            />
          </>
        )}

        {screen === "abha_address" && (
          <>
            <div className={s.titleBlock}>
              <h2>
                We found {found.length} ABHA address
                {found.length === 1 ? "" : "es"}
              </h2>
              <p>Please select one to link with your account</p>
            </div>
            <div role="radiogroup" aria-label="ABHA address" className={s.list}>
              {found.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={address === a}
                  className={s.addressCard}
                  onClick={() => setAddress(a)}
                >
                  <span className={s.radio} aria-hidden="true" />
                  <span className={s.grow}>
                    <strong>{activeMember.name}</strong>
                    <small>Address : {a}</small>
                  </span>
                  <AbhaLogo />
                </button>
              ))}
            </div>
            <Divider>or</Divider>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCustom("");
                go("create_address");
              }}
            >
              <Icon name="add" size={18} />
              Create new ABHA address
            </Button>
          </>
        )}

        {screen === "create_address" && (
          <>
            <div className={s.titleBlock}>
              <h2>Create new ABHA address</h2>
              <p>Create a new ABHA address to link with your ABHA account</p>
            </div>
            <label className={s.fieldLabel} htmlFor="abha-new-address">
              ABHA address
            </label>
            <div className={s.suffix}>
              <input
                id="abha-new-address"
                maxLength={18}
                value={custom}
                onChange={(e) =>
                  setCustom(e.target.value.replace(/[^a-z0-9._]/gi, ""))
                }
              />
              <span>{DOMAIN}</span>
            </div>
            <p className={s.availability} data-state={availability || "hint"}>
              {availability === "checking"
                ? "Checking availability…"
                : availability === "available"
                  ? "✓ This ABHA address is available"
                  : availability === "taken"
                    ? "This ABHA address is already taken. Please try another one."
                    : "8-18 characters, alphabets and numbers only"}
            </p>
            <p className={s.fieldLabel}>
              Here are some suggestions you can use:
            </p>
            <div className={s.chips}>
              {suggestions.map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={custom === x}
                  onClick={() => setCustom(x)}
                >
                  {x}
                  {DOMAIN}
                </button>
              ))}
            </div>
          </>
        )}

        {screen === "otp_code" && (
          <>
            <div className={s.addressCard} data-static>
              <span className={s.grow}>
                <strong>{activeMember.name}</strong>
                <small>Address : {address}</small>
              </span>
              <button type="button" className={s.change} onClick={back}>
                Change
              </button>
            </div>
            <div className={s.titleBlock}>
              <h2>OTP verification</h2>
              <p>
                OTP sent to mobile number ending with ******
                {(mobile || "0000").slice(-4)}
              </p>
            </div>
            <OtpBoxes value={otp} onChange={setOtp} invalid={!!error} />
            <Resend />
            <ErrorText>{error}</ErrorText>
            <p className={s.hint}>Use code {CODE} for this preview.</p>
          </>
        )}

        {screen === "link" && (
          <>
            <div className={s.titleBlock}>
              <h2>Link your ABHA</h2>
              <p>{LINK_METHODS[linkMethod].sub}</p>
            </div>
            {linkMethod === "mobile" && (
              <div className={s.phone}>
                <Icon name="call" size={18} />
                <span>+91</span>
                <input
                  aria-label="Mobile number"
                  inputMode="tel"
                  maxLength={10}
                  placeholder="Enter mobile number"
                  value={linkValue}
                  onChange={(e) =>
                    setLinkValue(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            )}
            {linkMethod === "address" && (
              <div className={s.suffix}>
                <input
                  aria-label="ABHA address"
                  maxLength={18}
                  placeholder="Enter your ABHA address"
                  value={linkValue}
                  onChange={(e) =>
                    setLinkValue(
                      e.target.value.replace(DOMAIN, "").replace(/\s/g, ""),
                    )
                  }
                />
                <span>{DOMAIN}</span>
              </div>
            )}
            {linkMethod === "number" && (
              <input
                className={s.input}
                aria-label="ABHA number"
                inputMode="tel"
                maxLength={17}
                placeholder="00-0000-0000-0000"
                value={linkValue}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 14);
                  setLinkValue(
                    [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10), d.slice(10)]
                      .filter(Boolean)
                      .join("-"),
                  );
                }}
              />
            )}
            <ErrorText>{error}</ErrorText>
            <Terms
              checked={terms}
              onChange={setTerms}
              onView={() => setTermsOpen(true)}
            />
            <Divider>Other options to link ABHA</Divider>
            {Object.entries(LINK_METHODS)
              .filter(([k]) => k !== linkMethod)
              .map(([k, m]) => (
                <NavCard
                  key={k}
                  icon={m.icon}
                  label={m.title}
                  onClick={() => {
                    setLinkMethod(k);
                    setLinkValue("");
                    setError("");
                  }}
                />
              ))}
            <Divider>Or create ABHA</Divider>
            <NavCard
              icon="personalcard"
              label="Create ABHA using Aadhaar"
              onClick={() => setHistory(["create"])}
            />
          </>
        )}

        {screen === "mobile_otp" && (
          <>
            <div className={s.titleBlock}>
              <h2>OTP verification</h2>
              <p>
                {linkMethod === "mobile"
                  ? `OTP sent to mobile number ending with ******${linkValue.slice(-4)}.`
                  : linkMethod === "address"
                    ? `OTP sent to mobile number linked with ABHA address ${linkValue}${DOMAIN}.`
                    : `OTP sent to mobile number linked with ABHA number ${linkValue}.`}
              </p>
            </div>
            <OtpBoxes value={otp} onChange={setOtp} invalid={!!error} />
            <Resend />
            <ErrorText>{error}</ErrorText>
            <p className={s.hint}>Use code {CODE} for this preview.</p>
          </>
        )}

        {screen === "success" && (
          <div className={s.success} role="status">
            <span className={s.successMark}>
              <Icon name="tick-circle" size={72} bulk />
            </span>
            <h2>Verified successfully</h2>
            <p>Linking your ABHA…</p>
          </div>
        )}
      </div>

      {screen !== "success" && (
        <div className={s.dock}>
          <Button
            fullWidth
            disabled={disabled}
            loading={busy}
            onClick={primary}
          >
            {label}
          </Button>
        </div>
      )}

      <Sheet
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Terms and conditions"
      >
        <p className={s.termsText}>
          I hereby declare that I am voluntarily sharing my Aadhaar number and
          demographic information issued by UIDAI with the National Health
          Authority (NHA) for the sole purpose of creating my ABHA number. I
          understand that my ABHA number can be used and shared for purposes
          notified by ABDM from time to time, including provision of healthcare
          services. My name, address, age, date of birth, gender and photograph
          may be shared with entities working in the National Digital Health
          Ecosystem (NDHE).
        </p>
        <Button fullWidth onClick={() => setTermsOpen(false)}>
          Got it
        </Button>
      </Sheet>

      <Sheet open={!!capture} onClose={() => {}} title="Aadhaar biometric">
        <div className={s.capture} role="status">
          <span className={s.scan} data-state={capture}>
            <Icon name="finger-scan" size={56} bulk />
          </span>
          <strong>
            {capture === "discovering"
              ? "Discovering device…"
              : capture === "capturing"
                ? "Capturing fingerprint… Please place your thumb on the scanner."
                : "Captured successfully"}
          </strong>
          <ul>
            <li>Place your thumb on the biometric scanner.</li>
            <li>Do not close this while it is capturing.</li>
            <li>This closes automatically.</li>
          </ul>
        </div>
      </Sheet>
    </div>
  );
}
