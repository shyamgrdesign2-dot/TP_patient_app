import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { needsSymptoms } from "../services/symptomReminders";
import { isVideo } from "../../shared/videoVisit";
import { Button, Icon, PageHeader, Empty, Notice } from "../components/ui";
import VisitSummary from "../components/booking/VisitSummary";
import s from "../App.module.css";
import v from "../components/VisitExperience.module.css";
import b from "../components/booking/Booking.module.css";

// Visits whose arrival animation has already played in this session, so
// coming back from symptoms shows the screen at rest.
const celebrated = new Set();

// Confirmation for a booked visit. It has its own URL, so it survives a
// refresh and Back from "Add symptoms" returns here, not to the booking steps.
export default function BookingSuccess() {
  const { id } = useParams();
  const { state, activeMember, dispatch, openAgent } = useApp();
  const navigate = useNavigate();
  const visit = state.appointments.find((a) => a.id === id);
  const [arrive] = useState(() => !celebrated.has(id));
  useEffect(() => {
    celebrated.add(id);
  }, [id]);
  if (!visit)
    return (
      <div className={s.page}>
        <PageHeader title="Appointment" />
        <Empty
          icon="calendar-2"
          title="We couldn’t find this appointment"
          description="Open My visits to see your upcoming appointments."
          action="Go to My visits"
          onAction={() => navigate("/appointments", { replace: true })}
        />
      </div>
    );
  // Cancelled or completed since: the visit's own details are the right place.
  if (visit.status !== "Confirmed")
    return (
      <Navigate
        to={`/appointments?visit=${encodeURIComponent(visit.id)}`}
        replace
      />
    );
  const member = state.members.find((m) => m.id === visit.memberId);
  return (
    <div className={s.page}>
      <PageHeader
        onBack={() => {
          navigate("/appointments", { replace: true });
          return true;
        }}
      />
      <div
        className={`${s.successHero} ${s.successCompact} ${arrive ? s.successArrive : ""}`}
      >
        <span>
          <Icon name="tick-circle" size={48} bulk />
        </span>
        <h1>Your appointment is confirmed</h1>
      </div>
      <VisitSummary
        visit={visit}
        member={member}
        showDoctor
        contact
        className={b.successCard}
      />
      <Notice icon="calendar-tick" tone="warning">
        {isVideo(visit)
          ? "Join from My visits 15 minutes before your slot and keep any previous reports nearby."
          : "Please arrive 15 minutes before your appointment and bring any previous reports."}
      </Notice>
      <div className={b.successActions}>
        <Button
          variant="solid"
          className={v.aiAction}
          fullWidth
          leftIcon={<Icon name="add-plain" />}
          onClick={() => {
            // Symptoms belong to the visit's patient, whoever is active now.
            if (activeMember.id !== visit.memberId)
              dispatch({ type: "SELECT_MEMBER", id: visit.memberId });
            openAgent({ kind: "symptoms", appointmentId: visit.id });
          }}
        >
          {needsSymptoms(visit) ? "Add symptoms" : "Review symptoms"}
        </Button>
        <Button variant="outline" fullWidth onClick={() => navigate("/")}>
          Go home
        </Button>
      </div>
    </div>
  );
}
