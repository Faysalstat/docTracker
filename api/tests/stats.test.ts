import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { authHeader } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';
import { doctorInput, patientInput } from './helpers/factories.js';

useTestDatabase();

const app = createApp();
let auth: string;

beforeAll(async () => {
  auth = await authHeader();
});

const get = (url: string) => request(app).get(url).set('Authorization', auth);
const post = (url: string, body: object) =>
  request(app).post(url).set('Authorization', auth).send(body);

let house: string;
let grey: string;

beforeEach(async () => {
  house = (await post('/api/v1/doctors', doctorInput({ name: 'Dr. House' }))).body.id;
  grey = (await post('/api/v1/doctors', doctorInput({ name: 'Dr. Grey' }))).body.id;

  const patients = [
    { doctorId: house, admissionDate: '2026-01-05', condition: 'asthma', status: 'admitted' },
    { doctorId: house, admissionDate: '2026-01-20', condition: 'asthma', status: 'recovered' },
    { doctorId: house, admissionDate: '2026-03-02', condition: 'cardiac', status: 'admitted' },
    { doctorId: grey, admissionDate: '2025-12-30', condition: 'diabetes', status: 'recovered' },
    // Earliest record: makes December 2025 a fully covered comparison period.
    { doctorId: grey, admissionDate: '2025-11-15', condition: 'other', status: 'recovered' },
  ];
  for (const patient of patients) {
    const res = await post('/api/v1/patients', patientInput(patient));
    expect(res.status).toBe(201);
  }
});

describe('stats API', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/stats/summary')).status).toBe(401);
  });

  it('summarizes totals, admissions in range and the previous period', async () => {
    const res = await get('/api/v1/stats/summary?from=2026-01-01&to=2026-01-31');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalDoctors: 2,
      totalPatients: 5,
      avgPatientsPerDoctor: 2.5,
      currentlyAdmitted: 2,
      admissions: 2,
      previousAdmissions: 1, // 2025-12-01..2025-12-31
      previousRange: { from: '2025-12-01', to: '2025-12-31' },
    });
  });

  it('omits the comparison when records do not cover the previous period', async () => {
    // Earliest admission is 2025-11-15; the previous period would start on 2025-10-01.
    const res = await get('/api/v1/stats/summary?from=2025-12-01&to=2026-01-31');

    expect(res.body).toMatchObject({
      admissions: 3,
      previousAdmissions: null,
      previousRange: null,
    });
  });

  it('flags the bucket that has not ended yet as partial', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await get(
      `/api/v1/stats/admissions?from=${today.slice(0, 8)}01&to=${today}&interval=month`,
    );

    expect(res.body.data).toEqual([{ date: `${today.slice(0, 8)}01`, count: 0, partial: true }]);
  });

  it('treats today as an incomplete day in daily buckets', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await get(`/api/v1/stats/admissions?from=${today}&to=${today}`);

    expect(res.body).toEqual({ interval: 'day', data: [{ date: today, count: 0, partial: true }] });
  });

  it('ranks doctors by patient count within the range', async () => {
    const all = await get('/api/v1/stats/patients-per-doctor');
    expect(all.body.data).toEqual([
      expect.objectContaining({ doctorId: house, name: 'Dr. House', count: 3 }),
      expect.objectContaining({ doctorId: grey, name: 'Dr. Grey', count: 2 }),
    ]);

    const ranged = await get('/api/v1/stats/patients-per-doctor?from=2026-01-01&limit=1');
    expect(ranged.body.data).toEqual([expect.objectContaining({ name: 'Dr. House', count: 3 })]);
  });

  it('buckets admissions by month with zero-filled gaps', async () => {
    const res = await get('/api/v1/stats/admissions?from=2025-12-01&to=2026-03-31&interval=month');

    expect(res.body).toEqual({
      interval: 'month',
      data: [
        { date: '2025-12-01', count: 1 },
        { date: '2026-01-01', count: 2 },
        { date: '2026-02-01', count: 0 },
        { date: '2026-03-01', count: 1 },
      ],
    });
  });

  it('picks a daily interval for short ranges', async () => {
    const res = await get('/api/v1/stats/admissions?from=2026-01-01&to=2026-01-07');
    expect(res.body.interval).toBe('day');
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data[4]).toEqual({ date: '2026-01-05', count: 1 });
  });

  it('returns every condition, zero-filled and sorted by count', async () => {
    const res = await get('/api/v1/stats/conditions');

    expect(res.body.data[0]).toEqual({ condition: 'asthma', count: 2 });
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data.at(-1).count).toBe(0);
  });

  it('rejects an invalid range', async () => {
    const res = await get('/api/v1/stats/summary?from=2026-02-01&to=2026-01-01');
    expect(res.status).toBe(400);
  });
});
