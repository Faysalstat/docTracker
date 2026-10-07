import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
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

const api = {
  get: (url: string) => request(app).get(url).set('Authorization', auth),
  post: (url: string, body: object) => request(app).post(url).set('Authorization', auth).send(body),
  patch: (url: string, body: object) =>
    request(app).patch(url).set('Authorization', auth).send(body),
};

async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await api.post('/api/v1/doctors', doctorInput(overrides));
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string };
}

describe('doctors API', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/doctors');
    expect(res.status).toBe(401);
  });

  describe('POST /doctors', () => {
    it('creates a doctor and returns 201 with a Location header', async () => {
      const res = await api.post(
        '/api/v1/doctors',
        doctorInput({ name: '  Dr. Jane Doe ', email: 'JANE@Example.com' }),
      );

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/v1/doctors/${res.body.id}`);
      expect(res.body).toMatchObject({
        name: 'Dr. Jane Doe',
        email: 'jane@example.com',
        patientCount: 0,
      });
      expect(res.body).not.toHaveProperty('nameLower');
    });

    it('returns 409 for a duplicate email', async () => {
      await createDoctor({ email: 'dup@example.com' });
      const res = await api.post('/api/v1/doctors', doctorInput({ email: 'dup@example.com' }));

      expect(res.status).toBe(409);
    });

    it('returns 400 with field errors for invalid input', async () => {
      const res = await api.post('/api/v1/doctors', {
        name: 'X',
        specialization: 'Astrology',
        phone: 'abc',
        email: 'nope',
      });

      expect(res.status).toBe(400);
      const fields = (res.body.errors as { field: string }[]).map((e) => e.field);
      expect(fields).toEqual(
        expect.arrayContaining(['name', 'specialization', 'hospital', 'phone', 'email']),
      );
    });
  });

  describe('GET /doctors', () => {
    it('paginates, searches by name prefix (case-insensitive) and filters', async () => {
      await createDoctor({ name: 'Alice Walker', specialization: 'Neurology' });
      await createDoctor({ name: 'Albert Stone', specialization: 'Cardiology' });
      await createDoctor({ name: 'Bob Marley', specialization: 'Neurology' });

      const page = await api.get('/api/v1/doctors?limit=2&page=2');
      expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
      expect(page.body.data).toHaveLength(1);

      const search = await api.get('/api/v1/doctors?q=al');
      expect((search.body.data as { name: string }[]).map((d) => d.name).sort()).toEqual([
        'Albert Stone',
        'Alice Walker',
      ]);

      const filtered = await api.get('/api/v1/doctors?specialization=Neurology&q=b');
      expect(filtered.body.data).toHaveLength(1);
      expect(filtered.body.data[0].name).toBe('Bob Marley');
    });

    it('treats regex characters in search as plain text', async () => {
      await createDoctor({ name: 'Alice Walker' });
      const res = await api.get('/api/v1/doctors?q=.*');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('sorts by name and filters by created date range', async () => {
      await createDoctor({ name: 'Charlie' });
      await createDoctor({ name: 'Anna' });
      const today = new Date().toISOString().slice(0, 10);

      const sorted = await api.get(`/api/v1/doctors?sort=name&from=${today}&to=${today}`);
      expect((sorted.body.data as { name: string }[]).map((d) => d.name)).toEqual([
        'Anna',
        'Charlie',
      ]);

      const past = await api.get('/api/v1/doctors?to=2000-01-01');
      expect(past.body.meta.total).toBe(0);
    });

    it('rejects an invalid sort, page size or date range', async () => {
      for (const query of ['sort=password', 'limit=500', 'from=2026-02-01&to=2026-01-01']) {
        const res = await api.get(`/api/v1/doctors?${query}`);
        expect(res.status, query).toBe(400);
      }
    });

    it('includes the patient count for each doctor', async () => {
      const doctor = await createDoctor();
      await api.post(`/api/v1/doctors/${doctor.id}/patients`, patientInput());
      await api.post(`/api/v1/doctors/${doctor.id}/patients`, patientInput());

      const res = await api.get('/api/v1/doctors');
      expect(res.body.data[0]).toMatchObject({ id: doctor.id, patientCount: 2 });
    });
  });

  describe('GET/PATCH /doctors/:id', () => {
    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      expect((await api.get('/api/v1/doctors/64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
      expect((await api.get('/api/v1/doctors/not-an-id')).status).toBe(400);
    });

    it('updates a doctor and keeps search in sync with the new name', async () => {
      const doctor = await createDoctor({ name: 'Old Name' });
      const res = await api.patch(`/api/v1/doctors/${doctor.id}`, { name: 'Zed New' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Zed New');
      const search = await api.get('/api/v1/doctors?q=zed');
      expect(search.body.data).toHaveLength(1);
    });

    it('rejects an empty update', async () => {
      const doctor = await createDoctor();
      const res = await api.patch(`/api/v1/doctors/${doctor.id}`, {});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /doctors/hospitals', () => {
    it('returns distinct hospital names, sorted', async () => {
      await createDoctor({ hospital: 'Mercy' });
      await createDoctor({ hospital: 'City General' });
      await createDoctor({ hospital: 'Mercy' });

      const res = await api.get('/api/v1/doctors/hospitals');
      expect(res.body.data).toEqual(['City General', 'Mercy']);
    });
  });

  describe('GET /doctors/options', () => {
    it('returns id/name pairs sorted by name (case-insensitive)', async () => {
      await createDoctor({ name: 'charlie Day' });
      await createDoctor({ name: 'Alice Ray' });

      const res = await api.get('/api/v1/doctors/options');
      expect(res.status).toBe(200);
      expect(res.body.data.map((d: { name: string }) => d.name)).toEqual([
        'Alice Ray',
        'charlie Day',
      ]);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['id', 'name']);
    });
  });

  describe('doctor patients', () => {
    it('adds patients under a doctor and lists only that doctor’s patients', async () => {
      const doctor = await createDoctor();
      const other = await createDoctor();
      const created = await api.post(`/api/v1/doctors/${doctor.id}/patients`, patientInput());
      await api.post(`/api/v1/doctors/${other.id}/patients`, patientInput());

      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ doctorId: doctor.id, doctor: { id: doctor.id } });

      const list = await api.get(`/api/v1/doctors/${doctor.id}/patients`);
      expect(list.body.meta.total).toBe(1);
      expect(list.body.data[0].doctorId).toBe(doctor.id);
    });

    it('returns 404 when the doctor does not exist', async () => {
      const id = '64b7f0f0f0f0f0f0f0f0f0f0';
      expect((await api.get(`/api/v1/doctors/${id}/patients`)).status).toBe(404);
      expect((await api.post(`/api/v1/doctors/${id}/patients`, patientInput())).status).toBe(404);
    });
  });
});
