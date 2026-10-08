import type { Request, Response } from "express";
import * as patientService from "../service/patient-service";
import { sendError, sendSuccess } from "../utils/http-response";

export const listPatients = async (req: Request, res: Response) => {
  try {
    const body = await patientService.listPatients(req);
    return sendSuccess(res, { message: "Patient list fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Patient list fetch failed", error });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  try {
    const body = await patientService.getPatientById(req);
    return sendSuccess(res, { message: "Patient fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Patient fetch failed", error });
  }
};

export const createPatient = async (req: Request, res: Response) => {
  try {
    const body = await patientService.createPatient(req);
    return sendSuccess(res, { message: "Patient created successfully", body });
  } catch (error) {
    return sendError(res, { message: "Patient creation failed", error });
  }
};

export const updatePatient = async (req: Request, res: Response) => {
  try {
    const body = await patientService.updatePatient(req);
    return sendSuccess(res, { message: "Patient updated successfully", body });
  } catch (error) {
    return sendError(res, { message: "Patient update failed", error });
  }
};

export const deletePatient = async (req: Request, res: Response) => {
  try {
    const body = await patientService.deletePatient(req);
    return sendSuccess(res, { message: "Patient deleted successfully", body });
  } catch (error) {
    return sendError(res, { message: "Patient deletion failed", error });
  }
};
