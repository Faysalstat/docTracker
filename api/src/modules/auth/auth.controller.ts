import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares/authenticate.js';
import { loginSchema } from './auth.schema.js';
import * as authService from './auth.service.js';

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.getUserById(getAuthUser(req).sub);
  res.json(user);
}
