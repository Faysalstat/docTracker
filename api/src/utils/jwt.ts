import jwt, { type SignOptions } from "jsonwebtoken";
import { USER_ROLES, type UserRole } from "../model/enums";

// No fallback secret: a missing or weak secret stops the server at startup.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters (see .env.example).");
}
const SECRET: string = JWT_SECRET;

const EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as NonNullable<SignOptions["expiresIn"]>;

// The web app verifies the session cookie with the same secret and claims
// (web/src/data/session.ts), so keep these in sync.
const ISSUER = "doctor-tracker-api";
const AUDIENCE = "doctor-tracker-web";

export interface TokenPayload {
  userId: string;
  userRole: UserRole;
}

function sign({ userId, userRole }: TokenPayload) {
  const token = jwt.sign({ role: userRole }, SECRET, {
    algorithm: "HS256",
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: EXPIRES_IN,
  });
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, expiresAt: new Date(exp * 1000) };
}

/** Throws when the token is malformed, expired, forged or missing claims. */
function verify(token: string): TokenPayload {
  const decoded = jwt.verify(token, SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Token is missing required claims");
  }
  const role: unknown = decoded.role;
  if (!Object.values<unknown>(USER_ROLES).includes(role)) {
    throw new Error("Token has an unknown role");
  }
  return { userId: decoded.sub, userRole: role as UserRole };
}

export { sign, verify };
