const fs = require('fs');
const path = require('path');

// Génère un PDF standard et valide contenant le règlement du Trail des Mines 2027
function createReglementPDF() {
  const content = [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "endobj",
    "3 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "endobj",
    "4 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "endobj",
    "5 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "endobj"
  ];

  // Flux de texte
  const streamLines = [
    "BT",
    "/F1 20 Tf",
    "50 800 Td",
    "(TRAIL DES MINES 2027 - REGLEMENT OFFICIEL) Tj",
    "/F2 10 Tf",
    "0 -20 Td",
    "(Association Run in Champagney - 16 Mai 2027) Tj",
    "0 -35 Td",
    "/F1 13 Tf",
    "(Article 1 : Organisation & Cadre de Course) Tj",
    "/F2 9 Tf",
    "0 -15 Td",
    "(Le Trail des Mines est organise par l'association loi 1901 Run in Champagney sous l'egide de la FFA.) Tj",
    "0 -13 Td",
    "(L'epreuve se deroule le 16 mai 2027 au depart de Champagney sur les sentiers du bassin minier.) Tj",
    "0 -25 Td",
    "/F1 13 Tf",
    "(Article 2 : Conditions d'Admission & Parcours Prevention Sante - PPS) Tj",
    "/F2 9 Tf",
    "0 -15 Td",
    "(Toute participation requiert une attestation PPS valide de moins de 3 mois ou une licence FFA active.) Tj",
    "0 -13 Td",
    "(Ages minimums : 18 ans pour 52km et 28km, 16 ans pour 13km avec accord parental.) Tj",
    "0 -25 Td",
    "/F1 13 Tf",
    "(Article 3 : Dossards & Cession) Tj",
    "/F2 9 Tf",
    "0 -15 Td",
    "(Les dossards doivent etre portes de maniere visible. Toute cession sans accord est interdite.) Tj",
    "0 -25 Td",
    "/F1 13 Tf",
    "(Article 4 : Equipements Obligatoires & Controles) Tj",
    "/F2 9 Tf",
    "0 -15 Td",
    "(Gobelet personnel, reserve d'eau obligatoire selon la distance, couverture de survie et sifflet.) Tj",
    "0 -13 Td",
    "(52km : frontale obligatoire, bande de strapping et veste 10k schmerber.) Tj",
    "0 -25 Td",
    "/F1 13 Tf",
    "(Article 5 : Eco-responsabilite & Sanctions) Tj",
    "/F2 9 Tf",
    "0 -15 Td",
    "(Tout jet de dechet hors zone de ravitaillement entrainera la disqualification immediate.) Tj",
    "0 -25 Td",
    "/F1 13 Tf",
    "(Article 6 : Barrieres Horaires & Securite) Tj",
    "/F2 9 Tf",
    "0 -15 Td",
    "(Les barrieres horaires garantissent la securite. Tout concurrent hors delai est rapatrie.) Tj",
    "ET"
  ];

  const streamContent = streamLines.join("\n");
  const streamLength = Buffer.byteLength(streamContent);

  content.push("6 0 obj");
  content.push(`<< /Length ${streamLength} >>`);
  content.push("stream");
  content.push(streamContent);
  content.push("endstream");
  content.push("endobj");

  // Table xref
  const pdfBody = content.join("\n") + "\n";
  const xrefOffset = Buffer.byteLength(pdfBody);
  
  const finalPdf = pdfBody + 
    "xref\n0 7\n0000000000 65535 f \n" +
    "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" +
    xrefOffset + "\n%%EOF\n";

  const targetDir = path.resolve(__dirname, '../../public/medias');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, 'reglement.pdf');
  fs.writeFileSync(targetFile, finalPdf, 'binary');
  console.log('Fichier PDF cree avec succes :', targetFile);
}

createReglementPDF();
