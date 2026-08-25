export interface AuthTokenPayload {
  sub: string;
  businessId: string;
  branchId?: string;
}

export interface AuthenticatedUser {
  id: string;
  businessId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  branches: Array<{ id: string; code: string; name: string }>;
  branchId?: string;
}