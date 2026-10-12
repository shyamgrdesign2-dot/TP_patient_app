// Conversation engine for "Book with assistant". Pure functions over a
// session, like the symptom collector's script: each patient message (typed,
// spoken or a quick reply) is read leniently for the patient, visit type, day
// and time, then the assistant asks for whatever is still missing.
//
// ctx = {
//   doctor, members, activeMemberId, videoEnabled, today ("YYYY-MM-DD"),
//   firstDay, lastDay (bookable offsets from today), slots (all slot labels),
//   openSlots(date, memberId) -> open slot labels for that day
// }
export const VIDEO = "Video consultation";
export const IN_PERSON = "In-person";

const noon = (key) => new Date(`${key}T12:00:00`);
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function addDays(key, days) {
  const d = noon(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}
const offsetOf = (key, today) => Math.round((noon(key) - noon(today)) / 86400000);
export function dayLabel(key, today) {
  const offset = offsetOf(key, today);
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return noon(key).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
// "tomorrow" or "on Tue, 14 Oct", for the middle of a sentence.
const inSentence = (label) =>
  /^(Today|Tomorrow)$/.test(label) ? label.toLowerCase() : `on ${label}`;
const first = (name) => name.trim().split(/\s+/)[0];

const RELATION_WORDS = [
  ["Self", /\b(me|myself|my ?self|self|mine)\b/],
  ["Father", /\b(father|dad|daddy|papa|pitaji|appa)\b/],
  ["Mother", /\b(mother|mom|mum|mummy|mama|amma|maa)\b/],
  ["Spouse", /\b(spouse|wife|husband|partner)\b/],
  ["Son", /\b(son)\b/],
  ["Daughter", /\b(daughter)\b/],
  ["Brother", /\b(brother|bro)\b/],
  ["Sister", /\b(sister|sis)\b/],
  ["Grandfather", /\b(grandfather|grandpa|granddad|dada|nana)\b/],
  ["Grandmother", /\b(grandmother|grandma|granny|dadi|nani)\b/],
];
const WEEKDAYS = [
  /\bsun(day)?\b/,
  /\bmon(day)?\b/,
  /\btue(s|sday)?\b/,
  /\bwed(nesday)?\b/,
  /\bthu(r|rs|rsday)?\b/,
  /\bfri(day)?\b/,
  /\bsat(urday)?\b/,
];
const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const MONTH = `(${MONTHS.join("|")})[a-z]*`;
const PARTS = [
  ["Morning", /\b(morning|breakfast|early)\b/],
  ["Afternoon", /\b(afternoon|noon|lunch)\b/],
  ["Evening", /\b(evening|night|late|after work)\b/],
];
const hour24 = (slot) => {
  const [h] = slot.split(":").map(Number);
  return (h % 12) + (/pm/i.test(slot) ? 12 : 0);
};
export const partOf = (slot) =>
  hour24(slot) < 12 ? "Morning" : hour24(slot) < 17 ? "Afternoon" : "Evening";
const slotLabel = (h, m) =>
  `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;

// A date in the text, as a key; `rest` is the text with the date removed so
// its numbers are not read again as a time.
function findDate(text, today) {
  let rest = text;
  const take = (match) => {
    rest = rest.replace(match[0], " ");
  };
  const fromParts = (day, month, year) => {
    const base = noon(today);
    const d = new Date(year || base.getFullYear(), month, day, 12);
    if (d.getMonth() !== month || d.getDate() !== day) return null;
    // A day already gone this year means the same day next year.
    if (!year && d < base) d.setFullYear(d.getFullYear() + 1);
    return toKey(d);
  };
  let m;
  if ((m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text))) {
    take(m);
    return { date: fromParts(+m[3], +m[2] - 1, +m[1]), rest };
  }
  if ((m = /\bday after( tomorrow)?\b/.exec(text))) {
    take(m);
    return { date: addDays(today, 2), rest };
  }
  if ((m = /\b(tomorrow|tomm?orow|tmrw|tmr)\b/.exec(text))) {
    take(m);
    return { date: addDays(today, 1), rest };
  }
  if ((m = /\b(today|tonight)\b/.exec(text))) {
    take(m);
    return { date: today, rest };
  }
  if ((m = /\bin (\d{1,2}) days?\b/.exec(text))) {
    take(m);
    return { date: addDays(today, +m[1]), rest };
  }
  if (
    (m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${MONTH}\\b`).exec(
      text,
    ))
  ) {
    take(m);
    return { date: fromParts(+m[1], MONTHS.indexOf(m[2])), rest };
  }
  if ((m = new RegExp(`\\b${MONTH} (\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(text))) {
    take(m);
    return { date: fromParts(+m[2], MONTHS.indexOf(m[1])), rest };
  }
  if ((m = /\b(\d{1,2})[/-](\d{1,2})\b/.exec(text))) {
    take(m);
    return { date: fromParts(+m[1], +m[2] - 1), rest };
  }
  const weekday = WEEKDAYS.findIndex((re) => re.test(text));
  if (weekday >= 0) {
    rest = rest.replace(WEEKDAYS[weekday], " ").replace(/\b(next|this|coming)\b/, " ");
    const ahead = (weekday - noon(today).getDay() + 7) % 7 || 7;
    return { date: addDays(today, ahead), rest };
  }
  if ((m = /\b(\d{1,2})(st|nd|rd|th)\b/.exec(text))) {
    take(m);
    const base = noon(today);
    const month = +m[1] >= base.getDate() ? base.getMonth() : base.getMonth() + 1;
    const d = new Date(base.getFullYear(), month, +m[1], 12);
    return { date: d.getDate() === +m[1] ? toKey(d) : null, rest };
  }
  return { rest };
}

// A clock time in the text, as a slot label ("04:00 PM"). Bare numbers
// ("4") only count while the assistant is asking for the time.
function findTime(text, askingTime) {
  const m =
    /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/.exec(text) ||
    /\b(\d{1,2}):(\d{2})\b/.exec(text) ||
    (askingTime && /\b(\d{1,2})(?:[:.](\d{2}))?\b/.exec(text));
  if (!m) return null;
  let h = +m[1];
  const minutes = +(m[2] || 0);
  const meridiem = (m[3] || "").replace(/\./g, "");
  if (h > 23 || minutes > 59) return null;
  if (meridiem === "pm" && h < 12) h += 12;
  else if (meridiem === "am" && h === 12) h = 0;
  // No am/pm: clinic hours, so 1 to 7 means the afternoon or evening.
  else if (!meridiem && h >= 1 && h <= 7) h += 12;
  return slotLabel(h, minutes);
}

// Everything the message says, without deciding what to do with it.
export function extract(message, ctx, stage) {
  const text = ` ${message.toLowerCase().replace(/[,!?]|\.(?!\d)/g, " ")} `;
  const found = {};
  const byName = ctx.members.filter((m) =>
    new RegExp(`\\b${first(m.name).toLowerCase()}\\b`).test(text),
  );
  if (byName.length === 1) found.memberId = byName[0].id;
  else {
    const relation = RELATION_WORDS.find(([, re]) => re.test(text))?.[0];
    if (relation) {
      const match = ctx.members.filter(
        (m) => (m.relation || "").toLowerCase() === relation.toLowerCase(),
      );
      if (match.length === 1) found.memberId = match[0].id;
      else if (relation !== "Self" || stage === "member")
        found.unknownRelation = relation;
    }
  }
  if (/\b(video|online|tele\w*|virtual|from home|video ?call)\b/.test(text))
    found.type = VIDEO;
  else if (
    /\b(in[- ]?clinic|clinic|in[- ]?person|hospital|physical|offline|walk[- ]?in|face to face|visit the)\b/.test(
      text,
    )
  )
    found.type = IN_PERSON;
  const { date, rest } = findDate(text, ctx.today);
  if (date) found.date = date;
  else if (date === null) found.badDate = true;
  const time = findTime(rest, stage === "time");
  if (time) found.time = time;
  const part = PARTS.find(([, re]) => re.test(rest))?.[0];
  if (part) found.part = part;
  if (/\b(yes|yep|yeah|yup|ok|okay|sure|confirm|book( it)?|go ahead|looks good|correct|done)\b/.test(text))
    found.yes = true;
  if (/\b(no|nope|change|edit|wrong|not right|different)\b/.test(text))
    found.no = true;
  return found;
}

export function createSession(ctx, prefill = {}) {
  return {
    stage: "member",
    memberId: null,
    type: ctx.videoEnabled ? null : IN_PERSON,
    date: null,
    time: null,
    part: null,
    ...prefill,
  };
}

const memberChip = (m) => ({
  label: m.relation === "Self" ? `Myself (${first(m.name)})` : `${first(m.name)} (${m.relation})`,
  text: m.relation === "Self" ? "For me" : `For ${first(m.name)}`,
  set: { memberId: m.id },
});

// Open times for the session's day, narrowed to a part of day when asked.
function timesFor(s, ctx) {
  const open = ctx.openSlots(s.date, s.memberId);
  const inPart = s.part ? open.filter((t) => partOf(t) === s.part) : open;
  return { open, shown: inPart.length ? inPart : open, partEmpty: !!s.part && !inPart.length };
}

function nextStage(s) {
  if (!s.memberId) return "member";
  if (!s.type) return "type";
  if (!s.date) return "day";
  if (!s.time) return "time";
  return "confirm";
}

function ask(s, ctx, lead = "") {
  const say = (text) => [lead, text].filter(Boolean).join("\n\n");
  s.stage = nextStage(s);
  if (s.stage === "member")
    return {
      session: s,
      turn: {
        text: say("Who is this visit for?"),
        chips: [
          ...ctx.members.map(memberChip),
          { label: "Add family member", action: "add-member" },
        ],
      },
    };
  if (s.stage === "type")
    return {
      session: s,
      turn: {
        text: say(
          `Would you like to meet ${ctx.doctor.name} in clinic or on a video consultation?`,
        ),
        chips: [
          { label: "In clinic", text: "In clinic", set: { type: IN_PERSON } },
          { label: "Video consultation", text: "Video consultation", set: { type: VIDEO } },
        ],
      },
    };
  if (s.stage === "day")
    return {
      session: s,
      turn: {
        text: say("Which day works for you?"),
        chips: [
          ...Array.from({ length: 4 }, (_, i) => {
            const date = addDays(ctx.today, ctx.firstDay + i);
            const label = dayLabel(date, ctx.today);
            return { label, text: label, set: { date } };
          }),
          { label: "Another date", text: "Another date", set: { otherDate: true } },
        ],
      },
    };
  if (s.stage === "time") {
    const { shown, partEmpty } = timesFor(s, ctx);
    const day = inSentence(dayLabel(s.date, ctx.today));
    return {
      session: s,
      turn: {
        text: say(
          partEmpty
            ? `There are no ${s.part.toLowerCase()} times left ${day}. Here is what is open. What suits you?`
            : `Here are the open ${s.part ? `${s.part.toLowerCase()} ` : ""}times ${day}. What suits you?`,
        ),
        chips: shown.map((t) => ({ label: t, text: t, set: { time: t } })),
        scroll: true,
      },
    };
  }
  return {
    session: s,
    turn: {
      text: say("Here is your appointment. Shall I book it?"),
      summary: true,
      chips: [],
    },
  };
}

export function greeting(ctx, session) {
  const me = ctx.members.find((m) => m.id === ctx.activeMemberId) || ctx.members[0];
  return ask(
    { ...session },
    ctx,
    `Hi ${first(me.name)}, I’m Mira. I’ll help you book a visit with ${ctx.doctor.name} (${ctx.doctor.specialty}).`,
  );
}

const CHANGE_CHIPS = [
  { label: "Patient", text: "Change the patient", set: { clear: "memberId" } },
  { label: "Visit type", text: "Change the visit type", set: { clear: "type" } },
  { label: "Day", text: "Change the day", set: { clear: "date" } },
  { label: "Time", text: "Change the time", set: { clear: "time" } },
  { label: "Keep it as it is", text: "Keep it as it is", set: { keep: true } },
];

// One patient turn. `set` comes from a quick reply and skips the parsing.
// Returns { session, turn } or { session, confirm: true } to book.
export function respond(session, message, ctx, set) {
  const s = { ...session };
  const found = set || extract(message, ctx, s.stage);
  const notes = [];
  let moved = false;

  if (found.clear) {
    s[found.clear] = null;
    if (found.clear === "date") s.time = null;
    if (found.clear === "time") s.part = null;
    if (found.clear === "type" && !ctx.videoEnabled) {
      s.type = IN_PERSON;
      return ask(s, ctx, "Video consultations aren’t available right now, so this stays an in-clinic visit.");
    }
    return ask(s, ctx, "Sure.");
  }
  if (found.keep) return ask(s, ctx, "Of course.");
  if (found.otherDate) {
    s.stage = "day";
    return {
      session: s,
      turn: {
        text: "Sure. Tell me the date, for example “20 Oct” or “next Friday”.",
        chips: [],
      },
    };
  }
  if (s.stage === "confirm" && !set) {
    const fields = ["memberId", "type", "date", "time", "part"].some(
      (k) => found[k],
    );
    if (found.yes && !found.no && !fields) return { session: s, confirm: true };
    if (!fields)
      return {
        session: s,
        turn: {
          text: found.no
            ? "No problem. What would you like to change?"
            : "Sorry, I didn’t catch that. Tap Confirm appointment to book, or tell me what to change.",
          chips: CHANGE_CHIPS,
          summary: !found.no,
        },
      };
  }

  if (found.memberId && found.memberId !== s.memberId) {
    s.memberId = found.memberId;
    moved = true;
  } else if (found.memberId) moved = true;
  else if (found.unknownRelation)
    notes.push(
      found.unknownRelation === "Self"
        ? "I couldn’t find your own profile."
        : `I couldn’t find a ${found.unknownRelation.toLowerCase()} in your family profiles. You can add one below.`,
    );

  if (found.type) {
    if (found.type === VIDEO && !ctx.videoEnabled)
      notes.push("Video consultations aren’t available right now, so I’ll keep this as an in-clinic visit.");
    else {
      s.type = found.type;
      moved = true;
    }
  }

  if (found.badDate) notes.push("That date doesn’t look right.");
  if (found.date) {
    const offset = offsetOf(found.date, ctx.today);
    if (offset < ctx.firstDay)
      notes.push(
        offset === 0
          ? "Same-day visits can’t be booked here. The earliest I can do is tomorrow."
          : "That day has already passed.",
      );
    else if (offset > ctx.lastDay)
      notes.push(`I can book up to ${ctx.lastDay} days ahead.`);
    else {
      if (found.date !== s.date) s.time = null;
      s.date = found.date;
      moved = true;
    }
  }
  if (found.part) {
    s.part = found.part;
    if (s.time && partOf(s.time) !== found.part) s.time = null;
    moved = true;
  }
  if (found.time) {
    if (!ctx.slots.includes(found.time)) {
      notes.push(`${found.time} isn’t a consultation slot.`);
      s.part = partOf(found.time);
    } else {
      s.time = found.time;
      s.part = null;
      moved = true;
    }
  }
  // A chosen time has to be open on the chosen day for this patient.
  if (s.time && s.date) {
    const { open } = timesFor({ ...s, part: null }, ctx);
    if (!open.includes(s.time)) {
      notes.push(
        `${s.time} is no longer open ${inSentence(dayLabel(s.date, ctx.today))}.`,
      );
      s.part = partOf(s.time);
      s.time = null;
    }
  }
  if (s.date && !ctx.openSlots(s.date, s.memberId).length) {
    notes.push(
      `There are no open times ${inSentence(dayLabel(s.date, ctx.today))}.`,
    );
    s.date = null;
    s.time = null;
  }
  if (!moved && !notes.length)
    notes.push(
      s.stage === "member"
        ? "Sorry, I didn’t catch who this is for."
        : s.stage === "time"
          ? "Sorry, I didn’t catch the time."
          : s.stage === "day"
            ? "Sorry, I didn’t catch the day."
            : "Sorry, I didn’t catch that.",
    );
  return ask(s, ctx, notes.join(" "));
}

// The sample patient's answer to the current question, for the simulated
// voice mode (the collector's voice demo plays a sample patient the same way).
export function voiceLine(session, turn) {
  if (session.stage === "confirm") return null;
  const chip = (turn?.chips || []).find((c) => c.set && !c.set.otherDate);
  if (!chip) return null;
  const spoken = {
    member: chip.text,
    type: "An in-clinic visit please",
    day: `${chip.label} works for me`,
    time: `${chip.label} please`,
  }[session.stage];
  return { text: spoken || chip.text, set: chip.set };
}
