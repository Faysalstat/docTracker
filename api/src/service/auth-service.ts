import bcrypt from "bcrypt";
import type { Request } from "express";
import { z } from "zod";
import User from "../model/user";
import { sign } from "../utils/jwt";
import { emailSchema, parseInput } from "../utils/validate";

export const PASSWORD_SALT_ROUNDS = 10;

// Compared against when the email is unknown, so both paths take the same time
// and response timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("timing-attack-mitigation", PASSWORD_SALT_ROUNDS);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "is required").max(128, "must be at most 128 characters"),
});

export const login = async (req: Request) => {
  const { email, password } = parseInput(loginSchema, req.body);

  const user = await User.findOne({ email }).select("+password").lean();
  const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  // Same message for both cases, so the response does not reveal which emails exist.
  if (!user || !passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const { token, expiresAt } = sign({ userId: user._id.toString(), userRole: user.role });
  const { password: _password, ...publicUser } = user;

  return { token, expiresAt: expiresAt.toISOString(), user: publicUser };
};

export const getCurrentUser = async (req: Request) => {
  const user = await User.findById(req.userId).lean();
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};
