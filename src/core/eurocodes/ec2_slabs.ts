/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Dalles & Planchers (EN 1992-1-1 §5.3, §6.4 & §9.3)
 * Intègre le choix personnalisé des diamètres et espacements (X et Y),
 * les armatures de répartition transversale, espacements maximaux et nomenclature ISO 3766.
 */

import { ConcreteGrade, RebarGrade } from './materials.ts';
import { calculateAnchorage, BondCondition, AnchorageType, AnchorageResults } from './ec2_anchorage.ts';

export type SlabFloorType = 'solid' | 'hollow_core' | 'precast_hollow' | 'composite_deck';
export type HollowBlockType = '12_4' | '16_4' | '20_5' | '25_5';

export interface HollowCoreDetails {
  systemName: string;
  totalThicknessMm: number;
  blockHeightMm: number;
  toppingThicknessMm: number;
  ribSpacingMm: number;
  ribWidthBwMm: number;
  momentPerRibKNm: number;
  shearPerRibKN: number;
  asRibRqdCm2: number;
  asRibProvidedCm2: number;
  ribRebarsText: string;
  topMeshText: string;
}

export interface SlabInput {
  floorType?: SlabFloorType; // Dalle pleine ou Plancher à corps creux
  hollowBlockType?: HollowBlockType; // 12+4, 16+4, 20+5, 25+5 cm
  thicknessH: number;        // Épaisseur de dalle h en mm (ex: 200 mm)
  spanLx: number;            // Portée dans le sens x en m (ex: 5.0 m)
  spanLy: number;            // Portée dans le sens y en m (ex: 6.5 m)
  slabType: 'one_way' | 'two_way'; // Dalle 1 sens ou 2 sens
  supportCondition: 'simple_supported' | 'continuous' | 'cantilever';
  coverC: number;            // Enrobage cnom en mm (ex: 25 mm)
  
  // Charges surfaciques
  deadLoadG: number;         // Charge permanente g (kN/m2) (hors poids propre, ex: 1.5 kN/m2)
  liveLoadQ: number;          // Charge d'exploitation q (kN/m2) (ex: 2.5 kN/m2)
  
  // Paramètres normatifs d'ancrage
  bondCondition: BondCondition;
  anchorageType: AnchorageType;
  overlapPercent: 25 | 33 | 50 | 100;

  // Choix personnalisés des armatures
  customPhiX?: number;       // Diamètre HA sens X (8, 10, 12, 14, 16 mm)
  customSpacingX?: number;   // Espacement e sens X (100, 125, 150, 200, 250 mm)
  customPhiY?: number;       // Diamètre HA sens Y (6, 8, 10, 12, 14 mm)
  customSpacingY?: number;   // Espacement e sens Y (100, 125, 150, 200, 250 mm)
}

export interface SlabRebarBar {
  count: number;
  diameter: number;
  layer: 'x_main' | 'y_distrib' | 'chapeau' | 'u_rive';
  shape: 'straight' | 'hooked' | 'u_frame';
  unitLengthM: number;
  totalWeightKg: number;
  details: string;
}

export interface SlabOutput {
  floorType: SlabFloorType;
  hollowCoreDetails?: HollowCoreDetails;
  selfWeightG0: number;      // Poids propre dalle (kN/m2)
  qEdELU: number;            // Charge surfacique ELU = 1.35*G + 1.5*Q (kN/m2)
  qEdELS: number;            // Charge surfacique ELS = G + Q (kN/m2)
  
  // Moments fléchissants
  mEdXKNm: number;           // Moment fléchissant de calcul en x (kNm/m)
  mEdYKNm: number;           // Moment fléchissant de calcul en y (kNm/m)
  mEdAppuiKNm: number;       // Moment sur appui de continuité
  
  // Hauteurs utiles
  dx: number;                // mm
  dy: number;                // mm
  
  // Sections d'armatures requises (cm2/m)
  asxRqdCm2PerM: number;
  asyRqdCm2PerM: number;
  asMinCm2PerM: number;
  asMaxCm2PerM: number;
  
  // Dispositions adoptées
  phiX: number;
  spacingX: number;
  asxProvidedCm2PerM: number;
  phiY: number;
  spacingY: number;
  asyProvidedCm2PerM: number;
  providedRebarsX: string;   // ex: "HA 10 e = 150 mm (5.24 cm2/m)"
  providedRebarsY: string;   // ex: "HA 8 e = 150 mm (3.35 cm2/m)"
  sMaxPermissibleMm: number; // s <= min(2*h, 250 mm)
  sActualMm: number;
  isSpacingCompliant: boolean;
  
