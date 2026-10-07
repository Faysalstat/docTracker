import { Types } from 'mongoose';
import { signAccessToken } from '../../src/utils/jwt.js';

/** Authorization header value for a synthetic admin (the middleware only verifies the JWT). */
export async function authHeader() {
  const { token } = await signAccessToken({ sub: new Types.ObjectId().toString(), role: 'admin' });
  return `Bearer ${token}`;
}
