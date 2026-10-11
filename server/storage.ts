import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Determine storage directory: prioritize user-specified or cross-platform default
const defaultStorage = process.platform === 'win32'
  ? path.resolve(process.cwd(), 'storage/DocuFlow')
  : '/srv/files/DocuFlow';

let STORAGE_DIR = process.env.STORAGE_DIR || defaultStorage;
try {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  // Test write permissions
  const testFile = path.join(STORAGE_DIR, '.test_write');
  fs.writeFileSync(testFile, 'ok');
  fs.unlinkSync(testFile);
} catch (err) {
  STORAGE_DIR = path.resolve(process.cwd(), 'storage/DocuFlow');
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Subdirectories
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');
const SESSIONS_FILE = path.join(STORAGE_DIR, 'sessions.json');
const SHARES_FILE = path.join(STORAGE_DIR, 'shares.json');
const TEMPLATES_DIR = path.join(STORAGE_DIR, 'templates');
const TAGS_DIR = path.join(STORAGE_DIR, 'tags');
const PACKAGES_DIR = path.join(STORAGE_DIR, 'packages');

[TEMPLATES_DIR, TAGS_DIR, PACKAGES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// JSON file helper with safe atomic write and write queue
const writeLocks = new Map<string, Promise<void>>();

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        return fallback;
      }
      return parsed as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {}
    console.error(`Error writing ${filePath}:`, err);
  }
}


// Data models
export interface UserRecord {
  id: string;
  email?: string;
  username: string;
  name?: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ShareRecord {
  code: string;           // e.g. "DOC-7X9K2B"
  template?: any;         // Single template (for backward compatibility)
  templates: any[];       // Array of DocTemplate
  tags: any[];            // Array of TagDefinition
  authorName: string;
  authorId: string;
  createdAt: string;
  importsCount: number;
  expiresAt?: string | null;  // ISO timestamp or null for unlimited
  maxImports?: number | null; // Max allowed imports or null for unlimited
}

// Password hashing
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === expectedHash;
}

// User CRUD
export function getAllUsers(): UserRecord[] {
  return readJsonFile<UserRecord[]>(USERS_FILE, []);
}

export function findUserByEmailOrUsername(identifier: string): UserRecord | undefined {
  const users = getAllUsers();
  const lower = identifier.toLowerCase().trim();
  return users.find(
    (u) => (u.username && u.username.toLowerCase() === lower) || (u.email && u.email.toLowerCase() === lower)
  );
}

export function findUserById(id: string): UserRecord | undefined {
  const users = getAllUsers();
  return users.find((u) => u.id === id);
}

