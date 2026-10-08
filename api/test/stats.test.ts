import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RUN_ID, api, createDoctor, createPatient, useTestServer } from "./helpers";

// The dev DB holds real data, so the fixtures sit in 1989-1990, where nothing else is
// admitted. Totals that span the whole collection are checked as deltas.
let house: string;
let grey: string;
let baseline: { totalDoctors: number; totalPatients: number; currentlyAdmitted: number };

useTestServer(async () => {
  baseline = (await api.get("/api/stats/summary")).body;

  house = (await createDoctor({ name: `Dr. House ${RUN_ID}` }))._id;
  grey = (await createDoctor({ name: `Dr. Grey ${RUN_ID}` }))._id;

  const fixtures = [
    { doctorId: house, admissionDate: "1990-01-05", condition: "asthma", status: "admitted" },
    { doctorId: house, admissionDate: "1990-01-20", condition: "asthma", status: "recovered" },
    { doctorId: house, admissionDate: "1990-03-02", condition: "cardiac", status: "admitted" },
    { doctorId: grey, admissionDate: "1989-12-30", condition: "diabetes", status: "recovered" },
    // Earliest record: makes December 1989 a fully covered comparison period.
    { doctorId: grey, admissionDate: "1989-11-15", condition: "other", status: "recovered" },
  ];
  for (const { doctorId, ...fields } of fixtures) {
    await createPatient(doctorId, fields);
  }
});

describe("stats API", () => {
  it("requires authentication", async () => {
    const res = await api.get("/api/stats/summary", { token: null });
    assert.equal(res.status, 401);
  });

  it("summarizes totals, admissions in range and the previous period", async () => {
    const res = await api.get("/api/stats/summary?from=1990-01-01&to=1990-01-31");

    assert.equal(res.status, 200);
    assert.equal(res.body.totalDoctors - baseline.totalDoctors, 2);
    assert.equal(res.body.totalPatients - baseline.totalPatients, 5);
    assert.equal(res.body.currentlyAdmitted - baseline.currentlyAdmitted, 2);
    assert.equal(res.body.admissions, 2);
    assert.equal(res.body.previousAdmissions, 1); // 1989-12-01..1989-12-31
    assert.deepEqual(res.body.previousRange, { from: "1989-12-01", to: "1989-12-31" });
  });

  it("omits the comparison when records do not cover the previous period", async () => {
    // Earliest admission is 1989-11-15; the previous period would start on 1989-10-01.
    const res = await api.get("/api/stats/summary?from=1989-12-01&to=1990-01-31");

    assert.equal(res.body.admissions, 3);
    assert.equal(res.body.previousAdmissions, null);
    assert.equal(res.body.previousRange, null);
  });

  it("flags the bucket that has not ended yet as partial", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const monthly = await api.get(
      `/api/stats/admissions?from=${today.slice(0, 8)}01&to=${today}&interval=month`,
    );
    assert.equal(monthly.body.data.length, 1);
    assert.equal(monthly.body.data[0].date, `${today.slice(0, 8)}01`);
    assert.equal(monthly.body.data[0].partial, true);

    const daily = await api.get(`/api/stats/admissions?from=${today}&to=${today}`);
    assert.equal(daily.body.interval, "day");
    assert.equal(daily.body.data[0].partial, true);
  });

  it("ranks doctors by patient count within the range", async () => {
    const all = await api.get("/api/stats/patients-per-doctor?from=1989-01-01&to=1990-12-31");
    assert.deepEqual(
      all.body.map((row: { doctorId: string; count: number }) => [row.doctorId, row.count]),
      [
        [house, 3],
        [grey, 2],
      ],
    );

    const ranged = await api.get(
      "/api/stats/patients-per-doctor?from=1990-01-01&to=1990-12-31&limit=1",
    );
    assert.equal(ranged.body.length, 1);
    assert.equal(ranged.body[0].name, `Dr. House ${RUN_ID}`);
    assert.equal(ranged.body[0].count, 3);
  });

  it("buckets admissions by month with zero-filled gaps", async () => {
    const res = await api.get("/api/stats/admissions?from=1989-12-01&to=1990-03-31&interval=month");

    assert.deepEqual(res.body, {
      interval: "month",
      data: [
        { date: "1989-12-01", count: 1 },
        { date: "1990-01-01", count: 2 },
        { date: "1990-02-01", count: 0 },
        { date: "1990-03-01", count: 1 },
      ],
    });
  });

  it("picks a daily interval for short ranges", async () => {
    const res = await api.get("/api/stats/admissions?from=1990-01-01&to=1990-01-07");
    assert.equal(res.body.interval, "day");
    assert.equal(res.body.data.length, 7);
    assert.deepEqual(res.body.data[4], { date: "1990-01-05", count: 1 });
  });

  it("returns every condition, zero-filled and sorted by count", async () => {
    const res = await api.get("/api/stats/conditions?from=1989-01-01&to=1990-12-31");

    assert.deepEqual(res.body[0], { condition: "asthma", count: 2 });
    assert.equal(res.body.length, 6);
    assert.equal(res.body.at(-1).count, 0);
  });

  it("rejects an invalid range", async () => {
    const res = await api.get("/api/stats/summary?from=2026-02-01&to=2026-01-01");
    assert.equal(res.status, 400);
    assert.equal(res.message, "Summary fetch failed: from must be on or before to");
  });
});
