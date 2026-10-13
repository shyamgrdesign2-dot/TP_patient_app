import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { normalizeRecord } from "../services/records.js";
import { clearFiles } from "../services/files";
import { initialState } from "../../shared/data";
import { updateState } from "./model";
import { profileProblem } from "../../shared/age";
import {
  defaultBrand,
  validBrand,
  loadBrandFonts,
  brandMarkSrc,
  restoreSavedBrand,
} from "../../shared/brand";
import { setAdminConfigPreview } from "../../shared/hospitalConfig";
const Context = createContext(null);
const KEY = "tatva-patient-demo-v1";
const ACCOUNTS = "tatva-demo-accounts";
const BRAND = "tatva-brand-preview";
const DEFAULT_ICON = defaultBrand.logoMark;
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
  Object.fromEntries(
    keys.filter((k) => obj[k] != null).map((k) => [k, obj[k]]),
  );
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
    for (const key of (saved.seedVersion || 0) < 5
      ? ["appointments", "records", "bills"]
      : []) {
      const have = new Map((saved[key] || []).map((x) => [x.id, x]));
      const fresh = seed[key].filter((x) => !have.has(x.id));
      saved[key] = [
        ...(saved[key] || []).map((x) => {
          const s = seed[key].find((y) => y.id === x.id);
          if (!s) return x;
          const { note: _note, ...rest } = x;
          return {
            ...(s.note ? x : rest),
            ...pick(s, [
              "rx",
              "appointmentId",
              "doctorId",
              "params",
              "category",
              "type",
              "summary",
              "discharge",
              "certificate",
              "note",
            ]),
          };
        }),
        ...fresh,
      ];
    }
    if ((saved.seedVersion || 0) < 6) {
      const ids = new Set((saved.records || []).map((r) => r.id));
      // Add examples only to the original demo profiles, never newly registered patients.
      const demoMembers = new Set(
        saved.members
          .filter((m) =>
            seed.members.some((s) => s.id === m.id && s.mrn === m.mrn),
          )
          .map((m) => m.id),
      );
      saved.records = [
        ...(saved.records || []),
        ...seed.records.filter(
          (r) => r.demo && demoMembers.has(r.memberId) && !ids.has(r.id),
        ),
      ];
      saved.members = saved.members.map((m) => {
        const example = seed.members.find((s) => s.id === m.id);
        return demoMembers.has(m.id) && m.history
          ? {
              ...m,
              history: {
                injuries: example?.history?.injuries || [],
                rehabilitation: example?.history?.rehabilitation || [],
                ...m.history,
              },
            }
          : m;
      });
    }
    if ((saved.seedVersion || 0) < 7) {
      const ids = new Set((saved.records || []).map((r) => r.id));
      const demoMembers = new Set(
        saved.members
          .filter((m) =>
            seed.members.some((s) => s.id === m.id && s.mrn === m.mrn),
          )
          .map((m) => m.id),
      );
      saved.records = [
        ...(saved.records || []),
        ...seed.records.filter(
          (r) =>
            r.demo &&
            r.id.startsWith("demo-v7-") &&
            demoMembers.has(r.memberId) &&
            !ids.has(r.id),
        ),
      ];
      saved.members = saved.members.map((m) => {
        if (m.id !== "father" || !demoMembers.has(m.id)) return m;
        const example = seed.members.find((s) => s.id === m.id);
        // Existing clinical entries, including an explicitly empty list, remain untouched.
        return {
          ...m,
          history: {
            ...pick(example.history, [
              "lifestyle",
              "conditions",
              "family",
              "allergies",
              "surgeries",
              "additional",
            ]),
            ...m.history,
          },
        };
      });
    }
    // Package and vaccine booking requests arrived later; keep the patient's
    // own requests and any status the hospital has set.
    const have = new Set((saved.packageRequests || []).map((r) => r.id));
    saved.packageRequests = [
      ...(saved.packageRequests || []),
      ...seed.packageRequests.filter((r) => !have.has(r.id)),
    ];
    // Medical history is kept by the hospital against each member.
    saved.members = (saved.members || []).map((m) => {
      const s = seed.members.find((x) => x.id === m.id);
      return s?.history && s.mrn === m.mrn && !m.history
        ? { ...m, history: s.history }
        : m;
    });
    // Records saved under the older document categories move to their tab.
    saved.records = (saved.records || []).map(normalizeRecord);
    saved.seedVersion = 7;
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
          next.records = (next.records || []).map(normalizeRecord);
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
  const [savedBrand, setBrand] = useState(() => {
    const saved = read(BRAND, defaultBrand);
    return restoreSavedBrand(saved);
  });
  const [brandDraft, setBrandDraft] = useState(null);
  const [, refreshConfig] = useState(0);
  const [configurationPreviewId] = useState(() =>
    window.location.pathname.startsWith("/admin")
      ? crypto.randomUUID()
      : window.self !== window.top
        ? new URLSearchParams(window.location.search).get(
            "configurationPreview",
          )
        : null,
  );
  const previewChannel = useRef(null);
  const ownedPreview = useRef(null);
  const brand = brandDraft || savedBrand;
  const applyPreview = useCallback((payload) => {
    setBrandDraft(payload?.brand || null);
    setAdminConfigPreview(payload?.config || null);
    refreshConfig((version) => version + 1);
  }, []);
  const previewConfiguration = useCallback(
    (nextBrand, nextConfig) => {
      if (!validBrand(nextBrand)) return;
      const payload = { brand: nextBrand, config: nextConfig };
      ownedPreview.current = payload;
      applyPreview(payload);
      previewChannel.current?.postMessage({ type: "preview", payload });
    },
    [applyPreview],
  );
  const clearConfigurationPreview = useCallback(() => {
    if (!ownedPreview.current) return;
    ownedPreview.current = null;
    applyPreview(null);
    previewChannel.current?.postMessage({ type: "preview", payload: null });
  }, [applyPreview]);
  useEffect(() => {
    if (!window.BroadcastChannel || !configurationPreviewId) return;
    const channel = new BroadcastChannel(
      `tatva-configuration-preview-${configurationPreviewId}`,
    );
    previewChannel.current = channel;
    channel.onmessage = ({ data }) => {
      if (data?.type === "request" && ownedPreview.current)
        channel.postMessage({ type: "preview", payload: ownedPreview.current });
      if (
        data?.type === "preview" &&
        (!data.payload || validBrand(data.payload.brand))
      )
        applyPreview(data.payload);
    };
    channel.postMessage({ type: "request" });
    const clearOnExit = () => {
      if (ownedPreview.current)
        channel.postMessage({ type: "preview", payload: null });
    };
    window.addEventListener("pagehide", clearOnExit);
    return () => {
      clearOnExit();
      window.removeEventListener("pagehide", clearOnExit);
      channel.close();
      previewChannel.current = null;
      setAdminConfigPreview(null);
    };
  }, [applyPreview, configurationPreviewId]);
  // The admin console saved a new brand (logo, colours, fonts) in another
  // tab or in this tab's preview frame: apply it here without a reload.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== BRAND || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if (validBrand(next)) {
          const restored = restoreSavedBrand(next);
          setBrand((current) =>
            JSON.stringify(current) === JSON.stringify(restored)
              ? current
              : restored,
          );
        }
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
    clearConfigurationPreview();
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
  // Persist the initial migration once. Storage events are read-only: echoing
  // them back can race newer saves across open previews and patient tabs.
  const initialBrand = useRef(savedBrand);
  useEffect(() => {
    try {
      const serialized = JSON.stringify(initialBrand.current);
      if (localStorage.getItem(BRAND) !== serialized)
        localStorage.setItem(BRAND, serialized);
    } catch {
      /* preview remains usable in memory */
    }
  }, []);
  useEffect(() => {
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
        const problem = profileProblem(
          { ...profile, phone },
          { relation: false },
        );
        if (problem) throw new Error(problem);
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
            ...(profile.dobFromAge ? { dobFromAge: true } : {}),
            relation: "Self",
            gender: profile.gender,
            blood: "",
            phone,
            email: "",
            mrn: "",
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
    saveBrand(defaultBrand);
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
        configurationPreviewId,
        previewConfiguration,
        clearConfigurationPreview,
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
