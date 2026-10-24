import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const CONTACT_SUBJECTS = {
  inscriptions: 'Inscriptions', parcours: 'Parcours', benevolat: 'Bénévolat',
  partenariat: 'Partenariat', medias: 'Résultats et photos', autre: 'Autre demande',
} as const;

export interface ContactInput {
  firstName: string; lastName: string; email: string; phone: string;
  subject: keyof typeof CONTACT_SUBJECTS; message: string; consent: true;
}
export interface ContactEntry extends ContactInput { id: string; createdAt: string; lastActivityAt: string; readAt: string | null; }

export function validateContact(value: unknown): { data?: ContactInput; errors: Record<string, string> } {
  const body = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const errors: Record<string, string> = {};
  const clean = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const firstName = clean('firstName'); const lastName = clean('lastName');
  const email = clean('email').toLowerCase(); const phone = clean('phone');
  const subject = clean('subject'); const message = clean('message').replace(/\r\n?/g, '\n');
  const invalidSingleLine = /[\u0000-\u001f\u007f]/;
  if (!firstName || firstName.length > 80 || invalidSingleLine.test(firstName)) errors.firstName = 'Indiquez votre prénom (80 caractères maximum).';
  if (!lastName || lastName.length > 80 || invalidSingleLine.test(lastName)) errors.lastName = 'Indiquez votre nom (80 caractères maximum).';
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || invalidSingleLine.test(email)) errors.email = 'Indiquez une adresse e-mail valide.';
  if (phone.length > 40 || (phone && !/^[+\d\s().-]+$/.test(phone)) || invalidSingleLine.test(phone)) errors.phone = 'Vérifiez votre numéro de téléphone.';
  if (!Object.hasOwn(CONTACT_SUBJECTS, subject)) errors.subject = 'Choisissez un sujet.';
  if (message.length < 10 || message.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) errors.message = 'Votre message doit contenir entre 10 et 5 000 caractères.';
  if (body.consent !== true && body.consent !== 'on') errors.consent = 'Acceptez le traitement des informations pour envoyer votre demande.';
  return Object.keys(errors).length ? { errors } : {
    errors, data: { firstName, lastName, email, phone, subject: subject as ContactInput['subject'], message, consent: true },
  };
}

export function getContactDataDir(): string {
  const directory = path.resolve(process.env.CONTACT_DATA_DIR || path.join(process.env.DATA_DIR || path.join(process.cwd(), '.local-data'), 'contacts'));
  for (const publicDirectory of [path.resolve('public'), path.resolve('dist/client')]) {
    const relative = path.relative(publicDirectory, directory);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Le dossier des messages doit être privé.');
  }
  return directory;
}

export function getContactRetentionMonths(): number {
  const configured = Number(process.env.CONTACT_RETENTION_MONTHS || 24);
  return Number.isInteger(configured) && configured > 0 && configured <= 120 ? configured : 24;
}
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

function storedContacts(): ContactEntry[] {
  const directory = getContactDataDir();
  if (!fs.existsSync(directory)) return [];
  const cutoff = new Date(); cutoff.setUTCMonth(cutoff.getUTCMonth() - getContactRetentionMonths());
  return fs.readdirSync(directory)
    .filter(name => name.endsWith('.json') && validId(name.slice(0, -5)))
    .flatMap(name => {
      const filename = path.join(directory, name);
      const entry = JSON.parse(fs.readFileSync(filename, 'utf8')) as ContactEntry;
      if (!validateContact(entry).data || entry.id !== name.slice(0, -5) || !Number.isFinite(Date.parse(entry.createdAt)) || (entry.readAt !== null && !Number.isFinite(Date.parse(entry.readAt)))) throw new Error('Un message sauvegardé est illisible.');
      entry.lastActivityAt ||= entry.createdAt;
      if (!Number.isFinite(Date.parse(entry.lastActivityAt))) throw new Error('La date du dernier échange est illisible.');
      if (Date.parse(entry.lastActivityAt) < cutoff.getTime()) { fs.unlinkSync(filename); return []; }
      return [entry];
    });
}

export function createContact(data: ContactInput): ContactEntry {
  const checked = validateContact(data);
  if (!checked.data) throw new Error('Demande de contact invalide.');
  storedContacts();
  const directory = getContactDataDir();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const createdAt = new Date().toISOString();
  const entry: ContactEntry = { ...checked.data, id: randomUUID(), createdAt, lastActivityAt: createdAt, readAt: null };
  const temporary = path.join(directory, `${entry.id}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600, flag: 'wx', flush: true });
    fs.renameSync(temporary, path.join(directory, `${entry.id}.json`));
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return entry;
}

export function listContacts(): ContactEntry[] { return storedContacts().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

function updateContact(id: string, change: (entry: ContactEntry) => void): ContactEntry | null {
  if (!validId(id)) return null;
  const entry = storedContacts().find(contact => contact.id === id);
  if (!entry) return null;
  const directory = getContactDataDir();
  change(entry);
  const temporary = path.join(directory, `${id}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600, flag: 'wx', flush: true });
    fs.renameSync(temporary, path.join(directory, `${id}.json`));
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return entry;
}

export function setContactRead(id: string, read: boolean): ContactEntry | null {
  return updateContact(id, entry => { entry.readAt = read ? new Date().toISOString() : null; });
}

export function recordContactExchange(id: string): ContactEntry | null {
  return updateContact(id, entry => { entry.lastActivityAt = new Date().toISOString(); });
}

export function deleteContact(id: string): boolean {
  if (!validId(id)) return false;
  const filename = path.join(getContactDataDir(), `${id}.json`);
  if (!fs.existsSync(filename)) return false;
  fs.unlinkSync(filename); return true;
}
