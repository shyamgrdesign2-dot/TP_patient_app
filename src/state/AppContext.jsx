import { createContext, useContext, useRef, useState, useEffect } from "react";
import { clearFiles } from "../services/files";
import { initialState } from "../services/data";
import { updateState } from "./model";
import { defaultBrand, validBrand } from "../config/brand";
const Context = createContext(null);
const KEY = "tatva-patient-demo-v1";
const ACCOUNTS = "tatva-demo-accounts";
const ownerPhone = (account) =>
  account?.accountPhone ||
  account?.members?.find((m) => m.relation === "Self")?.phone;
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
    return saved?.version === 1 && saved.members?.length
      ? saved
      : initialState();
  });
  const stateRef = useRef(state);
  const [brand, setBrand] = useState(() => {
    const saved = read("tatva-brand-preview", defaultBrand);
    return validBrand(saved) ? { ...defaultBrand, ...saved } : defaultBrand;
  });
  const [toast, setToast] = useState(null);
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
      localStorage.setItem("tatva-brand-preview", JSON.stringify(brand));
    } catch {
      /* preview remains usable in memory */
    }
    document.title = `${brand.name} · Your health, connected`;
    document.querySelector('meta[name="theme-color"]').content = brand.primary;
  }, [brand]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  function dispatch(action) {
    const next = updateState(stateRef.current, action);
    stateRef.current = next;
    setState(next);
    return next;
  }
  const notify = (message, error = false) => setToast({ message, error });
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
        next = initialState();
        for (const key of [
          "appointments",
          "records",
          "bills",
          "notifications",
          "vaccines",
          "requests",
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
            gender: "Prefer not to say",
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
        toast,
        notify,
        activeMember,
        session,
        signIn,
        findAccount,
        signOut,
        resetDemo,
        deleteAccount,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
