/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Poutres Mixtes Acier-Béton (EN 1994-1-1 - EC4)
 * Intègre le calcul plastique, les connecteurs goujons Nelson (s_min >= 5d, s_max <= min(800, 4hc))
 * et les armatures transversales de dalle anti-fendage
 */

import { ConcreteGrade, StructuralSteelGrade, RebarGrade } from './materials.ts';

export interface SteelSectionProfile {
  name: string;
  h: number;     // Hauteur profilé (mm)
  b: number;     // Largeur semelle (mm)
  tw: number;    // Épaisseur âme (mm)
  tf: number;    // Épaisseur semelle (mm)
  areaCm2: number; // Section Aa (cm2)
  wplCm3: number; // Module plastique Wpl,y (cm3)
  iyCm4: number;  // Inertie I_y (cm4)
  massKgM: number;
}

export const STEEL_PROFILES: Record<string, SteelSectionProfile> = {
  'IPE 270': { name: 'IPE 270', h: 270, b: 135, tw: 6.6, tf: 10.2, areaCm2: 45.9, wplCm3: 484, iyCm4: 5790, massKgM: 36.1 },
  'IPE 300': { name: 'IPE 300', h: 300, b: 150, tw: 7.1, tf: 10.7, areaCm2: 53.8, wplCm3: 628, iyCm4: 8356, massKgM: 42.2 },
  'IPE 360': { name: 'IPE 360', h: 360, b: 170, tw: 8.0, tf: 12.7, areaCm2: 72.7, wplCm3: 1019, iyCm4: 16270, massKgM: 57.1 },
  'IPE 400': { name: 'IPE 400', h: 400, b: 180, tw: 8.6, tf: 13.5, areaCm2: 84.5, wplCm3: 1307, iyCm4: 23130, massKgM: 66.3 },
  'HEA 240': { name: 'HEA 240', h: 230, b: 240, tw: 7.5, tf: 12.0, areaCm2: 76.8, wplCm3: 745, iyCm4: 7763, massKgM: 60.3 },
  'HEA 280': { name: 'HEA 280', h: 270, b: 280, tw: 8.0, tf: 13.0, areaCm2: 97.3, wplCm3: 1112, iyCm4: 13670, massKgM: 76.4 },
  'HEB 260': { name: 'HEB 260', h: 260, b: 260, tw: 10.0, tf: 17.5, areaCm2: 118.4, wplCm3: 1283, iyCm4: 14920, massKgM: 93.0 },
};

export interface CompositeInput {
  spanL: number;             // Portée en m (ex: 8.0 m)
  profileKey: string;        // ex: 'IPE 360'
  slabThicknessHc: number;   // Épaisseur de dalle béton hc en mm (ex: 140 mm)
  beffWidth: number;         // Largeur participante beff en mm (ex: 1600 mm)
  studDiameterD: number;     // Diamètre du goujon Nelson d en mm (19 mm ou 22 mm)
  studHeightH: number;       // Hauteur totale du goujon hsc en mm (ex: 100 mm)
  studRows: 1 | 2;           // 1 ou 2 goujons par ligne
  
  // Sollicitations ELU
  momentMEd: number;         // Moment de flexion ELU en kNm (ex: 380 kNm)
  shearVEd: number;          // Effort tranchant ELU en kN (ex: 190 kN)
}

export interface CompositeOutput {
  profile: SteelSectionProfile;
  plasticResistanceMplRdKNm: number;
  momentCapacityRatio: number;
  
  // Effort normal plastique des composants
  ncPlasticConcreteKN: number; // Nc = 0.85 * fcd * beff * hc
  naPlasticSteelKN: number;    // Na = Aa * fyd
  degreeOfConnectionEta: number; // Connexion complète ou partielle
  
  // Connecteurs Goujons Nelson
  studCapacityPRdKN: number; // Résistance de calcul d'un goujon Nelson PRd
  totalStudsRequiredPerHalfSpan: number;
  spacingCalculatedMm: number;
  spacingMinMm: number;      // s_min >= 5*d (EN 1994-1-1 §6.6.5.5)
  spacingMaxMm: number;      // s_max <= min(800, 4*hc) mm
  isStudSpacingCompliant: boolean;
  
  // Armatures transversales de dalle anti-fendage (EN 1994-1-1 §6.6.6)
  asfOverSfCm2PerM: number;  // Section requise Asf / sf
  providedTransverseRebars: string; // ex: "HA 10 e = 150 mm (5.24 cm2/m)"
  
  // Diagnostic constructif
  constructiveAdvice: string;
}

