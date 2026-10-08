import type { Request, Response } from "express";
import * as doctorService from "../service/doctor-service";
import { sendError, sendSuccess } from "../utils/http-response";

export const listDoctors = async (req: Request, res: Response) => {
  try {
    const body = await doctorService.listDoctors(req);
    return sendSuccess(res, { message: "Doctor list fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Doctor list fetch failed", error });
  }
};

export const getDoctorById = async (req: Request, res: Response) => {
  try {
    const body = await doctorService.getDoctorById(req);
    return sendSuccess(res, { message: "Doctor fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Doctor fetch failed", error });
  }
};

export const createDoctor = async (req: Request, res: Response) => {
  try {
    const body = await doctorService.createDoctor(req);
    return sendSuccess(res, { message: "Doctor created successfully", body });
  } catch (error) {
    return sendError(res, { message: "Doctor creation failed", error });
  }
};

export const updateDoctor = async (req: Request, res: Response) => {
  try {
    const body = await doctorService.updateDoctor(req);
    return sendSuccess(res, { message: "Doctor updated successfully", body });
  } catch (error) {
    return sendError(res, { message: "Doctor update failed", error });
  }
};

export const listDoctorOptions = async (req: Request, res: Response) => {
  try {
    const body = await doctorService.listDoctorOptions(req);
    return sendSuccess(res, { message: "Doctor options fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Doctor options fetch failed", error });
  }
};

export const listHospitals = async (req: Request, res: Response) => {
  try {
    const body = await doctorService.listHospitals(req);
    return sendSuccess(res, { message: "Hospital list fetched successfully", body });
  } catch (error) {
    return sendError(res, { message: "Hospital list fetch failed", error });
  }
};
