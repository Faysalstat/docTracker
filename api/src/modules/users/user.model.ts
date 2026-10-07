import { type InferSchemaType, Schema, model } from 'mongoose';

export const USER_ROLES = ['admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'admin', required: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model('User', userSchema);