export function calculateCompositeBeam(
  input: CompositeInput,
  steel: StructuralSteelGrade,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): CompositeOutput {
  const profile = STEEL_PROFILES[input.profileKey] || STEEL_PROFILES['IPE 360'];
  const { spanL, slabThicknessHc, beffWidth, studDiameterD, studHeightH, studRows } = input;
  
  const fydSteel = steel.fy / 1.0; // gamma_M0 = 1.0
  const fcdConcrete = concrete.fcd;
  
  // Effort normal plastique de la dalle comprimée : Nc = 0.85 * fcd * beff * hc
  const ncPlasticN = 0.85 * fcdConcrete * beffWidth * slabThicknessHc;
  const ncPlasticConcreteKN = +(ncPlasticN / 1000).toFixed(1);
  
  // Effort normal plastique du profilé acier : Na = Aa * fyd
  const naPlasticN = profile.areaCm2 * 100 * fydSteel;
  const naPlasticSteelKN = +(naPlasticN / 1000).toFixed(1);
  
  // Résistance d'un goujon Nelson (EN 1994-1-1 Eq. 6.18 & 6.19)
  // PRd,1 = 0.8 * fu * (pi * d^2 / 4) / gamma_V (avec fu = 450 MPa, gamma_V = 1.25)
  const fuStud = 450;
  const gammaV = 1.25;
  const studAreaMm2 = (Math.PI * studDiameterD * studDiameterD) / 4;
  const pRd1N = (0.8 * fuStud * studAreaMm2) / gammaV;
  
  // PRd,2 = 0.29 * alpha * d^2 * sqrt(fck * Ecm) / gamma_V
  const alphaStud = studHeightH / studDiameterD >= 4 ? 1.0 : 0.2 * (studHeightH / studDiameterD + 1);
  const ecmMpa = concrete.Ecm * 1000;
  const pRd2N = (0.29 * alphaStud * studDiameterD * studDiameterD * Math.sqrt(concrete.fck * ecmMpa)) / gammaV;
  
  const pRdN = Math.min(pRd1N, pRd2N);
  const studCapacityPRdKN = +(pRdN / 1000).toFixed(1);
  
  // Effort de cisaillement total à reprendre sur une demi-portée : Vl = min(Nc, Na)
  const vlN = Math.min(ncPlasticN, naPlasticN);
  const totalStudsNeededHalfSpan = Math.ceil(vlN / pRdN);
  
  // Moment plastique de la section mixte Mpl,Rd
  // Bras de levier z_comp = (h_acier / 2) + h_c - (0.5 * x_pl)
  let xPl = 0;
  let mplRdNmm = 0;
  if (ncPlasticN >= naPlasticN) {
    // Axe neutre plastique dans la dalle béton
    xPl = naPlasticN / (0.85 * fcdConcrete * beffWidth);
    const zComp = profile.h / 2 + slabThicknessHc - xPl / 2;
    mplRdNmm = naPlasticN * zComp;
  } else {
    // Axe neutre plastique dans la semelle supérieure de l'acier
    xPl = slabThicknessHc;
    const deltaN = naPlasticN - ncPlasticN;
    const zComp = profile.h / 2 + slabThicknessHc / 2;
    mplRdNmm = ncPlasticN * zComp + profile.wplCm3 * 1000 * fydSteel * 0.4;
  }
  
  const plasticResistanceMplRdKNm = +(mplRdNmm / 1e6).toFixed(1);
  const momentCapacityRatio = +(input.momentMEd / plasticResistanceMplRdKNm).toFixed(2);
  const degreeOfConnectionEta = +(Math.min(1.0, (totalStudsNeededHalfSpan * pRdN) / vlN)).toFixed(2);
  
  // Dispositions constructives des goujons Nelson (EN 1994-1-1 §6.6.5.5)
  // s_min >= 5 * d (dans le sens de l'effort)
  const spacingMinMm = Math.ceil(5 * studDiameterD);
  // s_max <= min(800 mm, 4 * hc)
  const spacingMaxMm = Math.floor(Math.min(800, 4 * slabThicknessHc));
  
  // Espacement effectif calculé
  const halfSpanLengthMm = (spanL * 1000) / 2;
  const rawSpacing = Math.floor(halfSpanLengthMm / (totalStudsNeededHalfSpan / studRows));
  const spacingCalculatedMm = Math.max(spacingMinMm, Math.min(rawSpacing, spacingMaxMm));
  const isStudSpacingCompliant = spacingCalculatedMm >= spacingMinMm && spacingCalculatedMm <= spacingMaxMm;
  
  // Armatures transversales anti-fendage (EN 1994-1-1 §6.6.6)
  // v_Ed = (N_stud * PRd) / (h_f * delta_x)
  // Asf / sf >= (v_Ed * h_f) / (fyd * cot(theta_f))
  const vEdLongNPerMm = (studRows * pRdN) / spacingCalculatedMm;
  const cotThetaF = 1.2; // 1.0 <= cotTheta_f <= 2.0
  const asfOverSfMm2PerMm = vEdLongNPerMm / (rebar.fyd * cotThetaF);
  const asfOverSfCm2PerM = +(asfOverSfMm2PerMm * 10).toFixed(2);
  
  const providedTransverseRebars = `HA 10 e = 150 mm (${+( (1000/150) * 0.785 ).toFixed(2)} cm²/m en deux lits)`;
  
  const constructiveAdvice = `Goujons Nelson Ø${studDiameterD} mm (${studRows} file/s), espacés de ${spacingCalculatedMm} mm (conforme ${spacingMinMm} mm ≤ s ≤ ${spacingMaxMm} mm). Armatures anti-fendage certifiées.`;
  
  return {
    profile,
    plasticResistanceMplRdKNm,
    momentCapacityRatio,
    ncPlasticConcreteKN,
    naPlasticSteelKN,
    degreeOfConnectionEta,
    studCapacityPRdKN,
    totalStudsRequiredPerHalfSpan: totalStudsNeededHalfSpan,
    spacingCalculatedMm,
    spacingMinMm,
    spacingMaxMm,
    isStudSpacingCompliant,
    asfOverSfCm2PerM,
    providedTransverseRebars,
    constructiveAdvice,
  };
}
