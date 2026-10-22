/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Vérifications ELS : Limitation des Contraintes & Fissuration (EN 1992-1-1 §7.2 & §7.3)
 */

import { ConcreteGrade, RebarGrade } from './materials.ts';

export interface CrackingInput {
  momentMEdSer: number;      // Moment fléchissant de service kNm
  widthB: number;            // Largeur b (mm)
  heightH: number;           // Hauteur h (mm)
  effectiveDepthD: number;   // Hauteur utile d (mm)
  asProvidedCm2: number;     // Section d'aciers tendus fournie (cm²)
  barDiameterPhi: number;    // Diamètre des barres tendues (mm)
  barCount: number;          // Nombre de barres
  coverC: number;            // Enrobage cnom (mm)
  wMaxLimitMm?: number;      // Limite d'ouverture des fissures wmax (0.2, 0.3 ou 0.4 mm)
}

export interface CrackingOutput {
  // 1. Limitation des contraintes ELS (§7.2)
  sigmaCMPa: number;         // Contrainte de compression dans le béton sous Mser (MPa)
  sigmaCLimitMPa: number;    // Limite 0.60 * fck (MPa)
  isStressCOk: boolean;      // sigma_c <= 0.60 fck
  
  sigmaSMPa: number;         // Contrainte de traction dans les aciers sous Mser (MPa)
  sigmaSLimitMPa: number;    // Limite 0.80 * fyk (MPa)
  isStressSOk: boolean;      // sigma_s <= 0.80 fyk

  // 2. Calcul d'ouverture des fissures (§7.3.4)
  neutralAxisX1Mm: number;   // Position de l'axe neutre non fissuré / fissuré ELS (mm)
  leverArmZ1Mm: number;      // Bras de levier ELS (mm)
  effTensionAreaAcEffMm2: number; // Aire de béton tendu efficace Ac,eff (mm²)
  rhoPEff: number;           // Ratio d'armatures effectif rho_p,eff
  maxCrackSpacingSrMaxMm: number; // Espacement maximal des fissures sr,max (mm)
  meanStrainDiff: number;    // Différence moyenne de déformation (eps_sm - eps_cm)
  crackWidthWkMm: number;    // Ouverture caractéristique des fissures wk (mm)
  wMaxLimitMm: number;       // Valeur limite wmax (mm)
  isCrackWidthOk: boolean;   // wk <= wmax
  recommendation: string;
}

/**
 * Calcul complet des contraintes et de la fissuration selon l'Eurocode 2
 */