export function createUser(username: string, password: string, name?: string, email?: string): UserRecord {
  const users = getAllUsers();
  const { salt, hash } = hashPassword(password);

  const newUser: UserRecord = {
    id: `user-${crypto.randomUUID()}`,
    email: email ? email.toLowerCase().trim() : '',
    username: username.trim(),
    name: name?.trim() || username.trim(),
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeJsonFile(USERS_FILE, users);
  return newUser;
}

// Sessions
export function createSession(userId: string): string {
  const now = Date.now();
  const sessions = readJsonFile<SessionRecord[]>(SESSIONS_FILE, [])
    .filter((s) => new Date(s.expiresAt).getTime() > now);
  const token = crypto.randomBytes(32).toString('hex');
  const session: SessionRecord = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
  sessions.push(session);
  writeJsonFile(SESSIONS_FILE, sessions);
  return token;
}

export function getUserIdFromToken(token?: string): string | null {
  if (!token) return null;
  const now = Date.now();
  const rawSessions = readJsonFile<SessionRecord[]>(SESSIONS_FILE, []);
  const validSessions = rawSessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  if (validSessions.length !== rawSessions.length) {
    writeJsonFile(SESSIONS_FILE, validSessions);
  }
  const session = validSessions.find((s) => s.token === token);
  return session ? session.userId : null;
}

export function deleteSession(token: string): void {
  const now = Date.now();
  const sessions = readJsonFile<SessionRecord[]>(SESSIONS_FILE, [])
    .filter((s) => s.token !== token && new Date(s.expiresAt).getTime() > now);
  writeJsonFile(SESSIONS_FILE, sessions);
}

// User Templates
export function getUserTemplates(userId: string): any[] {
  const filePath = path.join(TEMPLATES_DIR, `${userId}.json`);
  return readJsonFile<any[]>(filePath, []);
}

export function saveUserTemplates(userId: string, templates: any[]): void {
  const filePath = path.join(TEMPLATES_DIR, `${userId}.json`);
  writeJsonFile(filePath, templates);
}

export function deleteUserTemplate(userId: string, templateId: string): void {
  const existing = getUserTemplates(userId);
  const filtered = existing.filter((t: any) => t.id !== templateId);
  saveUserTemplates(userId, filtered);
}

// User Tags
export function getUserTags(userId: string): any[] {
  const filePath = path.join(TAGS_DIR, `${userId}.json`);
  return readJsonFile<any[]>(filePath, []);
}

export function saveUserTags(userId: string, tags: any[]): void {
  const filePath = path.join(TAGS_DIR, `${userId}.json`);
  writeJsonFile(filePath, tags);
}

export function deleteUserTag(userId: string, tagName: string): void {
  const existing = getUserTags(userId);
  const filtered = existing.filter((t: any) => t.tag !== tagName);
  saveUserTags(userId, filtered);
}

// User Document Packages Archive (Per-user private archive)
export function getUserPackages(userId: string): any[] {
  const filePath = path.join(PACKAGES_DIR, `${userId}.json`);
  return readJsonFile<any[]>(filePath, []);
}

export function saveUserPackages(userId: string, packages: any[]): void {
  const filePath = path.join(PACKAGES_DIR, `${userId}.json`);
  writeJsonFile(filePath, packages);
}

export function deleteUserPackage(userId: string, packageId: string): void {
  const existing = getUserPackages(userId);
  const filtered = existing.filter((p: any) => p.id !== packageId);
  saveUserPackages(userId, filtered);
}

// Shares ("генератор ссылок и кодов чтобы можно было загрузить чьи-то готовые шаблоны")
function generateShareCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'DOC-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createShare(
  payload: {
    template?: any;
    templates?: any[];
    tags?: any[];
    durationMinutes?: number | null;
    maxImports?: number | null;
  },
  user: UserRecord
): ShareRecord {
  const shares = readJsonFile<ShareRecord[]>(SHARES_FILE, []);

  const templatesList = payload.templates || (payload.template ? [payload.template] : []);
  const tagsList = payload.tags || [];

  let code = generateShareCode();
  while (shares.some((s) => s.code === code)) {
    code = generateShareCode();
  }

  let expiresAt: string | null = null;
  if (payload.durationMinutes && payload.durationMinutes > 0) {
    expiresAt = new Date(Date.now() + payload.durationMinutes * 60 * 1000).toISOString();
  }

  const maxImports = (payload.maxImports && payload.maxImports > 0) ? payload.maxImports : null;

  const newShare: ShareRecord = {
    code,
    template: templatesList[0],
    templates: templatesList,
    tags: tagsList,
    authorName: user.name || user.username,
    authorId: user.id,
    createdAt: new Date().toISOString(),
    importsCount: 0,
    expiresAt,
    maxImports,
  };

  shares.push(newShare);
  writeJsonFile(SHARES_FILE, shares);
  return newShare;
}

export function getShareByCode(code: string): {
  success: boolean;
  share?: ShareRecord;
  error?: 'NOT_FOUND' | 'EXPIRED' | 'LIMIT_REACHED';
  message?: string;
} {
  const shares = readJsonFile<ShareRecord[]>(SHARES_FILE, []);
  const cleanCode = code.toUpperCase().trim();
  const found = shares.find((s) => s.code === cleanCode);

  if (!found) {
    return { success: false, error: 'NOT_FOUND', message: `Шаблон по коду ${code} не найден` };
  }

  // Check expiration by time
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    return { success: false, error: 'EXPIRED', message: 'Срок действия ссылки на шаблоны истек' };
  }

  // Check usage limit
  if (found.maxImports && (found.importsCount || 0) >= found.maxImports) {
    return { success: false, error: 'LIMIT_REACHED', message: `Лимит использований кода (${found.maxImports}) исчерпан` };
  }

  return { success: true, share: found };
}

