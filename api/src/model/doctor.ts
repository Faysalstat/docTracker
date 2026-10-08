import type { InferSchemaType, Types } from "mongoose";
import { mongoose } from "../connector/db-connector";
import { SPECIALIZATIONS } from "./enums";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Lowercase copy of `name` for index-backed, case-insensitive prefix search.
    // Set by doctor-service on every write that changes `name`.
    nameLower: { type: String, required: true, select: false },
    specialization: { type: String, required: true, enum: Object.values(SPECIALIZATIONS) },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  {
    timestamps: true,
    collection: "doctor",
    versionKey: false,
  },
);

// Indexes follow the ESR rule (Equality → Sort → Range) for the list queries.
// `_id` is the sort tiebreaker for stable pagination, so it is part of each sort index.
doctorSchema.index({ createdAt: -1, _id: -1 });
doctorSchema.index({ specialization: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ nameLower: 1, _id: 1 });
doctorSchema.index({ phone: 1 });

export type DoctorRecord = InferSchemaType<typeof doctorSchema> & { _id: Types.ObjectId };

export default mongoose.model("doctor", doctorSchema);
