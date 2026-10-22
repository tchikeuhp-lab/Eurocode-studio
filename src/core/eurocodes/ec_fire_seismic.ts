/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Moteur Transversal Séisme (EN 1998-1) & Résistance au Feu (EN 1992-1-2, EN 1993-1-2, EN 1995-1-2)
 */

export interface SeismicInput {
  enabled: boolean;
  zone: number;             // 1 à 5
  ag: number;               // Accélération de référence (m/s²)
  soilClass: 'A' | 'B' | 'C' | 'D' | 'E';
  ductilityClass: 'DCL' | 'DCM' | 'DCH'; // Classe de ductilité
  behaviorFactorQ: number;  // Facteur de comportement q (1.5 pour DCL, 3.0 à 3.9 pour DCM, 4.5+ pour DCH)
  importanceClass: 'I' | 'II' | 'III' | 'IV';
}

export interface SeismicOutput {
  enabled: boolean;
  agEff: number;            // Accélération effective ag * gamma_I (m/s²)
  soilFactorS: number;      // Facteur de sol S
  seismicCoeffSd: number;   // Coefficient d'accélération de calcul Sd(T)
  minStirrupSpacingMm: number; // Espacement maximal en zone critique de confinement
  criticalZoneLengthM: number; // Longueur de zone critique hcr
  isDuctileConfinementRequired: boolean;
  recommendations: string[];
}

export interface FireInput {
  enabled: boolean;
  fireRating: 'R30' | 'R60' | 'R90' | 'R120';
  material: 'concrete' | 'steel' | 'timber';
  dimensions: {
    widthB: number;
    heightH: number;
    coverC?: number;
  };
}

export interface FireOutput {
  enabled: boolean;
  durationMin: number;
  isCompliant: boolean;
  criticalParameters: {
    label: string;
    actualValue: number;
    requiredValue: number;
    unit: string;
    isOk: boolean;
  }[];
  residualCapacityPercent: number; // Capacité portante résiduelle estimée
  notes: string[];
}

/**
 * Calcul des dispositions et actions sismiques selon Eurocode 8 (EN 1998-1)
 */
export function calculateSeismicRules(
  input: SeismicInput,
  elementWidthMm: number,
  elementHeightMm: number,
  longitudinalPhiMm: number
): SeismicOutput {
  if (!input.enabled) {
    return {
      enabled: false,
      agEff: 0,
      soilFactorS: 1.0,
      seismicCoeffSd: 0,
      minStirrupSpacingMm: 300,
      criticalZoneLengthM: 0,
      isDuctileConfinementRequired: false,
      recommendations: ['Vérification sismique inactive.'],
    };
  }

  const importanceFactor = input.importanceClass === 'I' ? 0.8 : input.importanceClass === 'II' ? 1.0 : input.importanceClass === 'III' ? 1.2 : 1.4;
  const soilFactors = { A: 1.0, B: 1.2, C: 1.5, D: 1.8, E: 1.6 };
  const S = soilFactors[input.soilClass] || 1.2;
  const agEff = +(input.ag * importanceFactor).toFixed(2);
  
  // Spectre de calcul simplifié à l'ELU sismique Sd = agEff * S * 2.5 / q
  const q = Math.max(1.5, input.behaviorFactorQ);
  const Sd = +((agEff * S * 2.5) / q).toFixed(3);

  // Exigences de confinement en zone critique selon EC8 §5.4.3 & §5.5.3
  // s_cl <= min(b_w / 4, 6 * phi_l, 175 mm) pour DCM
  // s_cl <= min(b_w / 4, 5 * phi_l, 100 mm) pour DCH
  let maxCritSpacing = 175;
  if (input.ductilityClass === 'DCH') {
    maxCritSpacing = Math.min(elementWidthMm / 4, 5 * longitudinalPhiMm, 100);
  } else if (input.ductilityClass === 'DCM') {
    maxCritSpacing = Math.min(elementWidthMm / 4, 6 * longitudinalPhiMm, 175);
  } else {
    maxCritSpacing = Math.min(elementWidthMm / 2, 8 * longitudinalPhiMm, 200);
  }
  maxCritSpacing = Math.max(50, Math.round(maxCritSpacing / 5) * 5);

  // Longueur de zone critique hcr
  const hcr = +(Math.max(elementHeightMm / 1000 * (input.ductilityClass === 'DCH' ? 1.5 : 1.0), 0.5)).toFixed(2);

  const recommendations: string[] = [
    `Zone critique de longueur lcr = ${hcr} m aux extrémités avec espacement resserré s ≤ ${maxCritSpacing} mm.`,
    input.ductilityClass !== 'DCL'
      ? 'Aciers longitudinaux de classe de ductilité B ou C exigés (EN 1998-1 §5.2.3.4).'
      : 'Conception sous faible sismicité DCL (dimensionnement élastique admis).',
    `Coefficient d'action sismique de calcul Sd = ${Sd} m/s² (Facteur q = ${q}).`
  ];

  return {
    enabled: true,
    agEff,
    soilFactorS: S,
    seismicCoeffSd: Sd,
    minStirrupSpacingMm: maxCritSpacing,
    criticalZoneLengthM: hcr,
    isDuctileConfinementRequired: input.ductilityClass !== 'DCL',
    recommendations,
  };
}

