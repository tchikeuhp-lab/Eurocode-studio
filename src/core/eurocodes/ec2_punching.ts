/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Poinçonnement des Dalles & Planchers (EN 1992-1-1 §6.4)
 * Périmètres u0 et u1 (à 2d), vérification vEd vs vRd,c et dimensionnement des armatures transversales
 */

import { ConcreteGrade, RebarGrade } from './materials.ts';

export interface PunchingInput {
  slabThicknessH: number;    // Épaisseur de dalle en mm (ex: 200)
  effectiveDepthD: number;   // Hauteur utile moyenne d en mm (ex: 165)
  colDimC1: number;          // Dimension poteau x en mm (ex: 300)
  colDimC2: number;          // Dimension poteau y en mm (ex: 300)
  isCircularCol?: boolean;   // Poteau circulaire de diamètre D
  columnPosition: 'internal' | 'edge' | 'corner'; // Intérieur (beta=1.15), Rive (1.4), Angle (1.5)
  punchingForceVEdKN: number; // Effort normal transmis ou tranchant de poinçonnement en kN (ex: 320)
  reinforcementRatioRhoL: number; // Ratio moyen d'armature longitudinale flexuelle rho_l (ex: 0.008)
}

export interface PunchingOutput {
  betaFactor: number;        // Facteur de majoration d'excentricité beta
  u0Mm: number;              // Périmètre direct au nu du poteau u0 (mm)
  vEd0MPa: number;           // Contrainte de cisaillement au nu vEd,0 = beta * VEd / (u0 * d)
  vRdMaxMPa: number;         // Contrainte maximale admissible vRd,max = 0.5 * nu * fcd
  isNuPoteauCompliant: boolean; // vEd,0 <= vRd,max (sinon écrasement du béton)
  
  u1Mm: number;              // Périmètre de contrôle de référence u1 à 2d du nu (mm)
  vEd1MPa: number;           // Contrainte de poinçonnement sur u1 : vEd = beta * VEd / (u1 * d)
  vRdCMPa: number;           // Résistance du béton sans armature de poinçonnement vRd,c
  isShearReinforcementRequired: boolean; // vEd > vRd,c
  
  // Armatures de poinçonnement si requises
  aswRequiredTotalMm2: number; // Section totale d'armatures transversales de poinçonnement
  providedPunchingRebars: string; // ex: "2 couronnes de 8 étriers verticaux HA 10"
  uOutMm: number;            // Périmètre extérieur au-delà duquel les armatures ne sont plus requises
  punchingSummaryAdvice: string;
}

