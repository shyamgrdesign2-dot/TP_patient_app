import BookingAssistant from "./BookingAssistant";
import { useNavigate, useSearchParams } from "react-router-dom";
import MiraAvatar from "../MiraAvatar";
import { Icon, MemberContext, PageHeader, Sheet } from "../ui";
import s from "../../App.module.css";
import b from "./Booking.module.css";

export default function BookingStart() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const assistant = params.get("mode") === "assistant";
  if (assistant)
    return (
      <BookingAssistant
        onManual={(answers) =>
          navigate(
            answers.doctorId
              ? `/book/${answers.doctorId}?mode=manual`
              : "/doctors?mode=manual",
            { replace: true, state: { prefill: answers } },
          )
        }
      />
    );
  return (
    <div className={s.page}>
      <PageHeader
        title={assistant ? "Book with AI assistant" : "Book an appointment"}
      />
      <MemberContext />
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
            onClick={() => navigate("/book?mode=assistant", { replace: true })}
          >
            <span className={b.optionIcon}>
              <MiraAvatar size={44} />
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
            onClick={() => navigate("/doctors?mode=manual", { replace: true })}
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
    </div>
  );
}
