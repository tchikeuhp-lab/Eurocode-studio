/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Moteur CAO DXF Professionnel & Cartouches Normalisées (ISO 7200 & ISO 13567)
 * Spécification universelle AutoCAD (AC1009 R12 & AC1015 AutoCAD 2000-2026) avec calques normalisés,
 * cadrage automatique VPORT *ACTIVE, repères de pliage et grille ISO 5457, cartouche ISO 7200,
 * gestion native des caractères accentués français (\U+XXXX), armatures transversales complètes,
 * multi-cadres (L, T, Croix, Hexagone) et nomenclature des aciers ISO 3766 sur TOUS les modules.
 */

import { BeamInput, BeamOutput } from '../eurocodes/ec2_beams.ts';
import { ColumnInput, ColumnOutput } from '../eurocodes/ec2_columns.ts';
import { SlabInput, SlabOutput } from '../eurocodes/ec2_slabs.ts';
import { FootingInput, FootingOutput } from '../eurocodes/ec2_footings.ts';
import { CompositeInput, CompositeOutput } from '../eurocodes/ec4_composite.ts';

/**
 * Encode les caractères accentués français et symboles techniques sous forme de séquences
 * d'échappement AutoCAD universelles (\U+XXXX et codes %%).
 * Garantit une compatibilité 100% sur AutoCAD 2000-2026, AutoCAD LT, DWG TrueView et LibreCAD.
 */
export function encodeDxfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r?\n/g, ' ')
    .replace(/é/g, '\\U+00E9')
    .replace(/è/g, '\\U+00E8')
    .replace(/ê/g, '\\U+00EA')
    .replace(/ë/g, '\\U+00EB')
    .replace(/à/g, '\\U+00E0')
    .replace(/â/g, '\\U+00E2')
    .replace(/î/g, '\\U+00EE')
    .replace(/ï/g, '\\U+00EF')
    .replace(/ô/g, '\\U+00F4')
    .replace(/ù/g, '\\U+00F9')
    .replace(/û/g, '\\U+00FB')
    .replace(/ü/g, '\\U+00FC')
    .replace(/ç/g, '\\U+00E7')
    .replace(/É/g, '\\U+00C9')
    .replace(/È/g, '\\U+00C8')
    .replace(/Ê/g, '\\U+00CA')
    .replace(/À/g, '\\U+00C0')
    .replace(/Ç/g, '\\U+00C7')
    .replace(/°/g, '%%d')
    .replace(/[Øø]/g, '%%c')
    .replace(/±/g, '%%p')
    .replace(/²/g, '\\U+00B2')
    .replace(/³/g, '\\U+00B3')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘]/g, "'");
}

export interface CartoucheData {
  projectName: string;
  elementRef: string;
  clientName: string;
  firmName: string;
  authorName: string;
  verifierName: string;
  dateStr: string;
  revisionIndex: string; // 'A', 'B', 'REV-B', etc.
  scaleText: string;     // '1:20', '1:25', '1:50'
  sheetFormat: 'A3' | 'A2' | 'A1';
  drawingNumber: string;
  dxfVersion?: 'AC1009' | 'AC1015'; // AC1009 = R12 Universel, AC1015 = AutoCAD 2000+
}

export const DEFAULT_CARTOUCHE: CartoucheData = {
  projectName: 'BÂTIMENT R+4 EUROCODES - GROS ŒUVRE BÉTON ARMÉ',
  elementRef: 'POUTRE P-101 TRAVÉE COURANTE',
  clientName: 'SCI DU PARC TERTIAIRE',
  firmName: 'EUROCODES STUDIO INGÉNIERIE & STRUCTURES',
  authorName: 'Ing. Structure Civil',
  verifierName: 'SOCOTEC / VERITAS (Visa B.P.E.)',
  dateStr: new Date().toLocaleDateString('fr-FR'),
  revisionIndex: 'REV-B',
  scaleText: '1:25',
  sheetFormat: 'A3',
  drawingNumber: 'EC2-STR-PE-101',
  dxfVersion: 'AC1009',
};

export interface DxfLayerDef {
  name: string;
  color: number;       // ACI Color Index: 1=Red, 2=Yellow, 3=Green, 4=Cyan, 5=Blue, 6=Magenta, 7=White, 8=Gray
  lineweight: number;  // Lineweight en 1/100 mm (ex: 50 = 0.50mm, 70 = 0.70mm)
  linetype?: string;   // 'CONTINUOUS', 'CENTER', 'DASHED'
  description?: string;
}

export const ISO_13567_LAYERS: Record<string, DxfLayerDef> = {
  'A-COFF-CONTOUR': { name: 'A-COFF-CONTOUR', color: 4, lineweight: 50, linetype: 'CONTINUOUS', description: 'Contour principal du coffrage béton' },
  'A-COFF-AXES': { name: 'A-COFF-AXES', color: 1, lineweight: 18, linetype: 'CENTER', description: 'Axes structurels et lignes neutres' },
  'A-COFF-CACHE': { name: 'A-COFF-CACHE', color: 8, lineweight: 18, linetype: 'DASHED', description: 'Arêtes cachées de coffrage' },
  'A-ARMT-LONG-INF': { name: 'A-ARMT-LONG-INF', color: 3, lineweight: 70, linetype: 'CONTINUOUS', description: 'Armatures longitudinales inférieures tendues' },
  'A-ARMT-LONG-SUP': { name: 'A-ARMT-LONG-SUP', color: 3, lineweight: 70, linetype: 'CONTINUOUS', description: 'Armatures longitudinales supérieures / montage' },
  'A-ARMT-TRANS-CADR': { name: 'A-ARMT-TRANS-CADR', color: 2, lineweight: 35, linetype: 'CONTINUOUS', description: 'Cadres et étriers transversaux de cisaillement' },
  'A-ARMT-ANCR': { name: 'A-ARMT-ANCR', color: 6, lineweight: 50, linetype: 'CONTINUOUS', description: 'Cotes des longueurs d ancrage lbd et recouvrements l0' },
  'A-COTE-DIM': { name: 'A-COTE-DIM', color: 1, lineweight: 18, linetype: 'CONTINUOUS', description: 'Lignes de cotes et cotes de coffrage' },
  'A-TEXT-REPE': { name: 'A-TEXT-REPE', color: 7, lineweight: 25, linetype: 'CONTINUOUS', description: 'Repères des barres et bulles d annotations' },
  'A-CART-CADRE': { name: 'A-CART-CADRE', color: 7, lineweight: 50, linetype: 'CONTINUOUS', description: 'Cadre extérieur de planche et cartouche ISO 7200' },
  'A-TABL-NOMENCL': { name: 'A-TABL-NOMENCL', color: 7, lineweight: 25, linetype: 'CONTINUOUS', description: 'Nomenclature et schémas de façonnage ISO 3766' },
};

/**
 * Générateur DXF universel compatible avec 100% des versions d'AutoCAD (R12 à AutoCAD 2026).
 */
export class AdvancedDxfBuilder {
  private entities: string[] = [];
  private format: 'A3' | 'A2' | 'A1';
  public widthMm: number;
  public heightMm: number;
  public version: 'AC1009' | 'AC1015';

  constructor(format: 'A3' | 'A2' | 'A1' = 'A3', version: 'AC1009' | 'AC1015' = 'AC1009') {
    this.format = format;
    this.version = version;
    if (format === 'A1') {
      this.widthMm = 841;
      this.heightMm = 594;
    } else if (format === 'A2') {
      this.widthMm = 594;
      this.heightMm = 420;
    } else {
      this.widthMm = 420;
      this.heightMm = 297;
    }
  }

  addLine(x1: number, y1: number, x2: number, y2: number, layer: string, color?: number) {
    let str = '0\nLINE\n';
    str += `8\n${layer}\n`;
    if (color !== undefined) str += `62\n${color}\n`;
    str += `10\n${x1.toFixed(3)}\n20\n${y1.toFixed(3)}\n30\n0.0\n`;
    str += `11\n${x2.toFixed(3)}\n21\n${y2.toFixed(3)}\n31\n0.0\n`;
    this.entities.push(str);
  }

  addRect(x: number, y: number, w: number, h: number, layer: string, color?: number) {
    this.addLine(x, y, x + w, y, layer, color);
    this.addLine(x + w, y, x + w, y + h, layer, color);
    this.addLine(x + w, y + h, x, y + h, layer, color);
    this.addLine(x, y + h, x, y, layer, color);
  }

  addCircle(cx: number, cy: number, r: number, layer: string, color?: number) {
    let str = '0\nCIRCLE\n';
    str += `8\n${layer}\n`;
    if (color !== undefined) str += `62\n${color}\n`;
    str += `10\n${cx.toFixed(3)}\n20\n${cy.toFixed(3)}\n30\n0.0\n`;
    str += `40\n${r.toFixed(3)}\n`;
    this.entities.push(str);
  }

