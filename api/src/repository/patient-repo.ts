import type { Types } from "mongoose";
import Patient from "../model/patient";

/** Patient counts for a page of doctors, served by the { doctorId, admissionDate } index. */
export async function countPatientsByDoctor(doctorIds: Types.ObjectId[]) {
  if (doctorIds.length === 0) return new Map<string, number>();
  const rows = await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctorId: { $in: doctorIds } } },
    { $group: { _id: "$doctorId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}
