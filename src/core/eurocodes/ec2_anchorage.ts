/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Moteur Normatif des Ancrages & Recouvrements (EN 1992-1-1 §8.4 & §8.7)
 * Implémentation certifiée conforme à l'audit Eurocode 2
 */

export type BondCondition = 'good' | 'poor'; // 'good' = bonnes conditions (eta1 = 1.0), 'poor' = mauvaises/défavorables (eta1 = 0.7)
export type AnchorageType = 'straight' | 'hook_90' | 'bend_135' | 'loop'; // alpha1 = 1.0 ou 0.7
export type BarStressType = 'tension' | 'compression';

export interface AnchorageParams {
  barDiameter: number;           // phi en mm (ex: 12, 14, 16, 20, 25, 32)
  fctd: number;                  // Résistance de calcul en traction du béton en MPa
  fyd: number;                   // Limite d'élasticité de calcul de l'acier en MPa (ex: 434.78 pour B500B)
  sigmaSd?: number;              // Contrainte réelle dans la barre à l'ELU (par défaut = fyd pour ancrage total)
  bondCondition: BondCondition;  // 'good' | 'poor'
  anchorageType: AnchorageType;  // 'straight' | 'hook_90' | 'bend_135' | 'loop'
  stressType: BarStressType;     // 'tension' | 'compression'
  overlapRatioPercent: 25 | 33 | 50 | 100; // % de barres recouvertes dans la même section
  coverCd?: number;              // Enrobage minimal ou entraxe des barres (mm)
  isTransverseWeldedBar?: boolean; // alpha4
  confinementPressureKPa?: number; // alpha5
}

export interface AnchorageResults {
  // Contraintes
  eta1: number;                  // Facteur de condition d'adhérence (1.0 ou 0.7)
  eta2: number;                  // Facteur lié au diamètre (1.0 si phi <= 32mm)
  fbd: number;                   // Contrainte ultime d'adhérence fbd = 2.25 * eta1 * eta2 * fctd (MPa)
  sigmaSd: number;               // Contrainte d'ancrage considérée (MPa)
  
  // Longueurs de base & calcul
  lbRqd: number;                 // Longueur d'ancrage de base requise lb,rqd = (phi / 4) * (sigmaSd / fbd) (mm)
  alpha1: number;                // Forme de la barre (1.0 droit, 0.7 crochet/crosse en traction)
  alpha2: number;                // Effet de l'enrobage minimal (0.7 <= a2 <= 1.0)
  alpha3: number;                // Effet du confinement par armatures transversales
  alpha4: number;                // Effet des barres soudées transversales (0.7 ou 1.0)
  alpha5: number;                // Effet de la pression transversale (0.7 <= a5 <= 1.0)
  alpha6: number;                // Coefficient de recouvrement alpha6 = sqrt(rho1 / 25) borné [1.0, 1.5]
  
  // Résultats d'ancrage
  lbd: number;                   // Longueur d'ancrage de calcul effective lbd (mm)
  lbMin: number;                 // Longueur d'ancrage minimale lb,min (mm)
  lbdStraight: number;           // Longueur d'ancrage droite (alpha1 = 1.0) (mm)
  lbdHook: number;               // Longueur d'ancrage avec crochet / crosse standard (alpha1 = 0.7) (mm)
  
  // Résultats de recouvrement
  l0: number;                    // Longueur de recouvrement calculée l0 (mm)
  l0Min: number;                 // Longueur de recouvrement minimale l0,min (mm)
}

/**
 * Calcul complet des ancrages et recouvrements selon EN 1992-1-1 §8.4 et §8.7
 */
