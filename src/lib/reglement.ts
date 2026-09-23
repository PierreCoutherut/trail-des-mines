import fs from 'node:fs';
import path from 'node:path';

export interface ReglementChapter {
  id: string;
  number: string; // ex: "Article 1" ou "Chapitre 1"
  title: string;  // ex: "Organisation & Cadre de Course"
  content: string; // texte complet du chapitre
}

export interface ReglementData {
  pdfUrl: string;
  pdfFilename: string;
  pdfSizeBytes: number;
  lastUpdated: string;
  edition: string;
  title: string;
  description: string;
  chapters: ReglementChapter[];
}

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const REGLEMENT_FILE = path.join(DATA_DIR, 'reglement.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDefaultReglement(): ReglementData {
  return {
    pdfUrl: '/medias/reglement.pdf',
    pdfFilename: 'reglement-trail-des-mines-2027.pdf',
    pdfSizeBytes: 245000,
    lastUpdated: new Date().toISOString(),
    edition: '2027',
    title: 'Règlement Officiel - Trail des Mines 2027',
    description: "Le présent règlement a pour objet de définir les conditions d'organisation, de sécurité et de participation au Trail des Mines. L'inscription implique l'acceptation sans réserve de l'ensemble des articles.",
    chapters: [
      {
        id: 'article-1',
        number: 'Article 1',
        title: 'Organisation & Cadre de Course',
        content: "Le Trail des Mines est organisé par l'association loi 1901 Run in Champagney, sous l'égide de la Commission Départementale des Courses Hors Stade (CDCHS 70) et de la Fédération Française d'Athlétisme (FFA).\n\nL'événement se déroule le dimanche 16 mai 2027 au départ de Champagney (Haute-Saône) et emprunte les sentiers du bassin minier et des contreforts du massif vosgien."
      },
      {
        id: 'article-2',
        number: 'Article 2',
        title: 'Conditions d\'Admission & Parcours Prévention Santé (PPS)',
        content: "Conformément à la réglementation FFA, toute participation à une épreuve chronométrée est subordonnée à :\n- La présentation d'une attestation Parcours Prévention Santé (PPS) datant de moins de 3 mois au jour de la course, ou\n- D'une licence FFA valide (Compétition, Entreprise ou Running).\n\nÂges minimums : 18 ans révolus pour les 52km et 28km, 16 ans révolus pour le 13km (avec autorisation parentale pour les mineurs)."
      },
      {
        id: 'article-3',
        number: 'Article 3',
        title: 'Dossards & Cession',
        content: "Les dossards doivent être portés sur la poitrine ou le ventre et demeurer visibles dans leur intégralité pendant toute la durée de l'épreuve.\n\nToute rétrocession ou cession de dossard à une tierce personne sans accord formel préalable de l'organisation est formellement interdite et dégage l'organisation de toute responsabilité."
      },
      {
        id: 'article-4',
        number: 'Article 4',
        title: 'Équipements Obligatoires & Contrôles Inopinés',
        content: "Des contrôles inopinés de matériel obligatoire seront effectués sur la ligne de départ et tout au long du parcours :\n- 13 km (Galibots) : Gobelet réutilisable, réserve d'eau 0.5L conseillée, téléphone portable chargé.\n- 28 km (Terrils) : Gobelet réutilisable, réserve 1L, sifflet, couverture de survie, veste imperméable.\n- 52 km (Gueules Noires) : Idem + réserve 1.5L, frontale en état de marche, bande de strapping élastique, veste 10k schmerber."
      },
      {
        id: 'article-5',
        number: 'Article 5',
        title: 'Éco-responsabilité & Sanctions Environnementales',
        content: "Le Trail des Mines traverse des zones naturelles sensibles et préservées (ZNIEFF et forêts domaniales). Tout jet de déchet en dehors des zones balisées de ravitaillement entraînera une disqualification immédiate et définitive.\n\nL'usage de bâtons est autorisé mais réglementé sur certaines portions techniques en descente pour des raisons de sécurité et de préservation des sols."
      },
      {
        id: 'article-6',
        number: 'Article 6',
        title: 'Barrières Horaires & Rapatriement',
        content: "Les barrières horaires sont calculées pour garantir la sécurité des participants et des bénévoles. Tout concurrent arrêté au-delà de l'heure limite devra remettre son dossard aux commissaires de course et sera rapatrié par la navette organisation vers le gymnase de Champagney."
      }
    ]
  };
}