  addArc(cx: number, cy: number, r: number, startAngleDeg: number, endAngleDeg: number, layer: string, color?: number) {
    let str = '0\nARC\n';
    str += `8\n${layer}\n`;
    if (color !== undefined) str += `62\n${color}\n`;
    str += `10\n${cx.toFixed(3)}\n20\n${cy.toFixed(3)}\n30\n0.0\n`;
    str += `40\n${r.toFixed(3)}\n`;
    str += `50\n${startAngleDeg.toFixed(2)}\n`;
    str += `51\n${endAngleDeg.toFixed(2)}\n`;
    this.entities.push(str);
  }

  addText(
    text: string,
    x: number,
    y: number,
    height: number,
    layer: string,
    color?: number,
    alignment: 'left' | 'center' | 'right' = 'left'
  ) {
    const cleanText = encodeDxfText(text);
    let str = '0\nTEXT\n';
    str += `8\n${layer}\n`;
    if (color !== undefined) str += `62\n${color}\n`;
    str += `10\n${x.toFixed(3)}\n20\n${y.toFixed(3)}\n30\n0.0\n`;
    str += `40\n${height.toFixed(3)}\n`;
    str += `1\n${cleanText}\n`;
    str += '7\nSTANDARD\n';

    if (alignment === 'center') {
      str += '72\n1\n';
      str += `11\n${x.toFixed(3)}\n21\n${y.toFixed(3)}\n31\n0.0\n`;
    } else if (alignment === 'right') {
      str += '72\n2\n';
      str += `11\n${x.toFixed(3)}\n21\n${y.toFixed(3)}\n31\n0.0\n`;
    }
    this.entities.push(str);
  }

  addDimension(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    offset: number,
    label: string,
    isVertical: boolean = false
  ) {
    const layer = 'A-COTE-DIM';
    const tick = 2.0; // tique de 2mm à 45°
    const textHeight = 2.4;

    if (!isVertical) {
      const dimY = y1 + offset;
      const rappStart = y1 + (offset > 0 ? 1 : -1);
      const rappEnd = dimY + (offset > 0 ? 3 : -3);
      this.addLine(x1, rappStart, x1, rappEnd, layer, 1);
      this.addLine(x2, rappStart, x2, rappEnd, layer, 1);
      this.addLine(x1, dimY, x2, dimY, layer, 1);
      this.addLine(x1 - tick, dimY - tick, x1 + tick, dimY + tick, layer, 1);
      this.addLine(x2 - tick, dimY - tick, x2 + tick, dimY + tick, layer, 1);
      const textY = offset > 0 ? dimY + 1.2 : dimY + 1.2;
      this.addText(label, (x1 + x2) / 2, textY, textHeight, layer, 1, 'center');
    } else {
      const dimX = x1 + offset;
      const rappStart = x1 + (offset > 0 ? 1 : -1);
      const rappEnd = dimX + (offset > 0 ? 3 : -3);
      this.addLine(rappStart, y1, rappEnd, y1, layer, 1);
      this.addLine(rappStart, y2, rappEnd, y2, layer, 1);
      this.addLine(dimX, y1, dimX, y2, layer, 1);
      this.addLine(dimX - tick, y1 - tick, dimX + tick, y1 + tick, layer, 1);
      this.addLine(dimX - tick, y2 - tick, dimX + tick, y2 + tick, layer, 1);
      const textX = offset > 0 ? dimX + 2 : dimX - 4;
      this.addText(label, textX, (y1 + y2) / 2, textHeight, layer, 1, 'center');
    }
  }

  addNormalizedBorderAndCartouche(cartouche: CartoucheData) {
    const layer = 'A-CART-CADRE';
    const sheetW = this.widthMm;
    const sheetH = this.heightMm;

    const leftMargin = 20;  // 20 mm reliure ISO 5457
    const rightMargin = 10;
    const topMargin = 10;
    const bottomMargin = 10;

    // Cadre de découpe
    this.addRect(0, 0, sheetW, sheetH, layer, 8);

    // Cadre intérieur marge utile
    const innerX = leftMargin;
    const innerY = bottomMargin;
    const innerW = sheetW - leftMargin - rightMargin;
    const innerH = sheetH - topMargin - bottomMargin;
    this.addRect(innerX, innerY, innerW, innerH, layer, 7);

    // Repères de centrage
    this.addLine(sheetW / 2, 0, sheetW / 2, 8, layer, 7);
    this.addLine(sheetW / 2, sheetH - 8, sheetW / 2, sheetH, layer, 7);
    this.addLine(0, sheetH / 2, 8, sheetH / 2, layer, 7);
    this.addLine(sheetW - 8, sheetH / 2, sheetW, sheetH / 2, layer, 7);

    // Repères de pliage (190 mm)
    this.addLine(190, sheetH, 190, sheetH - 5, layer, 8);
    this.addLine(190, 0, 190, 5, layer, 8);

    // Grille coordonnées ISO 5457
    const horizCols = 8;
    const colStep = innerW / horizCols;
    for (let i = 1; i < horizCols; i++) {
      const gx = innerX + i * colStep;
      this.addLine(gx, sheetH, gx, sheetH - 4, layer, 8);
      this.addLine(gx, 0, gx, 4, layer, 8);
      this.addText(`${i}`, innerX + (i - 0.5) * colStep, sheetH - 3, 2.0, layer, 8, 'center');
      this.addText(`${i}`, innerX + (i - 0.5) * colStep, 1.5, 2.0, layer, 8, 'center');
    }
    this.addText(`${horizCols}`, innerX + (horizCols - 0.5) * colStep, sheetH - 3, 2.0, layer, 8, 'center');
    this.addText(`${horizCols}`, innerX + (horizCols - 0.5) * colStep, 1.5, 2.0, layer, 8, 'center');

    const vertRows = 4;
    const rowStep = innerH / vertRows;
    const rowLetters = ['D', 'C', 'B', 'A'];
    for (let j = 1; j < vertRows; j++) {
      const gy = innerY + j * rowStep;
      this.addLine(0, gy, 4, gy, layer, 8);
      this.addLine(sheetW, gy, sheetW - 4, gy, layer, 8);
    }
    for (let j = 0; j < vertRows; j++) {
      this.addText(rowLetters[j], 2, innerY + (j + 0.4) * rowStep, 2.0, layer, 8, 'center');
      this.addText(rowLetters[j], sheetW - 2, innerY + (j + 0.4) * rowStep, 2.0, layer, 8, 'center');
    }

    // CARTOUCHE ISO 7200 (180 × 65 mm)
    const cartW = 180;
    const cartH = 65;
    const cartX = innerX + innerW - cartW;
    const cartY = innerY;

    this.addRect(cartX, cartY, cartW, cartH, layer, 7);
    this.addLine(cartX, cartY + 52, cartX + cartW, cartY + 52, layer, 7);
    this.addLine(cartX, cartY + 38, cartX + cartW, cartY + 38, layer, 7);
    this.addLine(cartX, cartY + 24, cartX + cartW, cartY + 24, layer, 7);
    this.addLine(cartX, cartY + 12, cartX + cartW, cartY + 12, layer, 7);

    this.addLine(cartX + 135, cartY + 52, cartX + 135, cartY + cartH, layer, 7);
    this.addLine(cartX + 90, cartY + 38, cartX + 90, cartY + 52, layer, 7);
    this.addLine(cartX + 60, cartY + 24, cartX + 60, cartY + 38, layer, 7);
    this.addLine(cartX + 120, cartY + 24, cartX + 120, cartY + 38, layer, 7);
    this.addLine(cartX + 35, cartY + 12, cartX + 35, cartY + 24, layer, 7);
    this.addLine(cartX + 65, cartY + 12, cartX + 65, cartY + 24, layer, 7);
    this.addLine(cartX + 120, cartY + 12, cartX + 120, cartY + 24, layer, 7);
    this.addLine(cartX + 90, cartY, cartX + 90, cartY + 12, layer, 7);

    // Textes du cartouche
    this.addText('PROJET', cartX + 3, cartY + 61, 1.8, layer, 8);
    this.addText(cartouche.projectName.substring(0, 48), cartX + 3, cartY + 55, 2.6, layer, 7);

    this.addText('IND.', cartX + 138, cartY + 61, 1.8, layer, 8);
    this.addText(cartouche.revisionIndex, cartX + 155, cartY + 55, 3.2, layer, 3, 'center');

    this.addText('MAÎTRE D OUVRAGE / CLIENT', cartX + 3, cartY + 48, 1.8, layer, 8);
    this.addText(cartouche.clientName.substring(0, 26), cartX + 3, cartY + 41, 2.3, layer, 7);

    this.addText('BUREAU D ÉTUDES STRUCTURES', cartX + 93, cartY + 48, 1.8, layer, 8);
    this.addText(cartouche.firmName.substring(0, 26), cartX + 93, cartY + 41, 2.3, layer, 7);

    this.addText('DESSINÉ PAR', cartX + 3, cartY + 34, 1.8, layer, 8);
    this.addText(cartouche.authorName.substring(0, 18), cartX + 3, cartY + 27, 2.1, layer, 7);

    this.addText('VÉRIFIÉ & APPROUVÉ', cartX + 63, cartY + 34, 1.8, layer, 8);
    this.addText(cartouche.verifierName.substring(0, 18), cartX + 63, cartY + 27, 2.1, layer, 7);

    this.addText('DATE D ÉMISSION', cartX + 123, cartY + 34, 1.8, layer, 8);
    this.addText(cartouche.dateStr, cartX + 123, cartY + 27, 2.1, layer, 7);

    this.addText('ÉCHELLE', cartX + 3, cartY + 20, 1.8, layer, 8);
    this.addText(cartouche.scaleText, cartX + 15, cartY + 14, 2.5, layer, 7);

    this.addText('FORMAT', cartX + 38, cartY + 20, 1.8, layer, 8);
    this.addText(cartouche.sheetFormat, cartX + 50, cartY + 14, 2.5, layer, 7);

    this.addText('NORME CAO', cartX + 68, cartY + 20, 1.8, layer, 8);
    this.addText('ISO 7200 / 13567', cartX + 70, cartY + 14, 2.0, layer, 7);

    this.addText('RÉFÉRENCE ÉLÉMENT', cartX + 123, cartY + 20, 1.8, layer, 8);
    this.addText(cartouche.elementRef.substring(0, 20), cartX + 123, cartY + 14, 2.4, layer, 3);

    this.addText('N° DU PLAN OFFICIEL', cartX + 3, cartY + 8, 1.8, layer, 8);
    this.addText(cartouche.drawingNumber, cartX + 3, cartY + 3, 2.8, layer, 7);

    this.addText('STATUT DU LIVRABLE', cartX + 93, cartY + 8, 1.8, layer, 8);
    this.addText('BON POUR EXÉCUTION (B.P.E.)', cartX + 93, cartY + 3, 2.5, layer, 3);
  }