  // Ancrage en about d'appui de rive
  anchorageRive: AnchorageResults;
  anchorageRequiredLengthMm: number;
  anchorageAdvice: string;
  
  // Vérification de flèche sans calcul direct
  lOverDRatio: number;
  lOverDLimit: number;
  deflectionCheckOk: boolean;

  // Nomenclature d'aciers ISO 3766
  rebarSchedule: SlabRebarBar[];
  totalSteelWeightKg: number;
  concreteVolumeM3: number;
}

export function calculateSlab(
  input: SlabInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): SlabOutput {
  const floorType: SlabFloorType = input.floorType || 'solid';
  const hollowType: HollowBlockType = input.hollowBlockType || '16_4';
  
  // Épaisseur et poids propre selon typologie de plancher
  let actualThicknessH = input.thicknessH;
  let selfWeightG0 = +(25 * (actualThicknessH / 1000)).toFixed(2);
  let blockH = 160;
  let toppingH = 40;

  if (floorType === 'hollow_core') {
    if (hollowType === '12_4') { actualThicknessH = 160; selfWeightG0 = 2.45; blockH = 120; toppingH = 40; }
    else if (hollowType === '16_4') { actualThicknessH = 200; selfWeightG0 = 2.75; blockH = 160; toppingH = 40; }
    else if (hollowType === '20_5') { actualThicknessH = 250; selfWeightG0 = 3.20; blockH = 200; toppingH = 50; }
    else if (hollowType === '25_5') { actualThicknessH = 300; selfWeightG0 = 3.70; blockH = 250; toppingH = 50; }
  } else if (floorType === 'precast_hollow') {
    actualThicknessH = 200;
    selfWeightG0 = 3.10;
  } else if (floorType === 'composite_deck') {
    actualThicknessH = 130;
    selfWeightG0 = 2.20;
  }

  const { spanLx, spanLy, slabType, supportCondition, coverC } = input;
  const thicknessH = actualThicknessH;
  
  const totalG = selfWeightG0 + input.deadLoadG;
  const qEdELU = +(1.35 * totalG + 1.5 * input.liveLoadQ).toFixed(2);
  const qEdELS = +(totalG + input.liveLoadQ).toFixed(2);
  
  const dx = thicknessH - coverC - 5; // mm
  const dy = dx - 10;                // mm
  
  let mEdXKNm = 0;
  let mEdYKNm = 0;
  let mEdAppuiKNm = 0;
  
  const alphaRatio = spanLx / spanLy;
  
  if (slabType === 'one_way' || alphaRatio < 0.4) {
    // Portance principale en X
    const coefSpan = supportCondition === 'continuous' ? 0.08 : 0.125;
    mEdXKNm = +(coefSpan * qEdELU * spanLx * spanLx).toFixed(2);
    mEdYKNm = +(0.20 * mEdXKNm).toFixed(2); // Répartition transversale minimale 20%
    mEdAppuiKNm = supportCondition === 'continuous' ? +(0.10 * qEdELU * spanLx * spanLx).toFixed(2) : 0;
  } else {
    // Dalle deux sens (table de Pigeaud / EC2 coefficients)
    const muX = 1 / (8 * (1 + 2.4 * Math.pow(alphaRatio, 3)));
    const muY = muX * Math.pow(alphaRatio, 2);
    mEdXKNm = +(muX * qEdELU * spanLx * spanLx).toFixed(2);
    mEdYKNm = +(muY * qEdELU * spanLy * spanLy).toFixed(2);
    mEdAppuiKNm = supportCondition === 'continuous' ? +(0.5 * mEdXKNm).toFixed(2) : 0;
  }
  
  // Calcul section d'acier par mètre linéaire (b = 1000 mm)
  const b = 1000;
  const fcd = concrete.fcd;
  const fyd = rebar.fyd;
  
  // Sens X
  const muXVal = (mEdXKNm * 1e6) / (b * dx * dx * fcd);
  const alphaX = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * muXVal)));
  const zX = dx * (1 - 0.4 * alphaX);
  const asxRawMm2 = (mEdXKNm * 1e6) / (zX * fyd);
  
  // Sens Y
  const muYVal = (mEdYKNm * 1e6) / (b * dy * dy * fcd);
  const alphaY = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * muYVal)));
  const zY = dy * (1 - 0.4 * alphaY);
  const asyRawMm2 = (mEdYKNm * 1e6) / (zY * fyd);
  
  // Sections minimales et maximales
  const asMinMm2PerM = Math.max(
    0.26 * (concrete.fctm / rebar.fyk) * b * dx,
    0.0013 * b * dx
  );
  const asMaxMm2PerM = 0.04 * b * thicknessH;
  
  const asxRqdCm2PerM = +(Math.max(asxRawMm2, asMinMm2PerM) / 100).toFixed(2);
  const asyRqdCm2PerM = +(Math.max(asyRawMm2, asMinMm2PerM * 0.2) / 100).toFixed(2);
  const asMinCm2PerM = +(asMinMm2PerM / 100).toFixed(2);
  const asMaxCm2PerM = +(asMaxMm2PerM / 100).toFixed(2);
  
  // Espacement maximal admissible EC2 §9.3.1.1(3) : s_max <= min(2*h, 250 mm)
  const sMaxPermissibleMm = Math.min(2 * thicknessH, 250);
  
  // Ferraillage préconisé ou personnalisé
  let phiX = input.customPhiX || 10;
  let spacingX = input.customSpacingX || 150;
  if (!input.customPhiX && !input.customSpacingX) {
    let area = +((1000 / spacingX) * (Math.PI * Math.pow(phiX / 2, 2) / 100)).toFixed(2);
    if (area < asxRqdCm2PerM) {
      phiX = 12;
    }
  }
  const areaXCm2 = +((1000 / spacingX) * (Math.PI * Math.pow(phiX / 2, 2) / 100)).toFixed(2);
  
  let phiY = input.customPhiY || 8;
  let spacingY = input.customSpacingY || 150;
  if (!input.customPhiY && !input.customSpacingY) {
    let area = +((1000 / spacingY) * (Math.PI * Math.pow(phiY / 2, 2) / 100)).toFixed(2);
    if (area < asyRqdCm2PerM) {
      phiY = 10;
    }
  }
  const areaYCm2 = +((1000 / spacingY) * (Math.PI * Math.pow(phiY / 2, 2) / 100)).toFixed(2);
  
  const providedRebarsX = `HA ${phiX} e = ${spacingX} mm (${areaXCm2} cm²/m)`;
  const providedRebarsY = `HA ${phiY} e = ${spacingY} mm (${areaYCm2} cm²/m)`;
  const sActualMm = Math.max(spacingX, spacingY);
  const isSpacingCompliant = sActualMm <= sMaxPermissibleMm;
  
  // Ancrage en abouts d'appuis de rives
  const anchorageRive = calculateAnchorage({
    barDiameter: phiX,
    fctd: concrete.fctd,
    fyd: rebar.fyd,
    bondCondition: input.bondCondition,
    anchorageType: input.anchorageType,
    stressType: 'tension',
    overlapRatioPercent: input.overlapPercent,
    coverCd: input.coverC,
  });
  
  const anchorageRequiredLengthMm = anchorageRive.lbd;
  const anchorageAdvice = `Ancrage d'about certifié : lbd = ${anchorageRequiredLengthMm} mm (crochet 90° ou boucle terminale U conseillée)`;
  
  // Ratio L/d de limitation de flèche
  const lOverDRatio = +((spanLx * 1000) / dx).toFixed(1);
  const rho = (asxRqdCm2PerM * 100) / (b * dx);
  const lOverDLimit = +(14 + 0.1 * Math.sqrt(concrete.fck) * (0.005 / rho)).toFixed(1);
  const deflectionCheckOk = lOverDRatio <= lOverDLimit;

  // Nomenclature d'aciers ISO 3766 pour la dalle entière
  const concreteVolumeM3 = +(spanLx * spanLy * (thicknessH / 1000)).toFixed(3);
  
  // Nappe principale X : barres de longueur spanLx + 2*lbd
  const countX = Math.ceil((spanLy * 1000) / spacingX) + 1;
  const unitLengthXM = +(spanLx + (2 * anchorageRequiredLengthMm) / 1000).toFixed(2);
  const linearMassX = phiX * phiX * 0.00617;
  const weightX = +(countX * unitLengthXM * linearMassX).toFixed(2);

  // Nappe de répartition transversale Y : barres de longueur spanLy
  const countY = Math.ceil((spanLx * 1000) / spacingY) + 1;
  const unitLengthYM = +(spanLy + 0.2).toFixed(2);
  const linearMassY = phiY * phiY * 0.00617;
  const weightY = +(countY * unitLengthYM * linearMassY).toFixed(2);

  // Chapeaux de rive / U de bord libre
  const countChapeaux = 2 * Math.ceil((spanLy * 1000) / spacingX);
  const unitLengthChap = +(Math.min(1.5, spanLx * 0.25) + 0.2).toFixed(2);
  const weightChap = +(countChapeaux * unitLengthChap * linearMassX).toFixed(2);

  const rebarSchedule: SlabRebarBar[] = [
    {
      count: countX,
      diameter: phiX,
      layer: 'x_main',
      shape: input.anchorageType === 'hook_90' ? 'hooked' : 'straight',
      unitLengthM: unitLengthXM,
      totalWeightKg: weightX,
      details: `Nappe principale inférieure X (e = ${spacingX} mm)`,
    },
    {
      count: countY,
      diameter: phiY,
      layer: 'y_distrib',
      shape: 'straight',
      unitLengthM: unitLengthYM,
      totalWeightKg: weightY,
      details: `Armatures de répartition transversale Y (e = ${spacingY} mm)`,
    },
    {
      count: countChapeaux,
      diameter: phiX,
      layer: 'chapeau',
      shape: 'hooked',
      unitLengthM: unitLengthChap,
      totalWeightKg: weightChap,
      details: 'Chapeaux de continuité / rives (0.2 Lx)',
    },
  ];

  const totalSteelWeightKg = +(weightX + weightY + weightChap).toFixed(1);

  // Détails spécifiques si plancher corps creux
  let hollowCoreDetails: HollowCoreDetails | undefined;
  if (floorType === 'hollow_core') {
    const mRib = +(mEdXKNm * 0.60).toFixed(2); // entraxe 0.60m
    const vRib = +(qEdELU * (spanLx / 2) * 0.60).toFixed(2);
    const asRibRqd = +(asxRqdCm2PerM * 0.60).toFixed(2);
    // Poutrelle avec 2 barres tendues HA10/HA12
    const asRibProvided = asRibRqd <= 1.57 ? 1.57 : asRibRqd <= 2.26 ? 2.26 : 3.08;
    const ribText = asRibRqd <= 1.57 ? '2 HA 10 (1.57 cm²)' : asRibRqd <= 2.26 ? '2 HA 12 (2.26 cm²)' : '2 HA 14 (3.08 cm²)';
    
    hollowCoreDetails = {
      systemName: `Plancher Corps Creux ${hollowType.replace('_', '+')} cm (Poutrelles + Entrevous)`,
      totalThicknessMm: thicknessH,
      blockHeightMm: blockH,
      toppingThicknessMm: toppingH,
      ribSpacingMm: 600,
      ribWidthBwMm: 120,
      momentPerRibKNm: mRib,
      shearPerRibKN: vRib,
      asRibRqdCm2: asRibRqd,
      asRibProvidedCm2: asRibProvided,
      ribRebarsText: ribText,
      topMeshText: `Treillis anti-fissuration PAF R (maille 200x200 Ø${toppingH >= 50 ? 5 : 4.5} mm)`,
    };
  }

  return {
    floorType,
    hollowCoreDetails,
    selfWeightG0,
    qEdELU,
    qEdELS,
    mEdXKNm,
    mEdYKNm,
    mEdAppuiKNm,
    dx,
    dy,
    asxRqdCm2PerM,
    asyRqdCm2PerM,
    asMinCm2PerM,
    asMaxCm2PerM,
    phiX,
    spacingX,
    asxProvidedCm2PerM: areaXCm2,
    phiY,
    spacingY,
    asyProvidedCm2PerM: areaYCm2,
    providedRebarsX,
    providedRebarsY,
    sMaxPermissibleMm,
    sActualMm,
    isSpacingCompliant,
    anchorageRive,
    anchorageRequiredLengthMm,
    anchorageAdvice,
    lOverDRatio,
    lOverDLimit,
    deflectionCheckOk,
    rebarSchedule,
    totalSteelWeightKg,
    concreteVolumeM3,
  };
}
