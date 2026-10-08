import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RUN_ID, api, createDoctor, createPatient, patientInput, useTestServer } from "./helpers";

const UNKNOWN_ID = "64b7f0f0f0f0f0f0f0f0f0f0";
let doctorId: string;

useTestServer(async () => {
  doctorId = (await createDoctor({ name: "Dr. House", specialization: "Cardiology" }))._id;
});

describe("patient API", () => {
  it("creates a patient with the doctor populated in doctorId", async () => {
    const res = await api.post("/api/patient/create", { ...patientInput(), doctorId });

    assert.equal(res.status, 200);
    assert.equal(res.message, "Patient created successfully");
    assert.deepEqual(res.body.doctorId, {
      _id: doctorId,
      name: "Dr. House",
      specialization: "Cardiology",
    });
    assert.equal(res.body.admissionDate, "2026-01-15T00:00:00.000Z");
    assert.equal(res.body.status, "admitted");
    assert.equal("nameLower" in res.body, false);
  });

  it("validates the doctor reference and the admission date", async () => {
    const unknownDoctor = await api.post("/api/patient/create", {
      ...patientInput(),
      doctorId: UNKNOWN_ID,
    });
    assert.equal(unknownDoctor.status, 400);
    assert.equal(unknownDoctor.message, "Patient creation failed: Doctor not found");

    const future = await api.post("/api/patient/create", {
      ...patientInput({ admissionDate: "2999-01-01" }),
      doctorId,
    });
    assert.equal(future.message, "Patient creation failed: admissionDate cannot be in the future");

    const badAge = await api.post("/api/patient/create", {
      ...patientInput({ age: 400 }),
      doctorId,
    });
    assert.equal(badAge.message, "Patient creation failed: age must be 120 or less");
  });

  it("filters by doctor, condition, status and admission date, and searches by name", async () => {
    const doctor = (await createDoctor())._id;
    await createPatient(doctor, {
      name: "Maria Lopez",
      condition: "asthma",
      admissionDate: "2026-03-10",
    });
    await createPatient(doctor, { name: "Mark Twain", condition: "diabetes", status: "recovered" });
    await createPatient(doctor, {
      name: "Zoe Kim",
      condition: "asthma",
      admissionDate: "2025-12-01",
    });
    const scope = `doctorId=${doctor}`;

    const all = await api.get(`/api/patient/list?${scope}`);
    assert.equal(all.body.length, 3);

    const asthma = await api.get(`/api/patient/list?${scope}&condition=asthma`);
    assert.equal(asthma.body.length, 2);

    const recovered = await api.get(`/api/patient/list?${scope}&status=recovered`);
    assert.equal(recovered.body.data[0].name, "Mark Twain");

    const range = await api.get(
      `/api/patient/list?${scope}&from=2026-01-01&to=2026-12-31&condition=asthma`,
    );
    assert.deepEqual(
      range.body.data.map((p: { name: string }) => p.name),
      ["Maria Lopez"],
    );

    const search = await api.get(`/api/patient/list?${scope}&q=MAR`);
    assert.equal(search.body.length, 2);
  });

  it("sorts by admission date, newest first, by default", async () => {
    const doctor = (await createDoctor())._id;
    await createPatient(doctor, { name: "Old", admissionDate: "2025-01-01" });
    await createPatient(doctor, { name: "New", admissionDate: "2026-02-01" });

    const res = await api.get(`/api/patient/list?doctorId=${doctor}`);
    assert.deepEqual(
      res.body.data.map((p: { name: string }) => p.name),
      ["New", "Old"],
    );
  });

  it("reports an unknown doctor instead of an empty list", async () => {
    const res = await api.get(`/api/patient/list?doctorId=${UNKNOWN_ID}`);
    assert.equal(res.status, 400);
    assert.equal(res.message, "Patient list fetch failed: Doctor not found");
  });

  it("updates a patient, including moving them to another doctor", async () => {
    const patient = await createPatient(doctorId);
    const other = await createDoctor({ name: `Dr. Grey ${RUN_ID}` });

    const res = await api.put(`/api/patient/update/${patient._id}`, {
      status: "recovered",
      doctorId: other._id,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "recovered");
    assert.equal(res.body.doctorId.name, `Dr. Grey ${RUN_ID}`);
    assert.equal(res.body.name, patient.name);

    const unknownDoctor = await api.put(`/api/patient/update/${patient._id}`, {
      doctorId: UNKNOWN_ID,
    });
    assert.equal(unknownDoctor.message, "Patient update failed: Doctor not found");
  });

  it("deletes a patient and then reports it as not found", async () => {
    const patient = await createPatient(doctorId);

    const deleted = await api.delete(`/api/patient/delete/${patient._id}`);
    assert.equal(deleted.status, 200);
    assert.deepEqual(deleted.body, { _id: patient._id });

    const fetched = await api.get(`/api/patient/getbyid?id=${patient._id}`);
    assert.equal(fetched.message, "Patient fetch failed: Patient not found");

    const again = await api.delete(`/api/patient/delete/${patient._id}`);
    assert.equal(again.message, "Patient deletion failed: Patient not found");
  });
});
