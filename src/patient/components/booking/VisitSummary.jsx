import { doctors, formatDate, money, feeFor } from "../../../shared/data";
import { locations } from "../../../shared/brand";
import { memberMeta } from "../../../shared/age";
import { Avatar, Icon, Meta, PatientName, DoctorName, Button } from "../ui";
import s from "./Booking.module.css";

const VIDEO = "Video consultation";

function Line({ icon, family, label, children }) {
  return (
    <div className={s.line}>
      <span className={s.lineIcon} aria-hidden="true">
        <Icon
          name={icon}
          family={family}
          corner={family ? "rounded" : undefined}
          bulk
          size={20}
        />
      </span>
      <div className={s.lineBody}>
        <span className={s.lineLabel}>{label}</span>
        {children}
      </div>
    </div>
  );
}

// The whole visit on one card: who, when, how, where and what it costs.
// Shared by the manual review step, the assistant's summary and the
// confirmation screen (`contact` adds the clinic's address, call and map).
export default function VisitSummary({
  visit,
  member,
  showDoctor = false,
  contact = false,
  className = "",
}) {
  const doctor = doctors.find((d) => d.id === visit.doctorId);
  const clinic = locations.find((l) => l.id === visit.location);
  const video = visit.type === VIDEO;
  const fee = feeFor(doctor, visit.type);
  return (
    <section
      className={`${s.summary} ${className}`}
      aria-label="Appointment summary"
    >
      {showDoctor && doctor && (
        <div className={s.person}>
          <Avatar
            src={doctor.image}
            name={doctor.name.replace("Dr. ", "")}
            size={48}
            shape="rounded"
            radius={12}
            color="primary"
          />
          <div className={s.lineBody}>
            <strong>
              <DoctorName doctor={doctor} />
            </strong>
            <small>{doctor.specialty}</small>
          </div>
        </div>
      )}
      {member && (
        <div className={s.person} data-testid="summary-patient">
          <Avatar
            name={member.name}
            size={showDoctor ? 48 : 40}
            color="primary"
          />
          <div className={s.lineBody}>
            <span className={s.lineLabel}>Patient</span>
            <strong>
              <PatientName member={member} />
            </strong>
            <Meta
              className={s.sub}
              items={[member.relation, ...memberMeta(member)]}
            />
          </div>
        </div>
      )}
      <Line icon="calendar-2" label="Date and time">
        <strong>
          <Meta>
            {formatDate(visit.date, { weekday: "short" })}
            {visit.time}
          </Meta>
        </strong>
      </Line>
      <Line
        icon={video ? "video" : "hospital"}
        family={video ? "video-audio-image" : "building"}
        label="Visit type"
      >
        <strong>{video ? "Video consultation" : "In clinic"}</strong>
      </Line>
      {video ? (
        <Line icon="location" label="Where">
          <strong>Online</strong>
          <span className={s.sub}>
            Join from My visits 15 minutes before your slot.
          </span>
        </Line>
      ) : (
        clinic && (
          <Line icon="location" label="Hospital">
            <strong>{clinic.name}</strong>
            {contact && clinic.mapsUrl ? (
              <a
                className={`${s.sub} ${s.contactLink}`}
                href={clinic.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Directions to ${clinic.name} clinic`}
              >
                {clinic.address}
              </a>
            ) : (
              <span className={s.sub}>{clinic.address}</span>
            )}
            {contact && (
              <span className={s.contact}>
                {clinic.phone && (
                  <a
                    className={s.contactLink}
                    href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}
                    aria-label={`Call ${clinic.name} clinic on ${clinic.phone}`}
                  >
                    {clinic.phone}
                  </a>
                )}
              </span>
            )}
          </Line>
        )
      )}
      <div className={s.fee}>
        <div className={s.lineBody}>
          <span className={s.lineLabel}>Consultation fee</span>
          <span className={s.sub}>
            Pay at hospital. Nothing is collected now.
          </span>
        </div>
        <strong>{fee != null ? money(fee) : "Payable at the clinic"}</strong>
      </div>
    </section>
  );
}
