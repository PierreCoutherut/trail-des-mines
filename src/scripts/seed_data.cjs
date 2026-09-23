const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const MEDIAS_DIR = path.resolve(process.cwd(), 'public/medias');
const GALERIES_DIR = path.join(MEDIAS_DIR, 'galeries');
const INDEX_PHOTOS_DIR = path.join(MEDIAS_DIR, 'Index');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(GALERIES_DIR)) fs.mkdirSync(GALERIES_DIR, { recursive: true });

async function createWatermark() {
  const svg = '<svg width="340" height="74" viewBox="0 0 340 74" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="0" y="0" width="340" height="74" rx="18" fill="rgba(16, 29, 32, 0.85)" stroke="rgba(176, 190, 66, 0.6)" stroke-width="1.5"/>' +
    '<text x="24" y="34" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff" letter-spacing="2">TRAIL DES <tspan fill="#B0BE42">MINES</tspan></text>' +
    '<text x="24" y="55" font-family="Arial, sans-serif" font-weight="600" font-size="11" fill="#9ca3af" letter-spacing="3">PHOTOS OFFICIELLES</text>' +
    '</svg>';

  const watermarkPath = path.join(MEDIAS_DIR, 'watermark.png');
  await sharp(Buffer.from(svg)).png().toFile(watermarkPath);
  console.log('Watermark badge created at:', watermarkPath);
}

async function prepareGalleries() {
  // Pierre Coutherut 2024
  const pcTargetDir = path.join(GALERIES_DIR, '2024', 'pierre-coutherut');
  if (!fs.existsSync(pcTargetDir)) fs.mkdirSync(pcTargetDir, { recursive: true });

  // Elodie Bermond 2024
  const ebTargetDir = path.join(GALERIES_DIR, '2024', 'elodie-bermond');
  if (!fs.existsSync(ebTargetDir)) fs.mkdirSync(ebTargetDir, { recursive: true });

  const pcPhotos = [];
  const ebPhotos = [];

  if (fs.existsSync(INDEX_PHOTOS_DIR)) {
    const files = fs.readdirSync(INDEX_PHOTOS_DIR);
    
    // Process Pierre Coutherut photos
    const pcFiles = files.filter(f => f.startsWith('Pierre-Coutherut'));
    for (let i = 0; i < pcFiles.length; i++) {
      const filename = pcFiles[i];
      const srcPath = path.join(INDEX_PHOTOS_DIR, filename);
      const baseName = 'pc_' + (i + 1);
      const hdPath = path.join(pcTargetDir, baseName + '-hd.webp');
      const thumbPath = path.join(pcTargetDir, baseName + '-thumb.webp');

      let meta;
      try {
        meta = await sharp(srcPath).metadata();
        await sharp(srcPath).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 85 }).toFile(hdPath);
        await sharp(srcPath).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumbPath);
      } catch (e) {
        console.warn('Error processing photo:', filename, e.message);
      }

      const moment = i < 4 ? 'Départ matinal & lever de soleil' : (i < 8 ? 'Sommet Planche des Belles Filles' : 'Terrils & Sous-bois');
      const race = i < 7 ? 'Les Gueules Noires (52km)' : 'Les Terrils (28km)';

      pcPhotos.push({
        id: 'photo_pc_2024_' + (i + 1),
        filename: filename,
        urlHd: '/medias/galeries/2024/pierre-coutherut/' + baseName + '-hd.webp',
        urlThumb: '/medias/galeries/2024/pierre-coutherut/' + baseName + '-thumb.webp',
        caption: 'Passage engagé - Trail des Mines 2024',
        race,
        moment,
        width: meta?.width || 1920,
        height: meta?.height || 1080,
        uploadedAt: '2024-05-18T10:00:00.000Z'
      });
    }

    // Process Elodie Bermond photos
    const ebFiles = files.filter(f => f.startsWith('Elodie-Bermond'));
    for (let i = 0; i < ebFiles.length; i++) {
      const filename = ebFiles[i];
      const srcPath = path.join(INDEX_PHOTOS_DIR, filename);
      const baseName = 'eb_' + (i + 1);
      const hdPath = path.join(ebTargetDir, baseName + '-hd.webp');
      const thumbPath = path.join(ebTargetDir, baseName + '-thumb.webp');

      let meta;
      try {
        meta = await sharp(srcPath).metadata();
        await sharp(srcPath).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 85 }).toFile(hdPath);
        await sharp(srcPath).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumbPath);
      } catch (e) {
        console.warn('Error processing photo:', filename, e.message);
      }

      const moment = i < 3 ? 'Sous-bois & Ravitos' : 'Arrivées & Finishers';
      const race = 'Toutes courses';

      ebPhotos.push({
        id: 'photo_eb_2024_' + (i + 1),
        filename: filename,
        urlHd: '/medias/galeries/2024/elodie-bermond/' + baseName + '-hd.webp',
        urlThumb: '/medias/galeries/2024/elodie-bermond/' + baseName + '-thumb.webp',
        caption: 'Instants de course capturés au vol',
        race,
        moment,
        width: meta?.width || 1920,
        height: meta?.height || 1080,
        uploadedAt: '2024-05-18T11:00:00.000Z'
      });
    }
  }

  // Duplicate photos for 2025 demo so both 2024 and 2025 have active galleries
  const pc2025Photos = pcPhotos.map(p => ({
    ...p,
    id: p.id.replace('2024', '2025'),
    caption: p.caption.replace('2024', '2025'),
    uploadedAt: '2025-05-18T10:00:00.000Z'
  }));

  const eb2025Photos = ebPhotos.map(p => ({
    ...p,
    id: p.id.replace('2024', '2025'),
    caption: p.caption.replace('2024', '2025'),
    uploadedAt: '2025-05-18T11:00:00.000Z'
  }));

  return { pcPhotos, ebPhotos, pc2025Photos, eb2025Photos };
}

