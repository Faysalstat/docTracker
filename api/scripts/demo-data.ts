import { Types } from "mongoose";
import { SPECIALIZATIONS } from "../src/model/enums";

const SPECIALIZATION_LIST = Object.values(SPECIALIZATIONS);

/** Deterministic PRNG (mulberry32): the same seed always produces the same demo data. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)] as T;
  const weighted = <T extends string>(weights: Record<T, number>) => {
    const entries = Object.entries(weights) as [T, number][];
    let roll = next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1]![0];
  };
  return { next, int, pick, weighted };
}

const FIRST_NAMES = [
  "Olivia",
  "Liam",
  "Emma",
  "Noah",
  "Ava",
  "Elijah",
  "Sophia",
  "James",
  "Isabella",
  "Lucas",
  "Mia",
  "Mason",
  "Amelia",
  "Ethan",
  "Harper",
  "Aiden",
  "Evelyn",
  "Logan",
  "Aisha",
  "Omar",
  "Fatima",
  "Yusuf",
  "Priya",
  "Arjun",
  "Mei",
  "Hiroshi",
  "Sofia",
  "Mateo",
  "Chloe",
  "Daniel",
  "Grace",
  "Samuel",
  "Zara",
  "Leo",
  "Nora",
  "Ibrahim",
  "Layla",
  "Carlos",
  "Hannah",
  "Ravi",
];
const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Lee",
  "Khan",
  "Rahman",
  "Patel",
  "Nguyen",
  "Kim",
  "Chen",
  "Ali",
  "Hassan",
  "Okafor",
  "Silva",
  "Rossi",
  "Müller",
  "Novak",
  "Haddad",
  "Sato",
  "Cohen",
  "Ahmed",
  "Clarke",
  "Walker",
  "Young",
  "Hughes",
];
const HOSPITALS = [
  "City General Hospital",
  "St. Mary’s Medical Center",
  "Riverside Health",
  "Northside Clinic",
  "Lakeview Hospital",
  "Mercy Heart Institute",
  "Greenfield Children’s Hospital",
  "Unity Medical Center",
];

const CONDITION_WEIGHTS = {
  hypertension: 24,
  diabetes: 20,
  respiratory: 15,
  cardiac: 13,
  asthma: 12,
  other: 16,
} as const;

type Condition = keyof typeof CONDITION_WEIGHTS;

// Typical age ranges per condition, so the data reads plausibly.
const AGE_RANGES: Record<Condition, [number, number]> = {
  hypertension: [38, 85],
  diabetes: [25, 80],
  respiratory: [3, 85],
  cardiac: [45, 90],
  asthma: [4, 60],
  other: [1, 90],
};

const DAY_MS = 86_400_000;
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");

export interface DemoDataOptions {
  doctors: number;
  patients: number;
  /** Admissions are spread over the last `months` months, ending today. */
  months: number;
  seed?: number;
}

/** Builds raw documents (inserted directly; the generator guarantees valid values). */
export function buildDemoData({
  doctors: doctorCount,
  patients: patientCount,
  months,
  seed = 42,
}: DemoDataOptions) {
  const random = createRandom(seed);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = today - months * 30.4 * DAY_MS;

  const doctors = Array.from({ length: doctorCount }, (_, index) => {
    const first = random.pick(FIRST_NAMES);
    const last = random.pick(LAST_NAMES);
    const name = `Dr. ${first} ${last}`;
    // Doctors joined over the 18 months before today.
    const createdAt = new Date(today - random.int(0, 540) * DAY_MS - random.int(0, DAY_MS));
    return {
      _id: new Types.ObjectId(),
      name,
      nameLower: name.toLowerCase(),
      specialization:
        SPECIALIZATION_LIST[index % SPECIALIZATION_LIST.length] ?? random.pick(SPECIALIZATION_LIST),
      hospital: random.pick(HOSPITALS),
      phone: `+1 555 ${String(1000 + index).padStart(4, "0")}`,
      email: `${slug(first)}.${slug(last)}${index + 1}@hospital.example`,
      createdAt,
      updatedAt: createdAt,
      // Skewed workload: a few doctors carry many patients (Pareto-like).
      weight: 1 / (index + 1) ** 0.6,
    };
  });

  const totalWeight = doctors.reduce((sum, doctor) => sum + doctor.weight, 0);
  const pickDoctor = () => {
    let roll = random.next() * totalWeight;
    for (const doctor of doctors) {
      roll -= doctor.weight;
      if (roll <= 0) return doctor;
    }
    return doctors[doctors.length - 1]!;
  };

  const patients = Array.from({ length: patientCount }, (_, index) => {
    // Gradual growth over time plus a winter peak, so the trend chart has a shape.
    let admitted: number;
    for (;;) {
      admitted = start + random.next() * (today - start);
      const progress = (admitted - start) / (today - start);
      const month = new Date(admitted).getUTCMonth();
      const winter = month === 11 || month <= 1 ? 1.35 : 1;
      if (random.next() < ((0.55 + 0.45 * progress) * winter) / 1.35) break;
    }
    const admissionDate = new Date(Math.floor(admitted / DAY_MS) * DAY_MS);
    const condition = random.weighted(CONDITION_WEIGHTS);
    const [minAge, maxAge] = AGE_RANGES[condition];
    const daysAgo = (today - admissionDate.getTime()) / DAY_MS;
    // Older admissions are more likely to have recovered.
    const status =
      daysAgo > 60
        ? random.weighted({ recovered: 80, under_treatment: 15, admitted: 5 })
        : daysAgo > 14
          ? random.weighted({ recovered: 35, under_treatment: 45, admitted: 20 })
          : random.weighted({ recovered: 5, under_treatment: 35, admitted: 60 });
    const first = random.pick(FIRST_NAMES);
    const last = random.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const createdAt = new Date(admissionDate.getTime() + random.int(0, DAY_MS - 1));

    return {
      name,
      nameLower: name.toLowerCase(),
      age: random.int(minAge, maxAge),
      gender: random.weighted({ female: 49, male: 49, other: 2 }),
      phone: `+1 555 ${String(2000 + (index % 8000)).padStart(4, "0")}`,
      ...(random.next() < 0.7 && {
        email: `${slug(first)}.${slug(last)}${index + 1}@mail.example`,
      }),
      condition,
      status,
      admissionDate,
      doctorId: pickDoctor()._id,
      createdAt,
      updatedAt: createdAt,
    };
  });

  return {
    doctors: doctors.map(({ weight: _weight, ...doctor }) => doctor),
    patients,
  };
}
