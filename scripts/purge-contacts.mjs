// Private CLI task. Run from the project root with the same environment as Node.
import { listContacts } from '../src/lib/contacts.ts';

try {
  const remaining = listContacts().length;
  console.log(`Purge des messages terminée. Demandes conservées : ${remaining}.`);
} catch {
  console.error('Purge des messages impossible. Vérifiez le dossier privé et les droits du processus Node.');
  process.exitCode = 1;
}