  /**
   * Ajoute un tableau normalisé de nomenclature des aciers ISO 3766 dans le quart inférieur gauche
   */
  addRebarScheduleTable(
    title: string,
    rows: Array<{
      rep: string;
      role: string;
      countPhi: string;
      unitLen: string;
      codeIso: string;
      weight: string;
    }>,
    totalWeightKg?: number,
    tabX = 25,
    tabY = 12,
    tabW = 195,
    tabH = 60
  ) {
    const layer = 'A-TABL-NOMENCL';
    this.addRect(tabX, tabY, tabW, tabH, layer, 7);
    this.addText(title, tabX + 3, tabY + tabH - 6, 2.3, layer, 7);
    this.addLine(tabX, tabY + tabH - 10, tabX + tabW, tabY + tabH - 10, layer, 7);

    const headers = ['Rep.', 'Désignation & Rôle', 'Nombre & Ø', 'Long. unit.', 'Façonnage ISO 3766', 'Masse'];
    const colPositions = [3, 20, 68, 105, 138, 175];
    for (let i = 0; i < headers.length; i++) {
      this.addText(headers[i], tabX + colPositions[i], tabY + tabH - 15, 1.8, layer, 8);
    }
    this.addLine(tabX, tabY + tabH - 18, tabX + tabW, tabY + tabH - 18, layer, 8);

    let rowY = tabY + tabH - 26;
    const maxRows = Math.min(rows.length, 5);
    for (let i = 0; i < maxRows; i++) {
      const r = rows[i];
      this.addText(r.rep, tabX + 3, rowY, 1.9, layer, 3);
      this.addText(r.role, tabX + 20, rowY, 1.8, layer, 7);
      this.addText(r.countPhi, tabX + 68, rowY, 1.9, layer, 7);
      this.addText(r.unitLen, tabX + 105, rowY, 1.8, layer, 7);
      this.addText(r.codeIso, tabX + 138, rowY, 1.7, layer, 7);
      this.addText(r.weight, tabX + 175, rowY, 1.9, layer, 7);
      rowY -= 7.5;
    }

    if (totalWeightKg !== undefined) {
      this.addLine(tabX, tabY + 6, tabX + tabW, tabY + 6, layer, 8);
      this.addText(`MASSE TOTALE D'ACIER = ${totalWeightKg} kg`, tabX + 3, tabY + 2, 2.0, layer, 3);
    }
  }

  buildDxfString(): string {
    const isR12 = this.version === 'AC1009';
    let dxf = '';

    // 1. SECTION HEADER
    dxf += '0\nSECTION\n2\nHEADER\n';
    dxf += `9\n$ACADVER\n1\n${this.version}\n`;
    dxf += '9\n$DWGCODEPAGE\n3\nANSI_1252\n';
    dxf += '9\n$MEASUREMENT\n70\n1\n'; // 1 = Métrique (ISO)
    dxf += '9\n$INSUNITS\n70\n4\n';    // 4 = Millimètres
    dxf += '9\n$LUNITS\n70\n2\n';      // 2 = Format décimal
    dxf += '9\n$AUNITS\n70\n0\n';      // 0 = Degrés décimaux

    dxf += '9\n$LIMMIN\n10\n0.0\n20\n0.0\n';
    dxf += `9\n$LIMMAX\n10\n${this.widthMm.toFixed(1)}\n20\n${this.heightMm.toFixed(1)}\n`;
    dxf += '9\n$EXTMIN\n10\n0.0\n20\n0.0\n30\n0.0\n';
    dxf += `9\n$EXTMAX\n10\n${this.widthMm.toFixed(1)}\n20\n${this.heightMm.toFixed(1)}\n30\n0.0\n`;
    dxf += '0\nENDSEC\n';

    // 2. SECTION TABLES (VPORT, LTYPE, LAYER, STYLE, APPID)
    dxf += '0\nSECTION\n2\nTABLES\n';

    // VPORT *ACTIVE
    const centerX = this.widthMm / 2;
    const centerY = this.heightMm / 2;
    const viewHeight = this.heightMm * 1.06;
    const aspect = this.widthMm / this.heightMm;

    dxf += '0\nTABLE\n2\nVPORT\n70\n1\n';
    dxf += '0\nVPORT\n2\n*ACTIVE\n70\n0\n';
    dxf += '10\n0.0\n20\n0.0\n11\n1.0\n21\n1.0\n';
    dxf += `12\n${centerX.toFixed(3)}\n22\n${centerY.toFixed(3)}\n`;
    dxf += '13\n0.0\n23\n0.0\n14\n1.0\n24\n1.0\n15\n0.0\n25\n0.0\n';
    dxf += '16\n0.0\n26\n0.0\n36\n1.0\n17\n0.0\n27\n0.0\n37\n0.0\n';
    dxf += `40\n${viewHeight.toFixed(3)}\n41\n${aspect.toFixed(3)}\n42\n50.0\n`;
    dxf += '43\n0.0\n44\n0.0\n50\n0.0\n51\n0.0\n';
    dxf += '71\n0\n72\n100\n73\n1\n74\n3\n75\n1\n76\n1\n77\n1\n78\n1\n';
    dxf += '0\nENDTAB\n';

    // APPID ACAD
    dxf += '0\nTABLE\n2\nAPPID\n70\n1\n';
    dxf += '0\nAPPID\n2\nACAD\n70\n0\n';
    dxf += '0\nENDTAB\n';

    // LTYPE
    dxf += '0\nTABLE\n2\nLTYPE\n70\n4\n';
    dxf += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
    dxf += '0\nLTYPE\n2\nCENTER\n70\n0\n3\nCenter line\n72\n65\n73\n4\n40\n16.0\n49\n10.0\n49\n-2.0\n49\n2.0\n49\n-2.0\n';
    dxf += '0\nLTYPE\n2\nDASHED\n70\n0\n3\nDashed line\n72\n65\n73\n2\n40\n10.0\n49\n6.0\n49\n-4.0\n';
    dxf += '0\nLTYPE\n2\nHIDDEN\n70\n0\n3\nHidden line\n72\n65\n73\n2\n40\n9.5\n49\n6.0\n49\n-3.5\n';
    dxf += '0\nENDTAB\n';

    // LAYER
    const layerKeys = Object.keys(ISO_13567_LAYERS);
    dxf += `0\nTABLE\n2\nLAYER\n70\n${layerKeys.length + 1}\n`;
    dxf += '0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n';
    for (const key of layerKeys) {
      const l = ISO_13567_LAYERS[key];
      dxf += '0\nLAYER\n';
      dxf += `2\n${l.name}\n`;
      dxf += '70\n0\n';
      dxf += `62\n${l.color}\n`;
      dxf += `6\n${l.linetype || 'CONTINUOUS'}\n`;
      if (!isR12) {
        dxf += `370\n${l.lineweight}\n`;
      }
    }
    dxf += '0\nENDTAB\n';

    // STYLE STANDARD Arial Narrow
    dxf += '0\nTABLE\n2\nSTYLE\n70\n1\n';
    dxf += '0\nSTYLE\n2\nSTANDARD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\nARIALN.TTF\n4\n\n';
    dxf += '0\nENDTAB\n';

    dxf += '0\nENDSEC\n';

    // 3. SECTION BLOCKS
    dxf += '0\nSECTION\n2\nBLOCKS\n';
    dxf += '0\nBLOCK\n8\n0\n2\n*MODEL_SPACE\n70\n0\n10\n0.0\n20\n0.0\n30\n0.0\n3\n*MODEL_SPACE\n1\n\n';
    dxf += '0\nENDBLK\n8\n0\n';
    dxf += '0\nBLOCK\n8\n0\n2\n*PAPER_SPACE\n70\n0\n10\n0.0\n20\n0.0\n30\n0.0\n3\n*PAPER_SPACE\n1\n\n';
    dxf += '0\nENDBLK\n8\n0\n';
    dxf += '0\nENDSEC\n';

    // 4. SECTION ENTITIES
    dxf += '0\nSECTION\n2\nENTITIES\n';
    dxf += this.entities.join('');
    dxf += '0\nENDSEC\n';

    // 5. EOF
    dxf += '0\nEOF\n';
    return dxf;
  }
}

