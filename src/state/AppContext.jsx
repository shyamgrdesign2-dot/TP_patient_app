import { createContext, useContext, useRef, useState, useEffect } from "react";
import { initialState } from "../services/data";
import { updateState } from "./model";
import { defaultBrand, validBrand } from "../config/brand";
const Context = createContext(null);
const KEY = "tatva-patient-demo-v1";
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
export function AppProvider({ children }) {
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
    () => sessionStorage.getItem("tatva-demo-session") !== "signed-out",
  );
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      setToast({
        message:
          "Your browser could not save this demo. Changes will last for this session.",
        error: true,
      });
    }
  }, [state]);
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
  function signIn() {
    sessionStorage.setItem("tatva-demo-session", "active");
    setSession(true);
  }
  function signOut() {
    sessionStorage.setItem("tatva-demo-session", "signed-out");
    setSession(false);
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
        signOut,
        resetDemo,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