export function incrementShareImports(code: string): {
  success: boolean;
  error?: 'NOT_FOUND' | 'EXPIRED' | 'LIMIT_REACHED';
  message?: string;
} {
  const shares = readJsonFile<ShareRecord[]>(SHARES_FILE, []);
  const cleanCode = code.toUpperCase().trim();
  const found = shares.find((s) => s.code === cleanCode);

  if (!found) {
    return { success: false, error: 'NOT_FOUND', message: 'Код не найден' };
  }

  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    return { success: false, error: 'EXPIRED', message: 'Срок действия ссылки на шаблоны истек' };
  }

  if (found.maxImports && (found.importsCount || 0) >= found.maxImports) {
    return { success: false, error: 'LIMIT_REACHED', message: `Лимит использований (${found.maxImports}) исчерпан` };
  }

  found.importsCount = (found.importsCount || 0) + 1;
  writeJsonFile(SHARES_FILE, shares);
  return { success: true };
}

export function getStorageInfo() {
  return {
    status: 'ok',
    usersCount: getAllUsers().length,
    sharesCount: readJsonFile<any[]>(SHARES_FILE, []).length,
  };
}

// --- PACKAGE SHARES (Temporary / One-Time Links for Generated Documents) ---
const PACKAGE_SHARES_FILE = path.join(STORAGE_DIR, 'package_shares.json');

export interface PackageShareRecord {
  id: string;
  title: string;
  personName: string;
  docNumber: string;
  docDate: string;
  documents: any[];
  authorName: string;
  authorId: string;
  createdAt: string;
  expiresAt: string | null; // ISO string or null for unlimited
  oneTimeOnly: boolean;
  viewsCount: number;
}

export function createPackageShare(payload: {
  title: string;
  personName: string;
  docNumber: string;
  docDate: string;
  documents: any[];
  durationMinutes: number | null; // null for forever, or minutes
  oneTimeOnly: boolean;
}, user?: UserRecord | null): PackageShareRecord {
  const packageShares = readJsonFile<PackageShareRecord[]>(PACKAGE_SHARES_FILE, []);

  // Generate clean ID: e.g. "VIEW-7X9K2B" with collision check
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const genId = () => {
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VIEW-${rand}`;
  };

  let id = genId();
  while (packageShares.some((p) => p.id === id)) {
    id = genId();
  }

  let expiresAt: string | null = null;
  if (payload.durationMinutes && payload.durationMinutes > 0) {
    expiresAt = new Date(Date.now() + payload.durationMinutes * 60 * 1000).toISOString();
  }

  const newRecord: PackageShareRecord = {
    id,
    title: payload.title,
    personName: payload.personName,
    docNumber: payload.docNumber,
    docDate: payload.docDate,
    documents: payload.documents,
    authorName: user?.name || user?.username || 'Пользователь DocuFlow',
    authorId: user?.id || 'guest',
    createdAt: new Date().toISOString(),
    expiresAt,
    oneTimeOnly: Boolean(payload.oneTimeOnly),
    viewsCount: 0,
  };

  packageShares.push(newRecord);
  writeJsonFile(PACKAGE_SHARES_FILE, packageShares);
  return newRecord;
}

export function getPackageShare(
  id: string,
  recordView = true,
  isBot = false
): {
  success: boolean;
  package?: PackageShareRecord;
  error?: string;
  message?: string;
} {
  const packageShares = readJsonFile<PackageShareRecord[]>(PACKAGE_SHARES_FILE, []);
  const cleanId = id.toUpperCase().trim();
  const found = packageShares.find((p) => p.id === cleanId);

  if (!found) {
    return { success: false, error: 'NOT_FOUND', message: 'Ссылка не найдена или была удалена' };
  }

  // Check if expired by time
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    return { success: false, error: 'EXPIRED', message: 'Срок действия ссылки истек' };
  }

  // Check if single-use and already viewed
  if (found.oneTimeOnly && found.viewsCount >= 1) {
    return {
      success: false,
      error: 'ALREADY_VIEWED',
      message: 'Ссылка была одноразовой и уже была открыта. Доступ закрыт.',
    };
  }

  // If link is one-time only, do not leak confidential content to automated crawlers/bots
  if (found.oneTimeOnly && isBot) {
    return {
      success: false,
      error: 'BOT_BLOCKED',
      message: 'Предварительный просмотр недоступен для одноразовой ссылки. Откройте в браузере.',
    };
  }

  // Record view (ignore bot crawlers from burning single-use link)
  if (recordView && !isBot) {
    found.viewsCount = (found.viewsCount || 0) + 1;
    writeJsonFile(PACKAGE_SHARES_FILE, packageShares);
  }

  return { success: true, package: found };
}