/**
 * 1. Module POUTRES BA (EN 1992-1-1 §5 & §6 & §9)
 * Élévation longitudinale, coupe transversale détaillée multi-lits, étriers intérieurs et nomenclature ISO 3766
 */
export function generateBeamDxf(
  input: BeamInput,
  output: BeamOutput,
  cartouche: CartoucheData = DEFAULT_CARTOUCHE
): string {
  const dxf = new AdvancedDxfBuilder(cartouche.sheetFormat, cartouche.dxfVersion || 'AC1009');
  const L = input.spanL * 1000;
  const H = input.heightH;
  const B = input.widthB;
  const C = input.coverC;
  const lbd = output.anchorage.lbd;
  const stirrupPhi = output.stirrupPhi || input.stirrupDiameter || 8;
  const topRebarPhi = input.topRebarPhi || 12;
  const topRebarCount = input.topRebarCount || 2;

  const sc = Math.min(0.038, 220 / (L + 600));
  const elevW = L * sc;
  const elevH = H * sc;

  const scSec = Math.min(0.08, 120 / H);
  const sectW = B * scSec;
  const sectH = H * scSec;

  const gap = 35;
  const totalW = elevW + gap + sectW + 35;
  const totalH = Math.max(elevH, sectH) + 40;

  const originX = 20 + Math.max(15, (390 - totalW) / 2) + 15;
  const originY = 80 + Math.max(15, (205 - totalH) / 2) + 15;

  // 1. ÉLÉVATION LONGITUDINALE
  dxf.addRect(originX, originY, elevW, elevH, 'A-COFF-CONTOUR', 4);
  dxf.addLine(originX - 10, originY + elevH / 2, originX + elevW + 10, originY + elevH / 2, 'A-COFF-AXES', 1);

  // Appuis poteaux supports
  const appuiW = 300 * sc;
  const appuiH = 350 * sc;
  dxf.addRect(originX - appuiW, originY - appuiH, appuiW, appuiH, 'A-COFF-CONTOUR', 8);
  dxf.addRect(originX + elevW, originY - appuiH, appuiW, appuiH, 'A-COFF-CONTOUR', 8);
  dxf.addText('APPUI G', originX - appuiW / 2, originY - appuiH - 4, 2.0, 'A-TEXT-REPE', 8, 'center');
  dxf.addText('APPUI D', originX + elevW + appuiW / 2, originY - appuiH - 4, 2.0, 'A-TEXT-REPE', 8, 'center');

  // Tracé des armatures longitudinales inférieures selon les lits configurés
  const lbdScaled = Math.min(60, lbd * sc);
  output.layersDetails.forEach((layer) => {
    const isFirstLayer = layer.layerIndex === 1;
    const yPosSc = originY + layer.yPositionMm * sc;
    const leftX = isFirstLayer ? originX - lbdScaled : originX;
    const rightX = isFirstLayer ? originX + elevW + lbdScaled : originX + elevW;

    dxf.addLine(leftX, yPosSc, rightX, yPosSc, 'A-ARMT-LONG-INF', 3);
    if (isFirstLayer && input.anchorageType === 'hook_90') {
      dxf.addLine(leftX, yPosSc, leftX, yPosSc + 120 * sc, 'A-ARMT-LONG-INF', 3);
      dxf.addLine(rightX, yPosSc, rightX, yPosSc + 120 * sc, 'A-ARMT-LONG-INF', 3);
    }
  });

  // Armatures longitudinales supérieures
  const supY = originY + (H - C - stirrupPhi - topRebarPhi / 2) * sc;
  dxf.addLine(originX - 120 * sc, supY, originX + elevW + 120 * sc, supY, 'A-ARMT-LONG-SUP', 3);
  dxf.addLine(originX - 120 * sc, supY, originX - 120 * sc, supY - 80 * sc, 'A-ARMT-LONG-SUP', 3);
  dxf.addLine(originX + elevW + 120 * sc, supY, originX + elevW + 120 * sc, supY - 80 * sc, 'A-ARMT-LONG-SUP', 3);
  dxf.addText(`Aciers de montage : ${output.providedRebarsSup}`, originX + 20, supY + 2.5, 2.0, 'A-TEXT-REPE', 3);

  // Aciers de peau intermédiaires pour poutres hautes (h >= 600 mm)
  if (output.confinementRules.requiresSkinRebars) {
    const skinY = originY + (H / 2) * sc;
    dxf.addLine(originX, skinY, originX + elevW, skinY, 'A-ARMT-LONG-SUP', 3);
    dxf.addText(`Aciers de peau répartis (h >= 600mm) : 2x2 HA ${input.skinRebarPhi || 10}`, originX + 15, skinY + 1.5, 2.0, 'A-TEXT-REPE', 3);
  }

  // Cadres et étriers transversaux (zones courante et critique)
  const sCritScaled = Math.max(2.5, output.spacingCritMm * sc);
  const sCourantScaled = Math.max(3.5, output.spacingCalculatedMm * sc);
  const zCritW = Math.min(elevW * 0.25, 2 * elevH);
  const infY1 = originY + (output.layersDetails[0]?.yPositionMm || C) * sc;

  for (let x = originX + 2; x <= originX + zCritW; x += sCritScaled) {
    dxf.addLine(x, infY1, x, supY, 'A-ARMT-TRANS-CADR', 2);
  }
  for (let x = originX + zCritW + sCourantScaled; x <= originX + elevW - zCritW; x += sCourantScaled) {
    dxf.addLine(x, infY1, x, supY, 'A-ARMT-TRANS-CADR', 2);
  }
  for (let x = originX + elevW - zCritW; x <= originX + elevW - 2; x += sCritScaled) {
    dxf.addLine(x, infY1, x, supY, 'A-ARMT-TRANS-CADR', 2);
  }

  // Cotes de l'élévation
  dxf.addDimension(originX, originY, originX + elevW, originY, -14, `Portée L = ${L} mm`);
  dxf.addDimension(originX, originY, originX, originY + elevH, -12, `H = ${H} mm`, true);
  dxf.addDimension(originX, infY1, originX - lbdScaled, infY1, 10, `lbd = ${lbd} mm`);

  // Repère de coupe A-A
  const midX = originX + elevW / 2;
  dxf.addLine(midX, originY - 10, midX, originY + elevH + 10, 'A-COFF-AXES', 1);
  dxf.addText('A', midX - 1.5, originY + elevH + 12, 3.5, 'A-TEXT-REPE', 7);
  dxf.addText('A', midX - 1.5, originY - 14, 3.5, 'A-TEXT-REPE', 7);

  // 2. COUPE TRANSVERSALE A-A DÉTAILLÉE
  const sectX = originX + elevW + gap + 15;
  const sectY = originY;

  if (input.isTSection) {
    const bfW = input.flangeWidthBf * scSec;
    const hfH = input.flangeHeightHf * scSec;
    dxf.addRect(sectX - (bfW - sectW) / 2, sectY + sectH - hfH, bfW, hfH, 'A-COFF-CONTOUR', 4);
    dxf.addRect(sectX, sectY, sectW, sectH - hfH, 'A-COFF-CONTOUR', 4);
    dxf.addText(`COUPE A-A (Té ${input.flangeWidthBf}/${B}×${H})`, sectX - 10, sectY + sectH + 8, 2.6, 'A-TEXT-REPE', 7);
  } else {
    dxf.addRect(sectX, sectY, sectW, sectH, 'A-COFF-CONTOUR', 4);
    dxf.addText(`COUPE A-A (${B}×${H} mm)`, sectX, sectY + sectH + 8, 2.6, 'A-TEXT-REPE', 7);
  }

  // Cadre transversal extérieur fermé
  const cSec = C * scSec;
  const stirrupPhiSec = stirrupPhi * scSec;
  dxf.addRect(sectX + cSec, sectY + cSec, sectW - 2 * cSec, sectH - 2 * cSec, 'A-ARMT-TRANS-CADR', 2);

  // ÉTRIER INTÉRIEUR SI ACTIF OU 4 BRINS
  if (output.hasInternalStirrup || output.stirrupLegsCount > 2) {
    const innerW = (sectW - 2 * cSec) * 0.48;
    const innerX = sectX + cSec + ((sectW - 2 * cSec) - innerW) / 2;
    dxf.addRect(innerX, sectY + cSec, innerW, sectH - 2 * cSec, 'A-ARMT-TRANS-CADR', 2);
    dxf.addText('Étriers intérieurs', innerX + innerW / 2, sectY + sectH / 2, 1.7, 'A-TEXT-REPE', 2, 'center');
  }

  // Barres supérieures de montage
  const topRebarY = sectY + sectH - cSec - stirrupPhiSec - (topRebarPhi / 2) * scSec;
  const topStep = (sectW - 2 * (cSec + stirrupPhiSec) - topRebarPhi * scSec) / Math.max(1, topRebarCount - 1);
  for (let t = 0; t < topRebarCount; t++) {
    const bx = sectX + cSec + stirrupPhiSec + (topRebarPhi / 2) * scSec + t * topStep;
    dxf.addCircle(bx, topRebarY, (topRebarPhi / 2) * scSec, 'A-ARMT-LONG-SUP', 3);
  }

  // Tracé des lits multiples inférieurs
  output.layersDetails.forEach((layer) => {
    const yBar = sectY + layer.yPositionMm * scSec;
    const rBar = (layer.diameter / 2) * scSec;
    const stepX = layer.count > 1
      ? (sectW - 2 * (cSec + stirrupPhiSec) - layer.diameter * scSec) / (layer.count - 1)
      : 0;

    for (let j = 0; j < layer.count; j++) {
      const xBar = layer.count > 1
        ? sectX + cSec + stirrupPhiSec + rBar + j * stepX
        : sectX + sectW / 2;
      dxf.addCircle(xBar, yBar, rBar, 'A-ARMT-LONG-INF', 3);
    }
  });

  // Aciers de peau en coupe si h >= 600 mm
  if (output.confinementRules.requiresSkinRebars) {
    const skinYSec = sectY + sectH / 2;
    dxf.addCircle(sectX + cSec + 1.5, skinYSec, 1.5, 'A-ARMT-LONG-SUP', 3);
    dxf.addCircle(sectX + sectW - cSec - 1.5, skinYSec, 1.5, 'A-ARMT-LONG-SUP', 3);
    dxf.addText('Peau', sectX + sectW + 2, skinYSec - 1, 1.8, 'A-TEXT-REPE', 3);
  }

  // Cotes de la coupe
  dxf.addDimension(sectX, sectY, sectX + sectW, sectY, -8, `b = ${B}`);
  dxf.addDimension(sectX + sectW, sectY, sectX + sectW, sectY + sectH, 8, `h = ${H}`, true);
  dxf.addDimension(sectX + sectW, sectY, sectX + sectW, sectY + output.d * scSec, 18, `d = ${output.d}`, true);

  // 3. TABLEAU DE NOMENCLATURE DES ACIERS ISO 3766
  const scheduleRows = output.rebarSchedule.map((bar, idx) => ({
    rep: `#${idx + 1}`,
    role: bar.details || (bar.layerIndex ? `Lit ${bar.layerIndex} Inf.` : bar.layer === 'sup' ? 'Montage Sup.' : 'Cadre/Étrier'),
    countPhi: `${bar.count} HA ${bar.diameter}`,
    unitLen: `${bar.unitLengthM} m`,
    codeIso: bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : bar.shape === 'u_frame' ? 'Code 31 (Cadre)' : 'Code 00 (Droit)',
    weight: `${bar.totalWeightKg} kg`,
  }));

  dxf.addRebarScheduleTable(
    'NOMENCLATURE DÉTAILLÉE DES ACIERS FAÇONNÉS (EN ISO 3766)',
    scheduleRows,
    output.totalSteelWeightKg
  );

  // Cadre de planche A3 et Cartouche ISO 7200 normalisé
  dxf.addNormalizedBorderAndCartouche({
    ...cartouche,
    elementRef: `POUTRE BA ${B}×${H} L=${input.spanL}m`,
  });

  return dxf.buildDxfString();
}

