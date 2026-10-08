import type { Request, Response } from "express";
import * as statsService from "../service/stats-service";
import { sendError, sendSuccess } from "../utils/http-response";

export const getSummary = async (req: Request, res: Response) => {
  try {
    const body = await statsService.getSummary(req);
    return sendSuccess(res, { message: "Summary fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Summary fetch failed", error });
  }
};

export const getPatientsPerDoctor = async (req: Request, res: Response) => {
  try {
    const body = await statsService.getPatientsPerDoctor(req);
    return sendSuccess(res, { message: "Patients per doctor fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Patients per doctor fetch failed", error });
  }
};

export const getAdmissions = async (req: Request, res: Response) => {
  try {
    const body = await statsService.getAdmissions(req);
    return sendSuccess(res, { message: "Admissions fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Admissions fetch failed", error });
  }
};

export const getConditions = async (req: Request, res: Response) => {
  try {
    const body = await statsService.getConditions(req);
    return sendSuccess(res, { message: "Conditions fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Conditions fetch failed", error });
  }
};
