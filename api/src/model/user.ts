import type { InferSchemaType, Types } from "mongoose";
import { mongoose } from "../connector/db-connector";
import { USER_ROLES } from "./enums";

const userSchema = new mongoose.Schema(
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
    // bcrypt hash. Never returned: loaded on purpose with .select("+password") only at login.
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.ADMIN,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "user",
    versionKey: false,
  },
);

export type UserRecord = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export default mongoose.model("user", userSchema);
