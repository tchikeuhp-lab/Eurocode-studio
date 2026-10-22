/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Poteaux Complexes 8 Formes (EN 1992-1-1 §5.8 & §6.1 & §9.5)
 * Formes : Rectangulaire, Circulaire, En L, En T, En Croix (+), Creux, Trapézoïdal, Hexagonal
 * Intègre le flambement au 2nd ordre, multi-cadres (L, T, Croix, Hexagone), frettage resserré scrit,
 * attentes l0 et nomenclature ISO 3766 complète.
 */

import { ConcreteGrade, RebarGrade, STRUCTURAL_STEEL_GRADES, TIMBER_GRADES } from './materials.ts';
import { STEEL_PROFILES } from './ec4_composite.ts';
import {
  calculateAnchorage,
  BondCondition,
  AnchorageType,
  AnchorageResults
} from './ec2_anchorage.ts';

export type ColumnMaterial = 'concrete' | 'steel' | 'timber';
export type ColumnShape = 'rect' | 'circle' | 'L' | 'T' | 'cross' | 'hollow' | 'trapezoid' | 'hexagon';

export interface SteelColumnOutput {
  profileName: string;
  areaCm2: number;
  iyCm4: number;
  izCm4: number;
  lambdaY: number;
  lambdaZ: number;
  chiMin: number;
  NbRdKN: number;
  axialRatio: number;
  isCompliant: boolean;
}

export interface TimberColumnOutput {
  gradeName: string;
  widthB: number;
  heightH: number;
  areaCm2: number;
  lambda: number;
  kc: number;
  fc0dMPa: number;
  sigmaC0dMPa: number;
  axialRatio: number;
  isCompliant: boolean;
}

export interface ColumnInput {
  material?: ColumnMaterial;  // 'concrete' | 'steel' | 'timber'
  shape: ColumnShape;
  heightL: number;           // Hauteur libre en m (ex: 3.2 m)
  endCondition: 'pinned_pinned' | 'fixed_pinned' | 'fixed_fixed' | 'cantilever';
  
  // Dimensions selon forme (en mm)
  dimB: number;              // Largeur b, diamètre ou entreplats (mm)
  dimH: number;              // Hauteur h (mm)
  dimT: number;              // Épaisseur ailes ou paroi tube (mm)
  dimB2?: number;            // Petite base pour trapèze (mm)
  
  coverC: number;            // Enrobage cnom en mm (ex: 30 mm)
  
  // Sollicitations de calcul
  axialNEd: number;          // Effort normal de compression NEd en kN (ex: 850 kN)
  momentMEd: number;         // Moment fléchissant de calcul MEd en kNm (ex: 45 kNm)
  
  // Paramètres d'attente et recouvrement
  bondCondition: BondCondition;
  anchorageType: AnchorageType;
  overlapPercent: 25 | 33 | 50 | 100;

  // Choix personnalisés des armatures béton
  customRebarPhi?: number;   // Diamètre des barres longitudinales (12, 14, 16, 20, 25, 32 mm)
  customBarCount?: number;   // Nombre total de barres longitudinales
  customTiePhi?: number;     // Diamètre des cadres/étriers (6, 8, 10, 12 mm)

  // Paramètres spécifiques Acier & Bois
  steelProfileKey?: string;  // 'HEA 240', 'HEB 260', etc.
  steelGradeKey?: string;    // 'S235', 'S275', 'S355'
  timberWidthB?: number;     // Section rectangulaire bois b (mm)
  timberHeightH?: number;    // Section rectangulaire bois h (mm)
  timberGradeKey?: string;   // 'C18', 'C24', 'C30', 'GL24h', 'GL28h'
}

export interface ColumnRebarBar {
  count: number;
  diameter: number;
  layer: 'longitudinal' | 'tie';
  shape: 'straight' | 'hooked' | 'u_frame';
  unitLengthM: number;
  totalWeightKg: number;
  details: string;
}

