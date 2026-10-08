import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../patient/state/AppContext";
import { brandMarkSrc } from "../shared/brand";
import { allDoctors } from "../shared/data";
import { Icon, Badge } from "../shared/ui";
import { Button } from "../patient/components/ui";
import s from "./Admin.module.css";

// Patient messaging, modelled on Tatva Practice "Messages" (bulk SMS /
// WhatsApp campaigns, Pm-Doctor-Portal pages/MessagesData + MessageCreateCampaign)
// with an extra free "App push" channel for the patient app. Sending and
// credit purchases are simulated in this preview.
const CREDIT_COST = { push: 0, sms: 1, whatsapp: 2 };
const CHANNELS = [
  ["push", "App push"],
  ["sms", "SMS"],
  ["whatsapp", "WhatsApp"],
];
const CATEGORIES = ["All templates", "Reminders", "Health camps", "Festivals", "Services"];
const TEMPLATES = [
  {
    id: "followup",
    category: "Reminders",
    name: "Follow-up reminder",
    body: "Hi {patient_name}, it's time for your follow-up with {doctor_name} at {clinic_name}. Book a visit in the app.",
  },
  {
    id: "camp",
    category: "Health camps",
    name: "Health check-up camp",
    body: "Dear {patient_name}, {clinic_name} is hosting a free {camp_name} on {date}. Book your slot in the app.",
  },
  {
    id: "vaccine",
    category: "Reminders",
    name: "Vaccination due",
    body: "Hi {patient_name}, {vaccine_name} is due soon. Book a visit at {clinic_name} through the app.",
  },
  {
    id: "festival",
    category: "Festivals",
    name: "Festival greetings",
    body: "Warm {festival_name} wishes from all of us at {clinic_name}. Stay healthy and safe!",
  },
  {
    id: "service",
    category: "Services",
    name: "New service",
    body: "{clinic_name} now offers {service_name}. Book a visit in the app to learn more.",
  },
  {
    id: "abha",
    category: "Services",
    name: "Link ABHA",
    body: "{patient_name}, link your ABHA in the {clinic_name} app to keep all your health records in one place.",
  },
];
const VISIT_RANGES = ["Till date", "Last week", "Last month", "Last 3 months", "Last 6 months", "Last 1 year"];
const PACKS = [500, 1000, 2000, 5000];

const vars = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
const label = (v) => v.replace(/_/g, " ");
const render = (text, values, brand) =>
  text.replace(/\{(\w+)\}/g, (_, k) =>
    k === "patient_name"
      ? "Aarav"
      : k === "clinic_name"
        ? values.clinic_name || brand.hospitalName
        : values[k] || `{${k}}`,
  );

