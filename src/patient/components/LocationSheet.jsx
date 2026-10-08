import { useState } from "react";
import { useApp } from "../state/AppContext";
import { locations, distanceKm } from "../../shared/brand";
import { Icon, Button, Sheet, Notice, ErrorText } from "./ui";
import s from "../App.module.css";

// Branch picker shared by the Home header and any page scoped to a branch.
export default function LocationSheet({ open, onClose }) {
  const { state, brand, dispatch } = useApp();
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState(null);
  function findNearest() {
    setLocating(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Location is unavailable. Choose your hospital below.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setNearest(
          [...locations].sort(
            (a, b) => distanceKm(point, a) - distanceKm(point, b),
          )[0].id,
        );
        setLocating(false);
      },
      () => {
        setError("Location access is unavailable. Choose a hospital below.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Your hospital"
      description={brand.hospitalName}
    >
      <Button
        variant="tonal"
        leftIcon={<Icon name="gps" />}
        loading={locating}
        onClick={findNearest}
      >
        Find nearest location
      </Button>
      <ErrorText>{error}</ErrorText>
      {locations.map((location) => (
        <button
          className={s.selectionCard}
          key={location.id}
          role="radio"
          aria-checked={state.location === location.id}
          data-selected={state.location === location.id}
          onClick={() => {
            dispatch({ type: "LOCATION", id: location.id });
            onClose();
          }}
        >
          <span className={s.rowIcon}>
            <Icon name="location" size={24} />
          </span>
          <span className={s.grow}>
            <strong>
              {location.name}
              {nearest === location.id ? " · Nearest" : ""}
            </strong>
            <small>{location.address}</small>
            <small>{location.hours}</small>
          </span>
          <span
            className={s.radioMark}
            data-checked={state.location === location.id || undefined}
            aria-hidden="true"
          />
        </button>
      ))}
    </Sheet>
  );
}

// Compact header chip showing the current branch; opens the picker.
export function LocationChip() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const hospital = locations.find((l) => l.id === state.location);
  return (
    <>
      <button
        className={s.locationChip}
        aria-label={`${hospital.name}. Change location`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="location" size={16} bulk />
        <span>{hospital.name}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      <LocationSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
