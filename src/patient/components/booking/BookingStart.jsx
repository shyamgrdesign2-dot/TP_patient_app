import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doctors } from "../../../shared/data";
import { useApp } from "../../state/AppContext";
import { AiSpark } from "../AiNote";
import {
  Avatar,
  Button,
  Field,
  Icon,
  MemberContext,
  PageHeader,
  Sheet,
} from "../ui";
import s from "../../App.module.css";
import b from "./Booking.module.css";

export default function BookingStart() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state, activeMember } = useApp();
  const [query, setQuery] = useState("");
  const assistant = params.get("mode") === "assistant";
  const available = doctors.filter((doctor) =>
    doctor.locations.includes(state.location),
  );
  const matches = available.filter((doctor) =>
    `${doctor.name} ${doctor.specialty} ${doctor.languages}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <div className={s.page}>
      <PageHeader
        title={assistant ? "Book with AI assistant" : "Book an appointment"}
      />
      <MemberContext />
      {assistant ? (
        <>
          <section className={b.startMessage} aria-label="Booking assistant">
            <AiSpark size={24} />
            <div>
              <strong>
                Let’s find your doctor, {activeMember.name.split(" ")[0]}.
              </strong>
              <p>
                Who would you like to see? Search for a doctor or specialty,
                then I’ll help you choose the appointment.
              </p>
            </div>
          </section>
          <Field
            aria-label="Tell the booking assistant which doctor or specialty"
            placeholder="Doctor, specialty or language"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            leftIcon={<Icon name="search-normal" />}
          />
          <div className={b.chooser} aria-live="polite">
            {matches.map((doctor) => (
              <button
                className={b.option}
                type="button"
                key={doctor.id}
                onClick={() =>
                  navigate(`/book/${doctor.id}?mode=assistant`, {
                    state: { prefill: { memberId: activeMember.id } },
                  })
                }
              >
                <Avatar name={doctor.name} src={doctor.image} size={40} />
                <span className={s.grow}>
                  <strong>{doctor.name}</strong>
                  <small>{doctor.specialty}</small>
                </span>
                <Icon name="chevron-right" size={16} />
              </button>
            ))}
            {!matches.length && (
              <p>
                No matching doctors at this location. Try another name or
                specialty.
              </p>
            )}
          </div>
          <Button
            variant="link"
            onClick={() => navigate("/doctors?mode=manual", { replace: true })}
          >
            Book manually instead
          </Button>
          <small className={b.chooserNote}>
            Preview assistant · guided booking
          </small>
        </>
      ) : (
        <Sheet
          open
          onClose={() => navigate(-1)}
          title="How would you like to book?"
        >
          <section className={b.chooser}>
            <button
              type="button"
              className={b.option}
              data-ai
              onClick={() =>
                navigate("/book?mode=assistant", { replace: true })
              }
            >
              <span className={b.optionIcon}>
                <AiSpark size={24} />
              </span>
              <span className={s.grow}>
                <strong>Book with AI assistant</strong>
                <small>
                  Find a doctor and arrange your visit with guided assistance.
                </small>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
            <button
              type="button"
              className={b.option}
              onClick={() =>
                navigate("/doctors?mode=manual", { replace: true })
              }
            >
              <span className={b.optionIcon}>
                <Icon name="calendar-2" size={24} />
              </span>
              <span className={s.grow}>
                <strong>Book manually</strong>
                <small>Browse doctors and choose a date and time.</small>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
          </section>
        </Sheet>
      )}
    </div>
  );
}