export default function PushNotifications({ config, setConfig, flash }) {
  const { brand } = useApp();
  const [tab, setTab] = useState("history");
  const [creating, setCreating] = useState(null);
  const [buying, setBuying] = useState(false);
  const credits = config.credits ?? 4820;
  const campaigns = config.campaigns || [];
  const drafts = config.drafts || [];
  const purchases = config.purchases || [];
  const save = (patch) => setConfig({ ...config, ...patch });
  const rows = tab === "history" ? campaigns : drafts;
  return (
    <>
      <header className={s.pageTitle}>
        <div>
          <h1>Messages</h1>
          <p>Engage patients with timely updates and reminders.</p>
        </div>
        <div className={s.titleActions}>
          <Button variant="outline" onClick={() => setBuying(true)}>
            <Icon name="coin" family="money" size={18} /> Available credits: {credits.toLocaleString("en-IN")}
          </Button>
          <Button onClick={() => setCreating({})}>
            <Icon name="add" size={18} /> Choose new template
          </Button>
        </div>
      </header>

      <section className={s.panel} data-flush>
        <div className={s.tabBar}>
          <Tabs value={tab} onValueChange={setTab} size="sm">
            <TabsList aria-label="Messages">
              <TabsTrigger value="history">Campaign history ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
              <TabsTrigger value="purchases">Purchase history ({purchases.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {tab === "purchases" ? (
          purchases.length ? (
            <table className={s.table}>
              <thead>
                <tr><th>#</th><th>Transaction ID</th><th>Description</th><th>Date</th><th>Credits</th><th>Status</th></tr>
              </thead>
              <tbody>
                {purchases.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.id}</td>
                    <td>{p.description}</td>
                    <td>{p.date}</td>
                    <td>+{p.credits.toLocaleString("en-IN")} credits</td>
                    <td><Badge size="sm" variant="soft" color="success">Successful</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title="You haven't purchased any credits yet"
              sub="Buy credits to keep your SMS and WhatsApp messages flowing."
              action="Buy credits"
              onAction={() => setBuying(true)}
            />
          )
        ) : rows.length ? (
          <table className={s.table}>
            <thead>
              <tr>
                <th>#</th><th>Message</th><th>Date & time</th><th>Type</th><th>Target users</th>
                {tab === "history" && <th>Status</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td>
                  <td className={s.msgCell}>
                    <strong>{c.title}</strong>
                    <span>{c.preview}</span>
                  </td>
                  <td>{c.when}</td>
                  <td>{c.channels.map((k) => CHANNELS.find(([x]) => x === k)?.[1]).join(", ")}</td>
                  <td>{c.recipients.toLocaleString("en-IN")}</td>
                  {tab === "history" && (
                    <td>
                      <span className={s.status} data-state={c.status}>
                        {c.status === "Delivered" ? `${c.recipients.toLocaleString("en-IN")} delivered` : "Scheduled"}
                      </span>
                    </td>
                  )}
                  <td className={s.rowActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreating({ ...c.draft, step: 1 })}
                    >
                      {tab === "drafts" ? "Edit" : "Reuse"}
                    </Button>
                    {(tab === "drafts" || c.status === "Scheduled") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        theme="error"
                        onClick={() =>
                          save(
                            tab === "drafts"
                              ? { drafts: drafts.filter((x) => x.id !== c.id) }
                              : { campaigns: campaigns.filter((x) => x.id !== c.id) },
                          )
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "drafts" ? (
          <Empty title="No drafts" sub="Campaigns you save without sending appear here." />
        ) : (
          <Empty
            title="You haven't created any campaigns yet"
            sub="Start creating campaigns to keep your patients informed and engaged."
            action="Choose new template"
            onAction={() => setCreating({})}
          />
        )}
      </section>

      {creating && (
        <CreateCampaign
          initial={creating}
          brand={brand}
          credits={credits}
          onClose={() => setCreating(null)}
          onBuy={() => setBuying(true)}
          onDraft={(d) => {
            save({ drafts: [d, ...drafts.filter((x) => x.id !== d.id)] });
            setCreating(null);
            flash("Saved to drafts");
          }}
          onSend={(c, cost) => {
            save({
              credits: credits - cost,
              campaigns: [c, ...campaigns],
              drafts: drafts.filter((x) => x.id !== c.id),
            });
            setCreating(null);
            setTab("history");
            flash(c.status === "Delivered" ? "Message sent" : "Message scheduled");
          }}
        />
      )}
      {buying && (
        <BuyCredits
          credits={credits}
          onClose={() => setBuying(false)}
          onBuy={(amount) => {
            const added = Math.round(amount * (amount >= 2000 ? 1.2 : 1));
            save({
              credits: credits + added,
              purchases: [
                {
                  id: `TXN${Date.now().toString().slice(-8)}`,
                  description: `Message credits · ₹${amount.toLocaleString("en-IN")}`,
                  date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                  credits: added,
                },
                ...purchases,
              ],
            });
            setBuying(false);
            flash(`${added.toLocaleString("en-IN")} credits added`);
          }}
        />
      )}
    </>
  );
}

function Empty({ title, sub, action, onAction }) {
  return (
    <div className={s.empty}>
      <Icon name="notification-2" size={32} bulk />
      <strong>{title}</strong>
      <small>{sub}</small>
      {action && <Button variant="tonal" onClick={onAction}>{action}</Button>}
    </div>
  );
}

function CreateCampaign({ initial, brand, credits, onClose, onDraft, onSend, onBuy }) {
  const [step, setStep] = useState(initial.step ?? 0);
  const [category, setCategory] = useState("All templates");
  const [template, setTemplate] = useState(initial.template || null);
  const [channel, setChannel] = useState(initial.channel || "push");
  const [values, setValues] = useState(initial.values || {});
  const [title, setTitle] = useState(initial.title || "");
  const [audience, setAudience] = useState(initial.audience || "all");
  const [docs, setDocs] = useState(initial.docs || []);
  const [visited, setVisited] = useState(initial.visited || "Till date");
  const [age, setAge] = useState(initial.age || ["", ""]);
  const [genders, setGenders] = useState(initial.genders || []);
  const [when, setWhen] = useState(initial.when || "now");
  const [at, setAt] = useState(initial.at || "");
  const tpl = TEMPLATES.find((t) => t.id === template);
  const text = tpl ? render(tpl.body, values, brand) : "";
  const recipients = useMemo(() => {
    if (audience === "all") return 1236;
    let n = 1236;
    if (docs.length) n = Math.round((n * docs.length) / allDoctors.length);
    n = Math.round(n * ({ "Till date": 1, "Last week": 0.08, "Last month": 0.22, "Last 3 months": 0.45, "Last 6 months": 0.62, "Last 1 year": 0.81 })[visited]);
    if (age[0] || age[1]) n = Math.round(n * 0.55);
    if (genders.length === 1) n = Math.round(n * 0.5);
    return Math.max(n, 0);
  }, [audience, docs, visited, age, genders]);
  const parts = channel === "sms" ? Math.max(1, Math.ceil(text.length / 160)) : 1;
  const cost = recipients * parts * CREDIT_COST[channel];
  const hour = at ? new Date(at).getHours() : 12;
  const scheduleOk = when === "now" || (at && hour >= 8 && hour < 20);
  const filled = tpl && vars(tpl.body).every((v) => v === "patient_name" || v === "clinic_name" || values[v]);
  const canNext = step === 0 ? !!tpl : filled && title.trim() && scheduleOk && recipients > 0;
  const summary =
    `This ${CHANNELS.find(([k]) => k === channel)[1]} message will be sent ` +
    (when === "now" ? "now" : `on ${new Date(at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`) +
    ` to ${recipients.toLocaleString("en-IN")} patients` +
    (audience === "custom"
      ? `${docs.length ? ` of ${docs.map((id) => allDoctors.find((d) => d.id === id)?.name).join(", ")}` : ""}` +
        `${visited !== "Till date" ? ` who visited in the ${visited.toLowerCase()}` : ""}` +
        `${age[0] || age[1] ? `, aged ${age[0] || 0}–${age[1] || "any"}` : ""}` +
        `${genders.length === 1 ? `, ${genders[0].toLowerCase()} only` : ""}`
      : "") +
    ".";
  const draft = () => ({
    template, channel, values, title, audience, docs, visited, age, genders, when, at,
  });
  const record = (status) => ({
    id: initial.id || crypto.randomUUID(),
    title,
    preview: text,
    channels: [channel],
    recipients,
    when:
      when === "now"
        ? new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : new Date(at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    status,
    draft: draft(),
  });
  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className={s.drawerScrim} onClick={onClose}>
      <aside className={s.drawer} data-full onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Create campaign">
        <header className={s.drawerHead}>
          <h2>Create campaign</h2>
          <ol className={s.steps}>
            {["Choose template", "Configure", "Summary"].map((l, i) => (
              <li key={l} data-state={i < step ? "done" : i === step ? "active" : "todo"}>
                <span>{i < step ? <Icon name="tick-circle" size={16} bulk /> : i + 1}</span>
                {l}
              </li>
            ))}
          </ol>
          <button className={s.iconBtn} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </header>

        {step === 0 && (
          <div className={s.drawerBody}>
            <div className={s.rowBetween}>
              <h3 className={s.sub}>Choose a template</h3>
              <select className={s.input} data-narrow value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Template category">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className={s.templateGrid}>
              {TEMPLATES.filter((t) => category === "All templates" || t.category === category).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={s.templateCard}
                  aria-pressed={template === t.id}
                  onClick={() => {
                    setTemplate(t.id);
                    if (!title) setTitle(t.name);
                    setStep(1);
                  }}
                >
                  <strong>{t.name} <Icon name="chevron-right" size={14} /></strong>
                  <span>
                    {t.body.split(/(\{\w+\})/).map((part, i) =>
                      /^\{\w+\}$/.test(part) ? <em key={i}>{part}</em> : part,
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step >= 1 && tpl && (
          <div className={s.composer}>
            <div className={s.drawerBody}>
              {step === 1 ? (
                <>
                  <h3 className={s.sub}>Send on</h3>
                  <div className={s.chips}>
                    {CHANNELS.map(([k, l]) => (
                      <button key={k} type="button" aria-pressed={channel === k} onClick={() => setChannel(k)}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className={s.rowBetween}>
                    <h3 className={s.sub}>Compose message</h3>
                    <button className={s.linkBtn} onClick={() => setStep(0)}>Change template</button>
                  </div>
                  <label className={s.field}>
                    <span className={s.label}>Campaign name</span>
                    <input className={s.input} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <div className={s.grid2}>
                    {vars(tpl.body)
                      .filter((v) => v !== "patient_name")
                      .map((v) => (
                        <label className={s.field} key={v}>
                          <span className={s.label}>{label(v)}</span>
                          <input
                            className={s.input}
                            type={v === "date" ? "date" : "text"}
                            placeholder={v === "clinic_name" ? brand.hospitalName : `Enter ${label(v)}`}
                            value={values[v] || ""}
                            onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                          />
                        </label>
                      ))}
                  </div>
                  {channel === "sms" && (
                    <small className={s.hint}>
                      {text.length}/160 · Messages over 160 characters count as 2 SMS. Keep it concise to save costs.
                    </small>
                  )}

                  <h3 className={s.sub}>
                    Who will receive this message? <span className={s.count}>({recipients.toLocaleString("en-IN")} patients)</span>
                  </h3>
                  <div className={s.chips}>
                    {[["all", "All patients"], ["custom", "Custom"]].map(([k, l]) => (
                      <button key={k} type="button" aria-pressed={audience === k} onClick={() => setAudience(k)}>{l}</button>
                    ))}
                  </div>
                  {audience === "custom" && (
                    <div className={s.filterBox}>
                      <span className={s.label}>Patients of these doctors</span>
                      <div className={s.chips}>
                        {allDoctors.map((d) => (
                          <button key={d.id} type="button" aria-pressed={docs.includes(d.id)} onClick={() => toggle(docs, setDocs, d.id)}>{d.name}</button>
                        ))}
                      </div>
                      <span className={s.label}>Patients who visited</span>
                      <select className={s.input} value={visited} onChange={(e) => setVisited(e.target.value)}>
                        {VISIT_RANGES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <span className={s.label}>Age range (years)</span>
                      <div className={s.ageRow}>
                        <input className={s.input} type="number" min="0" placeholder="Min" value={age[0]} onChange={(e) => setAge([e.target.value, age[1]])} aria-label="Minimum age" />
                        <span className={s.muted}>to</span>
                        <input className={s.input} type="number" min="0" placeholder="Max" value={age[1]} onChange={(e) => setAge([age[0], e.target.value])} aria-label="Maximum age" />
                      </div>
                      <span className={s.label}>Gender</span>
                      <div className={s.chips}>
                        {["Male", "Female", "Other"].map((g) => (
                          <button key={g} type="button" aria-pressed={genders.includes(g)} onClick={() => toggle(genders, setGenders, g)}>{g}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <h3 className={s.sub}>When do you want to send this message?</h3>
                  <div className={s.chips}>
                    {[["now", "Send now"], ["later", "Schedule for later"]].map(([k, l]) => (
                      <button key={k} type="button" aria-pressed={when === k} onClick={() => setWhen(k)}>{l}</button>
                    ))}
                  </div>
                  {when === "later" && (
                    <label className={s.field}>
                      <span className={s.label}>Schedule date & time</span>
                      <input className={s.input} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
                      <small className={s.hint} data-error={(at && !scheduleOk) || undefined}>
                        Scheduling is allowed only between 8 AM and 8 PM.
                      </small>
                    </label>
                  )}
                </>
              ) : (
                <>
                  <h3 className={s.sub}>Summary</h3>
                  <p className={s.summaryText}>{summary}</p>
                  {cost > credits && (
                    <div className={s.shortfall}>
                      <span>
                        Your credit balance is short by <strong>{(cost - credits).toLocaleString("en-IN")} credits</strong>.
                      </span>
                      <Button size="sm" onClick={onBuy}>Buy credits</Button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className={s.phonePreview}>
              <small className={s.muted}>{CHANNELS.find(([k]) => k === channel)[1]} preview</small>
              <div className={s.notifPreview} data-channel={channel}>
                {channel === "push" && (
                  <span className={s.brandMark} data-small>
                    {brandMarkSrc(brand) ? <img src={brandMarkSrc(brand)} alt="" /> : <Icon name="hospital" family="building" bulk size={16} />}
                  </span>
                )}
                <div>
                  {channel === "push" && <strong>{title || "Title"}</strong>}
                  <p>{text}</p>
                </div>
              </div>
              <div className={s.creditBox}>
                <strong>Credit details</strong>
                <dl>
                  <dt>Target patients (A)</dt><dd>{recipients.toLocaleString("en-IN")}</dd>
                  <dt>Messages per patient (B)</dt><dd>{parts}</dd>
                  <dt>Credits per message (C)</dt><dd>{CREDIT_COST[channel]}</dd>
                  <dt>Total credits (A×B×C)</dt><dd><strong>{cost.toLocaleString("en-IN")}</strong></dd>
                  <dt>Balance</dt><dd>{credits.toLocaleString("en-IN")}</dd>
                </dl>
                {channel === "push" && <small className={s.hint}>App push notifications are free.</small>}
              </div>
            </div>
          </div>
        )}

        <footer className={s.drawerFoot}>
          {step > 0 && tpl && (
            <Button variant="ghost" theme="neutral" onClick={() => onDraft({ ...record("Draft"), id: initial.id || crypto.randomUUID() })}>
              Save as draft
            </Button>
          )}
          <span className={s.grow} />
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 2 ? (
            <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button
              disabled={cost > credits}
              onClick={() => onSend(record(when === "now" ? "Delivered" : "Scheduled"), cost)}
            >
              {when === "now" ? "Send message now" : "Schedule message"}
            </Button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function BuyCredits({ credits, onClose, onBuy }) {
  const [amount, setAmount] = useState(1000);
  return (
    <div className={s.drawerScrim} onClick={onClose}>
      <aside className={s.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Buy message credits">
        <header className={s.drawerHead}>
          <h2>Buy message credits</h2>
          <button className={s.iconBtn} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className={s.drawerBody}>
          <div className={s.promo}>Get 20% extra credits on purchases of ₹2,000 or more!</div>
          <span className={s.rolePill}>Available credits: {credits.toLocaleString("en-IN")}</span>
          <div className={s.noteBox}>
            <span>1 credit = ₹1.00</span>
            <span>1 SMS = {CREDIT_COST.sms} credit · 1 WhatsApp message = {CREDIT_COST.whatsapp} credits · App push is free</span>
          </div>
          <div className={s.packs} role="radiogroup" aria-label="Credit packs">
            {PACKS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={amount === p} className={s.roleCard} onClick={() => setAmount(p)}>
                <span className={s.radio} aria-hidden="true" />
                <span>
                  <strong>₹{p.toLocaleString("en-IN")} ({Math.round(p * (p >= 2000 ? 1.2 : 1)).toLocaleString("en-IN")} credits)</strong>
                  {p >= 2000 && <small>Extra 20% included</small>}
                </span>
              </button>
            ))}
          </div>
          <small className={s.hint}>An additional 18% GST applies.</small>
        </div>
        <footer className={s.drawerFoot}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onBuy(amount)}>Buy now</Button>
        </footer>
      </aside>
    </div>
  );
}
