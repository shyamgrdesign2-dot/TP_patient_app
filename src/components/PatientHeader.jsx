import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { locations, distanceKm } from "../config/brand";
import {
  Avatar,
  Icon,
  IconButton,
  Button,
  Sheet,
  FamilySheet,
  Notice,
  ErrorText,
  Empty,
} from "./ui";
import s from "../App.module.css";

export default function PatientHeader() {
  const { state, activeMember, brand, dispatch } = useApp();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState(null);
  const hospital = locations.find((l) => l.id === state.location);
  const notices = state.notifications.filter(
    (n) => !n.memberId || n.memberId === activeMember.id,
  );
  const unread = notices.filter((n) => !n.read).length;
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
    <>
      <header className={s.patientHeader}>
        <div className={s.patientIdentity}>
          <div className={s.grow}>
            <button
              className={s.headerLocation}
              aria-label={`${brand.hospitalName}, ${hospital.name}. Change location`}
              aria-haspopup="dialog"
              aria-expanded={sheet === "location"}
              onClick={() => setSheet("location")}
            >
              <Icon name="location" size={24} bulk />
              <span>{hospital.name}</span>
              <Icon name="chevron-right" size={18} />
            </button>
            <button
              className={s.headerPatient}
              aria-label={`Care for ${activeMember.name}. Switch patient`}
              aria-haspopup="dialog"
              aria-expanded={sheet === "family"}
              onClick={() => setSheet("family")}
            >
              <span>
                Care for <strong>{activeMember.name.split(" ")[0]}</strong>
              </span>
              <Icon name="chevron-down" size={14} />
            </button>
          </div>
          <div className={s.headerActions}>
            <IconButton
              name="notification-2"
              label="Notifications"
              badge={unread}
              aria-haspopup="dialog"
              aria-expanded={sheet === "notifications"}
              onClick={() => setSheet("notifications")}
            />
            <button
              className={s.avatarButton}
              aria-label="Switch family profile"
              aria-haspopup="dialog"
              aria-expanded={sheet === "family"}
              onClick={() => setSheet("family")}
            >
              <Avatar name={activeMember.name} size={38} color="primary" />
            </button>
          </div>
        </div>
      </header>
      <FamilySheet open={sheet === "family"} onClose={() => setSheet(null)} />
      <Sheet
        open={sheet === "location"}
        onClose={() => setSheet(null)}
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
            data-selected={state.location === location.id}
            onClick={() => {
              dispatch({ type: "LOCATION", id: location.id });
              setSheet(null);
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
            <Icon
              name={
                state.location === location.id ? "tick-circle" : "chevron-right"
              }
            />
          </button>
        ))}
        <Notice>Sample locations for this hospital preview.</Notice>
      </Sheet>
      <Sheet
        open={sheet === "notifications"}
        onClose={() => setSheet(null)}
        title="Your updates"
        description={
          unread
            ? `${unread} unread · For ${activeMember.name.split(" ")[0]}`
            : "You’re all caught up"
        }
        footer={
          <Button
            variant="tonal"
            fullWidth
            onClick={() => dispatch({ type: "READ_NOTICE", id: "all" })}
          >
            Mark all as read
          </Button>
        }
      >
        {notices.length ? (
          notices.map((notice) => (
            <button
              className={s.notificationCard}
              key={notice.id}
              data-unread={!notice.read}
              onClick={() => {
                dispatch({ type: "READ_NOTICE", id: notice.id });
                setSheet(null);
                navigate(notice.route);
              }}
            >
              <span className={s.rowIcon}>
                <Icon name={notice.icon} bulk />
              </span>
              <span className={s.grow}>
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
                <small>{notice.date}</small>
              </span>
              {!notice.read && <span className={s.newDot} />}
            </button>
          ))
        ) : (
          <Empty
            icon="notification-2"
            title="No updates yet"
            description="Your hospital updates will appear here."
          />
        )}
      </Sheet>
    </>
  );
}
