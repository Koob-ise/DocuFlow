import { DocTemplate, TagDefinition, DocumentPackage } from '../types';

const TOKEN_KEY = 'docuflow_auth_token';

export interface AuthUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  createdAt?: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Ошибка сервера (${res.status})`);
  }

  return data as T;
}

// Auth API
export async function apiRegister(username: string, password: string, name?: string, email?: string): Promise<{ token: string; user: AuthUser }> {
  const res = await request<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, name, email }),
  });
  setStoredToken(res.token);
  return res;
}

export async function apiLogin(identifier: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setStoredToken(res.token);
  return res;
}

export async function apiGetMe(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await request<{ user: AuthUser | null }>('/api/auth/me');
    return res.user;
  } catch {
    setStoredToken(null);
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore error
  } finally {
    setStoredToken(null);
  }
}

// Templates API
export async function apiGetTemplates(): Promise<DocTemplate[]> {
  try {
    const res = await request<{ templates: DocTemplate[] }>('/api/templates');
    return res.templates || [];
  } catch {
    return [];
  }
}

export async function apiSaveTemplate(template: DocTemplate): Promise<void> {
  await request('/api/templates', {
    method: 'POST',
    body: JSON.stringify({ template }),
  });
}

export async function apiSaveTemplates(templates: DocTemplate[]): Promise<void> {
  await request('/api/templates', {
    method: 'POST',
    body: JSON.stringify({ templates }),
  });
}

export async function apiDeleteTemplate(templateId: string): Promise<void> {
  await request(`/api/templates/${encodeURIComponent(templateId)}`, {
    method: 'DELETE',
  });
}

// Tags API
export async function apiGetTags(): Promise<TagDefinition[]> {
  try {
    const res = await request<{ tags: TagDefinition[] }>('/api/tags');
    return res.tags || [];
  } catch {
    return [];
  }
}

export async function apiSaveTag(tag: TagDefinition): Promise<void> {
  await request('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ tag }),
  });
}

export async function apiSaveTags(tags: TagDefinition[]): Promise<void> {
  await request('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

export async function apiDeleteTag(tagName: string): Promise<void> {
  await request(`/api/tags/${encodeURIComponent(tagName)}`, {
    method: 'DELETE',
  });
}

// User Packages Archive API (Per-user private archive)
export async function apiGetPackages(): Promise<DocumentPackage[]> {
  try {
    const res = await request<{ packages: DocumentPackage[] }>('/api/packages');
    return res.packages || [];
  } catch {
    return [];
  }
}

export async function apiSavePackage(pkg: DocumentPackage): Promise<void> {
  await request('/api/packages', {
    method: 'POST',
    body: JSON.stringify({ package: pkg }),
  });
}

export async function apiSavePackages(packages: DocumentPackage[]): Promise<void> {
  await request('/api/packages', {
    method: 'POST',
    body: JSON.stringify({ packages }),
  });
}

export async function apiDeletePackage(packageId: string): Promise<void> {
  await request(`/api/packages/${encodeURIComponent(packageId)}`, {
    method: 'DELETE',
  });
}

// Shares API ("генератор ссылок и кодов")
export interface ShareResponse {
  code: string;
  shareUrl: string;
  templateTitle: string;
  templatesCount?: number;
  tagsCount?: number;
  authorName: string;
  createdAt: string;
}

export interface ShareBundleData {
  code: string;
  template?: DocTemplate;
  templates: DocTemplate[];
  tags: TagDefinition[];
  authorName: string;
  createdAt: string;
  importsCount: number;
}

export async function apiCreateShare(
  payload: DocTemplate | { templates: DocTemplate[]; tags?: TagDefinition[] }
): Promise<ShareResponse> {
  const body = 'id' in payload ? { template: payload } : payload;
  return await request<ShareResponse>('/api/shares/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiGetShare(code: string): Promise<ShareBundleData> {
  return await request<ShareBundleData>(`/api/shares/${encodeURIComponent(code)}`);
}

export async function apiImportShare(code: string): Promise<{
  success: boolean;
  code: string;
  template?: DocTemplate;
  templates: DocTemplate[];
  tags: TagDefinition[];
  message: string;
}> {
  return await request(`/api/shares/${encodeURIComponent(code)}/import`, {
    method: 'POST',
  });
}

export async function apiGetSystemInfo(): Promise<{ status: string; storageDir: string; usersCount: number; sharesCount: number }> {
  try {
    return await request('/api/system/info');
  } catch {
    return { status: 'offline', storageDir: '/srv/files/DocuFlow', usersCount: 0, sharesCount: 0 };
  }
}

// Package Shares (Temporary / One-Time View Links)
export interface PackageShareData {
  id: string;
  title: string;
  personName: string;
  docNumber: string;
  docDate: string;
  documents: any[];
  authorName: string;
  createdAt: string;
  expiresAt: string | null;
  oneTimeOnly: boolean;
  viewsCount: number;
}

export async function apiCreatePackageShare(payload: {
  title: string;
  personName: string;
  docNumber: string;
  docDate: string;
  documents: any[];
  durationMinutes: number | null;
  oneTimeOnly: boolean;
}): Promise<{ id: string; shareUrl: string; share: PackageShareData }> {
  return await request('/api/package-shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiGetPackageShare(id: string): Promise<{
  success: boolean;
  package?: PackageShareData;
  error?: string;
  message?: string;
}> {
  return await request(`/api/package-shares/${encodeURIComponent(id)}`);
}

