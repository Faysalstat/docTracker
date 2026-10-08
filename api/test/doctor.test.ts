import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMAIL_DOMAIN,
  RUN_ID,
  api,
  createDoctor,
  createPatient,
  doctorInput,
  ownDoctors,
  useTestServer,
} from "./helpers";

useTestServer();

const UNKNOWN_ID = "64b7f0f0f0f0f0f0f0f0f0f0";

describe("doctor API", () => {
  describe("POST /api/doctor/create", () => {
    it("creates a doctor, trimming the name and lowercasing the email", async () => {
      const res = await api.post(
        "/api/doctor/create",
        doctorInput({ name: "  Dr. Jane Doe ", email: `JANE@${EMAIL_DOMAIN.toUpperCase()}` }),
      );

      assert.equal(res.status, 200);
      assert.equal(res.message, "Doctor created successfully");
      assert.equal(res.body.name, "Dr. Jane Doe");
      assert.equal(res.body.email, `jane@${EMAIL_DOMAIN}`);
      assert.equal(res.body.patientCount, 0);
      assert.equal(typeof res.body._id, "string");
      assert.equal("nameLower" in res.body, false);
    });

    it("reports a duplicate email in plain words", async () => {
      await createDoctor({ email: `dup@${EMAIL_DOMAIN}` });
      const res = await api.post(
        "/api/doctor/create",
        doctorInput({ email: `dup@${EMAIL_DOMAIN}` }),
      );

      assert.equal(res.status, 400);
      assert.equal(res.message, "Doctor creation failed: email already exists");
    });

    it("reports the first invalid field", async () => {
      const res = await api.post("/api/doctor/create", { name: "X", specialization: "Astrology" });
      assert.equal(res.status, 400);
      assert.equal(res.message, "Doctor creation failed: name must be at least 2 characters");

      const missing = await api.post("/api/doctor/create", { ...doctorInput(), phone: undefined });
      assert.equal(missing.message, "Doctor creation failed: phone is required");
    });

    it("ignores fields that are not part of a doctor", async () => {
      const res = await api.post("/api/doctor/create", {
        ...doctorInput(),
        _id: UNKNOWN_ID,
        isAdmin: true,
      });
      assert.equal(res.status, 200);
      assert.notEqual(res.body._id, UNKNOWN_ID);
      assert.equal("isAdmin" in res.body, false);
    });
  });

  describe("GET /api/doctor/list", () => {
    it("paginates with offset/limit, searches by name prefix and filters", async () => {
      const hospital = `${RUN_ID} list`;
      await createDoctor({ name: "Alice Walker", specialization: "Neurology", hospital });
      await createDoctor({ name: "Albert Stone", specialization: "Cardiology", hospital });
      await createDoctor({ name: "Bob Marley", specialization: "Neurology", hospital });
      const scope = `hospital=${encodeURIComponent(hospital)}`;

      const page = await api.get(`/api/doctor/list?${scope}&limit=2&offset=2`);
      assert.equal(page.body.length, 3);
      assert.equal(page.body.data.length, 1);

      const search = await api.get(`/api/doctor/list?${scope}&q=al`);
      assert.deepEqual(search.body.data.map((d: { name: string }) => d.name).sort(), [
        "Albert Stone",
        "Alice Walker",
      ]);

      const filtered = await api.get(`/api/doctor/list?${scope}&specialization=Neurology&q=b`);
      assert.deepEqual(
        filtered.body.data.map((d: { name: string }) => d.name),
        ["Bob Marley"],
      );

      // Empty filters count as "not provided".
      const empty = await api.get(`/api/doctor/list?${scope}&specialization=&q=`);
      assert.equal(empty.body.length, 3);
    });

    it("treats regex characters in search as plain text", async () => {
      await createDoctor({ name: "Alice Walker" });
      const res = await api.get(`/api/doctor/list?${ownDoctors}&q=.*`);
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 0);
    });

    it("sorts by name and filters by created date range", async () => {
      const hospital = `${RUN_ID} sort`;
      await createDoctor({ name: "Charlie", hospital });
      await createDoctor({ name: "anna", hospital });
      const scope = `hospital=${encodeURIComponent(hospital)}`;
      const today = new Date().toISOString().slice(0, 10);

      const sorted = await api.get(`/api/doctor/list?${scope}&sort=name&from=${today}&to=${today}`);
      assert.deepEqual(
        sorted.body.data.map((d: { name: string }) => d.name),
        ["anna", "Charlie"],
      );

      const past = await api.get(`/api/doctor/list?${scope}&to=2000-01-01`);
      assert.equal(past.body.length, 0);
    });

    it("rejects an invalid sort, page size or date range", async () => {
      const cases = {
        "sort=password": "sort must be one of: name, -name, createdAt, -createdAt",
        "limit=500": "limit must be at most 100",
        "offset=-1": "offset must be 0 or more",
        "from=2026-02-01&to=2026-01-01": "from must be on or before to",
      };
      for (const [query, message] of Object.entries(cases)) {
        const res = await api.get(`/api/doctor/list?${query}`);
        assert.equal(res.status, 400, query);
        assert.equal(res.message, `Doctor list fetch failed: ${message}`);
      }
    });

    it("includes the patient count for each doctor", async () => {
      const hospital = `${RUN_ID} count`;
      const doctor = await createDoctor({ hospital });
      await createPatient(doctor._id);
      await createPatient(doctor._id);

      const res = await api.get(`/api/doctor/list?hospital=${encodeURIComponent(hospital)}`);
      assert.equal(res.body.data[0]._id, doctor._id);
      assert.equal(res.body.data[0].patientCount, 2);
    });
  });

  describe("GET /api/doctor/getbyid and PUT /api/doctor/update/:id", () => {
    it("reports an unknown or malformed id", async () => {
      const unknown = await api.get(`/api/doctor/getbyid?id=${UNKNOWN_ID}`);
      assert.equal(unknown.status, 400);
      assert.equal(unknown.message, "Doctor fetch failed: Doctor not found");

      const malformed = await api.get("/api/doctor/getbyid?id=not-an-id");
      assert.equal(malformed.message, "Doctor fetch failed: doctorId is invalid");

      const injected = await api.get("/api/doctor/getbyid?id[$gt]=");
      assert.equal(injected.message, "Doctor fetch failed: doctorId is invalid");
    });

    it("returns the doctor with its patient count", async () => {
      const doctor = await createDoctor();
      await createPatient(doctor._id);

      const res = await api.get(`/api/doctor/getbyid?id=${doctor._id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.name, doctor.name);
      assert.equal(res.body.patientCount, 1);
    });

    it("updates only the sent fields and keeps search in sync with the new name", async () => {
      const doctor = await createDoctor({ name: "Old Name", hospital: `${RUN_ID} update` });
      const res = await api.put(`/api/doctor/update/${doctor._id}`, { name: `Zed ${RUN_ID}` });

      assert.equal(res.status, 200);
      assert.equal(res.body.name, `Zed ${RUN_ID}`);
      assert.equal(res.body.hospital, `${RUN_ID} update`);
      const search = await api.get(`/api/doctor/list?q=${encodeURIComponent(`zed ${RUN_ID}`)}`);
      assert.equal(search.body.length, 1);
    });

    it("rejects an empty update, an unknown doctor and a duplicate email", async () => {
      const doctor = await createDoctor();
      const other = await createDoctor();

      const empty = await api.put(`/api/doctor/update/${doctor._id}`, {});
      assert.equal(empty.message, "Doctor update failed: Provide at least one field to update");

      const unknown = await api.put(`/api/doctor/update/${UNKNOWN_ID}`, { name: "Someone" });
      assert.equal(unknown.message, "Doctor update failed: Doctor not found");

      const otherEmail = (await api.get(`/api/doctor/getbyid?id=${other._id}`)).body
        .email as string;
      const duplicate = await api.put(`/api/doctor/update/${doctor._id}`, { email: otherEmail });
      assert.equal(duplicate.message, "Doctor update failed: email already exists");
    });
  });

  describe("GET /api/doctor/hospitals", () => {
    it("returns distinct hospital names, sorted", async () => {
      const mercy = `${RUN_ID} Mercy`;
      const city = `${RUN_ID} City General`;
      await createDoctor({ hospital: mercy });
      await createDoctor({ hospital: city });
      await createDoctor({ hospital: mercy });

      const res = await api.get("/api/doctor/hospitals");
      const ours = (res.body as string[]).filter((name) => name === city || name === mercy);
      assert.deepEqual(ours, [city, mercy]);
    });
  });

  describe("GET /api/doctor/options", () => {
    it("returns _id/name pairs sorted by name, case-insensitively", async () => {
      await createDoctor({ name: `zz${RUN_ID} charlie` });
      await createDoctor({ name: `ZZ${RUN_ID} Alice` });

      const res = await api.get("/api/doctor/options");
      assert.equal(res.status, 200);
      const ours = (res.body as { name: string }[]).filter((d) =>
        d.name.toLowerCase().startsWith(`zz${RUN_ID}`),
      );
      assert.deepEqual(
        ours.map((d) => d.name),
        [`ZZ${RUN_ID} Alice`, `zz${RUN_ID} charlie`],
      );
      assert.deepEqual(Object.keys(ours[0] ?? {}).sort(), ["_id", "name"]);
    });
  });
});