export interface ColumnOutput {
  material: ColumnMaterial;
  shape: ColumnShape;
  shapeNameFr: string;
  steelColumn?: SteelColumnOutput;
  timberColumn?: TimberColumnOutput;
  actAreaCm2: number;        // Section de béton Ac en cm2
  perimeterMm: number;
  iRadiusOfGyrationMm: number; // Rayon de giration minimal i en mm
  bucklingLengthL0M: number; // Longueur de flambement l0 en m
  slendernessLambda: number; // Élancement lambda = l0 / i
  slendernessLimitLambdaLim: number; // Élancement limite lambda,lim
  isSecondOrderRequired: boolean;
  
  // Excentricités
  e0Mm: number;              // 1er ordre e0 = MEd / NEd
  eiMm: number;              // Imperfections ei = theta0 * l0 / 2
  e2Mm: number;              // 2nd ordre e2
  etotMm: number;            // Excentricité totale de calcul
  mEdTotKNm: number;         // Moment total majoré du 2nd ordre
  
  // Armatures requises & réelles
  asMinCm2: number;
  asMaxCm2: number;
  asRqdCm2: number;
  asProvidedCm2: number;
  rebarArrangement: string;  // ex: "8 HA 16"
  barDiameterPhi: number;
  barCount: number;
  tieDiameterPhi: number;
  cadresCountPerSet: number; // Nombre de cadres/étriers par niveau (1, 2)
  cadresDescription: string;
  
  // Attentes & Dispositions constructives
  anchorage: AnchorageResults;
  lapLengthL0Mm: number;     // Surlongueur d'attente pour recouvrement l0
  totalBarLengthM: number;   // Hauteur poteau + l0
  spacingCourantMm: number;  // Espacement courant des cadres
  spacingCritMm: number;     // Espacement resserré en zone de frettage tête/pied (<= 150 mm)
  zoneCritHeightMm: number;  // Hauteur de la zone critique h_crit = max(h, l0/6, 500 mm)
  frettageDescription: string;
  
  // Ratio de résistance et utilisation
  capacityRatio: number;     // Taux de travail NEd / NRd
  isSafe: boolean;
  concreteVolumeM3: number;
  steelWeightKg: number;
  
  // Nomenclature d'aciers ISO 3766
  rebarSchedule: ColumnRebarBar[];
}

