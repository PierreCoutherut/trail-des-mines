import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MIN_PASSWORD_LENGTH = 12;

export class AuthConfigurationError extends Error {
  constructor() {
    super("L'administration est temporairement indisponible. Contactez l'administrateur du site.");
    this.name = 'AuthConfigurationError';
  }
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'superadmin' | 'admin';
  createdAt: string;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new AuthConfigurationError();
  return secret;
}

export function getAuthDataDir(): string {
  const directory = path.resolve(process.env.AUTH_DATA_DIR || path.join(process.cwd(), 'src/data'));
  for (const publicDirectory of [path.resolve('public'), path.resolve('dist/client')]) {
    const relative = path.relative(publicDirectory, directory);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new AuthConfigurationError();
    }
  }
  return directory;
}

function ensureDataDir(directory: string) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  return { hash: crypto.scryptSync(password, generatedSalt, 64).toString('hex'), salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (typeof password !== 'string' || password.length > 1024 || !/^[a-f0-9]{128}$/i.test(hash) || !salt) return false;
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as AdminUser;
  return typeof user.id === 'string' && !!user.id &&
    typeof user.username === 'string' && !!user.username &&
    typeof user.passwordHash === 'string' && /^[a-f0-9]{128}$/i.test(user.passwordHash) &&
    typeof user.salt === 'string' && !!user.salt &&
    (user.role === 'superadmin' || user.role === 'admin') &&
    typeof user.createdAt === 'string';
}

export function getAdmins(): AdminUser[] {
  const directory = getAuthDataDir();
  const adminsFile = path.join(directory, 'admins.json');
  if (!fs.existsSync(adminsFile)) {
    const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    // Provision only a missing file, using explicitly configured credentials.
    if (!username && !password) return [];
    getSecret();
    if (!username || username.length < 3 || username.length > 64 ||
        !password || password.length < MIN_PASSWORD_LENGTH || password.length > 1024) {
      throw new AuthConfigurationError();
    }
    const { hash, salt } = hashPassword(password);
    const initialAdmins: AdminUser[] = [{
      id: 'admin_' + crypto.randomUUID(), username, passwordHash: hash, salt,
      role: 'superadmin', createdAt: new Date().toISOString()
    }];
    ensureDataDir(directory);
    try {
      fs.writeFileSync(adminsFile, JSON.stringify(initialAdmins, null, 2), { encoding: 'utf-8', flag: 'wx', mode: 0o600 });
      return initialAdmins;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new AuthConfigurationError();
    }
  }
  try {
    const admins: unknown = JSON.parse(fs.readFileSync(adminsFile, 'utf-8'));
    if (!Array.isArray(admins) || !admins.every(isAdminUser)) throw new AuthConfigurationError();
    return admins;
  } catch {
    throw new AuthConfigurationError();
  }
}

export function saveAdmins(admins: AdminUser[]): void {
  const directory = getAuthDataDir();
  ensureDataDir(directory);
  fs.writeFileSync(path.join(directory, 'admins.json'), JSON.stringify(admins, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function createAdmin(username: string, password: string, role: 'superadmin' | 'admin' = 'admin'): { success: boolean; message?: string; user?: AdminUser } {
  const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  if (cleanUsername.length < 3 || cleanUsername.length > 64) {
    return { success: false, message: "L'identifiant doit contenir entre 3 et 64 caractères" };
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 1024) {
    return { success: false, message: 'Le mot de passe doit contenir au moins 12 caractères' };
  }
  const admins = getAdmins();
  if (admins.some(a => a.username.toLowerCase() === cleanUsername)) return { success: false, message: 'Cet identifiant existe déjà' };
  const { hash, salt } = hashPassword(password);
  const newUser: AdminUser = {
    id: 'admin_' + crypto.randomUUID(), username: cleanUsername, passwordHash: hash, salt,
    role: role === 'superadmin' ? 'superadmin' : 'admin', createdAt: new Date().toISOString()
  };
  admins.push(newUser);
  saveAdmins(admins);
  return { success: true, user: newUser };
}

export function deleteAdmin(id: string, currentUsername: string): { success: boolean; message?: string } {
  const admins = getAdmins();
  const target = admins.find(a => a.id === id);
  if (!target) return { success: false, message: 'Utilisateur non trouvé' };
  if (target.username === currentUsername) return { success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' };
  if (target.role === 'superadmin' && admins.filter(a => a.role === 'superadmin').length <= 1) {
    return { success: false, message: 'Impossible de supprimer le dernier super-administrateur' };
  }
  saveAdmins(admins.filter(a => a.id !== id));
  return { success: true };
}

function hasLegacyDefaultPassword(user: AdminUser): boolean {
  return user.username.toLowerCase() === 'root' && verifyPassword('root', user.passwordHash, user.salt);
}

export function authenticate(username: string, password: string): { success: boolean; token?: string; user?: { username: string; role: string } } {
  const secret = getSecret();
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 64 || password.length > 1024) return { success: false };
  const admins = getAdmins();
  if (admins.length === 0) throw new AuthConfigurationError();
  const user = admins.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || hasLegacyDefaultPassword(user) || !verifyPassword(password, user.passwordHash, user.salt)) return { success: false };
  const payload = JSON.stringify({ sub: user.id, username: user.username, role: user.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    success: true, token: Buffer.from(payload).toString('base64') + '.' + signature,
    user: { username: user.username, role: user.role }
  };
}

export function verifyToken(token: string): { valid: boolean; user?: { username: string; role: string } } {
  try {
    const secret = getSecret();
    if (typeof token !== 'string' || token.length > 4096) return { valid: false };
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadB64, signature] = parts;
    if (!/^[a-f0-9]{64}$/i.test(signature)) return { valid: false };
    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf-8');
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest();
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expectedSignature)) return { valid: false };
    const data = JSON.parse(payloadStr);
    if (!data || typeof data.exp !== 'number' || !Number.isFinite(data.exp) || data.exp <= Date.now() ||
        typeof data.sub !== 'string' || typeof data.username !== 'string' ||
        (data.role !== 'admin' && data.role !== 'superadmin')) return { valid: false };
    // Deleted accounts and changed roles invalidate existing sessions immediately.
    const user = getAdmins().find(a => a.id === data.sub && a.username === data.username && a.role === data.role);
    if (!user || hasLegacyDefaultPassword(user)) return { valid: false };
    return { valid: true, user: { username: user.username, role: user.role } };
  } catch {
    return { valid: false };
  }
}
