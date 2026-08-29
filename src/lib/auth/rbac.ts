import type { Role } from "../constants";

export const ROLE_ORDER: Role[] = ["VIEWER", "SALESPERSON", "ADMIN", "OWNER"];

const PERMISSIONS = {
  "org:read": ["OWNER", "ADMIN", "SALESPERSON", "VIEWER"],
  "org:write": ["OWNER", "ADMIN"],
  "team:manage": ["OWNER", "ADMIN"],
  "billing:manage": ["OWNER"],
  "agent:write": ["OWNER", "ADMIN"],
  "knowledge:write": ["OWNER", "ADMIN"],
  "channels:write": ["OWNER", "ADMIN"],
  "leads:read": ["OWNER", "ADMIN", "SALESPERSON", "VIEWER"],
  "leads:write": ["OWNER", "ADMIN", "SALESPERSON"],
  "conversations:read": ["OWNER", "ADMIN", "SALESPERSON", "VIEWER"],
  "conversations:write": ["OWNER", "ADMIN", "SALESPERSON"],
  "conversations:takeover": ["OWNER", "ADMIN", "SALESPERSON"],
  "analytics:read": ["OWNER", "ADMIN", "SALESPERSON", "VIEWER"],
  "audit:read": ["OWNER", "ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function assertCan(role: Role, permission: Permission) {
  if (!can(role, permission)) {
    const error = new Error("Forbidden");
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}
