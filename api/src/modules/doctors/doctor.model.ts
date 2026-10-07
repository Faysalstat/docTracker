import { type InferSchemaType, Schema, model } from 'mongoose';
import { SPECIALIZATIONS } from './doctor.constants.js';

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Normalized copy of `name` for index-backed, case-insensitive prefix search.
    nameLower: { type: String, required: true, select: false },
    specialization: { type: String, required: true, enum: SPECIALIZATIONS },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

doctorSchema.pre('validate', function () {
  if (this.isModified('name') || this.isNew) this.nameLower = this.name.toLowerCase();
});

// Indexes follow the ESR rule (Equality → Sort → Range) for the list queries.
// `_id` is the sort tiebreaker for stable pagination, so it is part of each sort index.
doctorSchema.index({ createdAt: -1, _id: -1 });
doctorSchema.index({ specialization: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ nameLower: 1, _id: 1 });
doctorSchema.index({ phone: 1 });

export type DoctorDocument = InferSchemaType<typeof doctorSchema>;

export const Doctor = model('Doctor', doctorSchema);
