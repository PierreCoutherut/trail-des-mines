import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SECRET_KEY = process.env.AUTH_SECRET || 'trail-des-mines-admin-secret-2026';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'superadmin' | 'admin';
  createdAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(checkHash), Buffer.from(hash));
}

export function getAdmins(): AdminUser[] {
  ensureDataDir();
  if (!fs.existsSync(ADMINS_FILE)) {
    // Initialise avec root / root par défaut
    const { hash, salt } = hashPassword('root');
    const defaultAdmins: AdminUser[] = [
      {
        id: 'admin_root',
        username: 'root',
        passwordHash: hash,
        salt,
        role: 'superadmin',
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(defaultAdmins, null, 2), 'utf-8');
    return defaultAdmins;
  }

  try {
    const raw = fs.readFileSync(ADMINS_FILE, 'utf-8');
    const admins: AdminUser[] = JSON.parse(raw);
    // Assurer que le compte root existe toujours au démarrage
    if (!admins.some(a => a.username === 'root')) {
      const { hash, salt } = hashPassword('root');
      admins.push({
        id: 'admin_root',
        username: 'root',
        passwordHash: hash,
        salt,
        role: 'superadmin',
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf-8');
    }
    return admins;
  } catch (err) {
    console.error('Erreur lecture admins.json:', err);
    return [];
  }
}

export function saveAdmins(admins: AdminUser[]): void {
  ensureDataDir();
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf-8');
}

export function createAdmin(username: string, password: string, role: 'superadmin' | 'admin' = 'admin'): { success: boolean; message?: string; user?: AdminUser } {
  const admins = getAdmins();
  const cleanUsername = username.trim().toLowerCase();
  
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, message: "L'identifiant doit contenir au moins 3 caractères" };
  }
  if (!password || password.length < 3) {
    return { success: false, message: "Le mot de passe doit contenir au moins 3 caractères" };
  }
  if (admins.some(a => a.username.toLowerCase() === cleanUsername)) {
    return { success: false, message: "Cet identifiant existe déjà" };
  }

  const { hash, salt } = hashPassword(password);
  const newUser: AdminUser = {
    id: 'admin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: cleanUsername,
    passwordHash: hash,
    salt,
    role,
    createdAt: new Date().toISOString()
  };

  admins.push(newUser);
  saveAdmins(admins);
  return { success: true, user: newUser };
}

export function deleteAdmin(id: string, currentUsername: string): { success: boolean; message?: string } {
  const admins = getAdmins();
  const target = admins.find(a => a.id === id);
  if (!target) {
    return { success: false, message: "Utilisateur non trouvé" };
  }
  if (target.username === currentUsername) {
    return { success: false, message: "Vous ne pouvez pas supprimer votre propre compte" };
  }
  if (target.username === 'root' && admins.filter(a => a.role === 'superadmin').length <= 1) {
    return { success: false, message: "Impossible de supprimer le dernier super-administrateur" };
  }

  const filtered = admins.filter(a => a.id !== id);
  saveAdmins(filtered);
  return { success: true };
}

export function authenticate(username: string, password: string): { success: boolean; token?: string; user?: { username: string; role: string } } {
  const admins = getAdmins();
  const cleanUsername = username.trim().toLowerCase();
  const user = admins.find(a => a.username.toLowerCase() === cleanUsername);
  
  if (!user) {
    return { success: false };
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return { success: false };
  }

  const payload = JSON.stringify({
    username: user.username,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 jours
  });
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  const token = Buffer.from(payload).toString('base64') + '.' + signature;

  return {
    success: true,
    token,
    user: {
      username: user.username,
      role: user.role
    }
  };
}

export function verifyToken(token: string): { valid: boolean; user?: { username: string; role: string } } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    
    const [payloadB64, signature] = parts;
    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf-8');
    
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(payloadStr);
    const expectedSignature = hmac.digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false };
    }

    const data = JSON.parse(payloadStr);
    if (data.exp < Date.now()) {
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        username: data.username,
        role: data.role
      }
    };
  } catch (err) {
    return { valid: false };
  }
}