/**
 * 2. Module POTEAUX COMPLEXES 8 FORMES (EN 1992-1-1 §9.5)
 * Multi-cadres (L, T, Croix, Hexagone), élévation avec attentes l0, scrit tête/pied et nomenclature ISO 3766
 */
export function generateColumnDxf(
  input: ColumnInput,
  output: ColumnOutput,
  cartouche: CartoucheData = DEFAULT_CARTOUCHE
): string {
  const dxf = new AdvancedDxfBuilder(cartouche.sheetFormat, cartouche.dxfVersion || 'AC1009');
  const H = input.heightL * 1000;
  const B = input.dimB;
  const l0 = output.lapLengthL0Mm;
  const sCrit = output.spacingCritMm;
  const sCourant = output.spacingCourantMm;
  const zCritH = output.zoneCritHeightMm;
  const C = input.coverC;

  const sc = Math.min(0.042, 130 / (H + l0));
  const colW = B * sc;
  const colH = H * sc;
  const l0Scaled = l0 * sc;

  const scSec = Math.min(0.12, 60 / Math.max(B, input.dimH));
  const sW = B * scSec;
  const sH = input.dimH * scSec;
  const cSc = C * scSec;

  const totalW = colW + 60 + sW + 25;
  const totalH = colH + l0Scaled + 30;

  const originX = 20 + Math.max(20, (390 - totalW) / 2) + 15;
  const originY = 80 + Math.max(15, (205 - totalH) / 2);
  const sectX = originX + colW + 60;
  const sectY = originY + (colH - sH) / 2;

  // 1. ÉLÉVATION TECHNIQUE
  dxf.addRect(originX, originY, colW, colH, 'A-COFF-CONTOUR', 4);
  dxf.addLine(originX + colW / 2, originY - 12, originX + colW / 2, originY + colH + l0Scaled + 12, 'A-COFF-AXES', 1);

  // Armatures longitudinales avec attente l0
  const coverSc = C * sc;
  const bar1X = originX + coverSc;
  const bar2X = originX + colW - coverSc;
  dxf.addLine(bar1X, originY - 10, bar1X, originY + colH + l0Scaled, 'A-ARMT-LONG-INF', 3);
  dxf.addLine(bar2X, originY - 10, bar2X, originY + colH + l0Scaled, 'A-ARMT-LONG-INF', 3);
  dxf.addLine(bar1X, originY - 10, bar1X - 6, originY - 10, 'A-ARMT-LONG-INF', 3);
  dxf.addLine(bar2X, originY - 10, bar2X + 6, originY - 10, 'A-ARMT-LONG-INF', 3);

  if (B > 350 || output.barCount > 4) {
    const midBarX = originX + colW / 2;
    dxf.addLine(midBarX, originY - 10, midBarX, originY + colH + l0Scaled, 'A-ARMT-LONG-SUP', 3);
  }

  // Cadres et frettage (zone critique scrit et zone courante scour)
  const zCritHSc = zCritH * sc;
  const sCritSc = Math.max(2.5, sCrit * sc);
  const sCourSc = Math.max(3.5, sCourant * sc);

  for (let y = originY + 2; y <= originY + zCritHSc; y += sCritSc) {
    dxf.addLine(bar1X, y, bar2X, y, 'A-ARMT-TRANS-CADR', 2);
  }
  for (let y = originY + zCritHSc + sCourSc; y <= originY + colH - zCritHSc; y += sCourSc) {
    dxf.addLine(bar1X, y, bar2X, y, 'A-ARMT-TRANS-CADR', 2);
  }
  for (let y = originY + colH - zCritHSc; y <= originY + colH - 2; y += sCritSc) {
    dxf.addLine(bar1X, y, bar2X, y, 'A-ARMT-TRANS-CADR', 2);
  }

  // Cotes élévation
  dxf.addDimension(originX, originY, originX, originY + colH, -15, `H = ${H} mm`, true);
  dxf.addDimension(bar2X, originY + colH, bar2X, originY + colH + l0Scaled, 12, `Attente l0 = ${l0} mm`, true);

  // 2. SECTION DU POTEAU SELON LES 8 FORMES GÉOMÉTRIQUES & MULTI-CADRES
  dxf.addText(`SECTION DU POTEAU (${output.shapeNameFr.toUpperCase()})`, sectX, sectY + sH + 10, 2.7, 'A-TEXT-REPE', 7);

  if (input.shape === 'circle') {
    const cx = sectX + sW / 2;
    const cy = sectY + sH / 2;
    const rOut = sW / 2;
    const rTie = rOut - cSc;
    dxf.addCircle(cx, cy, rOut, 'A-COFF-CONTOUR', 4);
    dxf.addCircle(cx, cy, rTie, 'A-ARMT-TRANS-CADR', 2);
    // Barres réparties
    const n = Math.max(6, output.barCount);
    for (let i = 0; i < n; i++) {
      const ang = (i * 2 * Math.PI) / n;
      const bx = cx + (rTie - 2) * Math.cos(ang);
      const by = cy + (rTie - 2) * Math.sin(ang);
      dxf.addCircle(bx, by, 1.8, 'A-ARMT-LONG-INF', 3);
    }
  } else if (input.shape === 'hexagon') {
    // Section hexagonale régulière
    const cx = sectX + sW / 2;
    const cy = sectY + sH / 2;
    const rOut = (sW / 2) / Math.cos(Math.PI / 6);
    const rTie = rOut - cSc;

    // Contour béton hexagonal (6 côtés)
    for (let i = 0; i < 6; i++) {
      const a1 = (i * 60 * Math.PI) / 180;
      const a2 = (((i + 1) % 6) * 60 * Math.PI) / 180;
      dxf.addLine(cx + rOut * Math.cos(a1), cy + rOut * Math.sin(a1), cx + rOut * Math.cos(a2), cy + rOut * Math.sin(a2), 'A-COFF-CONTOUR', 4);
      // Cadre hexagonal fermé
      dxf.addLine(cx + rTie * Math.cos(a1), cy + rTie * Math.sin(a1), cx + rTie * Math.cos(a2), cy + rTie * Math.sin(a2), 'A-ARMT-TRANS-CADR', 2);
      // 6 barres d'angle
      dxf.addCircle(cx + (rTie - 2) * Math.cos(a1), cy + (rTie - 2) * Math.sin(a1), 1.8, 'A-ARMT-LONG-INF', 3);
    }
    dxf.addText('Cadre hexagonal 6 pans', cx, cy - 2, 1.8, 'A-TEXT-REPE', 2, 'center');
  } else if (input.shape === 'L') {
    // Section en L : Nécessite 2 cadres rectangulaires avec recouvrement en angle
    const tSc = (input.dimT || 150) * scSec;
    // Contour béton en L
    dxf.addLine(sectX, sectY, sectX + sW, sectY, 'A-COFF-CONTOUR', 4);
    dxf.addLine(sectX + sW, sectY, sectX + sW, sectY + tSc, 'A-COFF-CONTOUR', 4);
    dxf.addLine(sectX + sW, sectY + tSc, sectX + tSc, sectY + tSc, 'A-COFF-CONTOUR', 4);
    dxf.addLine(sectX + tSc, sectY + tSc, sectX + tSc, sectY + sH, 'A-COFF-CONTOUR', 4);
    dxf.addLine(sectX + tSc, sectY + sH, sectX, sectY + sH, 'A-COFF-CONTOUR', 4);
    dxf.addLine(sectX, sectY + sH, sectX, sectY, 'A-COFF-CONTOUR', 4);

    // Cadre 1 (aile horizontale)
    dxf.addRect(sectX + cSc, sectY + cSc, sW - 2 * cSc, tSc - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
    // Cadre 2 (aile verticale) avec chevauchement en angle
    dxf.addRect(sectX + cSc, sectY + cSc, tSc - 2 * cSc, sH - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
    dxf.addText('Cadres 1 & 2 croisés', sectX + tSc + 4, sectY + tSc + 4, 1.8, 'A-TEXT-REPE', 2);

    // Barres
    dxf.addCircle(sectX + cSc + 2, sectY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + sW - cSc - 2, sectY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + sW - cSc - 2, sectY + tSc - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + tSc - cSc - 2, sectY + tSc - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + tSc - cSc - 2, sectY + sH - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + cSc + 2, sectY + sH - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
  } else if (input.shape === 'T') {
    // Section en T : 2 cadres rectangulaires (table et âme pénétrante)
    const tSc = (input.dimT || 150) * scSec;
    const flgX = sectX;
    const flgY = sectY + sH - tSc;
    const webX = sectX + (sW - tSc) / 2;

    // Coffrage en T
    dxf.addLine(flgX, flgY, flgX + sW, flgY, 'A-COFF-CONTOUR', 4);
    dxf.addLine(flgX + sW, flgY, flgX + sW, sectY + sH, 'A-COFF-CONTOUR', 4);
    dxf.addLine(flgX + sW, sectY + sH, flgX, sectY + sH, 'A-COFF-CONTOUR', 4);
    dxf.addLine(flgX, sectY + sH, flgX, flgY, 'A-COFF-CONTOUR', 4);
    dxf.addLine(webX, sectY, webX + tSc, sectY, 'A-COFF-CONTOUR', 4);
    dxf.addLine(webX + tSc, sectY, webX + tSc, flgY, 'A-COFF-CONTOUR', 4);
    dxf.addLine(webX, flgY, webX, sectY, 'A-COFF-CONTOUR', 4);

    // Cadre 1 : Table horizontale
    dxf.addRect(flgX + cSc, flgY + cSc, sW - 2 * cSc, tSc - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
    // Cadre 2 : Âme verticale pénétrant la table
    dxf.addRect(webX + cSc, sectY + cSc, tSc - 2 * cSc, sH - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
    dxf.addText('Cadres 1 & 2 (Table + Âme)', sectX + 2, sectY - 4, 1.8, 'A-TEXT-REPE', 2);

    // Barres principales
    dxf.addCircle(flgX + cSc + 2, flgY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(flgX + sW - cSc - 2, flgY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(flgX + cSc + 2, sectY + sH - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(flgX + sW - cSc - 2, sectY + sH - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(webX + cSc + 2, sectY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(webX + tSc - cSc - 2, sectY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
  } else if (input.shape === 'cross') {
    // Section en Croix (+) : 2 cadres rectangulaires croisés orthogonaux
    const tSc = (input.dimT || 150) * scSec;
    const midX = sectX + (sW - tSc) / 2;
    const midY = sectY + (sH - tSc) / 2;

    // Cadre 1 (rectangle vertical)
    dxf.addRect(midX + cSc, sectY + cSc, tSc - 2 * cSc, sH - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
    // Cadre 2 (rectangle horizontal)
    dxf.addRect(sectX + cSc, midY + cSc, sW - 2 * cSc, tSc - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);

    // Coffrage croix
    dxf.addRect(midX, sectY, tSc, sH, 'A-COFF-CONTOUR', 4);
    dxf.addRect(sectX, midY, sW, tSc, 'A-COFF-CONTOUR', 4);
    dxf.addText('2 Cadres croisés (+)', sectX + 2, sectY - 4, 1.8, 'A-TEXT-REPE', 2);
  } else {
    // Rectangulaire ou tubulaire / trapézoïdal
    dxf.addRect(sectX, sectY, sW, sH, 'A-COFF-CONTOUR', 4);
    dxf.addRect(sectX + cSc, sectY + cSc, sW - 2 * cSc, sH - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
    if (output.cadresCountPerSet > 1) {
      const innerW = (sW - 2 * cSc) * 0.5;
      dxf.addRect(sectX + cSc + innerW / 2, sectY + cSc, innerW, sH - 2 * cSc, 'A-ARMT-TRANS-CADR', 2);
      dxf.addText('Étrier intérieur', sectX + sW / 2, sectY + sH / 2, 1.7, 'A-TEXT-REPE', 2, 'center');
    }
    // Barres 4 coins
    dxf.addCircle(sectX + cSc + 2, sectY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + sW - cSc - 2, sectY + cSc + 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + cSc + 2, sectY + sH - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
    dxf.addCircle(sectX + sW - cSc - 2, sectY + sH - cSc - 2, 1.8, 'A-ARMT-LONG-INF', 3);
  }

  dxf.addText(output.rebarArrangement, sectX, sectY - 8, 2.4, 'A-TEXT-REPE', 3);

  // 3. TABLEAU DE NOMENCLATURE DES ACIERS ISO 3766
  const scheduleRows = output.rebarSchedule.map((bar, idx) => ({
    rep: `#${idx + 1}`,
    role: bar.details,
    countPhi: `${bar.count} HA ${bar.diameter}`,
    unitLen: `${bar.unitLengthM} m`,
    codeIso: bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : bar.shape === 'u_frame' ? 'Code 31 (Cadre)' : 'Code 00 (Droit)',
    weight: `${bar.totalWeightKg} kg`,
  }));

  dxf.addRebarScheduleTable(
    'NOMENCLATURE DÉTAILLÉE DES ACIERS (EN ISO 3766)',
    scheduleRows,
    output.steelWeightKg
  );

  // Cadre et cartouche
  dxf.addNormalizedBorderAndCartouche({
    ...cartouche,
    elementRef: `POTEAU ${output.shapeNameFr.toUpperCase()} ${B}×${input.dimH}`,
  });

  return dxf.buildDxfString();
}

/**
 * 3. Module DALLES ET PLANCHERS (EN 1992-1-1 §9.3)
 * Mise en page A3, armatures transversales de répartition explicites et nomenclature ISO 3766
 */
export function generateSlabDxf(
  input: SlabInput,
  output: SlabOutput,
  cartouche: CartoucheData = DEFAULT_CARTOUCHE
): string {
  const dxf = new AdvancedDxfBuilder(cartouche.sheetFormat, cartouche.dxfVersion || 'AC1009');
  const Lx = input.spanLx * 1000;
  const Ly = input.spanLy * 1000;
  const h = input.thicknessH;

  const sc = Math.min(0.024, 130 / Math.max(Lx, Ly));
  const planW = Lx * sc;
  const planH = Ly * sc;

  const secW = 140;
  const secH = Math.max(22, h * 0.15);

  const totalW = planW + 45 + secW;
  const totalH = Math.max(planH, secH) + 35;

  const originX = 20 + Math.max(15, (390 - totalW) / 2);
  const originY = 80 + Math.max(15, (205 - totalH) / 2);
  const secX = originX + planW + 45;
  const secY = originY + (planH - secH) / 2;

  // 1. VUE EN PLAN DE DALLE
  dxf.addRect(originX, originY, planW, planH, 'A-COFF-CONTOUR', 4);
  dxf.addText(`PLAN DE COFFRAGE & FERRAILLAGE DALLE (h = ${h} mm)`, originX, originY + planH + 8, 2.6, 'A-TEXT-REPE', 7);

  // Nappe principale X
  const stepX = 200 * sc;
  for (let x = originX + stepX; x < originX + planW; x += stepX * 2) {
    dxf.addLine(x, originY, x, originY + planH, 'A-ARMT-LONG-INF', 3);
  }

  // Armatures de répartition transversale Y
  for (let y = originY + stepX; y < originY + planH; y += stepX * 2) {
    dxf.addLine(originX, y, originX + planW, y, 'A-ARMT-TRANS-CADR', 2);
  }

  // Chapeaux sur rives et armatures en U de bord libre
  const chapLen = Math.min(planW * 0.2, 25);
  dxf.addLine(originX, originY + 15, originX + chapLen, originY + 15, 'A-ARMT-ANCR', 6);
  dxf.addLine(originX + planW - chapLen, originY + 15, originX + planW, originY + 15, 'A-ARMT-ANCR', 6);
  dxf.addText('Chapeaux de rive', originX + 5, originY + 20, 2.0, 'A-TEXT-REPE', 6);

  // Cotes de la dalle
  dxf.addDimension(originX, originY, originX + planW, originY, -14, `Lx = ${Lx} mm`);
  dxf.addDimension(originX, originY, originX, originY + planH, -14, `Ly = ${Ly} mm`, true);

  // 2. COUPE TRANSVERSALE SUR ÉPAISSEUR
  dxf.addRect(secX, secY, secW, secH, 'A-COFF-CONTOUR', 4);
  dxf.addText(`COUPE SUR ÉPAISSEUR (h = ${h} mm)`, secX, secY + secH + 5, 2.3, 'A-TEXT-REPE', 7);

  // Nappe principale inférieure X
  dxf.addLine(secX + 5, secY + 4, secX + secW - 5, secY + 4, 'A-ARMT-LONG-INF', 3);
  // Armatures de répartition transversale Y (cercles)
  for (let px = secX + 12; px < secX + secW - 10; px += 18) {
    dxf.addCircle(px, secY + 7, 1.2, 'A-ARMT-TRANS-CADR', 2);
  }
  // Chapeaux supérieurs
  dxf.addLine(secX + 5, secY + secH - 4, secX + 35, secY + secH - 4, 'A-ARMT-ANCR', 6);
  dxf.addLine(secX + secW - 35, secY + secH - 4, secX + secW - 5, secY + secH - 4, 'A-ARMT-ANCR', 6);

  // U de rive de bord libre
  dxf.addLine(secX + 4, secY + 4, secX + 4, secY + secH - 4, 'A-ARMT-TRANS-CADR', 2);
  dxf.addLine(secX + secW - 4, secY + 4, secX + secW - 4, secY + secH - 4, 'A-ARMT-TRANS-CADR', 2);

  dxf.addDimension(secX + secW, secY, secX + secW, secY + secH, 8, `h = ${h}`, true);

  // 3. TABLEAU DE NOMENCLATURE DES ACIERS ISO 3766
  const scheduleRows = output.rebarSchedule.map((bar, idx) => ({
    rep: `#${idx + 1}`,
    role: bar.details,
    countPhi: `${bar.count} HA ${bar.diameter}`,
    unitLen: `${bar.unitLengthM} m`,
    codeIso: bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : bar.shape === 'u_frame' ? 'Code 31 (Cadre/U)' : 'Code 00 (Droit)',
    weight: `${bar.totalWeightKg} kg`,
  }));

  dxf.addRebarScheduleTable(
    'NOMENCLATURE DÉTAILLÉE DES ACIERS DALLE (EN ISO 3766)',
    scheduleRows,
    output.totalSteelWeightKg
  );

  // Cadre et cartouche
  dxf.addNormalizedBorderAndCartouche({
    ...cartouche,
    elementRef: `DALLE PLEINE h=${h}mm Lx=${input.spanLx}m Ly=${input.spanLy}m`,
  });

  return dxf.buildDxfString();
}

/**
 * 4. Module FONDATIONS - SEMELLES ISOLÉES (EN 1992-1-1 & DTU 13.12)
 * Armatures croisées, retours d'ancrage, attentes poteau et nomenclature ISO 3766
 */
export function generateFootingDxf(
  input: FootingInput,
  output: FootingOutput,
  cartouche: CartoucheData = DEFAULT_CARTOUCHE
): string {
  const dxf = new AdvancedDxfBuilder(cartouche.sheetFormat, cartouche.dxfVersion || 'AC1009');
  const A = input.dimA;
  const B = input.dimB;
  const H = input.dimH;
  const colA = input.colA;
  const colB = input.colB;

  const sc = Math.min(0.045, 130 / Math.max(A, B));
  const ftgW = A * sc;
  const ftgH = H * sc;
  const colW = colA * sc;

  const pW = A * sc * 0.85;
  const pH = B * sc * 0.85;

  const totalW = ftgW + 45 + pW;
  const totalH = Math.max(ftgH + 35, pH) + 35;

  const originX = 20 + Math.max(15, (390 - totalW) / 2);
  const originY = 80 + Math.max(15, (205 - totalH) / 2);
  const planX = originX + ftgW + 45;
  const planY = originY;

  // 1. COUPE ÉLÉVATION VERTICALE
  dxf.addRect(originX, originY, ftgW, ftgH, 'A-COFF-CONTOUR', 4);
  dxf.addText(`COUPE ÉLÉVATION SEMELLE (${A} × ${B} × ${H} mm)`, originX, originY + ftgH + 35, 2.5, 'A-TEXT-REPE', 7);

  // Amorce du poteau supérieur
  const colX = originX + (ftgW - colW) / 2;
  dxf.addRect(colX, originY + ftgH, colW, 25, 'A-COFF-CONTOUR', 4);

  // Nappe de ferraillage principale A
  const rebarY = originY + input.coverC * sc;
  dxf.addLine(originX + 6, rebarY, originX + ftgW - 6, rebarY, 'A-ARMT-LONG-INF', 3);

  // Armatures de répartition transversale B (cercles au-dessus de la nappe A)
  for (let bx = originX + 14; bx < originX + ftgW - 10; bx += 16) {
    dxf.addCircle(bx, rebarY + 3, 1.2, 'A-ARMT-TRANS-CADR', 2);
  }

  // Crochets de relevage terminaux si patin < lbd
  if (!output.isStraightAnchorageSufficientA) {
    dxf.addLine(originX + 6, rebarY, originX + 6, rebarY + 15, 'A-ARMT-ANCR', 6);
    dxf.addLine(originX + ftgW - 6, rebarY, originX + ftgW - 6, rebarY + 15, 'A-ARMT-ANCR', 6);
    dxf.addText('Crochets 90° requis (Patin < lbd)', originX + 10, rebarY + 18, 1.8, 'A-TEXT-REPE', 6);
  }

  // Attentes poteau
  dxf.addLine(colX + 4, originY + ftgH + 20, colX + 4, rebarY + 4, 'A-ARMT-ANCR', 6);
  dxf.addLine(colX + 4, rebarY + 4, colX - 8, rebarY + 4, 'A-ARMT-ANCR', 6);
  dxf.addLine(colX + colW - 4, originY + ftgH + 20, colX + colW - 4, rebarY + 4, 'A-ARMT-ANCR', 6);
  dxf.addLine(colX + colW - 4, rebarY + 4, colX + colW + 8, rebarY + 4, 'A-ARMT-ANCR', 6);

  // Cotes
  dxf.addDimension(originX, originY, originX + ftgW, originY, -14, `A = ${A} mm`);
  dxf.addDimension(originX, originY, originX, originY + ftgH, -12, `H = ${H}`, true);

  // 2. VUE EN PLAN
  dxf.addRect(planX, planY, pW, pH, 'A-COFF-CONTOUR', 4);
  const pcW = colA * sc * 0.85;
  const pcH = colB * sc * 0.85;
  dxf.addRect(planX + (pW - pcW) / 2, planY + (pH - pcH) / 2, pcW, pcH, 'A-COFF-CONTOUR', 8);
  dxf.addText(`VUE EN PLAN (${A} × ${B})`, planX, planY + pH + 6, 2.3, 'A-TEXT-REPE', 7);

  // 3. TABLEAU DE NOMENCLATURE DES ACIERS ISO 3766
  const scheduleRows = output.rebarSchedule.map((bar, idx) => ({
    rep: `#${idx + 1}`,
    role: bar.details,
    countPhi: `${bar.count} HA ${bar.diameter}`,
    unitLen: `${bar.unitLengthM} m`,
    codeIso: bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : 'Code 00 (Droit)',
    weight: `${bar.totalWeightKg} kg`,
  }));

  dxf.addRebarScheduleTable(
    'NOMENCLATURE DÉTAILLÉE DES ACIERS FONDATION (EN ISO 3766)',
    scheduleRows,
    output.totalSteelWeightKg
  );

  // Cadre et cartouche
  dxf.addNormalizedBorderAndCartouche({
    ...cartouche,
    elementRef: `SEMELLE ISOLÉE ${A}×${B}×${H}mm`,
  });

  return dxf.buildDxfString();
}

/**
 * 5. Module POUTRES MIXTES ACIER-BÉTON (EN 1994-1-1 - EC4)
 * Connecteurs Nelson, armatures transversales anti-fendage et nomenclature ISO 3766
 */
export function generateCompositeDxf(
  input: CompositeInput,
  output: CompositeOutput,
  cartouche: CartoucheData = DEFAULT_CARTOUCHE
): string {
  const dxf = new AdvancedDxfBuilder(cartouche.sheetFormat, cartouche.dxfVersion || 'AC1009');
  const prof = output.profile;
  const hc = input.slabThicknessHc;
  const beff = input.beffWidth;

  const sc = Math.min(0.08, 120 / Math.max(prof.h + hc, beff * 0.25));
  const slabW = Math.min(160, beff * sc * 0.35);
  const slabH = hc * sc;
  const profH = prof.h * sc;
  const profB = prof.b * sc;
  const profTw = prof.tw * sc;
  const profTf = prof.tf * sc;

  const elevW = 150;
  const totalW = slabW + 45 + elevW;
  const totalH = profH + slabH + 40;

  const originX = 20 + Math.max(15, (390 - totalW) / 2);
  const originY = 80 + Math.max(15, (205 - totalH) / 2);
  const elevX = originX + slabW + 45;
  const elevY = originY + 15;

  // 1. COUPE TRANSVERSALE MIXTE
  dxf.addRect(originX - (slabW - profB) / 2, originY + profH, slabW, slabH, 'A-COFF-CONTOUR', 4);
  dxf.addText(`Dalle béton participante beff = ${beff} mm (hc = ${hc} mm)`, originX - 20, originY + profH + slabH + 8, 2.5, 'A-TEXT-REPE', 7);

  // Aciers transversaux de dalle anti-fendage
  const rebarY = originY + profH + slabH / 2;
  dxf.addLine(originX - (slabW - profB) / 2 + 5, rebarY, originX + (slabW + profB) / 2 - 5, rebarY, 'A-ARMT-TRANS-CADR', 2);
  dxf.addText(`Aciers anti-fendage : ${output.providedTransverseRebars}`, originX - 15, rebarY + 2.5, 2.0, 'A-TEXT-REPE', 2);

  // Profilé acier laminé
  dxf.addRect(originX, originY + profH - profTf, profB, profTf, 'A-COFF-CONTOUR', 8);
  dxf.addRect(originX + (profB - profTw) / 2, originY + profTf, profTw, profH - 2 * profTf, 'A-COFF-CONTOUR', 8);
  dxf.addRect(originX, originY, profB, profTf, 'A-COFF-CONTOUR', 8);
  dxf.addText(`Profilé ${prof.name} (S355)`, originX + profB + 8, originY + profH / 2, 2.8, 'A-TEXT-REPE', 7);

  // Goujons Nelson soudés
  const studHSc = input.studHeightH * sc;
  dxf.addLine(originX + profB / 2, originY + profH, originX + profB / 2, originY + profH + studHSc, 'A-ARMT-ANCR', 6);
  dxf.addCircle(originX + profB / 2, originY + profH + studHSc, 2, 'A-ARMT-ANCR', 6);
  dxf.addText(`Goujons Nelson Ø${input.studDiameterD} s=${output.spacingCalculatedMm}mm`, originX + profB / 2 + 6, originY + profH + 6, 2.0, 'A-TEXT-REPE', 6);

  // Cotes
  dxf.addDimension(originX, originY, originX + profB, originY, -10, `b = ${prof.b}`);
  dxf.addDimension(originX + profB, originY, originX + profB, originY + profH, 10, `h = ${prof.h}`, true);

  // 2. VUE ÉLÉVATION
  dxf.addRect(elevX, elevY, elevW, profH, 'A-COFF-CONTOUR', 8);
  dxf.addRect(elevX, elevY + profH, elevW, slabH, 'A-COFF-CONTOUR', 4);
  dxf.addText(`ÉLÉVATION MIXTE L = ${input.spanL} m`, elevX, elevY + profH + slabH + 6, 2.3, 'A-TEXT-REPE', 7);

  // Répartition des connecteurs
  for (let sx = elevX + 10; sx < elevX + elevW - 5; sx += 20) {
    dxf.addLine(sx, elevY + profH, sx, elevY + profH + studHSc, 'A-ARMT-ANCR', 6);
    dxf.addCircle(sx, elevY + profH + studHSc, 1.5, 'A-ARMT-ANCR', 6);
  }

  // 3. TABLEAU DE NOMENCLATURE DES COMPOSANTS ET ACIERS
  const totalStuds = output.totalStudsRequiredPerHalfSpan * 2;
  const compositeRows = [
    {
      rep: '#1',
      role: `Poutre acier ${prof.name}`,
      countPhi: `1 profilé L=${input.spanL}m`,
      unitLen: `${input.spanL} m`,
      codeIso: 'Profilé laminé S355',
      weight: `${(prof.massKgM * input.spanL).toFixed(1)} kg`,
    },
    {
      rep: '#2',
      role: 'Connecteurs Goujons Nelson',
      countPhi: `${totalStuds} × Ø${input.studDiameterD}`,
      unitLen: `${input.studHeightH} mm`,
      codeIso: 'Goujon tête forgée',
      weight: `${(totalStuds * 0.28).toFixed(1)} kg`,
    },
    {
      rep: '#3',
      role: 'Armatures transversales anti-fendage',
      countPhi: `${Math.ceil(input.spanL * 1000 / 150)} × HA 10`,
      unitLen: `${(input.beffWidth / 1000).toFixed(2)} m`,
      codeIso: 'Code 00 (Droit)',
      weight: `${(Math.ceil(input.spanL * 1000 / 150) * (input.beffWidth / 1000) * 0.617).toFixed(1)} kg`,
    },
  ];

  dxf.addRebarScheduleTable(
    'NOMENCLATURE COMPOSANTS & ACIERS MIXTES (EN ISO 3766)',
    compositeRows
  );

  // Cadre et cartouche
  dxf.addNormalizedBorderAndCartouche({
    ...cartouche,
    elementRef: `POUTRE MIXTE ${prof.name} + DALLE ${hc}mm L=${input.spanL}m`,
  });

  return dxf.buildDxfString();
}