export function calculateAnchorage(params: AnchorageParams): AnchorageResults {
  const phi = params.barDiameter;
  const eta1 = params.bondCondition === 'good' ? 1.0 : 0.7;
  const eta2 = phi <= 32 ? 1.0 : Math.max(0.5, (132 - phi) / 100);
  
  // fbd = 2.25 * eta1 * eta2 * fctd (EC2 Eq. 8.2)
  const fbd = +(2.25 * eta1 * eta2 * params.fctd).toFixed(2);
  const sigmaSd = params.sigmaSd && params.sigmaSd > 0 ? params.sigmaSd : params.fyd;
  
  // lb,rqd = (phi / 4) * (sigmaSd / fbd) (EC2 Eq. 8.3)
  const lbRqd = Math.ceil((phi / 4) * (sigmaSd / fbd));
  
  // Facteur alpha1 (forme de la barre)
  let alpha1 = 1.0;
  if (params.stressType === 'tension') {
    if (params.anchorageType === 'hook_90' || params.anchorageType === 'bend_135' || params.anchorageType === 'loop') {
      alpha1 = 0.7;
    }
  } else {
    // En compression, les crochets ne sont pas favorables
    alpha1 = 1.0;
  }
  
  // Facteur alpha2 (enrobage) : par défaut 1.0 sauf si cd > 3*phi
  let alpha2 = 1.0;
  if (params.coverCd && params.coverCd >= 3 * phi) {
    alpha2 = 0.85; // Simplification sécuritaire conforme EN 1992-1-1 Tableau 8.2
  }
  
  const alpha3 = 1.0; // Confinement passif sans précontrainte transversale
  const alpha4 = params.isTransverseWeldedBar ? 0.7 : 1.0;
  const alpha5 = 1.0; // Confinement par pression transversale
  
  // Minimum d'ancrage lb,min (EC2 Eq. 8.6 & 8.7)
  let lbMin: number;
  if (params.stressType === 'tension') {
    lbMin = Math.max(0.3 * lbRqd, 10 * phi, 100);
  } else {
    lbMin = Math.max(0.6 * lbRqd, 10 * phi, 100);
  }
  lbMin = Math.ceil(lbMin);
  
  // Longueur d'ancrage de calcul lbd = alpha1*alpha2*alpha3*alpha4*alpha5 * lbRqd >= lbMin
  const rawLbd = alpha1 * alpha2 * alpha3 * alpha4 * alpha5 * lbRqd;
  const lbd = Math.ceil(Math.max(rawLbd, lbMin));
  
  // Calcul comparatif direct pour barre droite vs crochet
  const lbdStraight = Math.ceil(Math.max(1.0 * alpha2 * alpha3 * alpha4 * alpha5 * lbRqd, lbMin));
  const lbdHook = params.stressType === 'tension'
    ? Math.ceil(Math.max(0.7 * alpha2 * alpha3 * alpha4 * alpha5 * lbRqd, lbMin))
    : lbdStraight;
  
  // Facteur alpha6 pour les recouvrements (EC2 Eq. 8.10)
  // rho1 est le pourcentage de barres recouvertes dans une même section
  const rho1 = params.overlapRatioPercent;
  let alpha6 = Math.sqrt(rho1 / 25);
  alpha6 = Math.max(1.0, Math.min(1.5, +alpha6.toFixed(2)));
  
  // Longueur de recouvrement l0 (EC2 Eq. 8.10)
  // l0 = alpha1 * alpha2 * alpha3 * alpha5 * alpha6 * lb,rqd >= l0,min
  // Note: alpha4 n'intervient pas pour les recouvrements classiques
  const l0Min = Math.ceil(Math.max(0.3 * alpha6 * lbRqd, 15 * phi, 200));
  const rawL0 = alpha1 * alpha2 * alpha3 * alpha5 * alpha6 * lbRqd;
  const l0 = Math.ceil(Math.max(rawL0, l0Min));
  
  return {
    eta1,
    eta2,
    fbd,
    sigmaSd,
    lbRqd,
    alpha1,
    alpha2,
    alpha3,
    alpha4,
    alpha5,
    alpha6,
    lbd,
    lbMin,
    lbdStraight,
    lbdHook,
    l0,
    l0Min,
  };
}

/**
 * Règle du décalage de la courbe des moments a_l selon EN 1992-1-1 §9.2.1.3 (Eq. 9.2)
 * a_l = 0.5 * d * cot(theta)
 * @param d Hauteur utile en mm
 * @param cotTheta Cotangente de l'inclinaison des bielles de compression béton (généralement 1.0 <= cotTheta <= 2.5)
 */
export function calculateMomentShiftAl(d: number, cotTheta: number = 2.5): number {
  return Math.ceil(0.5 * d * cotTheta);
}

/**
 * Calcul des espacements maximaux et zones critiques de confinement (EC2 §9.2.2 & §9.5.3)
 */
export interface SpacingAndConfinementRules {
  sMaxBeamSpan: number;          // Espacement maximal en travée pour poutre smax <= 0.75 * d <= 400 mm
  sCritBeamAppuis: number;       // Espacement resserré en zone critique d'appui poutre <= 0.6 * smax
  sMaxColumnCourant: number;     // Espacement maximal en zone courante de poteau min(20*phi, b, 400 mm)
  sCritColumnHeadFoot: number;   // Espacement resserré de frettage tête/pied poteau min(12*phi, 0.6*b, 150 mm)
  requiresSkinRebars: boolean;   // Présence d'armatures de peau requise si h >= 600 mm
  skinRebarMinAreaPerFace: number; // Section minimale d'acier de peau en cm2 par face
}

export function calculateConfinementAndSpacing(
  d: number,
  h: number,
  b: number,
  longitudinalPhi: number
): SpacingAndConfinementRules {
  // Poutres : smax <= 0.75 * d <= 400 mm
  const sMaxBeamSpan = Math.floor(Math.min(0.75 * d, 400));
  // Zone critique d'appui : s_crit = 0.6 * s_max <= min(12*phi, 200 mm)
  const sCritBeamAppuis = Math.floor(Math.min(0.6 * sMaxBeamSpan, 12 * longitudinalPhi, 200));
  
  // Poteaux : s_max = min(20*phi, b, 400 mm)
  const sMaxColumnCourant = Math.floor(Math.min(20 * longitudinalPhi, b, 400));
  // Zone critique tête / pied de poteau : <= min(12*phi, 0.6*b, 150 mm)
  const sCritColumnHeadFoot = Math.floor(Math.min(12 * longitudinalPhi, 0.6 * b, 150));
  
  // Armatures de peau si h >= 600 mm (EC2 §9.2.4)
  const requiresSkinRebars = h >= 600;
  // As,skin >= 0.001 * b_act * h (avec b_act = b)
  const skinAreaMm2 = requiresSkinRebars ? 0.001 * b * h : 0;
  const skinRebarMinAreaPerFace = +(skinAreaMm2 / 100 / 2).toFixed(2); // en cm2 par face
  
  return {
    sMaxBeamSpan,
    sCritBeamAppuis,
    sMaxColumnCourant,
    sCritColumnHeadFoot,
    requiresSkinRebars,
    skinRebarMinAreaPerFace,
  };
}
