import type { Types } from "mongoose";
import Doctor from "../model/doctor";
import type { AdmissionInterval } from "../model/enums";
import { PATIENT_STATUSES } from "../model/enums";
import Patient from "../model/patient";

// Every query here filters on admissionDate, served by the { admissionDate, _id } index.
export type AdmissionMatch = { admissionDate?: { $gte?: Date; $lte?: Date } };

/**
 * Separate index-backed counts run in parallel. (A single $facet would be one round
 * trip, but $facet sub-pipelines cannot use indexes.)
 */
export async function countTotals(match: AdmissionMatch, previousMatch: AdmissionMatch | null) {
  const [totalDoctors, totalPatients, admissions, previousAdmissions, currentlyAdmitted] =
    await Promise.all([
      Doctor.estimatedDocumentCount(),
      Patient.estimatedDocumentCount(),
      Patient.countDocuments(match),
      previousMatch ? Patient.countDocuments(previousMatch) : Promise.resolve(null),
      Patient.countDocuments({
        status: { $in: [PATIENT_STATUSES.ADMITTED, PATIENT_STATUSES.UNDER_TREATMENT] },
      }),
    ]);
  return { totalDoctors, totalPatients, admissions, previousAdmissions, currentlyAdmitted };
}

/** Earliest admission date: an index seek on { admissionDate }, not a scan. */
export async function findEarliestAdmission() {
  const first = await Patient.findOne({}, { admissionDate: 1 }).sort({ admissionDate: 1 }).lean();
  return first?.admissionDate;
}

/** Top doctors by patient count: group first, then $lookup only the top N doctors. */
export async function countPatientsPerDoctor(match: AdmissionMatch, limit: number) {
  return Patient.aggregate<{
    doctorId: Types.ObjectId;
    name: string;
    specialization: string;
    count: number;
  }>([
    { $match: match },
    { $group: { _id: "$doctorId", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: Doctor.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "doctor",
        pipeline: [{ $project: { name: 1, specialization: 1 } }],
      },
    },
    { $unwind: "$doctor" },
    {
      $project: {
        _id: 0,
        doctorId: "$_id",
        name: "$doctor.name",
        specialization: "$doctor.specialization",
        count: 1,
      },
    },
  ]);
}

/** Admissions per bucket start (UTC; weeks start on Monday). Empty buckets are absent. */
export async function countAdmissionsByBucket(from: Date, to: Date, interval: AdmissionInterval) {
  return Patient.aggregate<{ _id: Date; count: number }>([
    { $match: { admissionDate: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$admissionDate",
            unit: interval,
            timezone: "UTC",
            startOfWeek: "monday",
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);
}

export async function countByCondition(match: AdmissionMatch) {
  return Patient.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$condition", count: { $sum: 1 } } },
  ]);
}
