/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Résistance au Feu (EN 1992-1-2 / Eurocode 2 Partie 1-2)
 * Méthode tabulée officielle pour Poutres, Poteaux et Dalles (R30, R60, R90, R120, R180)
 */

export type FireResistanceClass = 'R30' | 'R60' | 'R90' | 'R120' | 'R180';

export interface FireCheckInput {
  elementType: 'beam' | 'column' | 'slab';
  fireClass: FireResistanceClass;
  widthB: number;            // Largeur de la section en mm
  heightH: number;           // Hauteur de la section en mm
  cNom: number;              // Enrobage nominal en mm
  stirrupPhi: number;        // Diamètre cadres en mm
  mainBarPhi: number;        // Diamètre barres principales en mm
  isContinuous?: boolean;    // Poutre ou dalle continue vs isostatique
}

export interface FireRequirement {
  bMinMm: number;            // Largeur minimale requise en mm
  aMinMm: number;            // Distance d'axe minimale a requise en mm
}

export interface FireCheckOutput {
  fireClass: FireResistanceClass;
  fireDurationMinutes: number;
  actualAxisDistanceAMm: number; // a = cnom + phi_cadre + phi_L / 2
  requiredBMinMm: number;
  requiredAMinMm: number;
  isWidthCompliant: boolean;
  isAxisDistanceCompliant: boolean;
  isFireProofCompliant: boolean;
  spallingRiskAssessment: string;
  normativeReference: string;
}

// Tableaux EN 1992-1-2 : Valeurs minimales pour poutres isostatiques (Tableau 5.5)
const BEAM_FIRE_TABLE: Record<FireResistanceClass, { bMin: number; aMin: number }> = {
  'R30': { bMin: 150, aMin: 25 },
  'R60': { bMin: 200, aMin: 35 },
  'R90': { bMin: 250, aMin: 45 },
  'R120': { bMin: 300, aMin: 55 },
  'R180': { bMin: 400, aMin: 65 },
};

// Tableaux EN 1992-1-2 : Valeurs minimales pour poteaux (Tableau 5.2a Méthode A)
const COLUMN_FIRE_TABLE: Record<FireResistanceClass, { bMin: number; aMin: number }> = {
  'R30': { bMin: 200, aMin: 25 },
  'R60': { bMin: 250, aMin: 30 },
  'R90': { bMin: 350, aMin: 35 },
  'R120': { bMin: 350, aMin: 45 },
  'R180': { bMin: 450, aMin: 50 },
};

// Tableaux EN 1992-1-2 : Valeurs minimales pour dalles pleines (Tableau 5.8)
const SLAB_FIRE_TABLE: Record<FireResistanceClass, { hMin: number; aMin: number }> = {
  'R30': { hMin: 60, aMin: 10 },
  'R60': { hMin: 80, aMin: 20 },
  'R90': { hMin: 100, aMin: 30 },
  'R120': { hMin: 120, aMin: 40 },
  'R180': { hMin: 150, aMin: 50 },
};

export function checkFireResistance(input: FireCheckInput): FireCheckOutput {
  const { elementType, fireClass, widthB, heightH, cNom, stirrupPhi, mainBarPhi, isContinuous } = input;
  
  // Distance d'axe réelle de l'armature : a = cnom + stirrupPhi + mainBarPhi / 2
  const actualAxisDistanceAMm = +(cNom + stirrupPhi + mainBarPhi / 2).toFixed(1);
  
  let requiredBMinMm = 0;
  let requiredAMinMm = 0;
  let normativeReference = '';
  
  const durationMap: Record<FireResistanceClass, number> = {
    'R30': 30,
    'R60': 60,
    'R90': 90,
    'R120': 120,
    'R180': 180,
  };
  const fireDurationMinutes = durationMap[fireClass] || 60;
  
  if (elementType === 'beam') {
    const req = BEAM_FIRE_TABLE[fireClass] || BEAM_FIRE_TABLE['R60'];
    requiredBMinMm = isContinuous ? Math.round(req.bMin * 0.8) : req.bMin;
    requiredAMinMm = isContinuous ? Math.max(15, req.aMin - 10) : req.aMin;
    normativeReference = 'EN 1992-1-2 Tableau 5.5 (Poutres)';
  } else if (elementType === 'column') {
    const req = COLUMN_FIRE_TABLE[fireClass] || COLUMN_FIRE_TABLE['R60'];
    requiredBMinMm = req.bMin;
    requiredAMinMm = req.aMin;
    normativeReference = 'EN 1992-1-2 Tableau 5.2a (Poteaux)';
  } else {
    // Dalle
    const req = SLAB_FIRE_TABLE[fireClass] || SLAB_FIRE_TABLE['R60'];
    requiredBMinMm = req.hMin; // Hauteur minimale h
    requiredAMinMm = isContinuous ? Math.max(10, req.aMin - 10) : req.aMin;
    normativeReference = 'EN 1992-1-2 Tableau 5.8 (Dalles pleines)';
  }
  
  const dimToCheck = elementType === 'slab' ? heightH : widthB;
  const isWidthCompliant = dimToCheck >= requiredBMinMm;
  const isAxisDistanceCompliant = actualAxisDistanceAMm >= requiredAMinMm;
  const isFireProofCompliant = isWidthCompliant && isAxisDistanceCompliant;
  
  // Risque d'éclatement du béton (spalling) selon EN 1992-1-2 §4.5
  let spallingRiskAssessment = 'Risque d éclatement faible (enrobage cnom < 40 mm et teneur en eau courante).';
  if (actualAxisDistanceAMm > 45) {
    spallingRiskAssessment = 'Présence d armatures pare-éclats recommandée dans l enrobage (a > 45 mm).';
  }
  
  return {
    fireClass,
    fireDurationMinutes,
    actualAxisDistanceAMm,
    requiredBMinMm,
    requiredAMinMm,
    isWidthCompliant,
    isAxisDistanceCompliant,
    isFireProofCompliant,
    spallingRiskAssessment,
    normativeReference,
  };
}
