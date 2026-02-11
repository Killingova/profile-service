export interface Profile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string | null;
  language: string | null;
  timezone: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProfilePreferences {
  id: string;
  userId: string;
  tenantId: string;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProfilePatch {
  displayName?: string | null;
  language?: string | null;
  timezone?: string | null;
}

export interface ProfileContext {
  tenantId: string;
  userId: string;
  requestId?: string;
}
