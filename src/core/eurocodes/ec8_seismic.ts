/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Séisme & Ductilité (EN 1998-1 / Eurocode 8)
 * Vérification des zones critiques, espacements de confinement et dimensionnement en capacité
 */

export type DuctilityClass = 'DCL' | 'DCM' | 'DCH'; // Faible, Moyenne, Haute

export interface SeismicInput {
  ductilityClass: DuctilityClass;
  elementType: 'beam' | 'column';
  widthB: number;            // Largeur b (mm)
  heightH: number;           // Hauteur h (mm)
  clearSpanLclMm: number;    // Portée nette ou hauteur libre l_cl (mm)
  longitudinalPhi: number;   // Diamètre barre longitudinale principale (mm)
  stirrupPhi: number;        // Diamètre cadre de confinement (mm)
  axialNEdKN?: number;       // Effort normal pour poteaux (kN)
}

export interface SeismicOutput {
  ductilityClass: DuctilityClass;
  behaviorFactorQ: string;
  criticalZoneLengthLcrMm: number;  // Longueur de la zone critique l_cr (mm)
  maxStirrupSpacingCriticalMm: number; // Espacement maximal de frettage en zone critique s_crit
  maxStirrupSpacingCurrentMm: number;  // Espacement maximal en zone courante
  minStirrupPhiMm: number;           // Diamètre minimal du cadre de confinement (mm)
  capacityDesignAdvice: string;      // Règle du dimensionnement en capacité
  seismicRulesSummary: string[];
}

export function calculateSeismicProvisions(input: SeismicInput): SeismicOutput {
  const { ductilityClass, elementType, widthB, heightH, clearSpanLclMm, longitudinalPhi, stirrupPhi } = input;
  
  let behaviorFactorQ = 'q ≤ 1.5 (Conception élastique)';
  if (ductilityClass === 'DCM') behaviorFactorQ = '1.5 < q ≤ 3.9 (Ductilité moyenne)';
  if (ductilityClass === 'DCH') behaviorFactorQ = 'q > 3.9 (Ductilité haute, dissipation plastique)';
  
  let criticalZoneLengthLcrMm = 0;
  let maxStirrupSpacingCriticalMm = 0;
  let maxStirrupSpacingCurrentMm = 0;
  let minStirrupPhiMm = 6;
  const seismicRulesSummary: string[] = [];
  
  const b0 = widthB - 2 * 30; // Largeur du noyau confiné
  
  if (elementType === 'beam') {
    // EN 1998-1 §5.4.3.1 (Poutres)
    if (ductilityClass === 'DCL') {
      criticalZoneLengthLcrMm = heightH;
      maxStirrupSpacingCriticalMm = Math.min(0.75 * (heightH - 35), 300);
      maxStirrupSpacingCurrentMm = Math.min(0.75 * (heightH - 35), 400);
      minStirrupPhiMm = 6;
      seismicRulesSummary.push('Règles courantes EN 1992-1-1 sans exigences de ductilité dissipatives.');
    } else if (ductilityClass === 'DCM') {
      criticalZoneLengthLcrMm = Math.round(heightH);
      // s <= min(hw / 4, 24 * phi_w, 225 mm, 8 * phi_L) (EC8 Eq. 5.13)
      maxStirrupSpacingCriticalMm = Math.floor(Math.min(heightH / 4, 24 * stirrupPhi, 225, 8 * longitudinalPhi));
      maxStirrupSpacingCurrentMm = Math.floor(Math.min(heightH / 2, 300));
      minStirrupPhiMm = 6;
      seismicRulesSummary.push(`Zone critique l_cr = ${criticalZoneLengthLcrMm} mm aux deux extrémités de la poutre.`);
      seismicRulesSummary.push(`Espacement de frettage : s_crit ≤ ${maxStirrupSpacingCriticalMm} mm.`);
      seismicRulesSummary.push('Cadres fermés avec crochets à 135° et retour d ancrage 10 phi_w ≥ 70 mm.');
    } else {
      // DCH
      criticalZoneLengthLcrMm = Math.round(1.5 * heightH);
      maxStirrupSpacingCriticalMm = Math.floor(Math.min(heightH / 4, 175, 6 * longitudinalPhi));
      maxStirrupSpacingCurrentMm = Math.floor(Math.min(heightH / 3, 200));
      minStirrupPhiMm = 8;
      seismicRulesSummary.push(`Zone critique étendue l_cr = ${criticalZoneLengthLcrMm} mm (1.5 h).`);
      seismicRulesSummary.push(`Confinement très dense : s_crit ≤ ${maxStirrupSpacingCriticalMm} mm.`);
    }
  } else {
    // EN 1998-1 §5.4.3.2 (Poteaux)
    if (ductilityClass === 'DCL') {
      criticalZoneLengthLcrMm = Math.max(heightH, Math.round(clearSpanLclMm / 6), 450);
      maxStirrupSpacingCriticalMm = Math.min(12 * longitudinalPhi, 0.6 * widthB, 150);
      maxStirrupSpacingCurrentMm = Math.min(20 * longitudinalPhi, widthB, 400);
      minStirrupPhiMm = 6;
    } else if (ductilityClass === 'DCM') {
      criticalZoneLengthLcrMm = Math.max(heightH, Math.round(clearSpanLclMm / 6), 450);
      // s <= min(b0 / 2, 175 mm, 8 * phi_L) (EC8 Eq. 5.17)
      maxStirrupSpacingCriticalMm = Math.floor(Math.min(b0 / 2, 175, 8 * longitudinalPhi));
      maxStirrupSpacingCurrentMm = Math.floor(Math.min(widthB, 20 * longitudinalPhi, 300));
      minStirrupPhiMm = Math.max(6, Math.ceil(longitudinalPhi / 3));
      seismicRulesSummary.push(`Zone de confinement en pied et tête de poteau : l_cr = ${criticalZoneLengthLcrMm} mm.`);
      seismicRulesSummary.push(`Cadres de frettage resserrés : s_crit ≤ ${maxStirrupSpacingCriticalMm} mm.`);
      seismicRulesSummary.push('Contrôle de l effort normal réduit nu_d = NEd / (Ac * fcd) ≤ 0.65.');
    } else {
      // DCH
      criticalZoneLengthLcrMm = Math.max(1.5 * heightH, Math.round(clearSpanLclMm / 5), 500);
      maxStirrupSpacingCriticalMm = Math.floor(Math.min(b0 / 3, 100, 6 * longitudinalPhi));
      maxStirrupSpacingCurrentMm = Math.floor(Math.min(widthB / 2, 175));
      minStirrupPhiMm = Math.max(8, Math.ceil(longitudinalPhi / 2.5));
      seismicRulesSummary.push(`Zone critique DCH : l_cr = ${criticalZoneLengthLcrMm} mm avec frettage à s ≤ ${maxStirrupSpacingCriticalMm} mm.`);
    }
  }
  
  const capacityDesignAdvice = ductilityClass === 'DCL'
    ? 'Dimensionnement standard sans sur-résistance de capacité requise.'
    : 'Dimensionnement en capacité obligatoire : vérification de l effort tranchant sous moments plastiques d extrémité pour exclure toute rupture fragile.';
    
  return {
    ductilityClass,
    behaviorFactorQ,
    criticalZoneLengthLcrMm,
    maxStirrupSpacingCriticalMm,
    maxStirrupSpacingCurrentMm,
    minStirrupPhiMm,
    capacityDesignAdvice,
    seismicRulesSummary,
  };
}
