import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { authHeader } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';
import { doctorInput, patientInput } from './helpers/factories.js';

useTestDatabase();

const app = createApp();
let auth: string;
let doctorId: string;

beforeAll(async () => {
  auth = await authHeader();
});

const api = {
  get: (url: string) => request(app).get(url).set('Authorization', auth),
  post: (url: string, body: object) => request(app).post(url).set('Authorization', auth).send(body),
  patch: (url: string, body: object) =>
    request(app).patch(url).set('Authorization', auth).send(body),
  delete: (url: string) => request(app).delete(url).set('Authorization', auth),
};

beforeEach(async () => {
  const res = await api.post('/api/v1/doctors', doctorInput({ name: 'Dr. House' }));
  doctorId = (res.body as { id: string }).id;
});

async function createPatient(overrides: Record<string, unknown> = {}) {
  const res = await api.post('/api/v1/patients', { ...patientInput(overrides), doctorId });
  expect(res.status).toBe(201);
  return res.body as { id: string };
}

describe('patients API', () => {
  it('creates a patient with the doctor summary populated', async () => {
    const res = await api.post('/api/v1/patients', { ...patientInput(), doctorId });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      doctorId,
      doctor: { id: doctorId, name: 'Dr. House', specialization: 'Cardiology' },
      admissionDate: '2026-01-15T00:00:00.000Z',
    });
  });

  it('validates the doctor reference and the admission date', async () => {
    const unknownDoctor = await api.post('/api/v1/patients', {
      ...patientInput(),
      doctorId: '64b7f0f0f0f0f0f0f0f0f0f0',
    });
    expect(unknownDoctor.status).toBe(400);
    expect(unknownDoctor.body.errors[0]).toMatchObject({ field: 'doctorId' });

    const future = await api.post('/api/v1/patients', {
      ...patientInput({ admissionDate: '2999-01-01' }),
      doctorId,
    });
    expect(future.status).toBe(400);
  });

  it('filters by condition, status and admission date, and searches by name', async () => {
    await createPatient({ name: 'Maria Lopez', condition: 'asthma', admissionDate: '2026-03-10' });
    await createPatient({ name: 'Mark Twain', condition: 'diabetes', status: 'recovered' });
    await createPatient({ name: 'Zoe Kim', condition: 'asthma', admissionDate: '2025-12-01' });

    const asthma = await api.get('/api/v1/patients?condition=asthma');
    expect(asthma.body.meta.total).toBe(2);

    const recovered = await api.get('/api/v1/patients?status=recovered');
    expect(recovered.body.data[0].name).toBe('Mark Twain');

    const range = await api.get('/api/v1/patients?from=2026-01-01&to=2026-12-31&condition=asthma');
    expect(range.body.data.map((p: { name: string }) => p.name)).toEqual(['Maria Lopez']);

    const search = await api.get('/api/v1/patients?q=MAR');
    expect(search.body.meta.total).toBe(2);

    const byDoctor = await api.get(`/api/v1/patients?doctorId=${doctorId}`);
    expect(byDoctor.body.meta.total).toBe(3);
  });

  it('sorts by admission date, newest first, by default', async () => {
    await createPatient({ name: 'Old', admissionDate: '2025-01-01' });
    await createPatient({ name: 'New', admissionDate: '2026-02-01' });

    const res = await api.get('/api/v1/patients');
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['New', 'Old']);
  });

  it('updates a patient, including moving them to another doctor', async () => {
    const patient = await createPatient();
    const other = await api.post('/api/v1/doctors', doctorInput({ name: 'Dr. Grey' }));

    const res = await api.patch(`/api/v1/patients/${patient.id}`, {
      status: 'recovered',
      doctorId: other.body.id,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'recovered', doctor: { name: 'Dr. Grey' } });
  });

  it('deletes a patient (204) and then returns 404', async () => {
    const patient = await createPatient();

    expect((await api.delete(`/api/v1/patients/${patient.id}`)).status).toBe(204);
    expect((await api.get(`/api/v1/patients/${patient.id}`)).status).toBe(404);
    expect((await api.delete(`/api/v1/patients/${patient.id}`)).status).toBe(404);
  });
});
