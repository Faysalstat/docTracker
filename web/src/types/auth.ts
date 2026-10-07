export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: SessionUser;
}
