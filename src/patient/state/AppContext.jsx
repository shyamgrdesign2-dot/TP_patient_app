import { createContext, useContext, useRef, useState, useEffect } from "react";
import { clearFiles } from "../services/files";
import { initialState } from "../../shared/data";
import { updateState } from "./model";
import {
  defaultBrand,
  validBrand,
  loadBrandFonts,
  brandMarkSrc,
} from "../../shared/brand";
const Context = createContext(null);
const KEY = "tatva-patient-demo-v1";
const ACCOUNTS = "tatva-demo-accounts";
const BRAND = "tatva-brand-preview";
const DEFAULT_ICON = "/icons/app-192.png";
// Point the favicon and home-screen icon at the hospital mark when set.
function setDocumentIcons(brand) {
  const href = brandMarkSrc(brand) || DEFAULT_ICON;
  for (const rel of ["icon", "apple-touch-icon"]) {
    let link = document.head.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (rel === "icon") link.type = "image/png";
    if (link.getAttribute("href") !== href) link.href = href;
  }
}
const ownerPhone = (account) =>
  account?.accountPhone ||
  account?.members?.find((m) => m.relation === "Self")?.phone;
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] != null).map((k) => [k, obj[k]]));
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
export function AppProvider({ children }) {
  const [accountDeleted, setAccountDeleted] = useState(() =>
    read("tatva-account-deleted", false),
  );
  const [state, setState] = useState(() => {
    const saved = read(KEY, null);
    if (!(saved?.version === 1 && saved.members?.length)) return initialState();
    // Bills are view-only now; older saves used "Unpaid" for outstanding.
    saved.bills = (saved.bills || []).map((b) =>
      b.status === "Unpaid" ? { ...b, status: "Outstanding" } : b,
    );
    // Older appointment notices were plain text; link them to their visit.
    saved.notifications = (saved.notifications || []).map((n) => {
      if (n.type) return n;
      const m = /on (\d{4}-\d{2}-\d{2}) at (.+?) is/.exec(n.body || "");
      const visit =
        m &&
        (saved.appointments || []).find(
          (a) =>
            a.date === m[1] && a.time === m[2] && a.memberId === n.memberId,
        );
      return visit
        ? { ...n, type: "appointment", appointmentId: visit.id, body: "" }
        : { ...n, type: n.route === "/records" ? "report" : "general" };
    });
    // Bring in hospital data added since this save (past visits with their
    // prescription and bill), keeping the patient's own changes.
    // Runs once per save (seedVersion), so items the patient later removes
    // don't come back.
    const seed = initialState();
    for (const key of (saved.seedVersion || 0) < 3
      ? ["appointments", "records", "bills"]
      : []) {
      const have = new Map((saved[key] || []).map((x) => [x.id, x]));
      const fresh = seed[key].filter((x) => !have.has(x.id));
      saved[key] = [
        ...(saved[key] || []).map((x) => {
          const s = seed[key].find((y) => y.id === x.id);
          if (!s) return x;
          const { note: _note, ...rest } = x;
          return { ...(s.note ? x : rest), ...pick(s, ["rx", "appointmentId", "doctorId"]) };
        }),
        ...fresh,
      ];
    }
    // Package and vaccine booking requests arrived later; keep the patient's
    // own requests and any status the hospital has set.
    const have = new Set((saved.packageRequests || []).map((r) => r.id));
    saved.packageRequests = [
      ...(saved.packageRequests || []),
      ...seed.packageRequests.filter((r) => !have.has(r.id)),
    ];
    saved.seedVersion = 3;
    return saved;
  });
  const stateRef = useRef(state);
  // Another tab (the hospital console updating a booking request, or the
  // app open twice) saved newer data for this account: pick it up so this
  // tab does not overwrite it with an older copy.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if (
          next?.version === 1 &&
          next.members?.length &&
          ownerPhone(next) === ownerPhone(stateRef.current)
        ) {
          stateRef.current = next;
          setState(next);
        }
      } catch {
        /* ignore unreadable saves from other tabs */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const [brand, setBrand] = useState(() => {
    const saved = read(BRAND, defaultBrand);
    return validBrand(saved) ? { ...defaultBrand, ...saved } : defaultBrand;
  });
  // The admin console saved a new brand (logo, colours, fonts) in another
  // tab or in this tab's preview frame: apply it here without a reload.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== BRAND || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if (validBrand(next)) setBrand({ ...defaultBrand, ...next });
      } catch {
        /* ignore unreadable saves from other tabs */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Save a brand now and report whether it fit in this browser's storage,
  // so the console can say so instead of silently losing the logo.
  function saveBrand(next) {
    try {
      localStorage.setItem(BRAND, JSON.stringify(next));
    } catch {
      return false;
    }
    setBrand(next);
    return true;
  }
  const [toast, setToast] = useState(null);
  const [agentRequest, setAgentRequest] = useState(null);
  const [session, setSession] = useState(
    () =>
      !accountDeleted &&
      sessionStorage.getItem("tatva-demo-session") !== "signed-out",
  );
  useEffect(() => {
    if (accountDeleted) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      setToast({
        message:
          "Your browser could not save this demo. Changes will last for this session.",
        error: true,
      });
    }
  }, [state, accountDeleted]);
  useEffect(() => {
    try {
      localStorage.setItem(BRAND, JSON.stringify(brand));
    } catch {
      /* preview remains usable in memory */
    }
    loadBrandFonts(brand);
    document.title = `${brand.name} · Your health, connected`;
    document.querySelector('meta[name="theme-color"]').content = brand.primary;
    setDocumentIcons(brand);
  }, [brand]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  function dispatch(action) {
    const next = updateState(stateRef.current, action);
    stateRef.current = next;
    setState(next);
    return next;
  }
  const notify = (message, error = false) =>
    setToast({ id: crypto.randomUUID(), message, error });
  const activeMember =
    state.members.find((m) => m.id === state.activeMember) || state.members[0];
  function findAccount(phone) {
    if (!accountDeleted && ownerPhone(stateRef.current) === phone)
      return stateRef.current;
    return read(ACCOUNTS, {})[phone] || null;
  }
  function signIn(phone, profile) {
    if (phone) {
      const accounts = read(ACCOUNTS, {});
      if (!accountDeleted)
        accounts[ownerPhone(stateRef.current)] = stateRef.current;
      let next = findAccount(phone);
      if (!next && profile) {
        if (!["Male", "Female", "Other"].includes(profile.gender))
          throw new Error("Please select gender");
        next = initialState();
        for (const key of [
          "appointments",
          "records",
          "bills",
          "notifications",
          "requests",
          "packageRequests",
          "contacts",
          "feedback",
        ])
          next[key] = [];
        next.accountPhone = phone;
        next.members = [
          {
            id: "self",
            name: profile.name.trim(),
            dob: profile.dob,
            relation: "Self",
            gender: profile.gender,
            blood: "",
            phone,
            email: "",
            mrn: "",
            allergies: "",
            access: "Full access",
          },
        ];
      }
      if (!next) throw new Error("Complete your profile to continue.");
      if (ownerPhone(stateRef.current) !== phone)
        localStorage.removeItem("tatva-demo-credential");
      accounts[phone] = next;
      localStorage.setItem(ACCOUNTS, JSON.stringify(accounts));
      stateRef.current = next;
      setState(next);
    }
    localStorage.removeItem("tatva-account-deleted");
    setAccountDeleted(false);
    sessionStorage.setItem("tatva-demo-session", "active");
    setSession(true);
  }
  function signOut() {
    setAgentRequest(null);
    sessionStorage.setItem("tatva-demo-session", "signed-out");
    setSession(false);
  }
  async function deleteAccount() {
    const accounts = read(ACCOUNTS, {});
    delete accounts[ownerPhone(stateRef.current)];
    await clearFiles(
      Object.values(accounts).flatMap((account) =>
        account.records.map((record) => record.id),
      ),
    );
    localStorage.setItem(ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem("tatva-account-deleted", "true");
    localStorage.removeItem(KEY);
    localStorage.removeItem("tatva-demo-credential");
    setAccountDeleted(true);
    signOut();
    const next = initialState();
    stateRef.current = next;
    setState(next);
    notify("Your local demo account and uploaded files have been deleted.");
  }
  function resetDemo() {
    const next = initialState();
    stateRef.current = next;
    setState(next);
    setBrand(defaultBrand);
    localStorage.removeItem("tatva-demo-credential");
    notify("Sample data reset.");
  }
  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        brand,
        setBrand,
        saveBrand,
        toast,
        notify,
        activeMember,
        session,
        signIn,
        findAccount,
        signOut,
        resetDemo,
        deleteAccount,
        agentRequest,
        openAgent: (request) =>
          setAgentRequest({
            ...request,
            memberId: stateRef.current.activeMember,
            requestId: crypto.randomUUID(),
          }),
        closeAgent: () => setAgentRequest(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