/**
 * Calcul et vérification de la résistance au feu selon EN 1992-1-2 / EN 1993-1-2 / EN 1995-1-2
 */
export function calculateFireResistance(input: FireInput): FireOutput {
  const durationMin = input.fireRating === 'R30' ? 30 : input.fireRating === 'R60' ? 60 : input.fireRating === 'R90' ? 90 : 120;
  
  if (!input.enabled) {
    return {
      enabled: false,
      durationMin,
      isCompliant: true,
      criticalParameters: [],
      residualCapacityPercent: 100,
      notes: ['Vérification feu inactive.'],
    };
  }

  const { widthB, heightH, coverC = 30 } = input.dimensions;
  const criticalParameters: FireOutput['criticalParameters'] = [];
  const notes: string[] = [];
  let isCompliant = true;
  let residualCapacityPercent = 85;

  if (input.material === 'concrete') {
    // EN 1992-1-2 Tableau 5.5 & 5.6 (Poutres et poteaux en béton armé)
    // Distance de l'axe des armatures à la surface a = c + phi/2
    const actualA = coverC + 8; // approx phi=16mm/2
    let reqWidth = 160;
    let reqA = 15;

    if (input.fireRating === 'R30') { reqWidth = 160; reqA = 15; }
    else if (input.fireRating === 'R60') { reqWidth = 200; reqA = 25; }
    else if (input.fireRating === 'R90') { reqWidth = 250; reqA = 35; }
    else if (input.fireRating === 'R120') { reqWidth = 300; reqA = 45; }

    const isWidthOk = widthB >= reqWidth;
    const isAOk = actualA >= reqA;
    if (!isWidthOk || !isAOk) isCompliant = false;

    criticalParameters.push({
      label: 'Largeur minimale de section bmin',
      actualValue: widthB,
      requiredValue: reqWidth,
      unit: 'mm',
      isOk: isWidthOk,
    });
    criticalParameters.push({
      label: 'Distance à l\'axe des armatures amin',
      actualValue: actualA,
      requiredValue: reqA,
      unit: 'mm',
      isOk: isAOk,
    });

    residualCapacityPercent = Math.max(50, 100 - (durationMin / 120) * 40);
    notes.push(`Vérification selon méthode tabulée EN 1992-1-2 pour classe ${input.fireRating}.`);
  } else if (input.material === 'steel') {
    // EN 1993-1-2 : Profilé acier sans protection thermique
    // Échauffement critique pour profilés non protégés
    // Facteur de massiveté Am/V (m-1)
    const perimeterMm = 2 * (widthB + heightH);
    const areaMm2 = widthB * heightH * 0.15; // approx section profilé
    const amV = Math.round((perimeterMm / Math.max(1, areaMm2)) * 1000);
    
    // Si non floqué / non protégé, R > 30 min nécessite protection ou vérification
    const reqMaxAmV = input.fireRating === 'R30' ? 220 : 130;
    const isOk = durationMin <= 30 || amV <= reqMaxAmV;
    if (!isOk) isCompliant = false;

    criticalParameters.push({
      label: 'Facteur de massiveté Am/V',
      actualValue: amV,
      requiredValue: reqMaxAmV,
      unit: 'm⁻¹',
      isOk,
    });

    residualCapacityPercent = input.fireRating === 'R30' ? 65 : input.fireRating === 'R60' ? 40 : 25;
    notes.push(isCompliant ? 'Stabilité au feu vérifiée sans protection passive.' : 'Protection thermique passive (peinture intumescente ou flocage) requise.');
  } else {
    // EN 1995-1-2 : Bois de structure (Vitesse de carbonisation beta0 = 0.65 mm/min)
    const beta0 = 0.65; // mm/min pour résineux
    const dchar0 = +(beta0 * durationMin).toFixed(1); // mm
    const k0 = 1.0;
    const d0 = 7.0; // mm couche de transition thermique
    const def = +(dchar0 + k0 * d0).toFixed(1); // mm profondeur efficace
    
    const residualWidth = Math.max(0, widthB - 2 * def);
    const residualHeight = Math.max(0, heightH - (durationMin > 0 ? 2 * def : 0));
    const isOk = residualWidth >= 60 && residualHeight >= 80;
    if (!isOk) isCompliant = false;

    criticalParameters.push({
      label: 'Largeur résiduelle efficace bref',
      actualValue: +residualWidth.toFixed(1),
      requiredValue: 60,
      unit: 'mm',
      isOk: residualWidth >= 60,
    });
    criticalParameters.push({
      label: 'Profondeur carbonisée efficace def',
      actualValue: def,
      requiredValue: Math.round(widthB * 0.4),
      unit: 'mm',
      isOk: def < widthB * 0.4,
    });

    residualCapacityPercent = Math.max(30, Math.round(((residualWidth * residualHeight) / (widthB * heightH)) * 100));
    notes.push(`Carbonisation calculée selon EN 1995-1-2 : vitesse β0 = 0.65 mm/min, couche carbonisée dchar = ${dchar0} mm.`);
  }

  return {
    enabled: true,
    durationMin,
    isCompliant,
    criticalParameters,
    residualCapacityPercent,
    notes,
  };
}
