import type { Request, Response } from "express";
import * as authService from "../service/auth-service";
import { sendError, sendSuccess } from "../utils/http-response";

export const login = async (req: Request, res: Response) => {
  try {
    const body = await authService.login(req);
    return sendSuccess(res, { message: "Login successful", body });
  } catch (error) {
    return sendError(res, { message: "Login failed", error, statusCode: 401 });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const body = await authService.getCurrentUser(req);
    return sendSuccess(res, { message: "Current user fetched successfully", body });
  } catch (error) {
    // 401: the token is valid but its user no longer exists, so the session must end.
    return sendError(res, { message: "Current user fetch failed", error, statusCode: 401 });
  }
};