export function calculateColumn(
  input: ColumnInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): ColumnOutput {
  const { shape, heightL, endCondition, dimB, dimH, dimT, coverC } = input;
  
  // Facteur de longueur efficace de flambement beta
  let beta = 1.0;
  if (endCondition === 'pinned_pinned') beta = 1.0;
  else if (endCondition === 'fixed_pinned') beta = 0.7;
  else if (endCondition === 'fixed_fixed') beta = 0.5;
  else if (endCondition === 'cantilever') beta = 2.0;
  
  const bucklingLengthL0M = +(heightL * beta).toFixed(2);
  const l0Mm = bucklingLengthL0M * 1000;
  
  // Calcul section Ac, périmètre et inertie I min selon forme (8 formes)
  let acMm2 = 0;
  let iMinMm = 0;
  let perimeterMm = 0;
  let shapeNameFr = '';
  let defaultMinBars = 4;
  let cadresCountPerSet = 1;
  let cadresDescription = '1 cadre périphérique fermé';
  
  switch (shape) {
    case 'circle': {
      shapeNameFr = 'Circulaire Plein';
      const r = dimB / 2;
      acMm2 = Math.PI * r * r;
      perimeterMm = +(Math.PI * dimB).toFixed(0);
      iMinMm = dimB / 4;
      defaultMinBars = 6;
      cadresDescription = '1 frette circulaire fermée';
      break;
    }
    case 'hexagon': {
      shapeNameFr = 'Hexagonal Régulier';
      // dimB = cote entreplats (width across flats)
      // Côté a = dimB / sqrt(3)
      const a = dimB / Math.sqrt(3);
      acMm2 = (3 * Math.sqrt(3) / 2) * a * a;
      perimeterMm = +(6 * a).toFixed(0);
      // Rayon de giration i = sqrt(5/24) * a = 0.4564 * a = 0.2635 * dimB
      iMinMm = Math.sqrt(5 / 24) * a;
      defaultMinBars = 6;
      cadresDescription = '1 cadre hexagonal fermé à 6 pans';
      break;
    }
    case 'L': {
      shapeNameFr = 'En L (Cornière BA)';
      const t = dimT || 150;
      acMm2 = dimB * t + (dimH - t) * t;
      perimeterMm = 2 * (dimB + dimH);
      iMinMm = 0.28 * Math.min(dimB, dimH);
      defaultMinBars = 8;
      cadresCountPerSet = 2;
      cadresDescription = '2 cadres rectangulaires avec chevauchement en angle';
      break;
    }
    case 'T': {
      shapeNameFr = 'En Té';
      const t = dimT || 150;
      acMm2 = dimB * t + (dimH - t) * t;
      perimeterMm = 2 * dimB + 2 * dimH;
      iMinMm = 0.26 * Math.min(dimB, dimH);
      defaultMinBars = 8;
      cadresCountPerSet = 2;
      cadresDescription = '2 cadres rectangulaires (table et âme pénétrante)';
      break;
    }
    case 'cross': {
      shapeNameFr = 'En Croix (+)';
      const t = dimT || 150;
      acMm2 = dimB * t + (dimH - t) * t;
      perimeterMm = 4 * (dimB / 2) + 4 * (dimH / 2);
      iMinMm = 0.25 * Math.min(dimB, dimH);
      defaultMinBars = 8;
      cadresCountPerSet = 2;
      cadresDescription = '2 cadres rectangulaires croisés orthogonaux';
      break;
    }
    case 'hollow': {
      shapeNameFr = 'Creux Tubulaire';
      const t = dimT || 80;
      const bInt = Math.max(10, dimB - 2 * t);
      const hInt = Math.max(10, dimH - 2 * t);
      acMm2 = dimB * dimH - bInt * hInt;
      perimeterMm = 2 * (dimB + dimH) + 2 * (bInt + hInt);
      iMinMm = 0.35 * Math.min(dimB, dimH);
      defaultMinBars = 8;
      cadresCountPerSet = 2;
      cadresDescription = '2 cadres périphériques (extérieur + intérieur)';
      break;
    }
    case 'trapezoid': {
      shapeNameFr = 'Trapézoïdal';
      const b2 = input.dimB2 || dimB * 0.7;
      acMm2 = ((dimB + b2) / 2) * dimH;
      perimeterMm = dimB + b2 + 2 * Math.sqrt(dimH * dimH + Math.pow((dimB - b2) / 2, 2));
      iMinMm = 0.28 * Math.min(dimB, dimH);
      defaultMinBars = 4;
      cadresDescription = '1 cadre trapézoïdal fermé';
      break;
    }
    case 'rect':
    default: {
      shapeNameFr = 'Rectangulaire Standard';
      acMm2 = dimB * dimH;
      perimeterMm = 2 * (dimB + dimH);
      iMinMm = Math.min(dimB, dimH) / Math.sqrt(12);
      defaultMinBars = 4;
      if (dimB > 350 || dimH > 350) {
        cadresCountPerSet = 2;
        cadresDescription = '1 cadre périphérique + 1 étrier intérieur de renfort';
      }
      break;
    }
  }
  
  const actAreaCm2 = +(acMm2 / 100).toFixed(1);
  const concreteVolumeM3 = +((acMm2 / 1e6) * heightL).toFixed(3);
  
  // Élancement lambda = l0 / i
  const slendernessLambda = +(l0Mm / iMinMm).toFixed(1);
  // lambda,lim = 20 * A * B * C / sqrt(n)
  const nRelative = (input.axialNEd * 1000) / (acMm2 * concrete.fcd);
  const lambdaLim = +(20 * 0.7 * 1.1 * 0.7 / Math.sqrt(Math.max(0.01, nRelative))).toFixed(1);
  const isSecondOrderRequired = slendernessLambda > lambdaLim;
  
  // Excentricités
  const e0Mm = input.axialNEd > 0 ? (input.momentMEd * 1e6) / (input.axialNEd * 1000) : 0;
  // Imperfection géométrique ei = theta0 * l0 / 2 (avec theta0 = 1/200)
  const eiMm = l0Mm / 400;
  // 2nd ordre e2 (méthode de la courbure simplifiée si requis)
  let e2Mm = 0;
  if (isSecondOrderRequired) {
    const kr = Math.min(1.0, (1 + 0.1) / (1 + nRelative));
    const kPhi = 1.0;
    const dUseful = dimH - coverC - 10;
    const epsYd = rebar.fyd / rebar.Es;
    const curvature1OverR = kr * kPhi * (epsYd / (0.45 * dUseful));
    e2Mm = (1 / 10) * curvature1OverR * l0Mm * l0Mm;
  }
  
  const etotMm = +(Math.max(e0Mm + eiMm + e2Mm, 20)).toFixed(1); // minimum 20 mm selon EC2 §6.1(4)
  const mEdTotKNm = +((input.axialNEd * etotMm) / 1000).toFixed(1);
  
  // Sections d'armatures réglementaires
  // As,min = max(0.10 * NEd / fyd, 0.002 * Ac) (EC2 §9.5.2)
  const asMinMm2 = Math.max(
    (0.10 * input.axialNEd * 1000) / rebar.fyd,
    0.002 * acMm2
  );
  // As,max = 0.04 * Ac (hors zone de recouvrement)
  const asMaxMm2 = 0.04 * acMm2;
  
  // Estimation armature requise par diagramme d'interaction approché
  const nEdN = input.axialNEd * 1000;
  const fcd = concrete.fcd;
  const fyd = rebar.fyd;
  
  // Capacité béton seul centré
  const nRdConcrete = acMm2 * fcd;
  let asRqdMm2 = 0;
  if (nEdN > 0.8 * nRdConcrete || mEdTotKNm > 20) {
    const deltaN = Math.max(0, nEdN - 0.7 * nRdConcrete);
    const deltaM = mEdTotKNm * 1e6;
    const asFromN = deltaN / fyd;
    const asFromM = deltaM / ((dimH - 2 * coverC) * fyd);
    asRqdMm2 = asFromN + asFromM;
  }
  asRqdMm2 = Math.max(asRqdMm2, asMinMm2);
  
  const asRqdCm2 = +(asRqdMm2 / 100).toFixed(2);
  const asMinCm2 = +(asMinMm2 / 100).toFixed(2);
  const asMaxCm2 = +(asMaxMm2 / 100).toFixed(2);
  
  // Sélection des barres réelles : Respect du choix utilisateur ou auto-dimensionnement
  let chosenPhi = input.customRebarPhi || 16;
  let chosenCount = defaultMinBars;
  
  if (input.customRebarPhi) {
    const unitAreaMm2 = (Math.PI * chosenPhi * chosenPhi) / 4;
    const calculatedCount = Math.ceil(asRqdMm2 / unitAreaMm2);
    chosenCount = input.customBarCount || Math.max(defaultMinBars, calculatedCount);
    // S'assurer que le nombre de barres est pair ou multiple convenable pour les formes symétriques
    if (shape === 'rect' && chosenCount % 2 !== 0) chosenCount += 1;
    if (shape === 'hexagon' && chosenCount < 6) chosenCount = 6;
  } else {
    // Mode automatique
    const minBars = defaultMinBars;
    const barConfigs = [
      { phi: 14, count: minBars, area: minBars * 1.54 },
      { phi: 16, count: minBars, area: minBars * 2.01 },
      { phi: 16, count: minBars + 2, area: (minBars + 2) * 2.01 },
      { phi: 20, count: minBars, area: minBars * 3.14 },
      { phi: 20, count: minBars + 2, area: (minBars + 2) * 3.14 },
      { phi: 20, count: minBars + 4, area: (minBars + 4) * 3.14 },
      { phi: 25, count: minBars + 2, area: (minBars + 2) * 4.91 },
      { phi: 25, count: minBars + 4, area: (minBars + 4) * 4.91 },
    ];
    const autoChosen = barConfigs.find(c => c.area >= asRqdMm2 / 100) || barConfigs[barConfigs.length - 1];
    chosenPhi = autoChosen.phi;
    chosenCount = autoChosen.count;
  }

  const asProvidedCm2 = +((chosenCount * Math.PI * chosenPhi * chosenPhi) / 400).toFixed(2);
  const rebarArrangement = `${chosenCount} HA ${chosenPhi} (${asProvidedCm2} cm²)`;
  
  // Calcul des ancrages et surlongueur de recouvrement l0
  const anchorage = calculateAnchorage({
    barDiameter: chosenPhi,
    fctd: concrete.fctd,
    fyd: rebar.fyd,
    bondCondition: input.bondCondition,
    anchorageType: input.anchorageType,
    stressType: 'compression',
    overlapRatioPercent: input.overlapPercent,
    coverCd: input.coverC,
  });
  
  const lapLengthL0Mm = anchorage.l0;
  const totalBarLengthM = +(heightL + lapLengthL0Mm / 1000).toFixed(2);
  
  // Dispositions de frettage et cadres (EC2 §9.5.3)
  const tiePhi = input.customTiePhi || Math.max(6, Math.min(12, Math.ceil(chosenPhi / 4)), 8);
  // Espacement courant : s_cl = min(20*phi, b, 400 mm)
  const spacingCourantMm = Math.min(20 * chosenPhi, Math.min(dimB, dimH), 400);
  // Espacement critique tête / pied de poteau : s_crit <= 0.6 * s_cl <= min(12*phi, 150 mm)
  const spacingCritMm = Math.min(0.6 * spacingCourantMm, 12 * chosenPhi, 150);
  // Hauteur de la zone critique h_crit = max(b, h, l0/6, 500 mm)
  const zoneCritHeightMm = Math.max(dimB, dimH, Math.round(l0Mm / 6), 500);
  
  const frettageDescription = `Cadres HA ${tiePhi} (${cadresDescription}) resserrés à ${spacingCritMm} mm sur h_crit = ${zoneCritHeightMm} mm en tête & pied, ${spacingCourantMm} mm en zone courante`;
  
  // Capacité et sécurité
  const nRdTot = (acMm2 * fcd + asProvidedCm2 * 100 * fyd) / 1000; // kN
  const capacityRatio = +(input.axialNEd / (0.85 * nRdTot)).toFixed(2);
  const isSafe = capacityRatio <= 1.0;
  
  // Poids d'acier total et Nomenclature ISO 3766
  const linearMassLong = chosenPhi * chosenPhi * 0.00617;
  const steelWeightLong = chosenCount * totalBarLengthM * linearMassLong;
  
  const nbCritSets = 2 * Math.ceil(zoneCritHeightMm / spacingCritMm);
  const nbCourantSets = Math.ceil((heightL * 1000 - 2 * zoneCritHeightMm) / spacingCourantMm);
  const totalCadreSets = nbCritSets + Math.max(0, nbCourantSets);
  
  // Calcul précis du périmètre unitaire des cadres selon la forme
  let unitCadre1PerimeterM = (perimeterMm + 150) / 1000;
  let unitCadre2PerimeterM = 0;
  
  if (shape === 'L') {
    const t = dimT || 150;
    unitCadre1PerimeterM = +(2 * (dimB + t - 4 * coverC) + 150) / 1000;
    unitCadre2PerimeterM = +(2 * (dimH + t - 4 * coverC) + 150) / 1000;
  } else if (shape === 'T') {
    const t = dimT || 150;
    unitCadre1PerimeterM = +(2 * (dimB + t - 4 * coverC) + 150) / 1000;
    unitCadre2PerimeterM = +(2 * (dimH - t + 2 * coverC + t) + 150) / 1000;
  } else if (shape === 'cross') {
    const t = dimT || 150;
    unitCadre1PerimeterM = +(2 * (dimB + t - 4 * coverC) + 150) / 1000;
    unitCadre2PerimeterM = +(2 * (dimH + t - 4 * coverC) + 150) / 1000;
  } else if (shape === 'hexagon') {
    unitCadre1PerimeterM = +(perimeterMm - 6 * coverC * Math.tan(Math.PI / 6) + 150) / 1000;
  } else if (shape === 'circle') {
    unitCadre1PerimeterM = +(Math.PI * (dimB - 2 * coverC) + 150) / 1000;
  } else {
    unitCadre1PerimeterM = +(2 * (dimB + dimH - 4 * coverC) + 150) / 1000;
    if (cadresCountPerSet > 1) {
      unitCadre2PerimeterM = +(2 * (dimB * 0.5 + dimH - 4 * coverC) + 150) / 1000;
    }
  }
  
  const linearMassCadre = tiePhi * tiePhi * 0.00617;
  const weightCadre1 = +(totalCadreSets * unitCadre1PerimeterM * linearMassCadre).toFixed(2);
  const weightCadre2 = unitCadre2PerimeterM > 0
    ? +(totalCadreSets * unitCadre2PerimeterM * linearMassCadre).toFixed(2)
    : 0;
  
  const totalCadreWeight = weightCadre1 + weightCadre2;
  const steelWeightKg = +(steelWeightLong + totalCadreWeight).toFixed(1);
  
  // Tableau de nomenclature ISO 3766 complet
  const rebarSchedule: ColumnRebarBar[] = [
    {
      count: chosenCount,
      diameter: chosenPhi,
      layer: 'longitudinal',
      shape: input.anchorageType === 'hook_90' ? 'hooked' : 'straight',
      unitLengthM: totalBarLengthM,
      totalWeightKg: +steelWeightLong.toFixed(2),
      details: `Barres principales (Hauteur ${input.heightL}m + Attente l0 ${lapLengthL0Mm}mm)`,
    },
    {
      count: totalCadreSets,
      diameter: tiePhi,
      layer: 'tie',
      shape: 'u_frame',
      unitLengthM: unitCadre1PerimeterM,
      totalWeightKg: weightCadre1,
      details: cadresCountPerSet > 1 ? 'Cadre 1 principal' : `Cadre ${shapeNameFr}`,
    },
  ];
  
  if (cadresCountPerSet > 1 && unitCadre2PerimeterM > 0) {
    rebarSchedule.push({
      count: totalCadreSets,
      diameter: tiePhi,
      layer: 'tie',
      shape: 'u_frame',
      unitLengthM: unitCadre2PerimeterM,
      totalWeightKg: weightCadre2,
      details: shape === 'cross' ? 'Cadre 2 orthogonal' : shape === 'L' ? 'Cadre 2 aile' : 'Cadre 2 intérieur / âme',
    });
  }

  // 6. MODULES ACIER ET BOIS POUR POTEAUX
  const material: ColumnMaterial = input.material || 'concrete';
  let steelColumn: SteelColumnOutput | undefined;
  if (material === 'steel') {
    const profKey = input.steelProfileKey || 'HEA 240';
    const prof = STEEL_PROFILES[profKey] || STEEL_PROFILES['HEA 240'];
    const steelGrade = STRUCTURAL_STEEL_GRADES[input.steelGradeKey || 'S355'] || STRUCTURAL_STEEL_GRADES['S355'];
    const fy = steelGrade.fy;

    const areaMm2 = prof.areaCm2 * 100;
    const iyMm = Math.sqrt((prof.iyCm4 * 10000) / areaMm2);
    // Approximation axe faible z : iz ~ 0.5 * b
    const izMm = Math.max(10, 0.25 * prof.b);
    const izCm4 = +((areaMm2 * izMm * izMm) / 10000).toFixed(0);

    const l0Mm = bucklingLengthL0M * 1000;
    const lambdaY = +(l0Mm / iyMm).toFixed(1);
    const lambdaZ = +(l0Mm / izMm).toFixed(1);

    const lambda1 = 93.9 * Math.sqrt(235 / fy);
    const lambdaRelZ = lambdaZ / lambda1;
    // Courbe de flambement c (alpha = 0.49)
    const alphaBuckling = 0.49;
    const phi = 0.5 * (1 + alphaBuckling * (lambdaRelZ - 0.2) + lambdaRelZ * lambdaRelZ);
    const chi = Math.min(1.0, +(1 / (phi + Math.sqrt(Math.max(0, phi * phi - lambdaRelZ * lambdaRelZ)))).toFixed(3));

    const NbRdKN = +((chi * areaMm2 * fy) / 1000).toFixed(1);
    const axialRatio = +(input.axialNEd / Math.max(1, NbRdKN)).toFixed(2);

    steelColumn = {
      profileName: prof.name,
      areaCm2: prof.areaCm2,
      iyCm4: prof.iyCm4,
      izCm4,
      lambdaY,
      lambdaZ,
      chiMin: chi,
      NbRdKN,
      axialRatio,
      isCompliant: axialRatio <= 1.0,
    };
  }

  let timberColumn: TimberColumnOutput | undefined;
  if (material === 'timber') {
    const tGradeKey = input.timberGradeKey || 'C24';
    const tGrade = TIMBER_GRADES[tGradeKey] || TIMBER_GRADES['C24'];
    const wB = input.timberWidthB || 200;
    const wH = input.timberHeightH || 200;

    const areaMm2 = wB * wH;
    const iMin = Math.min(wB, wH) / Math.sqrt(12);
    const l0Mm = bucklingLengthL0M * 1000;
    const lambda = +(l0Mm / iMin).toFixed(1);

    const E005 = tGrade.E0mean * 1000 * 0.67; // approx E0.05
    const lambdaRel = +((lambda / Math.PI) * Math.sqrt((tGrade.fc0k) / E005)).toFixed(2);

    const betaC = tGrade.type === 'solid' ? 0.2 : 0.1;
    const k = 0.5 * (1 + betaC * (lambdaRel - 0.3) + lambdaRel * lambdaRel);
    const kc = Math.min(1.0, +(1 / (k + Math.sqrt(Math.max(0, k * k - lambdaRel * lambdaRel)))).toFixed(3));

    const fc0d = +((tGrade.kmod * tGrade.fc0k) / tGrade.gammaM).toFixed(2);
    const sigmaC0d = +((input.axialNEd * 1000) / areaMm2).toFixed(2);
    const axialRatio = +(sigmaC0d / Math.max(0.1, kc * fc0d)).toFixed(2);

    timberColumn = {
      gradeName: tGrade.name,
      widthB: wB,
      heightH: wH,
      areaCm2: +(areaMm2 / 100).toFixed(1),
      lambda,
      kc,
      fc0dMPa: fc0d,
      sigmaC0dMPa: sigmaC0d,
      axialRatio,
      isCompliant: axialRatio <= 1.0,
    };
  }

  return {
    material,
    shape,
    shapeNameFr,
    steelColumn,
    timberColumn,
    actAreaCm2,
    perimeterMm,
    iRadiusOfGyrationMm: +iMinMm.toFixed(1),
    bucklingLengthL0M,
    slendernessLambda,
    slendernessLimitLambdaLim: lambdaLim,
    isSecondOrderRequired,
    e0Mm: +e0Mm.toFixed(1),
    eiMm: +eiMm.toFixed(1),
    e2Mm: +e2Mm.toFixed(1),
    etotMm,
    mEdTotKNm,
    asMinCm2,
    asMaxCm2,
    asRqdCm2,
    asProvidedCm2,
    rebarArrangement,
    barDiameterPhi: chosenPhi,
    barCount: chosenCount,
    tieDiameterPhi: tiePhi,
    cadresCountPerSet,
    cadresDescription,
    anchorage,
    lapLengthL0Mm,
    totalBarLengthM,
    spacingCourantMm,
    spacingCritMm,
    zoneCritHeightMm,
    frettageDescription,
    capacityRatio,
    isSafe,
    concreteVolumeM3,
    steelWeightKg,
    rebarSchedule,
  };
}
