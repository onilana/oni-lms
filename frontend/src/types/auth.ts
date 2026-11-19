export interface Role {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  email_verified_at?: string;
  last_login_at?: string;
  roles: Role[];
  permissions: string[];
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: User;
}

export interface HealthStatus {
  success: boolean;
  service: string;
  checks: Record<string, string>;
}
