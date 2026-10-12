import { recordExamples } from "./recordExamples.js";
import { withAdminOverrides } from "./hospitalConfig.js";
import { soonSlot } from "./videoVisit.js";
export const dateKey = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const formatDate = (value, options = {}) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...options,
  });
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
const baseDoctors = [
  {
    id: "meera",
    name: "Dr. Meera Iyer",
    specialty: "General medicine",
    qualification: "MBBS, MD · Internal Medicine",
    experience: 14,
    languages: "English, Hindi, Kannada",
    image: "/images/doctor-meera.jpg",
    locations: ["indiranagar", "whitefield"],
    about:
      "A patient-first approach to everyday health, preventive care and the management of long-term conditions.",
    next: "10:30 AM",
  },
  {
    id: "arjun",
    name: "Dr. Arjun Rao",
    specialty: "Cardiology",
    qualification: "MBBS, MD, DM · Cardiology",
    experience: 18,
    languages: "English, Hindi, Kannada",
    image: "/images/doctor-arjun.jpg",
    locations: ["indiranagar", "jayanagar"],
    about:
      "Focused on preventive cardiology and supporting patients through every stage of their heart health journey.",
    next: "11:00 AM",
  },
  {
    id: "rohan",
    name: "Dr. Rohan Menon",
    specialty: "Orthopaedics",
    qualification: "MBBS, MS · Orthopaedics",
    experience: 12,
    languages: "English, Hindi, Malayalam",
    image: "/images/doctor-rohan.jpg",
    locations: ["indiranagar", "whitefield", "jayanagar"],
    about:
      "Care for joint, bone and movement concerns with a focus on recovery and everyday mobility.",
    next: "02:00 PM",
  },
  {
    id: "ananya",
    name: "Dr. Ananya Shah",
    specialty: "Dermatology",
    qualification: "MBBS, MD · Dermatology",
    experience: 10,
    languages: "English, Hindi",
    image: "",
    locations: ["indiranagar", "whitefield"],
    about:
      "Personalised consultations for skin and hair concerns, with clear explanations and practical follow-up care.",
    next: "03:30 PM",
  },
];
// Doctors and availability come from Tatva Practice, which has no fee
// setting: consultation fees are set in the hospital console only, and a
// doctor without one is still bookable (the fee is paid at the clinic).
export const allDoctors = baseDoctors;
export const doctors = withAdminOverrides(baseDoctors);
// Fee for a visit type, or null when the hospital hasn't set one.
export const feeFor = (doctor, type) => {
  const fee =
    type === "Video consultation"
      ? (doctor?.videoFee ?? doctor?.fee)
      : doctor?.fee;
  return Number.isFinite(fee) ? fee : null;
};
export const specialties = [
  ["All specialties", "category"],
  ["General medicine", "health"],
  ["Cardiology", "heart"],
  ["Orthopaedics", "activity"],
  ["Dermatology", "sun"],
];
export const slots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
];
export const packages = [
  {
    id: "essential",
    category: "Preventive care",
    name: "A little check-in. A healthier you.",
    shortName: "Essential health check",
    description: "A thoughtful starting point for your annual health check.",
    tests: "32 parameters",
    price: 1499,
    oldPrice: 2200,
    tag: "PREVENTIVE CARE",
    icon: "health",
    includes: [
      "Complete blood count",
      "Blood glucose",
      "Lipid profile",
      "Liver function",
      "Doctor review",
    ],
    collection: true,
  },
  {
    id: "heart",
    category: "Preventive care",
    name: "Give your heart a little attention.",
    shortName: "Heart health package",
    description: "A closer look at your cardiovascular health.",
    tests: "18 parameters + ECG",
    price: 2499,
    oldPrice: 3500,
    tag: "HEART HEALTH",
    icon: "heart",
    includes: ["Lipid profile", "HbA1c", "ECG", "Cardiology consultation"],
    collection: false,
  },
  {
    id: "senior",
    category: "Preventive care",
    name: "More care for the ones who cared.",
    shortName: "Senior wellness package",
    description: "Comprehensive care for the people who matter most.",
    tests: "56 parameters",
    price: 3499,
    oldPrice: 4800,
    tag: "FAMILY WELLNESS",
    icon: "people",
    includes: [
      "Complete blood count",
      "Kidney and liver function",
      "Thyroid profile",
      "Vitamin B12",
      "Physician review",
    ],
    collection: true,
  },
  {
    id: "laboratory",
    category: "Lab & pathology",
    name: "Know more about your health.",
    shortName: "Laboratory health check",
    description:
      "Routine blood and urine tests, reported by our pathology lab.",
    tests: "Blood & urine tests",
    price: 999,
    oldPrice: 1499,
    tag: "LAB & PATHOLOGY",
    icon: "clipboard-tick",
    includes: [
      "Complete blood count",
      "Blood glucose",
      "Urine routine",
      "Laboratory report",
    ],
    collection: true,
  },
  {
    id: "radiology",
    category: "Radiology",
    name: "A clearer picture of your health.",
    shortName: "Radiology imaging package",
    description:
      "Imaging with a radiologist's report. The care team confirms the right scan for your referral.",
    tests: "Imaging & reporting",
    price: 1799,
    oldPrice: 2200,
    tag: "RADIOLOGY",
    icon: "gallery",
    includes: ["Referral review", "X-ray imaging", "Radiologist report"],
    collection: false,
  },
];
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
export function initialState() {
  return {
    version: 1,
    seedVersion: 7,
    activeMember: "self",
    location: "indiranagar",
    members: [
      {
        id: "self",
        name: "Aarav Sharma",
        relation: "Self",
        dob: "1994-05-12",
        gender: "Male",
        blood: "B+",
        phone: "9000000001",
        email: "aarav@example.com",
        mrn: "TP-10482",
        access: "Full access",
        history: {
          conditions: [
            {
              name: "Vitamin D insufficiency",
              since: "2026",
              status: "Under treatment",
            },
            {
              name: "Allergic contact dermatitis",
              since: "2026",
              status: "Resolved",
            },
          ],
          allergies: [
            {
              name: "Dust mites",
              reaction: "Sneezing, watery eyes",
              severity: "Mild",
            },
          ],
          medications: [
            {
              name: "Cholecalciferol 60,000 IU",
              dose: "Once a week",
              since: "Sep 2026",
            },
          ],
          surgeries: [
            {
              name: "Appendectomy",
              year: "2012",
              place: "City Hospital, Pune",
            },
          ],
          vaccinations: [
            { name: "Influenza", date: "Aug 2026" },
            { name: "Tetanus booster", date: "Mar 2023" },
            { name: "COVID-19 (2 doses)", date: "2021" },
          ],
          family: [
            { relation: "Father", condition: "Hypertension" },
            { relation: "Mother", condition: "Osteoarthritis, hypothyroidism" },
          ],
          lifestyle:
            "Non-smoker · Occasional alcohol · Walks 3 days a week · Vegetarian",
        },
      },
      {
        id: "father",
        name: "Rajesh Sharma",
        relation: "Father",
        dob: "1962-11-08",
        gender: "Male",
        blood: "B+",
        phone: "9000000002",
        mrn: "TP-10483",
        access: "Full access",
        history: {
          conditions: [
            {
              name: "Essential hypertension",
              since: "2019",
              status: "Controlled",
            },
            { name: "Dyslipidaemia", since: "2024", status: "Under treatment" },
          ],
          allergies: [
            {
              name: "Seasonal pollen",
              reaction: "Sneezing and itchy eyes",
              severity: "Mild",
            },
          ],
          additional: [
            "Current medicines reviewed at the cardiology visit.",
            "Uses reading glasses after left eye cataract surgery.",
            "Independent in daily activities; carries a home blood pressure diary.",
          ],
          medications: [
            {
              name: "Telmisartan 40 mg",
              dose: "Once a day, morning",
              since: "2019",
            },
            {
              name: "Atorvastatin 10 mg",
              dose: "Once a day, night",
              since: "2024",
            },
          ],
          surgeries: [
            {
              name: "Cataract surgery, left eye",
              year: "2022",
              place: "Tatva Practice, Indiranagar",
            },
          ],
          vaccinations: [
            { name: "Influenza", date: "Aug 2026" },
            { name: "Pneumococcal", date: "Jan 2024" },
          ],
          family: [{ relation: "Brother", condition: "Type 2 diabetes" }],
          lifestyle:
            "Former smoker, quit in 2015 · No alcohol · Morning walk daily",
        },
      },
      {
        id: "mother",
        name: "Sunita Sharma",
        relation: "Mother",
        dob: "1966-03-21",
        gender: "Female",
        blood: "O+",
        phone: "9000000003",
        mrn: "TP-10484",
        access: "Full access",
        history: {
          conditions: [
            {
              name: "Osteoarthritis, right knee",
              since: "2026",
              status: "Under treatment",
            },
            { name: "Hypothyroidism", since: "2018", status: "Controlled" },
          ],
          allergies: [
            { name: "Penicillin", reaction: "Rash", severity: "Moderate" },
          ],
          medications: [
            {
              name: "Levothyroxine 50 mcg",
              dose: "Once a day, empty stomach",
              since: "2018",
            },
          ],
          surgeries: [
            {
              name: "Caesarean section",
              year: "1994",
              place: "City Hospital, Pune",
            },
          ],
          injuries: [
            {
              name: "Fall with right knee swelling",
              date: dateKey(-21),
              details: "Documented in the discharge summary",
            },
          ],
          rehabilitation: [
            {
              name: "Quadriceps strengthening",
              site: "Right knee",
              details: "Programme recorded at the orthopaedic follow-up",
            },
          ],
          vaccinations: [{ name: "Influenza", date: "Aug 2026" }],
          family: [{ relation: "Mother", condition: "Hypothyroidism" }],
          lifestyle: "Non-smoker · No alcohol · Yoga twice a week",
        },
      },
    ],
    appointments: [
      {
        id: "TP-24091",
        memberId: "self",
        doctorId: "meera",
        date: dateKey(),
        time: "10:30 AM",
        status: "Confirmed",
        location: "indiranagar",
        type: "In-person",
        reason: "Routine health consultation",
        source: "Hospital",
      },
      {
        id: "TP-24095",
        memberId: "self",
        doctorId: "ananya",
        date: dateKey(),
        time: soonSlot(),
        status: "Confirmed",
        location: "indiranagar",
        type: "Video consultation",
        reason: "Follow-up on lab results",
        source: "Patient",
      },
      {
        id: "TP-24072",
        memberId: "father",
        doctorId: "arjun",
        date: dateKey(2),
        time: "11:00 AM",
        status: "Confirmed",
        location: "indiranagar",
        type: "In-person",
        reason: "Follow-up consultation",
        source: "Family",
      },
      {
        id: "TP-23916",
        memberId: "self",
        doctorId: "meera",
        date: dateKey(-14),
        time: "09:30 AM",
        status: "Completed",
        location: "indiranagar",
        type: "In-person",
        reason: "Annual health review",
        source: "Patient",
      },
      {
        id: "TP-23874",
        memberId: "self",
        doctorId: "ananya",
        date: dateKey(-35),
        time: "11:00 AM",
        status: "Completed",
        location: "indiranagar",
        type: "In-person",
        reason: "Skin rash on forearms",
        source: "Patient",
      },
      {
        id: "TP-23842",
        memberId: "self",
        doctorId: "arjun",
        date: dateKey(-62),
        time: "05:30 PM",
        status: "Completed",
        location: "whitefield",
        type: "Video",
        reason: "Palpitations after exercise",
        source: "Patient",
      },
      {
        id: "TP-23951",
        memberId: "father",
        doctorId: "arjun",
        date: dateKey(-7),
        time: "08:30 AM",
        status: "Completed",
        location: "indiranagar",
        type: "In-person",
        reason: "Blood pressure review",
        source: "Patient",
      },
      {
        id: "TP-23888",
        memberId: "mother",
        doctorId: "rohan",
        date: dateKey(-21),
        time: "02:00 PM",
        status: "Completed",
        location: "jayanagar",
        type: "In-person",
        reason: "Follow-up",
        source: "Hospital",
      },
    ],
    records: [
      ...recordExamples(dateKey),
      {
        id: "r1",
        memberId: "self",
        title: "Complete blood count",
        category: "Lab results",
        date: dateKey(-2),
        time: "10:42 AM",
        author: "Hospital laboratory",
        doctorId: "meera",
        format: "PDF",
        new: true,
        params: [
          {
            id: "hb",
            name: "Haemoglobin",
            value: 14.2,
            unit: "g/dL",
            low: 13,
            high: 17,
            about:
              "Haemoglobin is the protein in red blood cells that carries oxygen around the body.",
            impact:
              "Low haemoglobin can mean anaemia, which causes tiredness, breathlessness and pale skin. High levels can thicken the blood.",
            action:
              "Keep iron-rich foods such as leafy greens, lentils and dates in your diet, and repeat the test at your next check-up.",
          },
          {
            id: "wbc",
            name: "White blood cells",
            value: 7200,
            unit: "/µL",
            low: 4000,
            high: 11000,
            about:
              "White blood cells are the immune cells that fight infection.",
            impact:
              "A high count usually points to an infection or inflammation. A low count can leave you more open to infections.",
            action:
              "No action is needed while the count is in range. Mention any fever or recurring infections to your doctor.",
          },
          {
            id: "plt",
            name: "Platelets",
            value: 160000,
            unit: "/µL",
            low: 150000,
            high: 410000,
            about:
              "Platelets are the cell fragments that help blood clot after an injury.",
            impact:
              "A low platelet count can cause easy bruising, nosebleeds or gums that bleed. Very low counts need prompt attention.",
            action:
              "Your count is just above the lower limit. Repeat the test in 4 to 6 weeks and tell your doctor about any unusual bruising or bleeding.",
          },
          {
            id: "rbc",
            name: "Red blood cells",
            value: 4.9,
            unit: "million/µL",
            low: 4.5,
            high: 5.9,
            about:
              "Red blood cells carry oxygen from the lungs to the rest of the body.",
            impact:
              "A low count goes with anaemia. A high count can follow dehydration or lung and heart conditions.",
            action:
              "No action is needed. Stay hydrated and keep up a balanced diet.",
          },
          {
            id: "mcv",
            name: "Mean corpuscular volume (MCV)",
            value: 88,
            unit: "fL",
            low: 80,
            high: 100,
            about: "MCV is the average size of your red blood cells.",
            impact:
              "Small cells can point to iron deficiency. Large cells can point to a shortage of vitamin B12 or folate.",
            action: "No action is needed while the size is in range.",
          },
        ],
      },
      {
        id: "r12",
        memberId: "self",
        title: "Diabetes screening",
        category: "Lab results",
        date: dateKey(-9),
        time: "08:50 AM",
        author: "Hospital laboratory",
        doctorId: "meera",
        format: "PDF",
        params: [
          {
            id: "fbg",
            name: "Glucose, fasting",
            value: 112,
            unit: "mg/dL",
            low: 70,
            high: 100,
            about:
              "Fasting glucose measures the level of sugar in the blood after an overnight fast.",
            impact:
              "A fasting glucose above the ideal range can be an early sign of prediabetes. Over time, high sugar levels strain the heart, kidneys, eyes and nerves.",
            action:
              "Consult your doctor to confirm the result and discuss diet, activity and a repeat test. Cut sugary drinks and refined carbohydrates, and aim for 30 minutes of walking a day.",
          },
          {
            id: "hba1c",
            name: "HbA1c",
            value: 5.6,
            unit: "%",
            low: 4,
            high: 5.6,
            about:
              "HbA1c shows your average blood sugar over the past 2 to 3 months.",
            impact:
              "Your HbA1c sits at the upper limit of the ideal range. Values above it fall in the prediabetes band, which raises the long-term risk of diabetes.",
            action:
              "Keep an eye on sugar intake, stay active and repeat the test in 3 months so your doctor can watch the trend.",
          },
          {
            id: "eag",
            name: "Estimated average glucose (eAG)",
            value: 114,
            unit: "mg/dL",
            low: 68,
            high: 114,
            about:
              "eAG converts your HbA1c into the average blood sugar reading you would see on a glucose meter.",
            impact:
              "It mirrors HbA1c, so it sits at the upper limit too. It helps you relate the lab result to day-to-day readings.",
            action:
              "No separate action. Follow the plan for your HbA1c and fasting glucose.",
          },
          {
            id: "ppbg",
            name: "Glucose, post-prandial",
            value: 128,
            unit: "mg/dL",
            low: 70,
            high: 140,
            about:
              "Post-prandial glucose is measured 2 hours after a meal and shows how your body handles sugar from food.",
            impact:
              "High readings after meals can point to insulin resistance even when fasting results look normal.",
            action:
              "No action is needed while the reading is in range. Pair meals with protein and fibre to keep spikes low.",
          },
        ],
      },
      {
        id: "r2",
        memberId: "self",
        title: "Consultation prescription",
        category: "Prescriptions",
        date: dateKey(-14),
        time: "11:15 AM",
        author: "Dr. Meera Iyer",
        doctorId: "meera",
        appointmentId: "TP-23916",
        format: "PDF",
        rx: {
          complaints:
            "Routine annual review. Occasional tiredness in the evenings.",
          vitals: "BP 124/80 mmHg · Pulse 76/min · Weight 68 kg · SpO2 98%",
          diagnosis: "Vitamin D insufficiency",
          medicines: [
            [
              "Cholecalciferol 60,000 IU",
              "1 sachet",
              "Once a week, after food",
              "8 weeks",
            ],
            [
              "Multivitamin",
              "1 tablet",
              "Once a day, after breakfast",
              "30 days",
            ],
          ],
          tests: "Vitamin D (25-OH) after 8 weeks",
          advice:
            "20 minutes of morning sunlight. Brisk walk 30 minutes a day.",
          followUp: "After 8 weeks with the Vitamin D report",
        },
      },
      {
        id: "r3",
        memberId: "self",
        title: "Chest X-ray report",
        category: "Medical records",
        type: "Radiology",
        date: dateKey(-30),
        time: "04:20 PM",
        author: "Radiology department",
        format: "PDF",
        note: "Chest X-ray, PA view. Both lung fields are clear. Heart size and mediastinum are normal. No pleural effusion. Bony thorax is normal. Impression: Normal chest radiograph.",
        summary: {
          headline: "A normal chest X-ray",
          points: [
            "Both lungs are clear, with no signs of infection, fluid or masses.",
            "The heart is a normal size and the surrounding structures look normal.",
            "The ribs and spine show no abnormality.",
          ],
          next: "No action is needed for this report. Keep it for reference if you need imaging again.",
        },
      },
      {
        id: "r14",
        memberId: "self",
        title: "Urine routine & microscopy",
        category: "Medical records",
        type: "Pathology",
        date: dateKey(-16),
        time: "09:35 AM",
        author: "Hospital laboratory",
        format: "PDF",
        note: "Colour pale yellow. Appearance clear. pH 6.0. Specific gravity 1.015. Protein nil. Glucose nil. Ketones nil. Pus cells 1-2/hpf. RBCs nil. Epithelial cells occasional. Casts and crystals absent. Impression: Normal urine examination.",
        summary: {
          headline: "A normal urine test",
          points: [
            "No protein, sugar or ketones were found, which is reassuring for kidney and sugar health.",
            "Cell counts are within normal limits, with no sign of infection.",
            "No crystals or casts, so there is no indication of stones or kidney irritation.",
          ],
          next: "No follow-up is needed. Drink enough water through the day.",
        },
      },
      {
        id: "r15",
        memberId: "father",
        title: "ECG report",
        category: "Medical records",
        type: "Other",
        date: dateKey(-45),
        time: "10:15 AM",
        author: "Cardiology department",
        doctorId: "arjun",
        format: "PDF",
        note: "12-lead resting ECG. Rate 72/min, regular sinus rhythm. PR 160 ms, QRS 90 ms, QTc 410 ms. Normal axis. Voltage criteria for left ventricular hypertrophy not met. No ST-T changes. Impression: Normal sinus rhythm, no acute changes.",
        summary: {
          headline: "A normal heart rhythm",
          points: [
            "The heart is beating at a regular rate and rhythm.",
            "Electrical timings are within normal limits.",
            "There is no sign of strain from blood pressure or of a past heart attack.",
          ],
          next: "Continue your blood pressure treatment and repeat the ECG when Dr. Arjun Rao advises.",
        },
      },
      {
        id: "r16",
        memberId: "mother",
        title: "Right knee X-ray",
        category: "Medical records",
        type: "Radiology",
        date: dateKey(-19),
        time: "11:50 AM",
        author: "Radiology department",
        format: "PDF",
        note: "Right knee, standing AP and lateral views. Mild narrowing of the medial joint space. Small marginal osteophytes at the medial tibial plateau. No fracture or loose body. Impression: Early degenerative changes (grade 2), right knee.",
        summary: {
          headline: "Early wear in the right knee",
          points: [
            "The gap on the inner side of the knee joint has narrowed slightly, a sign of early osteoarthritis.",
            "Small bony spurs have formed at the joint edge.",
            "There is no fracture and nothing loose inside the joint.",
          ],
          next: "Keep up the quadriceps exercises Dr. Rohan Menon advised and bring this X-ray to the follow-up visit.",
        },
      },
      {
        id: "r13",
        memberId: "father",
        title: "Lipid profile",
        category: "Lab results",
        date: dateKey(-12),
        time: "07:40 AM",
        author: "Hospital laboratory",
        doctorId: "arjun",
        format: "PDF",
        params: [
          {
            id: "tc",
            name: "Total cholesterol",
            value: 218,
            unit: "mg/dL",
            low: null,
            high: 200,
            about:
              "Total cholesterol adds up the fatty particles carried in your blood.",
            impact:
              "High cholesterol builds up in artery walls over time and raises the risk of heart attack and stroke.",
            action:
              "Continue the statin your cardiologist prescribed, limit fried and processed food, and repeat the lipid profile before your next visit.",
          },
          {
            id: "ldl",
            name: "LDL cholesterol",
            value: 142,
            unit: "mg/dL",
            low: null,
            high: 100,
            about:
              'LDL is the "bad" cholesterol that deposits in artery walls.',
            impact:
              "With blood pressure already being treated, a high LDL adds to the strain on the heart and arteries.",
            action:
              "Take your atorvastatin every night as prescribed. Swap ghee and butter for small amounts of mustard or olive oil, and walk 30 minutes a day.",
          },
          {
            id: "hdl",
            name: "HDL cholesterol",
            value: 42,
            unit: "mg/dL",
            low: 40,
            high: null,
            about:
              'HDL is the "good" cholesterol that carries fat away from the arteries.',
            impact:
              "HDL just above the lower limit gives less protection against heart disease.",
            action:
              "Regular brisk walking, nuts and fatty fish help raise HDL. Avoid smoking.",
          },
          {
            id: "tg",
            name: "Triglycerides",
            value: 118,
            unit: "mg/dL",
            low: null,
            high: 150,
            about:
              "Triglycerides are the fat your body stores from extra calories, sugar and alcohol.",
            impact:
              "High triglycerides go with heart disease and, when very high, inflammation of the pancreas.",
            action:
              "Your level is in range. Keep sweets and alcohol low to hold it there.",
          },
        ],
      },
      {
        id: "r4",
        memberId: "father",
        title: "Cardiology consultation",
        category: "Prescriptions",
        date: dateKey(-7),
        time: "09:05 AM",
        author: "Dr. Arjun Rao",
        doctorId: "arjun",
        appointmentId: "TP-23951",
        format: "PDF",
        rx: {
          complaints:
            "Follow-up for blood pressure. No chest pain or breathlessness.",
          vitals: "BP 138/86 mmHg · Pulse 72/min · Weight 78 kg",
          diagnosis: "Essential hypertension, controlled",
          medicines: [
            ["Telmisartan 40 mg", "1 tablet", "Once a day, morning", "90 days"],
            ["Atorvastatin 10 mg", "1 tablet", "Once a day, night", "90 days"],
          ],
          tests: "Lipid profile and kidney function before the next visit",
          advice:
            "Salt under 5 g a day. Walk 30 minutes daily. Check BP twice a week.",
          followUp: "After 3 months",
        },
      },
      {
        id: "r10",
        memberId: "self",
        title: "Dermatology prescription",
        category: "Prescriptions",
        date: dateKey(-35),
        time: "11:25 AM",
        author: "Dr. Ananya Shah",
        doctorId: "ananya",
        appointmentId: "TP-23874",
        format: "PDF",
        rx: {
          complaints:
            "Itchy red rash on both forearms for 10 days, worse after gardening.",
          vitals: "BP 120/78 mmHg · Pulse 74/min",
          diagnosis: "Allergic contact dermatitis",
          medicines: [
            [
              "Mometasone 0.1% cream",
              "Thin layer",
              "Once a day, night",
              "10 days",
            ],
            ["Levocetirizine 5 mg", "1 tablet", "Once a day, night", "7 days"],
          ],
          advice:
            "Wear gloves while gardening. Use a fragrance-free moisturiser twice a day.",
          followUp: "If the rash is not better in 2 weeks",
        },
      },
      {
        id: "r11",
        memberId: "self",
        title: "Cardiology teleconsultation",
        category: "Prescriptions",
        date: dateKey(-62),
        time: "05:55 PM",
        author: "Dr. Arjun Rao",
        doctorId: "arjun",
        appointmentId: "TP-23842",
        format: "PDF",
        rx: {
          complaints:
            "Occasional palpitations after running, no chest pain or fainting.",
          diagnosis: "Palpitations, likely benign; to evaluate",
          medicines: [],
          tests: "ECG, 2D echo and thyroid profile",
          advice: "Limit caffeine. Stay hydrated during exercise.",
          followUp: "In-clinic visit with the test reports",
        },
      },
      {
        id: "r9",
        memberId: "mother",
        title: "Follow-up prescription",
        category: "Prescriptions",
        date: dateKey(-21),
        time: "02:40 PM",
        author: "Dr. Rohan Menon",
        doctorId: "rohan",
        appointmentId: "TP-23888",
        format: "PDF",
        rx: {
          complaints: "Right knee pain on climbing stairs, 3 weeks.",
          vitals: "BP 132/84 mmHg · Pulse 80/min · Weight 64 kg",
          diagnosis: "Early osteoarthritis, right knee",
          medicines: [
            [
              "Aceclofenac 100 mg",
              "1 tablet",
              "Twice a day, after food",
              "5 days",
            ],
            ["Diclofenac gel", "Apply locally", "Three times a day", "2 weeks"],
          ],
          tests: "X-ray right knee, standing AP and lateral",
          advice:
            "Quadriceps strengthening exercises. Avoid squatting and cross-legged sitting.",
          followUp: "After 2 weeks with the X-ray",
          sketch: {
            title: "Right knee, front view",
            note: "Tenderness along the inner joint line. Mild swelling above the kneecap.",
            paths: [
              "M80 10 C 70 40, 70 60, 78 72 C 70 86, 70 110, 80 130",
              "M120 10 C 130 40, 130 60, 122 72 C 130 86, 130 110, 120 130",
              "M88 66 C 96 60, 104 60, 112 66 C 114 76, 112 84, 100 86 C 88 84, 86 76, 88 66",
            ],
            marks: [
              { x: 84, y: 80, label: "Tender" },
              { x: 100, y: 52, label: "Swelling" },
            ],
          },
        },
      },
      {
        id: "r5",
        memberId: "mother",
        title: "Discharge summary",
        category: "Discharge summaries",
        date: dateKey(-21),
        time: "06:30 PM",
        author: "Inpatient care team",
        doctorId: "rohan",
        format: "PDF",
        discharge: {
          admitted: dateKey(-24),
          discharged: dateKey(-21),
          ward: "Orthopaedics, Jayanagar",
          diagnosis:
            "Acute flare of right knee osteoarthritis with joint effusion",
          procedures: [
            "Knee joint aspiration",
            "Intra-articular steroid injection",
          ],
          course:
            "Admitted with a painful, swollen right knee after a fall at home. Aspiration removed 30 ml of clear fluid; infection was ruled out. Pain settled with rest, ice and a steroid injection. Walking with support from day 2.",
          medicines: [
            [
              "Aceclofenac 100 mg",
              "1 tablet",
              "Twice a day, after food",
              "5 days",
            ],
            [
              "Pantoprazole 40 mg",
              "1 tablet",
              "Once a day, before breakfast",
              "5 days",
            ],
          ],
          advice:
            "Use the knee brace while walking for 2 weeks. Ice pack 15 minutes, three times a day. Avoid stairs and squatting.",
          followUp:
            "Orthopaedics OPD with Dr. Rohan Menon after 2 weeks, or sooner if the swelling or fever returns.",
        },
      },
      {
        id: "r20",
        memberId: "self",
        title: "Medical fitness certificate",
        category: "Certificates",
        type: "Medical fitness",
        date: dateKey(-13),
        time: "11:40 AM",
        author: "Dr. Meera Iyer",
        doctorId: "meera",
        format: "PDF",
        certificate: {
          purpose: "Fitness to resume work",
          remarks:
            "Examined today and found medically fit to resume regular office duties with no restrictions.",
        },
      },
      {
        id: "r21",
        memberId: "self",
        title: "Medical leave certificate",
        category: "Certificates",
        type: "Medical leave",
        date: dateKey(-35),
        time: "11:40 AM",
        author: "Dr. Ananya Shah",
        doctorId: "ananya",
        format: "PDF",
        certificate: {
          from: dateKey(-35),
          to: dateKey(-33),
          purpose: "Leave of absence",
          remarks:
            "Under treatment for allergic contact dermatitis and advised rest for 3 days.",
        },
      },
      {
        id: "r22",
        memberId: "mother",
        title: "Medical leave certificate",
        category: "Certificates",
        type: "Medical leave",
        date: dateKey(-21),
        time: "06:40 PM",
        author: "Dr. Rohan Menon",
        doctorId: "rohan",
        format: "PDF",
        certificate: {
          from: dateKey(-24),
          to: dateKey(-7),
          purpose: "Leave of absence",
          remarks:
            "Admitted for a right knee flare and advised rest with a knee brace for 2 weeks after discharge.",
        },
      },
    ],
    bills: [
      {
        id: "INV-1048",
        memberId: "self",
        title: "General medicine consultation",
        date: dateKey(),
        amount: 700,
        status: "Outstanding",
        items: [["Consultation fee", 700]],
      },
      {
        id: "INV-1021",
        memberId: "self",
        title: "Laboratory investigations",
        date: dateKey(-2),
        amount: 1200,
        status: "Paid",
        method: "UPI at counter",
        transaction: "RCPT-728410",
        items: [
          ["Complete blood count", 400],
          ["Lipid profile", 800],
        ],
      },
      {
        id: "INV-0981",
        memberId: "self",
        appointmentId: "TP-23916",
        title: "General medicine consultation",
        date: dateKey(-14),
        amount: 700,
        status: "Paid",
        method: "UPI at counter",
        transaction: "RCPT-726904",
        items: [["Consultation fee", 700]],
      },
      {
        id: "INV-0921",
        memberId: "self",
        appointmentId: "TP-23874",
        title: "Dermatology consultation",
        date: dateKey(-35),
        amount: 850,
        status: "Paid",
        method: "Card at counter",
        transaction: "RCPT-724118",
        items: [["Consultation fee", 850]],
      },
      {
        id: "INV-0874",
        memberId: "self",
        appointmentId: "TP-23842",
        title: "Cardiology video consultation",
        date: dateKey(-62),
        amount: 900,
        status: "Paid",
        method: "UPI",
        transaction: "RCPT-721650",
        items: [["Video consultation fee", 900]],
      },
      {
        id: "INV-0962",
        memberId: "mother",
        appointmentId: "TP-23888",
        title: "Orthopaedics consultation",
        date: dateKey(-21),
        amount: 800,
        status: "Paid",
        method: "Cash at counter",
        transaction: "RCPT-726511",
        items: [["Follow-up consultation fee", 800]],
      },
      {
        id: "INV-0946",
        memberId: "father",
        appointmentId: "TP-23951",
        title: "Cardiology consultation",
        date: dateKey(-7),
        amount: 1000,
        status: "Paid",
        method: "Card at counter",
        transaction: "RCPT-728211",
        items: [["Consultation fee", 1000]],
      },
    ],
    notifications: [
      {
        id: "n1",
        type: "report",
        title: "Your lab report is ready",
        body: "Complete blood count is now in Health records.",
        createdAt: hoursAgo(2),
        route: "/records",
        read: false,
        memberId: "self",
      },
      {
        id: "n2",
        type: "appointment",
        appointmentId: "TP-24091",
        title: "We’re expecting you today",
        body: "Please arrive 15 minutes early.",
        createdAt: hoursAgo(3),
        route: "/appointments?visit=TP-24091",
        read: false,
        memberId: "self",
      },
    ],
    requests: [],
    packageRequests: [],
    // "Request a callback" from the hospital contacts, when enabled.
    callbackRequests: [],
    contacts: [
      {
        id: "c1",
        name: "Rajesh Sharma",
        relation: "Father",
        phone: "9000000002",
      },
    ],
    preferences: { reminders: true, reports: true, promotions: false },
    feedback: [],
    // Rajesh has a sample ABHA linked so the linked state can be explored.
    healthLinks: {
      father: {
        abha: {
          identifier: "12-3456-7890-1235",
          address: "rajesh.sharma@abdm",
          consentAt: hoursAgo(72),
          lastSyncAt: hoursAgo(26),
          demo: true,
        },
      },
    },
  };
}
