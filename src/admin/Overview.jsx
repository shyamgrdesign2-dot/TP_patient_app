import { useApp } from "../patient/state/AppContext";
import { locations } from "../shared/brand";
import { allDoctors, dateKey } from "../shared/data";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { PageTitle } from "./AdminParts";
import s from "./Admin.module.css";

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const timeAgo = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};

// Horizontal bars, scaled to the largest value in the set.
function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ul className={s.bars} aria-label={label}>
      {rows.map(([name, value, tone]) => (
        <li key={name}>
          <span className={s.barName}>{name}</span>
          <span className={s.barTrack} aria-hidden="true">
            <span className={s.barFill} data-tone={tone} style={{ width: value ? `max(4px, ${(value / max) * 100}%)` : 0 }} />
          </span>
          <strong className={s.barValue}>{value}</strong>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, sub, children, wide }) {
  return (
    <section className={s.chartCard} data-wide={wide || undefined}>
      <header>
        <h2>{title}</h2>
        {sub && <small>{sub}</small>}
      </header>
      {children}
    </section>
  );
}

// Overview: setup at a glance plus basic analytics from patient activity
// (appointments, requests, ABHA links, callbacks) and messages sent.
export default function Overview({ config }) {
  const { state, brand, dispatch } = useApp();
  const hidden = Object.values(config.doctors || {}).filter((d) => d.active === false).length;
  const month = dateKey().slice(0, 7);
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });
  const visits = state.appointments || [];
  const thisMonth = visits.filter((a) => a.date?.startsWith(month));
  const byStatus = (list, status) => list.filter((a) => a.status === status).length;
  const video = visits.filter((a) => a.type === "Video consultation").length;
  const inClinic = visits.length - video;
  const topDoctors = allDoctors
    .map((d) => [d.name, visits.filter((a) => a.doctorId === d.id).length, "brand"])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const requests = state.packageRequests || [];
  const campaigns = config.campaigns || [];
  const sent = campaigns.filter((c) => c.status === "Delivered");
  const reached = sent.reduce((n, c) => n + (c.recipients || 0), 0);
  const credits = config.credits ?? 4820;
  const members = state.members || [];
  const abhaLinked = members.filter((m) => state.healthLinks?.[m.id]?.abha).length;
  const callbacks = state.callbackRequests || [];
  const waiting = callbacks.filter((r) => r.status === "Requested");
  const stats = [
    ["Patients on the app", members.length, "profile-2user"],
    ["Upcoming appointments", byStatus(visits, "Confirmed"), "calendar-2"],
    ["Doctors listed", allDoctors.length - hidden, "health"],
    ["Clinics", locations.length, "hospital"],
  ];
  return (
    <>
      <PageTitle title="Overview" sub="How your patient app is set up and used, at a glance." />
      <div className={s.stats}>
        {stats.map(([label, value, icon]) => (
          <div className={s.stat} key={label}>
            <span className={s.statIcon}>
              <Icon name={icon} size={20} bulk />
            </span>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className={s.analytics}>
        <Card title={`Appointments in ${monthName}`} sub={`${thisMonth.length} booked this month`}>
          <Bars
            label="Appointments this month by status"
            rows={[
              ["Upcoming", byStatus(thisMonth, "Confirmed"), "brand"],
              ["Completed", byStatus(thisMonth, "Completed"), "soft"],
              ["Cancelled", byStatus(thisMonth, "Cancelled"), "neutral"],
            ]}
          />
        </Card>

        <Card title="In-clinic vs video" sub={`${visits.length} appointments in all`}>
          <div className={s.split} role="img" aria-label={`In-clinic ${pct(inClinic, visits.length)}%, video ${pct(video, visits.length)}%`}>
            <span data-tone="brand" style={{ flexGrow: inClinic || 0.0001 }} />
            <span data-tone="soft" style={{ flexGrow: video || 0.0001 }} />
          </div>
          <ul className={s.legend}>
            <li data-tone="brand">
              In-clinic <strong>{inClinic}</strong> <small>{pct(inClinic, visits.length)}%</small>
            </li>
            <li data-tone="soft">
              Video <strong>{video}</strong> <small>{pct(video, visits.length)}%</small>
            </li>
          </ul>
        </Card>

        <Card title="Top doctors by bookings">
          <Bars label="Bookings per doctor" rows={topDoctors} />
        </Card>

        <Card title="Package & vaccine requests" sub={`${requests.length} requests`}>
          <Bars
            label="Package and vaccine requests by status"
            rows={[
              ["Requested", byStatus(requests, "Requested"), "brand"],
              ["Confirmed", byStatus(requests, "Confirmed"), "soft"],
              ["Completed", byStatus(requests, "Completed"), "soft"],
              ["Cancelled", byStatus(requests, "Cancelled"), "neutral"],
            ]}
          />
        </Card>

        <Card title="Messages">
          <dl className={s.kpis}>
            <div>
              <dt>Messages sent</dt>
              <dd>{sent.length}</dd>
            </div>
            <div>
              <dt>Patients reached</dt>
              <dd>{reached.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Credits left</dt>
              <dd>{credits.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
        </Card>

        <Card title="ABHA-linked patients" sub="Patients and family members with an ABHA linked">
          <div className={s.meter}>
            <strong>
              {abhaLinked} <small>of {members.length}</small>
            </strong>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} data-tone="brand" style={{ width: `${pct(abhaLinked, members.length)}%` }} />
            </span>
            <small>{pct(abhaLinked, members.length)}% linked</small>
          </div>
        </Card>

        <Card
          wide
          title="Callback requests"
          sub={
            brand.callbackEnabled
              ? `${waiting.length} waiting · patients asked the front desk to call them back`
              : "Turn on “Request a callback” in App configuration → Contacts"
          }
        >
          {callbacks.length ? (
            <table className={s.table} data-compact>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Clinic</th>
                  <th>Requested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {callbacks.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>{r.phone ? `+91 ${r.phone}` : "—"}</td>
                    <td>{locations.find((l) => l.id === r.location)?.name || "—"}</td>
                    <td>{timeAgo(r.createdAt)}</td>
                    <td className={s.rowActions}>
                      {r.status === "Requested" ? (
                        <Button size="sm" variant="tonal" onClick={() => dispatch({ type: "CALLBACK_DONE", id: r.id })}>
                          Mark as called
                        </Button>
                      ) : (
                        <span className={s.status}>Called</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.hint}>No callback requests yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