export function calculateSlsCrackingAndStresses(
  input: CrackingInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): CrackingOutput {
  const {
    momentMEdSer,
    widthB,
    heightH,
    effectiveDepthD,
    asProvidedCm2,
    barDiameterPhi,
    coverC,
    wMaxLimitMm = 0.3,
  } = input;

  const AsMm2 = Math.max(10, asProvidedCm2 * 100);
  const nAlpha = 15; // Coefficient d'équivalence acier/béton à long terme alpha_e

  // Résolution quadratique de l'axe neutre fissuré en flexion simple :
  // 0.5 * b * x1^2 + alpha_e * As * x1 - alpha_e * As * d = 0
  const A_quad = 0.5 * widthB;
  const B_quad = nAlpha * AsMm2;
  const C_quad = -nAlpha * AsMm2 * effectiveDepthD;
  const delta = B_quad * B_quad - 4 * A_quad * C_quad;
  const x1Mm = (-B_quad + Math.sqrt(Math.max(0, delta))) / (2 * A_quad);

  // Bras de levier z1 = d - x1 / 3
  const z1Mm = effectiveDepthD - x1Mm / 3;

  // Moment d'inertie de la section fissurée I_I
  const I_fiss = (widthB * Math.pow(x1Mm, 3)) / 3 + nAlpha * AsMm2 * Math.pow(effectiveDepthD - x1Mm, 2);

  const MserNmm = Math.abs(momentMEdSer) * 1e6;

  // Contrainte dans le béton comprimé : sigma_c = Mser * x1 / I_fiss
  const sigmaC = I_fiss > 0 ? (MserNmm * x1Mm) / I_fiss : 0;
  const sigmaCLimit = +(0.60 * concrete.fck).toFixed(2);
  const isStressCOk = sigmaC <= sigmaCLimit;

  // Contrainte dans les aciers tendus : sigma_s = alpha_e * Mser * (d - x1) / I_fiss
  const sigmaS = I_fiss > 0 ? (nAlpha * MserNmm * (effectiveDepthD - x1Mm)) / I_fiss : 0;
  const sigmaSLimit = +(0.80 * rebar.fyk).toFixed(2);
  const isStressSOk = sigmaS <= sigmaSLimit;

  // 2. Fissuration selon EN 1992-1-1 §7.3.4
  // Hauteur efficace de béton tendu hc,ef = min(2.5*(h - d), (h - x1)/3, h/2)
  const hcEff = Math.min(2.5 * (heightH - effectiveDepthD), (heightH - x1Mm) / 3, heightH / 2);
  const AcEff = widthB * hcEff;
  const rhoPEff = AcEff > 0 ? AsMm2 / AcEff : 0.01;

  // Espacement maximal des fissures :
  // sr,max = k3 * c + k1 * k2 * k4 * phi / rho_p,eff
  // k1 = 0.8 (haute adhérence), k2 = 0.5 (flexion), k3 = 3.4, k4 = 0.425
  const k1 = 0.8;
  const k2 = 0.5;
  const k3 = 3.4;
  const k4 = 0.425;
  const srMax = k3 * coverC + (k1 * k2 * k4 * barDiameterPhi) / Math.max(0.001, rhoPEff);

  // Déformation différentielle moyenne (eps_sm - eps_cm) :
  // (eps_sm - eps_cm) = max( (sigma_s - kt * (fct,eff / rho_p,eff) * (1 + alpha_e * rho_p,eff)) / Es, 0.6 * sigma_s / Es )
  const kt = 0.4; // chargement de longue durée
  const fctEff = concrete.fctm;
  const Es = rebar.Es; // 200 000 MPa

  const term1 = (sigmaS - kt * (fctEff / Math.max(0.001, rhoPEff)) * (1 + nAlpha * rhoPEff)) / Es;
  const term2 = (0.6 * sigmaS) / Es;
  const epsDiff = Math.max(term1, term2);

  // Ouverture de fissure calculée wk = sr,max * (eps_sm - eps_cm)
  const wk = +(srMax * epsDiff).toFixed(3);
  const isCrackWidthOk = wk <= wMaxLimitMm;

  let recommendation = 'Maîtrise de la fissuration satisfaisante.';
  if (!isCrackWidthOk) {
    recommendation = `Ouverture des fissures wk = ${wk} mm > limite wmax = ${wMaxLimitMm} mm. Réduire le diamètre des barres ou resserrer l'espacement.`;
  } else if (!isStressCOk) {
    recommendation = `Contrainte de compression du béton sigma_c = ${sigmaC.toFixed(1)} MPa > 0.60 fck (${sigmaCLimit} MPa). Augmenter la section ou la classe de béton.`;
  } else if (!isStressSOk) {
    recommendation = `Contrainte des aciers sigma_s = ${sigmaS.toFixed(1)} MPa > 0.80 fyk (${sigmaSLimit} MPa). Augmenter la section d'acier fournie.`;
  }

  return {
    sigmaCMPa: +sigmaC.toFixed(2),
    sigmaCLimitMPa: sigmaCLimit,
    isStressCOk,
    sigmaSMPa: +sigmaS.toFixed(2),
    sigmaSLimitMPa: sigmaSLimit,
    isStressSOk,
    neutralAxisX1Mm: +x1Mm.toFixed(1),
    leverArmZ1Mm: +z1Mm.toFixed(1),
    effTensionAreaAcEffMm2: +AcEff.toFixed(0),
    rhoPEff: +rhoPEff.toFixed(4),
    maxCrackSpacingSrMaxMm: +srMax.toFixed(1),
    meanStrainDiff: +epsDiff.toFixed(6),
    crackWidthWkMm: wk,
    wMaxLimitMm,
    isCrackWidthOk,
    recommendation,
  };
}
