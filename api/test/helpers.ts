import "../src/config/load-env";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before } from "node:test";
import { Types } from "mongoose";
import { app } from "../app";
import * as connector from "../src/connector/db-connector";
import Doctor from "../src/model/doctor";
import Patient from "../src/model/patient";
import User from "../src/model/user";
import { sign } from "../src/utils/jwt";

// Tests run against the real dev DB (MONGO_URI). Every record they create carries this
// run's id (emails on EMAIL_DOMAIN, doctors in TEST_HOSPITAL) and is deleted afterwards.
// Never clear whole collections here: the dev data must survive a test run.
export const RUN_ID = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const EMAIL_DOMAIN = `${RUN_ID}.test.invalid`;
export const TEST_HOSPITAL = `Test Hospital ${RUN_ID}`;

export interface ApiResult {
  status: number;
  isSuccess: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- response bodies are asserted field by field
  body: any;
  headers: Headers;
}

let baseUrl = "";
let adminToken = "";

/**
 * Connects to the dev DB, starts the app on a free port, runs `setup` (fixtures), and
 * cleans up this run's records after. Fixtures go in `setup`, not a separate top-level
 * `before`, so they always run after the server is listening.
 */
export function useTestServer(setup?: () => Promise<void>) {
  let server: Server;

  before(async () => {
    await connector.connect();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    adminToken = sign({ userId: new Types.ObjectId().toString(), userRole: "admin" }).token;
    await setup?.();
  });

  after(async () => {
    await deleteTestRecords();
    await new Promise((resolve) => server.close(resolve));
    await connector.close();
  });
}

async function deleteTestRecords() {
  const ownEmail = new RegExp(`@${EMAIL_DOMAIN.replace(/\./g, "\\.")}$`);
  const doctors = await Doctor.find({ $or: [{ email: ownEmail }, { hospital: TEST_HOSPITAL }] })
    .select("_id")
    .lean();
  const doctorIds = doctors.map((doctor) => doctor._id);
  await Patient.deleteMany({ doctorId: { $in: doctorIds } });
  await Doctor.deleteMany({ _id: { $in: doctorIds } });
  await User.deleteMany({ email: ownEmail });
}

interface RequestOptions {
  body?: unknown;
  /** Defaults to an admin token; pass null for an unauthenticated request. */
  token?: string | null;
  rawBody?: string;
}

export async function request(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult> {
  const token = options.token === undefined ? adminToken : options.token;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined || options.rawBody !== undefined)
    headers["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body:
      options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const json = (await res.json()) as Omit<ApiResult, "status" | "headers">;
  return { status: res.status, headers: res.headers, ...json };
}

export const api = {
  get: (path: string, options?: RequestOptions) => request("GET", path, options),
  post: (path: string, body: unknown, options?: RequestOptions) =>
    request("POST", path, { ...options, body }),
  put: (path: string, body: unknown, options?: RequestOptions) =>
    request("PUT", path, { ...options, body }),
  delete: (path: string, options?: RequestOptions) => request("DELETE", path, options),
};

let sequence = 0;

export function doctorInput(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    name: `Dr. Test ${sequence}`,
    specialization: "Cardiology",
    hospital: TEST_HOSPITAL,
    phone: `+1 555 010${sequence % 10}`,
    email: `doctor${sequence}@${EMAIL_DOMAIN}`,
    ...overrides,
  };
}

export function patientInput(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    name: `Patient ${sequence}`,
    age: 40,
    gender: "female",
    phone: `+1 555 020${sequence % 10}`,
    condition: "diabetes",
    status: "admitted",
    admissionDate: "2026-01-15",
    ...overrides,
  };
}

export async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await api.post("/api/doctor/create", doctorInput(overrides));
  if (!res.isSuccess) throw new Error(res.message);
  return res.body as { _id: string; name: string };
}

export async function createPatient(doctorId: string, overrides: Record<string, unknown> = {}) {
  const res = await api.post("/api/patient/create", { ...patientInput(overrides), doctorId });
  if (!res.isSuccess) throw new Error(res.message);
  return res.body as { _id: string; name: string };
}

/** Query string that keeps doctor list tests to this run's doctors. */
export const ownDoctors = `hospital=${encodeURIComponent(TEST_HOSPITAL)}`;