export function getReglementSync(): ReglementData {
  ensureDataDir();
  if (!fs.existsSync(REGLEMENT_FILE)) {
    const defaultData = getDefaultReglement();
    fs.writeFileSync(REGLEMENT_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }

  try {
    const raw = fs.readFileSync(REGLEMENT_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erreur lecture reglement.json:', err);
    return getDefaultReglement();
  }
}

export function saveReglement(data: Partial<ReglementData>): ReglementData {
  ensureDataDir();
  const current = getReglementSync();
  const updated: ReglementData = {
    ...current,
    ...data,
    lastUpdated: new Date().toISOString(),
    chapters: data.chapters !== undefined ? data.chapters : current.chapters
  };

  fs.writeFileSync(REGLEMENT_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

/**
 * Analyse intelligente du texte brut d'un PDF pour extraire les chapitres/articles
 */
export function parsePdfTextToChapters(rawText: string): ReglementChapter[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalisation des sauts de ligne
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Regex pour détecter les débuts d'articles ou chapitres
  // Supporte : Article 1, ARTICLE 1er, Chapitre 2, Section 3, Titre I, 1. Titre, etc.
  const headerRegex = /(?:^|\n)\s*(?:[-–*]\s*)?(Article\s+[0-9A-Za-z\.\-]+|Chapitre\s+[0-9A-Za-z\.\-]+|Section\s+[0-9A-Za-z\.\-]+|TITRE\s+[IVXLCDM0-9]+|[0-9]{1,2}\s*[\.\-\)]\s+[A-ZÀ-Ÿ0-9])/gi;

  const matches: { index: number; number: string; fullMatch: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      number: match[1].trim(),
      fullMatch: match[0]
    });
  }

  // Si aucun en-tête d'article formel n'est trouvé, découper par blocs ou paragraphes majeurs
  if (matches.length === 0) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 30);

    if (paragraphs.length === 0) {
      return [
        {
          id: 'chap-1',
          number: 'Article Général',
          title: 'Règlement de l\'Épreuve',
          content: text.trim()
        }
      ];
    }

    return paragraphs.map((p, idx) => {
      const firstLine = p.split('\n')[0].replace(/[:\.\-]$/, '').trim();
      const title = firstLine.length < 60 ? firstLine : `Dispositions Générales - Partie ${idx + 1}`;
      const content = firstLine.length < 60 ? p.split('\n').slice(1).join('\n').trim() || p : p;
      return {
        id: `chap-${idx + 1}`,
        number: `Partie ${idx + 1}`,
        title,
        content
      };
    });
  }

  const chapters: ReglementChapter[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;

    const block = text.slice(startIndex, endIndex).trim();
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) continue;

    const firstLine = lines[0];
    let number = current.number;
    let title = '';
    let bodyLines = lines.slice(1);

    // Extraction du titre sur la première ligne après le séparateur (ex: "Article 1 : Organisation" -> title "Organisation")
    const sepMatch = firstLine.match(/^(?:Article|Chapitre|Section|TITRE|[0-9]+)\s*[^:–\-\n]*[:–\-\.]\s*(.+)$/i);
    if (sepMatch && sepMatch[1]) {
      title = sepMatch[1].trim();
    } else if (lines.length > 1 && lines[1].length < 80 && !lines[1].endsWith('.')) {
      // Si la 2ème ligne ressemble à un titre court
      title = lines[1];
      bodyLines = lines.slice(2);
    } else {
      title = `${number}`;
    }

    // Nettoyage de number (format propre "Article X")
    const numClean = number.replace(/^([a-zA-Z]+)\s*([0-9]+).*$/, '$1 $2');

    const content = bodyLines.join('\n').trim() || block;

    chapters.push({
      id: `article-${i + 1}`,
      number: numClean,
      title: title || `Article ${i + 1}`,
      content
    });
  }

  return chapters;
}
