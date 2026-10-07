import bcrypt from 'bcrypt';
import { ApiError } from '../../utils/api-error.js';
import { signAccessToken } from '../../utils/jwt.js';
import { User } from '../users/user.model.js';
import type { LoginInput } from './auth.schema.js';

export const PASSWORD_SALT_ROUNDS = 12;

// Compared against when the email is unknown, so both paths take the same time
// and response timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-mitigation', PASSWORD_SALT_ROUNDS);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function login({ email, password }: LoginInput) {
  const user = await User.findOne({ email }).select('+passwordHash').lean();
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const { token, expiresAt } = await signAccessToken({ sub: user._id.toString(), role: user.role });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    user: toPublicUser(user),
  };
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await User.findById(id).lean();
  if (!user) throw ApiError.unauthorized('User no longer exists');
  return toPublicUser(user);
}

function toPublicUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
}): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}
