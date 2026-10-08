import type { InferSchemaType, Types } from "mongoose";
import { mongoose } from "../connector/db-connector";
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from "./enums";

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Lowercase copy of `name` for index-backed, case-insensitive prefix search.
    // Set by patient-service on every write that changes `name`.
    nameLower: { type: String, required: true, select: false },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, required: true, enum: Object.values(GENDERS) },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    condition: { type: String, required: true, enum: Object.values(CONDITIONS) },
    status: {
      type: String,
      required: true,
      enum: Object.values(PATIENT_STATUSES),
      default: PATIENT_STATUSES.ADMITTED,
    },
    // Stored as UTC midnight of the admission day.
    admissionDate: { type: Date, required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },
  },
  {
    timestamps: true,
    collection: "patient",
    versionKey: false,
  },
);

// Indexes follow the ESR rule (Equality → Sort → Range) for the list and stats queries.
// `_id` is the sort tiebreaker for stable pagination, so it is part of each sort index.
patientSchema.index({ admissionDate: -1, _id: -1 });
patientSchema.index({ doctorId: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ condition: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ status: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ nameLower: 1, _id: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });

export type PatientRecord = InferSchemaType<typeof patientSchema> & { _id: Types.ObjectId };

export default mongoose.model("patient", patientSchema);