async function run() {
  await createWatermark();
  const { pcPhotos, ebPhotos, pc2025Photos, eb2025Photos } = await prepareGalleries();

  const editions = [
    {
      id: "2025",
      year: 2025,
      title: "L'Édition Record",
      subtitle: "4ème Édition • Mai 2025",
      date: "18 Mai 2025",
      description: "Une météo printanière idéale et des sentiers secs qui ont permis de pulvériser le record de l'épreuve reine. Première apparition du passage technique au sommet de la Planche des Belles Filles sur le format 52km, salué par l'ensemble du peloton pour sa beauté sauvage.",
      posterUrl: "/medias/affiches/affiche-2025.webp",
      stats: {
        finishers: 720,
        runners: 780,
        volunteers: 125,
        recordHolder: "Thibaut Martin",
        recordTime: "04:48:22",
        weather: "Ensoleillé, 19°C, sol sec"
      },
      highlights: [
        "Nouveau record scratch sur Les Gueules Noires (52km)",
        "Passage inédit par la Planche des Belles Filles",
        "720 finishers franchissant la ligne au cœur de Champagney"
      ],
      races: [
        {
          id: "gueules-noires-2025",
          name: "Les Gueules Noires",
          distance: "52 km",
          elevation: "+2 450 m",
          finishersCount: 210,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2025",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Thibaut MARTIN", time: "04:48:22", speed: "10.8 km/h", club: "Team Trail Vosges", bib: "101" },
            { rank: 2, gender: "M", name: "Romain GAUTHIER", time: "04:54:10", speed: "10.6 km/h", club: "ASPTT Belfort Trail", bib: "142" },
            { rank: 3, gender: "M", name: "Antoine LEFEBVRE", time: "05:02:45", speed: "10.3 km/h", club: "Colmar Marathon Club", bib: "118" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Lucie BERNARD", time: "05:42:15", speed: "9.1 km/h", club: "Besançon Trail Aventure", bib: "204" },
            { rank: 2, gender: "F", name: "Hélène DUMONT", time: "05:58:30", speed: "8.7 km/h", club: "Haute-Saône Endurance", bib: "219" },
            { rank: 3, gender: "F", name: "Claire PETIT", time: "06:12:04", speed: "8.4 km/h", club: "Run in Champagney", bib: "233" }
          ]
        },
        {
          id: "terrils-2025",
          name: "Les Terrils",
          distance: "28 km",
          elevation: "+1 250 m",
          finishersCount: 295,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2025",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Mathieu FAIVRE", time: "02:18:40", speed: "12.1 km/h", club: "Vesoul Marathon", bib: "302" },
            { rank: 2, gender: "M", name: "Julien VASSEUR", time: "02:22:15", speed: "11.8 km/h", club: "Montbéliard Trail", bib: "344" },
            { rank: 3, gender: "M", name: "Cédric BLANCHARD", time: "02:25:50", speed: "11.5 km/h", club: "Run in Champagney", bib: "312" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Camille ROUSSEL", time: "02:38:15", speed: "10.6 km/h", club: "Territoire Sport Nature", bib: "405" },
            { rank: 2, gender: "F", name: "Aurélie MERCIER", time: "02:46:22", speed: "10.1 km/h", club: "Épinal Trail", bib: "418" },
            { rank: 3, gender: "F", name: "Émilie GÉRARD", time: "02:51:40", speed: "9.8 km/h", club: "ASPTT Mulhouse", bib: "427" }
          ]
        },
        {
          id: "galibots-2025",
          name: "Les Galibots",
          distance: "13 km",
          elevation: "+520 m",
          finishersCount: 215,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2025",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Lucas SIMON", time: "00:58:12", speed: "13.4 km/h", club: "Lure Athlétisme", bib: "508" },
            { rank: 2, gender: "M", name: "Maxime ROY", time: "01:00:25", speed: "12.9 km/h", club: "Team Outdoor 70", bib: "515" },
            { rank: 3, gender: "M", name: "Nicolas BERTRAND", time: "01:02:40", speed: "12.4 km/h", club: "Non Licencié", bib: "542" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Sarah LECLERC", time: "01:09:30", speed: "11.2 km/h", club: "Belfort Athlé", bib: "601" },
            { rank: 2, gender: "F", name: "Chloé MOREL", time: "01:14:10", speed: "10.5 km/h", club: "Haute-Saône Trail", bib: "614" },
            { rank: 3, gender: "F", name: "Marion DUPONT", time: "01:16:45", speed: "10.2 km/h", club: "Run in Champagney", bib: "625" }
          ]
        }
      ],
      galleries: [
        {
          id: "pierre-coutherut-2025",
          photographerName: "Pierre Coutherut",
          photographerSlug: "pierre-coutherut",
          bio: "Photographe passionné d'espaces naturels et de trail dans le massif vosgien.",
          avatarUrl: "/medias/Index/Pierre-Coutherut_TDM-2024-2.jpg",
          websiteUrl: "https://www.instagram.com/pierre_coutherut_photo",
          instagramUrl: "@pierre_coutherut_photo",
          subGalleries: [
            {
              id: "pc-2025-depart",
              name: "Départ aux aurores",
              race: "Les Gueules Noires (52km)",
              moment: "Départ matinal & lever de soleil",
              description: "La tension et la ferveur sous l'arche de départ au lever du soleil.",
              photos: pc2025Photos.slice(0, 4)
            },
            {
              id: "pc-2025-planche",
              name: "Sommet Planche des Belles Filles",
              race: "Les Gueules Noires (52km)",
              moment: "Sommet Planche des Belles Filles",
              description: "Passage spectaculaire sur les crêtes rocheuses face aux ballons.",
              photos: pc2025Photos.slice(4, 8)
            },
            {
              id: "pc-2025-terrils",
              name: "Pentes et Terrils du Chanois",
              race: "Les Terrils (28km)",
              moment: "Terrils & Sous-bois",
              description: "La grimpette minérale noire au milieu des sapins.",
              photos: pc2025Photos.slice(8)
            }
          ]
        },
        {
          id: "elodie-bermond-2025",
          photographerName: "Élodie Bermond",
          photographerSlug: "elodie-bermond",
          bio: "Photographe reporter, amoureuse des visages et des émotions sportives intenses.",
          avatarUrl: "/medias/Index/Elodie-Bermond_IMG_6221-original.webp",
          websiteUrl: "https://www.instagram.com/elodiebermond_photo",
          instagramUrl: "@elodiebermond_photo",
          subGalleries: [
            {
              id: "eb-2025-ravitos",
              name: "Sous-bois et Ravitaillements",
              race: "Toutes courses",
              moment: "Sous-bois & Ravitos",
              description: "Les bénévoles et l'entraide festive aux postes de ravitaillement.",
              photos: eb2025Photos.slice(0, 3)
            },
            {
              id: "eb-2025-finishers",
              name: "Arrivées & Médailles Finishers",
              race: "Toutes courses",
              moment: "Arrivées & Finishers",
              description: "Le soulagement et la joie immense sur la ligne d'arrivée.",
              photos: eb2025Photos.slice(3)
            }
          ]
        }
      ]
    },
    {
      id: "2024",
      year: 2024,
      title: "Dans la Boue et la Gloire",
      subtitle: "3ème Édition • Mai 2024",
      date: "12 Mai 2024",
      description: "Des pluies torrentielles la veille de la course ont transformé les terrils en une véritable épopée minérale. Les coureurs ont puisé dans leurs retranchements pour dompter les raidillons gorgés d'eau, dans une ambiance de solidarité mémorable.",
      posterUrl: "/medias/affiches/affiche-2024.webp",
      stats: {
        finishers: 610,
        runners: 660,
        volunteers: 115,
        recordHolder: "Sylvain Cachot",
        recordTime: "05:14:08",
        weather: "Pluvieux, 12°C, terrain très gras"
      },
      highlights: [
        "Conditions météo dantesques et solidarité exceptionnelle",
        "Traversée des terrils dans un décor boueux d'anthologie",
        "610 finishers héros de cette 3ème édition"
      ],
      races: [
        {
          id: "gueules-noires-2024",
          name: "Les Gueules Noires",
          distance: "52 km",
          elevation: "+2 300 m",
          finishersCount: 165,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2024",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Sylvain CACHOT", time: "05:14:08", speed: "9.9 km/h", club: "Jura Trail", bib: "102" },
            { rank: 2, gender: "M", name: "Fabrice ROCHET", time: "05:22:30", speed: "9.7 km/h", club: "Team Doubs", bib: "115" },
            { rank: 3, gender: "M", name: "David MEUNIER", time: "05:31:12", speed: "9.4 km/h", club: "Colmar Athlé", bib: "134" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Céline BOURGEOIS", time: "06:18:40", speed: "8.2 km/h", club: "Haute-Saône Endurance", bib: "210" },
            { rank: 2, gender: "F", name: "Mélanie COUSIN", time: "06:35:15", speed: "7.9 km/h", club: "Besançon Trail", bib: "218" },
            { rank: 3, gender: "F", name: "Agnès FAIVRE", time: "06:49:00", speed: "7.6 km/h", club: "Run in Champagney", bib: "224" }
          ]
        },
        {
          id: "terrils-2024",
          name: "Les Terrils",
          distance: "28 km",
          elevation: "+1 200 m",
          finishersCount: 260,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2024",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Benoit CORNU", time: "02:29:10", speed: "11.2 km/h", club: "Lure Athlétisme", bib: "318" },
            { rank: 2, gender: "M", name: "Arnaud JACQUET", time: "02:34:45", speed: "10.8 km/h", club: "Vesoul Marathon", bib: "305" },
            { rank: 3, gender: "M", name: "Stéphane PERRIN", time: "02:39:20", speed: "10.5 km/h", club: "Belfort Trail", bib: "341" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Laurence BINET", time: "02:54:10", speed: "9.6 km/h", club: "ASPTT Belfort", bib: "411" },
            { rank: 2, gender: "F", name: "Sophie GAUTHIER", time: "03:02:40", speed: "9.2 km/h", club: "Run in Champagney", bib: "420" },
            { rank: 3, gender: "F", name: "Coralie MARCHAND", time: "03:10:15", speed: "8.8 km/h", club: "Montbéliard Outdoor", bib: "433" }
          ]
        },
        {
          id: "galibots-2024",
          name: "Les Galibots",
          distance: "13 km",
          elevation: "+500 m",
          finishersCount: 185,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2024",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Adrien VUITTON", time: "01:03:45", speed: "12.2 km/h", club: "Haute-Saône Trail", bib: "522" },
            { rank: 2, gender: "M", name: "Hugo PERRIN", time: "01:05:10", speed: "11.9 km/h", club: "Team Outdoor 70", bib: "511" },
            { rank: 3, gender: "M", name: "Thomas LEROY", time: "01:08:30", speed: "11.4 km/h", club: "Non Licencié", bib: "540" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Manon DELORME", time: "01:18:20", speed: "9.9 km/h", club: "Lure Athlétisme", bib: "612" },
            { rank: 2, gender: "F", name: "Julie GRAND", time: "01:21:45", speed: "9.5 km/h", club: "Run in Champagney", bib: "628" },
            { rank: 3, gender: "F", name: "Elise BARBIER", time: "01:25:10", speed: "9.1 km/h", club: "Belfort Athlé", bib: "635" }
          ]
        }
      ],
      galleries: [
        {
          id: "pierre-coutherut-2024",
          photographerName: "Pierre Coutherut",
          photographerSlug: "pierre-coutherut",
          bio: "Photographe passionné d'espaces naturels et de trail dans le massif vosgien.",
          avatarUrl: "/medias/Index/Pierre-Coutherut_TDM-2024-2.jpg",
          websiteUrl: "https://www.instagram.com/pierre_coutherut_photo",
          instagramUrl: "@pierre_coutherut_photo",
          subGalleries: [
            {
              id: "pc-2024-depart",
              name: "Départ sous la brume",
              race: "Les Gueules Noires (52km)",
              moment: "Départ matinal & lever de soleil",
              description: "Atmosphère humide et mystique aux premières lueurs du jour.",
              photos: pcPhotos.slice(0, 4)
            },
            {
              id: "pc-2024-cretes",
              name: "Crêtes & Sommets brumeux",
              race: "Les Gueules Noires (52km)",
              moment: "Sommet Planche des Belles Filles",
              description: "Courir dans les nuages sur les sentiers de schiste.",
              photos: pcPhotos.slice(4, 8)
            },
            {
              id: "pc-2024-boue",
              name: "Épopée dans la boue des Terrils",
              race: "Les Terrils (28km)",
              moment: "Terrils & Sous-bois",
              description: "Glissades, sourires et courage dans les raidillons.",
              photos: pcPhotos.slice(8)
            }
          ]
        },
        {
          id: "elodie-bermond-2024",
          photographerName: "Élodie Bermond",
          photographerSlug: "elodie-bermond",
          bio: "Photographe reporter, amoureuse des visages et des émotions sportives intenses.",
          avatarUrl: "/medias/Index/Elodie-Bermond_IMG_6221-original.webp",
          websiteUrl: "https://www.instagram.com/elodiebermond_photo",
          instagramUrl: "@elodiebermond_photo",
          subGalleries: [
            {
              id: "eb-2024-ravitos",
              name: "La chaleur des Ravitaillements",
              race: "Toutes courses",
              moment: "Sous-bois & Ravitos",
              description: "Thé chaud, sourires et encouragements chaleureux des bénévoles.",
              photos: ebPhotos.slice(0, 3)
            },
            {
              id: "eb-2024-finish",
              name: "Finishers boueux mais victorieux",
              race: "Toutes courses",
              moment: "Arrivées & Finishers",
              description: "L'arrivée des vaillants coureurs recouverts de boue.",
              photos: ebPhotos.slice(3)
            }
          ]
        }
      ]
    },
    {
      id: "2023",
      year: 2023,
      title: "La Confirmation",
      subtitle: "2ème Édition • Mai 2023",
      date: "14 Mai 2023",
      description: "Ouverture du format semi-marathon nature (28km) et mise en place du label éco-responsable avec suppression totale des contenants à usage unique sur tous les ravitaillements. Une météo clémente qui a permis de doubler le nombre de participants.",
      posterUrl: "/medias/affiches/affiche-2023.webp",
      stats: {
        finishers: 480,
        runners: 520,
        volunteers: 95,
        recordHolder: "Mathieu Faivre",
        recordTime: "05:28:14",
        weather: "Soleil voilé, 16°C"
      },
      highlights: [
        "Inauguration officielle de l'épreuve des Terrils (28km)",
        "Engagement zéro déchet et label éco-trail",
        "480 coureurs sur la ligne de départ"
      ],
      races: [
        {
          id: "gueules-noires-2023",
          name: "Les Gueules Noires",
          distance: "50 km",
          elevation: "+2 150 m",
          finishersCount: 120,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2023",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Mathieu FAIVRE", time: "05:28:14", speed: "9.1 km/h", club: "Vesoul Marathon", bib: "105" },
            { rank: 2, gender: "M", name: "Romain GAUTHIER", time: "05:39:40", speed: "8.8 km/h", club: "ASPTT Belfort", bib: "112" },
            { rank: 3, gender: "M", name: "Nicolas HENRY", time: "05:47:15", speed: "8.6 km/h", club: "Besançon Trail", bib: "128" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Isabelle GENET", time: "06:42:10", speed: "7.5 km/h", club: "Haute-Saône Endurance", bib: "180" },
            { rank: 2, gender: "F", name: "Pauline BLANC", time: "07:05:30", speed: "7.0 km/h", club: "Run in Champagney", bib: "192" },
            { rank: 3, gender: "F", name: "Valérie ROY", time: "07:18:22", speed: "6.8 km/h", club: "Mulhouse Trail", bib: "198" }
          ]
        },
        {
          id: "terrils-2023",
          name: "Les Terrils",
          distance: "28 km",
          elevation: "+1 100 m",
          finishersCount: 210,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2023",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Gilles MARION", time: "02:35:12", speed: "10.8 km/h", club: "Lure Athlétisme", bib: "250" },
            { rank: 2, gender: "M", name: "Julien VASSEUR", time: "02:38:40", speed: "10.6 km/h", club: "Team Montbéliard", bib: "264" },
            { rank: 3, gender: "M", name: "Christophe ROUX", time: "02:44:05", speed: "10.2 km/h", club: "Run in Champagney", bib: "277" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Sandrine LEFEVRE", time: "03:01:25", speed: "9.3 km/h", club: "Colmar Athlé", bib: "310" },
            { rank: 2, gender: "F", name: "Élise VOIRIN", time: "03:12:40", speed: "8.7 km/h", club: "ASPTT Belfort", bib: "325" },
            { rank: 3, gender: "F", name: "Carine DUBOIS", time: "03:19:15", speed: "8.4 km/h", club: "Haute-Saône Trail", bib: "338" }
          ]
        },
        {
          id: "galibots-2023",
          name: "Les Galibots",
          distance: "12 km",
          elevation: "+450 m",
          finishersCount: 150,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2023",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Romain PETIT", time: "00:59:45", speed: "12.1 km/h", club: "Team Outdoor 70", bib: "410" },
            { rank: 2, gender: "M", name: "Florian THIEBAUT", time: "01:02:18", speed: "11.6 km/h", club: "Belfort Athlé", bib: "422" },
            { rank: 3, gender: "M", name: "Guillaume BLOT", time: "01:04:55", speed: "11.1 km/h", club: "Non Licencié", bib: "435" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Laura GIRARD", time: "01:14:30", speed: "9.7 km/h", club: "Run in Champagney", bib: "480" },
            { rank: 2, gender: "F", name: "Amandine RENAUD", time: "01:18:15", speed: "9.2 km/h", club: "Lure Athlétisme", bib: "492" },
            { rank: 3, gender: "F", name: "Claire MASSON", time: "01:22:00", speed: "8.8 km/h", club: "Haute-Saône Sport", bib: "498" }
          ]
        }
      ],
      galleries: [
        {
          id: "pierre-coutherut-2023",
          photographerName: "Pierre Coutherut",
          photographerSlug: "pierre-coutherut",
          bio: "Photographe passionné d'espaces naturels et de trail dans le massif vosgien.",
          avatarUrl: "/medias/Index/Pierre-Coutherut_TDM-2024-2.jpg",
          websiteUrl: "https://www.instagram.com/pierre_coutherut_photo",
          instagramUrl: "@pierre_coutherut_photo",
          subGalleries: [
            {
              id: "pc-2023-ambiance",
              name: "Ambiance & Découverte des Sentiers",
              race: "Toutes courses",
              moment: "Sentiers & Terrils",
              description: "Découverte des sentiers des anciens mineurs réhabilités.",
              photos: pcPhotos.slice(0, 6)
            }
          ]
        }
      ]
    },
    {
      id: "2022",
      year: 2022,
      title: "Les Origines",
      subtitle: "1ère Édition • Mai 2022",
      date: "22 Mai 2022",
      description: "Le pari fou d'une poignée de passionnés de l'association Run in Champagney : réhabiliter les sentiers des anciens mineurs pour en faire une course nature authentique et chaleureuse. 250 pionniers sur la ligne de départ sous un grand soleil.",
      posterUrl: "/medias/affiches/affiche-2022.webp",
      stats: {
        finishers: 250,
        runners: 270,
        volunteers: 70,
        recordHolder: "Cédric Blanchard",
        recordTime: "01:34:20",
        weather: "Ensoleillé, 22°C"
      },
      highlights: [
        "Lancement officiel du Trail des Mines à Champagney",
        "250 coureurs pionniers au rendez-vous",
        "Réhabilitation des anciens sentiers miniers de Haute-Saône"
      ],
      races: [
        {
          id: "pionniers-2022",
          name: "Trail des Pionniers",
          distance: "18 km",
          elevation: "+600 m",
          finishersCount: 250,
          resultsPdfUrl: "#",
          chronoUrl: "https://www.chronometrage.com/tdm2022",
          podiumScratch: [
            { rank: 1, gender: "M", name: "Cédric BLANCHARD", time: "01:34:20", speed: "11.4 km/h", club: "Run in Champagney", bib: "001" },
            { rank: 2, gender: "M", name: "Frédéric LAMBERT", time: "01:37:45", speed: "11.0 km/h", club: "Lure Athlétisme", bib: "014" },
            { rank: 3, gender: "M", name: "Olivier MARCHAL", time: "01:41:10", speed: "10.7 km/h", club: "Belfort Trail", bib: "032" }
          ],
          podiumWomen: [
            { rank: 1, gender: "F", name: "Claire PETIT", time: "01:52:30", speed: "9.6 km/h", club: "Run in Champagney", bib: "088" },
            { rank: 2, gender: "F", name: "Stéphanie VOGEL", time: "01:58:15", speed: "9.1 km/h", club: "Vesoul Marathon", bib: "095" },
            { rank: 3, gender: "F", name: "Nathalie SIMON", time: "02:04:40", speed: "8.7 km/h", club: "Haute-Saône Trail", bib: "102" }
          ]
        }
      ],
      galleries: [
        {
          id: "pierre-coutherut-2022",
          photographerName: "Pierre Coutherut",
          photographerSlug: "pierre-coutherut",
          bio: "Photographe passionné d'espaces naturels et de trail dans le massif vosgien.",
          avatarUrl: "/medias/Index/Pierre-Coutherut_TDM-2024-2.jpg",
          websiteUrl: "https://www.instagram.com/pierre_coutherut_photo",
          instagramUrl: "@pierre_coutherut_photo",
          subGalleries: [
            {
              id: "pc-2022-pionniers",
              name: "Les 250 Pionniers",
              race: "Trail des Pionniers (18km)",
              moment: "Départ & Arrivée",
              description: "Les premières foulées d'une belle aventure qui continue.",
              photos: pcPhotos.slice(0, 5)
            }
          ]
        }
      ]
    }
  ];

  const editionsFile = path.join(DATA_DIR, 'editions.json');
  fs.writeFileSync(editionsFile, JSON.stringify(editions, null, 2), 'utf-8');
  console.log('editions.json seeded successfully at:', editionsFile);
}

run().catch(console.error);
