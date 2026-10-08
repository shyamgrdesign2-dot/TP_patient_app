import s from "./DemoOnly.module.css";
// This release is a demo. Any other VITE_PATIENT_MODE blocks both apps until
// a verified patient API and production authentication are connected.
export default function DemoOnly({ children }) {
  if (
    import.meta.env.VITE_PATIENT_MODE &&
    import.meta.env.VITE_PATIENT_MODE !== "demo"
  )
    return (
      <div className={s.modeBlocked}>
        <h1>Patient service not configured</h1>
        <p>
          This release provides a demo only. A verified patient API and
          production authentication must be connected before live use.
        </p>
      </div>
    );
  return children;
}