export function calculatePunchingShear(
  input: PunchingInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): PunchingOutput {
  const { slabThicknessH, effectiveDepthD, colDimC1, colDimC2, isCircularCol, columnPosition, punchingForceVEdKN, reinforcementRatioRhoL } = input;
  
  const d = effectiveDepthD > 0 ? effectiveDepthD : slabThicknessH - 35;
  const vEdN = punchingForceVEdKN * 1000;
  
  // Facteur d'excentricité beta (EC2 §6.4.3 Eq. 6.39 - 6.43)
  let beta = 1.15;
  if (columnPosition === 'edge') beta = 1.40;
  if (columnPosition === 'corner') beta = 1.50;
  
  // 1. Périmètre u0 au nu du poteau
  let u0 = 0;
  if (isCircularCol) {
    u0 = Math.PI * colDimC1;
  } else {
    u0 = 2 * (colDimC1 + colDimC2);
  }
  u0 = Math.round(u0);
  
  // Contrainte au nu du poteau : vEd,0 = beta * VEd / (u0 * d)
  const vEd0 = (beta * vEdN) / (u0 * d);
  const vEd0MPa = +(vEd0).toFixed(2);
  
  // Résistance maximale vRd,max = 0.5 * nu * fcd (EC2 Eq. 6.53)
  const nu = 0.6 * (1 - concrete.fck / 250);
  const vRdMax = 0.5 * nu * concrete.fcd;
  const vRdMaxMPa = +(vRdMax).toFixed(2);
  const isNuPoteauCompliant = vEd0 <= vRdMax;
  
  // 2. Périmètre de référence u1 à 2d du nu du poteau
  let u1 = 0;
  if (isCircularCol) {
    u1 = Math.PI * (colDimC1 + 4 * d);
  } else {
    // 2*(c1 + c2) + coins arrondis 2*pi*(2d)
    u1 = 2 * (colDimC1 + colDimC2) + 2 * Math.PI * (2 * d);
  }
  u1 = Math.round(u1);
  
  // Contrainte de cisaillement sur u1 : vEd,1 = beta * VEd / (u1 * d)
  const vEd1 = (beta * vEdN) / (u1 * d);
  const vEd1MPa = +(vEd1).toFixed(2);
  
  // Résistance du béton sans armature de poinçonnement vRd,c (EC2 Eq. 6.47)
  // vRd,c = CRd,c * k * (100 * rho_l * fck)^(1/3) >= vmin
  const cRdC = 0.18 / 1.5; // 0.12
  const k = Math.min(2.0, 1 + Math.sqrt(200 / d));
  const rhoL = Math.min(0.02, Math.max(0.002, reinforcementRatioRhoL));
  
  const vRdC_calc = cRdC * k * Math.pow(100 * rhoL * concrete.fck, 1 / 3);
  const vMin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(concrete.fck);
  const vRdC = Math.max(vRdC_calc, vMin);
  const vRdCMPa = +(vRdC).toFixed(2);
  
  const isShearReinforcementRequired = vEd1 > vRdC;
  
  // 3. Calcul des armatures de poinçonnement si vEd > vRd,c (EC2 Eq. 6.52)
  // Asw >= (vEd - 0.75 * vRd,c) * u1 * d / (1.5 * fywd,ef)
  let aswRequiredTotalMm2 = 0;
  let providedPunchingRebars = 'Aucune armature de poinçonnement requise (vEd ≤ vRd,c)';
  let uOutMm = u1;
  
  if (isShearReinforcementRequired) {
    const fywdEf = 250 + 0.25 * d; // Limite pratique pour armatures de poinçonnement (MPa)
    const asw = ((vEd1 - 0.75 * vRdC) * u1 * d) / (1.5 * fywdEf);
    aswRequiredTotalMm2 = Math.ceil(Math.max(asw, 0));
    
    // Périmètre extérieur u_out où vEd(u_out) = vRd,c : u_out = beta * VEd / (vRd,c * d)
    uOutMm = Math.round((beta * vEdN) / (vRdC * d));
    
    // Proposition réelle : étriers HA 10 ou épingles
    const unitAreaHA10 = 78.5; // mm2
    const nbStirrups = Math.ceil(aswRequiredTotalMm2 / unitAreaHA10);
    providedPunchingRebars = `${nbStirrups} étriers/épingles HA 10 répartis sur 2 périmètres concentriques (${(aswRequiredTotalMm2 / 100).toFixed(2)} cm²)`;
  }
  
  const punchingSummaryAdvice = isNuPoteauCompliant
    ? isShearReinforcementRequired
      ? `Contrainte vEd = ${vEd1MPa} MPa > vRd,c (${vRdCMPa} MPa) : Armatures de poinçonnement OBLIGATOIRES.`
      : `Contrainte vEd = ${vEd1MPa} MPa ≤ vRd,c (${vRdCMPa} MPa) : Béton seul suffisant sans ferraillage de poinçonnement.`
    : `Écrasement de bielle au nu du poteau : vEd,0 (${vEd0MPa} MPa) > vRd,max (${vRdMaxMPa} MPa) ! Augmenter l'épaisseur de dalle h ou la section du poteau.`;
    
  return {
    betaFactor: beta,
    u0Mm: u0,
    vEd0MPa,
    vRdMaxMPa,
    isNuPoteauCompliant,
    u1Mm: u1,
    vEd1MPa,
    vRdCMPa,
    isShearReinforcementRequired,
    aswRequiredTotalMm2,
    providedPunchingRebars,
    uOutMm,
    punchingSummaryAdvice,
  };
}
