import { type InferSchemaType, Schema, model } from 'mongoose';
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from './patient.constants.js';

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Normalized copy of `name` for index-backed, case-insensitive prefix search.
    nameLower: { type: String, required: true, select: false },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, required: true, enum: GENDERS },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    condition: { type: String, required: true, enum: CONDITIONS },
    status: { type: String, required: true, enum: PATIENT_STATUSES, default: 'admitted' },
    admissionDate: { type: Date, required: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  },
  { timestamps: true },
);

patientSchema.pre('validate', function () {
  if (this.isModified('name') || this.isNew) this.nameLower = this.name.toLowerCase();
});

// Indexes follow the ESR rule (Equality → Sort → Range) for the list and stats queries.
// `_id` is the sort tiebreaker for stable pagination, so it is part of each sort index.
patientSchema.index({ admissionDate: -1, _id: -1 });
patientSchema.index({ doctor: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ condition: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ status: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ nameLower: 1, _id: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });

export type PatientDocument = InferSchemaType<typeof patientSchema>;

export const Patient = model('Patient', patientSchema);
