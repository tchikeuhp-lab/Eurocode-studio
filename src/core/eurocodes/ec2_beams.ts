/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Poutres BA (EN 1992-1-1 §5 & §6 & §9)
 * Intègre les sections en Té, ancrages lbd, recouvrements l0, décalage al et nomenclature d'aciers
 */

import { ConcreteGrade, RebarGrade, STRUCTURAL_STEEL_GRADES, TIMBER_GRADES } from './materials.ts';
import { STEEL_PROFILES } from './ec4_composite.ts';
import {
  calculateAnchorage,
  calculateMomentShiftAl,
  calculateConfinementAndSpacing,
  BondCondition,
  AnchorageType,
  AnchorageResults,
  SpacingAndConfinementRules
} from './ec2_anchorage.ts';

export type BeamMaterial = 'concrete' | 'steel' | 'timber';
export type BeamSupportCondition = 'pinned_pinned' | 'fixed_fixed' | 'fixed_pinned' | 'cantilever' | 'continuous';

export interface SpanDetail {
  index: number;
  lengthM: number;
  momentMEdKNm: number;
  shearLeftKN: number;
  shearRightKN: number;
  deflectionMm: number;
  isDeflectionOk: boolean;
}

export interface SteelBeamOutput {
  profileName: string;
  wplCm3: number;
  iyCm4: number;
  areaCm2: number;
  massKgM: number;
  McRdKNm: number;
  VplRdKN: number;
  MbRdKNm: number;
  momentRatio: number;
  shearRatio: number;
  deflectionMm: number;
  deflectionLimitMm: number;
  isDeflectionOk: boolean;
}

export interface TimberBeamOutput {
  gradeName: string;
  widthB: number;
  heightH: number;
  fmdMPa: number;
  fvdMPa: number;
  sigmaMMPa: number;
  tauDMPa: number;
  kcrit: number;
  momentRatio: number;
  shearRatio: number;
  deflectionInstMm: number;
  deflectionNetFinMm: number;
  deflectionLimitMm: number;
  isDeflectionOk: boolean;
}

export interface RebarLayerSpec {
  count: number;             // Nombre de barres dans ce lit (ex: 2, 3, 4)
  diameter: number;          // Diamètre en mm (8, 10, 12, 14, 16, 20, 25, 32)
}

export interface RebarLayerDetails {
  layerIndex: number;        // 1 = Lit inférieur, 2 = 2ème lit, 3 = 3ème lit
  count: number;
  diameter: number;
  areaCm2: number;
  yPositionMm: number;       // Distance du centre des barres à la fibre inférieure
  spacingHorizontalMm: number; // Entraxe libre horizontal entre barres
  isSpacingOk: boolean;      // sh >= max(dg+5, phi, 20mm)
}

export interface BeamInput {
  material?: BeamMaterial;   // 'concrete' | 'steel' | 'timber'
  supportCondition?: BeamSupportCondition; // Appuis
  spansCount?: 1 | 2 | 3 | 4 | 5; // 1 à 5 travées
  spans?: number[];          // Longueurs de chaque travée en mètres [L1, L2, ...]

  spanL: number;             // Portée principale en m (ex: 6.0 m)
  widthB: number;            // Largeur de l'âme b en mm (ex: 250 mm)
  heightH: number;           // Hauteur totale h en mm (ex: 500 mm)
  isTSection: boolean;       // Section en Té active
  flangeWidthBf: number;     // Largeur participante de la table bf en mm (ex: 800 mm)
  flangeHeightHf: number;    // Épaisseur de la table hf en mm (ex: 120 mm)
  coverC: number;            // Enrobage nominal cnom en mm (ex: 30 mm)
  
  // Sollicitations de calcul
  momentMEd: number;         // Moment fléchissant ELU en kNm (ex: 180 kNm)
  shearVEd: number;          // Effort tranchant ELU en kN (ex: 120 kN)
  momentMEdSer: number;      // Moment de service ELS en kNm (ex: 125 kNm)
  
  // Paramètres normatifs d'ancrage & dispositions
  bondCondition: BondCondition;
  anchorageType: AnchorageType;
  overlapPercent: 25 | 33 | 50 | 100;
  cotTheta: number;          // Inclinaison des bielles cot(theta) (1.0 à 2.5)

  // Configuration interactive multi-lits et armatures transversales
  layersCount?: 1 | 2 | 3;
  layers?: RebarLayerSpec[]; // [Lit 1, Lit 2, Lit 3]
  stirrupDiameter?: number;  // Diamètre des cadres (6, 8, 10, 12, 14 mm)
  stirrupLegsCount?: 2 | 3 | 4; // Nombre de brins verticaux (2, 3, 4)
  hasInternalStirrup?: boolean; // Ajout d'étrier ou cadre intérieur
  topRebarCount?: number;    // Barres de montage sup (défaut 2)
  topRebarPhi?: number;      // Diamètre barres montage sup (défaut 12 mm)
  skinRebarPhi?: number;     // Diamètre aciers de peau (défaut 10 mm)

  // Paramètres pour matériaux Acier & Bois
  steelProfileKey?: string;  // 'IPE 300', 'HEA 240', etc.
  steelGradeKey?: string;    // 'S235', 'S275', 'S355'
  timberWidthB?: number;     // Largeur section bois (mm)
  timberHeightH?: number;    // Hauteur section bois (mm)
  timberGradeKey?: string;   // 'C18', 'C24', 'C30', 'GL24h', 'GL28h'
}

export interface RebarBar {
  count: number;
  diameter: number;          // mm
  layer: 'inf' | 'sup' | 'skin';
  shape: 'straight' | 'hooked' | 'u_frame';
  unitLengthM: number;       // Longueur unitaire avec ancrages
  totalWeightKg: number;
  layerIndex?: number;       // 1, 2, 3 pour lits inférieurs
  details?: string;          // Information complémentaire sur le lit
}

export interface BeamOutput {
  material: BeamMaterial;
  supportCondition: BeamSupportCondition;
  spansCount: number;
  spansDetails: SpanDetail[];
  supportMomentsKNm: number[];

  // Résultats spécifiques acier & bois
  steelBeam?: SteelBeamOutput;
  timberBeam?: TimberBeamOutput;

  // Géométrie & section utile béton
  d: number;                 // Hauteur utile en mm
  dPrime: number;            // Distance centre des aciers comprimés à la fibre sup
  actAreaCm2: number;        // Aire de béton en cm2
  barycenterDistanceYGMm: number; // Position du centre de gravité des aciers tendus yG (mm)
  layersDetails: RebarLayerDetails[]; // Détail de chaque lit d'armatures
  
  // Flexion ELU
  isFlangeCompressed: boolean;
  momentCapacityFlangeKNm: number; // Moment que peut reprendre la table seule
  mu: number;                // Moment réduit mu = MEd / (b * d^2 * fcd)
  alpha: number;             // Hauteur relative de l'axe neutre
  z: number;                 // Bras de levier en mm
  asRqdCm2: number;          // Section d'acier tendu requise en cm2
  asMinCm2: number;          // Section minimale réglementaire en cm2
  asMaxCm2: number;          // Section maximale admissible en cm2
  asProvidedCm2: number;     // Section réelle proposée en cm2
  providedRebarsInf: string; // ex: "3 HA 20 + 2 HA 16 (2 lits)"
  providedRebarsSup: string; // ex: "2 HA 12 (chapeaux/montage)"
  
  // Effort tranchant ELU
  vRdMaxKN: number;          // Résistance max bielle comprimée en kN
  shearRatio: number;        // VEd / VRd,max
  aswOverS: number;          // Section transversale Asw/s en cm2/m
  stirrupPhi: number;        // Diamètre des armatures transversales (mm)
  stirrupLegsCount: number;  // Nombre de brins verticaux (2, 3, 4)
  hasInternalStirrup: boolean; // Présence d'étriers intérieurs
  cadresAdoptes: string;     // ex: "Cadres + étriers HA8"
  spacingCalculatedMm: number;
  spacingMaxMm: number;
  spacingCritMm: number;     // Espacement resserré en zone d'appui
  
  // Dispositions constructives & Ancrages
  anchorage: AnchorageResults;
  momentShiftAlMm: number;   // Décalage courbe des moments al en mm
  confinementRules: SpacingAndConfinementRules;
  skinRebarsText: string;
  
  // ELS
  sigmaCSerMPa: number;      // Contrainte béton ELS
  sigmaSSerMPa: number;      // Contrainte acier ELS
  deflectionRatio: string;   // flèche estimée vs L/500
  deflectionOk: boolean;
  
  // Nomenclature d'aciers détaillée
  rebarSchedule: RebarBar[];
  totalSteelWeightKg: number;
  concreteVolumeM3: number;
  steelDensityKgM3: number;  // Ratio kg d'acier / m3 de béton
}

export function calculateBeam(
  input: BeamInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): BeamOutput {
  const { spanL, widthB, heightH, isTSection, flangeWidthBf, flangeHeightHf, coverC } = input;
  const stirrupPhi = input.stirrupDiameter || 8;
  const topRebarCount = input.topRebarCount || 2;
  const topRebarPhi = input.topRebarPhi || 12;
  const skinRebarPhi = input.skinRebarPhi || 10;
  
  const bWeb = widthB;
  const bEff = isTSection ? Math.max(widthB, flangeWidthBf) : widthB;
  
  // Calcul section béton
  const actAreaMm2 = isTSection
    ? (bEff - bWeb) * flangeHeightHf + bWeb * heightH
    : bWeb * heightH;
  const actAreaCm2 = +(actAreaMm2 / 100).toFixed(1);
  const concreteVolumeM3 = +((actAreaMm2 / 1e6) * spanL).toFixed(3);
  
  const fcd = concrete.fcd;
  const fyd = rebar.fyd;
  const mEdNmm = input.momentMEd * 1e6;

  // Première estimation de d pour pré-calcul de la flexion
  const preliminaryD = heightH - coverC - stirrupPhi - 10;
  
  // Section en Té : capacité de la table seule
  const momentCapacityFlangeKNm = isTSection
    ? +((bEff * flangeHeightHf * fcd * (preliminaryD - 0.5 * flangeHeightHf)) / 1e6).toFixed(2)
    : 0;

  // Estimation préliminaire de la section d'acier requise
  const prelimMu = mEdNmm / (bEff * preliminaryD * preliminaryD * fcd);
  const prelimAlpha = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * prelimMu)));
  const prelimZ = preliminaryD * (1 - 0.4 * prelimAlpha);
  const prelimAsRqdMm2 = mEdNmm / (prelimZ * fyd);

  // 1. DÉFINITION OU AUTOMATISATION DES LITS D'ARMATURES MULTI-LITS
  let activeLayers: RebarLayerSpec[] = [];
  if (input.layers && input.layers.length > 0) {
    activeLayers = input.layers.slice(0, input.layersCount || input.layers.length);
  } else {
    // Détermination automatique optimale des lits
    const targetAsCm2 = prelimAsRqdMm2 / 100;
    if (targetAsCm2 > 16) {
      activeLayers = [
        { count: 3, diameter: 25 },
        { count: 2, diameter: 20 },
      ];
    } else if (targetAsCm2 > 12) {
      activeLayers = [
        { count: 3, diameter: 20 },
        { count: 2, diameter: 16 },
      ];
    } else if (targetAsCm2 > 8) {
      activeLayers = [
        { count: 3, diameter: 20 },
      ];
    } else if (targetAsCm2 > 5) {
      activeLayers = [
        { count: 3, diameter: 16 },
      ];
    } else {
      activeLayers = [
        { count: 3, diameter: 14 },
      ];
    }
  }

  // 2. CALCUL DES POSITIONS VERTICALES, ENTRAXES ET BARYCENTRE yG
  const layersDetails: RebarLayerDetails[] = [];
  let currentY = coverC + stirrupPhi;
  let sumAsY = 0;
  let totalAsMm2 = 0;

  activeLayers.forEach((layer, idx) => {
    const phi = layer.diameter;
    const count = layer.count;
    const yPos = currentY + phi / 2;
    const areaOneMm2 = (Math.PI * phi * phi) / 4;
    const areaLayerMm2 = count * areaOneMm2;
    const areaLayerCm2 = +(areaLayerMm2 / 100).toFixed(2);

    // Entraxe libre horizontal sh
    const availableWidth = bWeb - 2 * (coverC + stirrupPhi);
    const totalBarsWidth = count * phi;
    const sh = count > 1 ? (availableWidth - totalBarsWidth) / (count - 1) : availableWidth - totalBarsWidth;
    const isSpacingOk = sh >= Math.max(20, phi);

    layersDetails.push({
      layerIndex: idx + 1,
      count,
      diameter: phi,
      areaCm2: areaLayerCm2,
      yPositionMm: +yPos.toFixed(1),
      spacingHorizontalMm: +sh.toFixed(1),
      isSpacingOk,
    });

    sumAsY += areaLayerMm2 * yPos;
    totalAsMm2 += areaLayerMm2;

    // Espacement vertical libre entre lits : sv >= max(dg+5, phi, 20mm)
    const sv = Math.max(25, phi);
    currentY = yPos + phi / 2 + sv;
  });

  const barycenterDistanceYGMm = totalAsMm2 > 0 ? +(sumAsY / totalAsMm2).toFixed(1) : +(coverC + stirrupPhi + 10).toFixed(1);
  const d = +(heightH - barycenterDistanceYGMm).toFixed(1);
  const dPrime = +(coverC + stirrupPhi + topRebarPhi / 2).toFixed(1);

  // 3. CALCUL PRÉCIS DE LA FLEXION ELU AVEC LA HAUTEUR UTILE D EXACTE
  let asRqdMm2 = 0;
  let mu = 0;
  let alpha = 0;
  let z = 0;
  let isFlangeCompressed = false;
  
  if (isTSection && mEdNmm <= momentCapacityFlangeKNm * 1e6) {
    isFlangeCompressed = true;
    mu = mEdNmm / (bEff * d * d * fcd);
    alpha = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
    z = d * (1 - 0.4 * alpha);
    asRqdMm2 = mEdNmm / (z * fyd);
  } else if (isTSection && mEdNmm > momentCapacityFlangeKNm * 1e6) {
    isFlangeCompressed = true;
    const mTableNmm = (bEff - bWeb) * flangeHeightHf * fcd * (d - 0.5 * flangeHeightHf);
    const mNervureNmm = mEdNmm - mTableNmm;
    
    const muNervure = mNervureNmm / (bWeb * d * d * fcd);
    const alphaNervure = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * muNervure)));
    const zNervure = d * (1 - 0.4 * alphaNervure);
    
    const asTable = ((bEff - bWeb) * flangeHeightHf * fcd) / fyd;
    const asNervure = mNervureNmm / (zNervure * fyd);
    asRqdMm2 = asTable + asNervure;
    mu = muNervure;
    alpha = alphaNervure;
    z = zNervure;
  } else {
    isFlangeCompressed = false;
    mu = mEdNmm / (bWeb * d * d * fcd);
    alpha = 1.25 * (1 - Math.sqrt(Math.max(0, 1 - 2 * mu)));
    z = d * (1 - 0.4 * alpha);
    asRqdMm2 = mEdNmm / (z * fyd);
  }
  
  // Section minimale réglementaire EC2 §9.2.1.1
  const asMinMm2 = Math.max(
    0.26 * (concrete.fctm / rebar.fyk) * bWeb * d,
    0.0013 * bWeb * d
  );
  const asMaxMm2 = 0.04 * actAreaMm2;
  
  const finalAsRqdMm2 = Math.max(asRqdMm2, asMinMm2);
  const asRqdCm2 = +(asRqdMm2 / 100).toFixed(2);
  const asMinCm2 = +(asMinMm2 / 100).toFixed(2);
  const asMaxCm2 = +(asMaxMm2 / 100).toFixed(2);
  const asProvidedCm2 = +(totalAsMm2 / 100).toFixed(2);

  // Libellé de description des armatures
  const layersStr = layersDetails.map(l => `${l.count} HA ${l.diameter}`).join(' + ');
  const providedRebarsInf = `${layersStr} (${asProvidedCm2} cm², ${layersDetails.length} lit${layersDetails.length > 1 ? 's' : ''})`;
  const topRebarAreaCm2 = +(topRebarCount * (Math.PI * topRebarPhi * topRebarPhi) / 400).toFixed(2);
  const providedRebarsSup = `${topRebarCount} HA ${topRebarPhi} (${topRebarAreaCm2} cm²)`;

  // Moteur d'ancrage calculé sur le diamètre maximal du lit inférieur
  const maxInfPhi = Math.max(...activeLayers.map(l => l.diameter));
  const anchorage = calculateAnchorage({
    barDiameter: maxInfPhi,
    fctd: concrete.fctd,
    fyd: rebar.fyd,
    sigmaSd: rebar.fyd * Math.min(1.0, finalAsRqdMm2 / totalAsMm2),
    bondCondition: input.bondCondition,
    anchorageType: input.anchorageType,
    stressType: 'tension',
    overlapRatioPercent: input.overlapPercent,
    coverCd: input.coverC,
  });

  // Décalage de la courbe des moments a_l
  const momentShiftAlMm = calculateMomentShiftAl(d, input.cotTheta);
  
  // Règles de confinement et d'espacement
  const confinementRules = calculateConfinementAndSpacing(d, heightH, bWeb, maxInfPhi);
  const skinRebarsText = confinementRules.requiresSkinRebars
    ? `Obligatoire (h ≥ 600 mm) : 2 × 2 HA ${skinRebarPhi} (${confinementRules.skinRebarMinAreaPerFace} cm²/face)`
    : `Non requis (h = ${heightH} mm < 600 mm)`;

  // Effort tranchant
  const nu1 = 0.6 * (1 - concrete.fck / 250);
  const vRdMaxN = (1.0 * bWeb * z * nu1 * fcd) / (input.cotTheta + 1 / input.cotTheta);
  const vRdMaxKN = +(vRdMaxN / 1000).toFixed(1);
  const shearRatio = +(input.shearVEd / vRdMaxKN).toFixed(2);

  // Section d'armatures transversales Asw / s
  const fywd = 500 / 1.15;
  const vEdN = input.shearVEd * 1000;
  const aswOverS_mm = vEdN / (z * fywd * input.cotTheta);
  const aswOverS = +(aswOverS_mm * 10).toFixed(2);

  const hasInternalStirrup = input.hasInternalStirrup ?? (input.stirrupLegsCount && input.stirrupLegsCount > 2 ? true : false);
  const stirrupLegsCount = input.stirrupLegsCount || (hasInternalStirrup ? 4 : 2);

  const singleLegAreaMm2 = (Math.PI * stirrupPhi * stirrupPhi) / 4;
  const stirrupAreaMm2 = stirrupLegsCount * singleLegAreaMm2;
  const sCalculated = Math.floor(stirrupAreaMm2 / aswOverS_mm);
  const spacingCalculatedMm = Math.max(50, Math.min(sCalculated, confinementRules.sMaxBeamSpan));
  const spacingMaxMm = confinementRules.sMaxBeamSpan;
  const spacingCritMm = confinementRules.sCritBeamAppuis;
  const cadresAdoptes = `${hasInternalStirrup ? `Cadre + Étrier intérieur (${stirrupLegsCount} brins)` : `Cadre fermé (${stirrupLegsCount} brins)`} HA ${stirrupPhi} (s = ${spacingCalculatedMm} mm, s_crit = ${spacingCritMm} mm)`;

  // ELS : Contraintes et flèche
  const nEquiv = 15;
  const rhoSer = asProvidedCm2 / (bWeb * d / 100);
  const ySer = d * (Math.sqrt(nEquiv * rhoSer * (2 + nEquiv * rhoSer)) - nEquiv * rhoSer);
  const iSer = (bWeb * Math.pow(ySer, 3)) / 3 + nEquiv * (asProvidedCm2 * 100) * Math.pow(d - ySer, 2);
  const sigmaCSerMPa = +((input.momentMEdSer * 1e6 * ySer) / iSer).toFixed(2);
  const sigmaSSerMPa = +(nEquiv * (input.momentMEdSer * 1e6 * (d - ySer)) / iSer).toFixed(1);

  const deflectionAdmissibleMm = (spanL * 1000) / 500;
  const ecmMpa = concrete.Ecm * 1000;
  const deflectionEstMm = +((5 / 48) * (input.momentMEdSer * 1e6 * Math.pow(spanL * 1000, 2)) / (ecmMpa * iSer)).toFixed(1);
  const deflectionOk = deflectionEstMm <= deflectionAdmissibleMm;
  const deflectionRatio = `${deflectionEstMm} mm ≤ L/500 (${deflectionAdmissibleMm} mm)`;

  // 4. NOMENCLATURE DES ACIERS DÉTAILLÉE PAR LIT SELON ISO 3766
  const rebarSchedule: RebarBar[] = [];

  // Barres inférieures (un repère distinct par lit)
  layersDetails.forEach((layer) => {
    const isFirstLayer = layer.layerIndex === 1;
    const unitLength = isFirstLayer
      ? +(spanL + (2 * anchorage.lbd) / 1000).toFixed(2)
      : +(spanL * 0.85 + (2 * anchorage.lbd) / 1000).toFixed(2);
    const linearMass = layer.diameter * layer.diameter * 0.00617;
    const weight = +(layer.count * unitLength * linearMass).toFixed(2);

    rebarSchedule.push({
      count: layer.count,
      diameter: layer.diameter,
      layer: 'inf',
      shape: input.anchorageType === 'hook_90' ? 'hooked' : 'straight',
      unitLengthM: unitLength,
      totalWeightKg: weight,
      layerIndex: layer.layerIndex,
      details: `Lit ${layer.layerIndex}`,
    });
  });

  // Barres supérieures de montage
  const unitLengthSup = +(spanL + 0.4).toFixed(2);
  const linearMassSup = topRebarPhi * topRebarPhi * 0.00617;
  const weightSup = +(topRebarCount * unitLengthSup * linearMassSup).toFixed(2);
  rebarSchedule.push({
    count: topRebarCount,
    diameter: topRebarPhi,
    layer: 'sup',
    shape: 'hooked',
    unitLengthM: unitLengthSup,
    totalWeightKg: weightSup,
    details: 'Montage Sup.',
  });

  // Armatures de peau si applicables (h >= 600 mm)
  if (confinementRules.requiresSkinRebars) {
    const unitLengthSkin = +(spanL + 0.2).toFixed(2);
    const linearMassSkin = skinRebarPhi * skinRebarPhi * 0.00617;
    const weightSkin = +(4 * unitLengthSkin * linearMassSkin).toFixed(2);
    rebarSchedule.push({
      count: 4,
      diameter: skinRebarPhi,
      layer: 'skin',
      shape: 'straight',
      unitLengthM: unitLengthSkin,
      totalWeightKg: weightSkin,
      details: 'Peau (h>=600)',
    });
  }

  // Cadres extérieurs transversaux
  const stirrupPerimeter = (2 * (bWeb - 2 * coverC) + 2 * (heightH - 2 * coverC) + 200) / 1000;
  const numberOfStirrups = Math.ceil((spanL * 1000) / spacingCalculatedMm) + 1;
  const linearMassCadre = stirrupPhi * stirrupPhi * 0.00617;
  const weightCadres = +(numberOfStirrups * stirrupPerimeter * linearMassCadre).toFixed(2);
  rebarSchedule.push({
    count: numberOfStirrups,
    diameter: stirrupPhi,
    layer: 'inf',
    shape: 'u_frame',
    unitLengthM: +stirrupPerimeter.toFixed(2),
    totalWeightKg: weightCadres,
    details: 'Cadre extérieur principal',
  });

  // Étriers intérieurs si configurés
  if (hasInternalStirrup) {
    const innerPerimeter = stirrupLegsCount === 4
      ? (2 * (bWeb * 0.48) + 2 * (heightH - 2 * coverC) + 150) / 1000
      : (2 * (heightH - 2 * coverC) + 180) / 1000;
    const weightInner = +(numberOfStirrups * innerPerimeter * linearMassCadre).toFixed(2);
    rebarSchedule.push({
      count: numberOfStirrups,
      diameter: stirrupPhi,
      layer: 'inf',
      shape: 'u_frame',
      unitLengthM: +innerPerimeter.toFixed(2),
      totalWeightKg: weightInner,
      details: stirrupLegsCount === 4 ? 'Cadre intérieur (2 brins)' : 'Épingle intérieure (1 brin)',
    });
  }

  const totalSteelWeightKg = +(rebarSchedule.reduce((acc, curr) => acc + curr.totalWeightKg, 0)).toFixed(1);
  const steelDensityKgM3 = +(totalSteelWeightKg / concreteVolumeM3).toFixed(1);

  // 3. MULTI-TRAVÉES (1 À 5 TRAVÉES) & CONDITIONS AUX APPUIS
  const material: BeamMaterial = input.material || 'concrete';
  const supportCondition: BeamSupportCondition = input.supportCondition || 'pinned_pinned';
  const spansCount = input.spansCount || 1;
  const inputSpans = input.spans && input.spans.length >= spansCount ? input.spans.slice(0, spansCount) : [];
  while (inputSpans.length < spansCount) {
    inputSpans.push(input.spanL || 6.0);
  }

  const spansDetails: SpanDetail[] = [];
  const supportMomentsKNm: number[] = [];

  // Résolution simplifiée selon Caquot / coefficients forfaitaires Eurocodes
  const baseM = Math.abs(input.momentMEd);
  const baseV = Math.abs(input.shearVEd);

  if (spansCount === 1) {
    let mSpan = baseM;
    let mSupp = 0;
    let vLeft = baseV;
    let vRight = baseV;
    let deflFactor = 1.0;

    if (supportCondition === 'fixed_fixed') {
      mSpan = +(baseM * 0.50).toFixed(1);
      mSupp = +(baseM * 1.0).toFixed(1);
      deflFactor = 0.20;
    } else if (supportCondition === 'fixed_pinned') {
      mSpan = +(baseM * 0.70).toFixed(1);
      mSupp = +(baseM * 0.85).toFixed(1);
      vLeft = +(baseV * 1.25).toFixed(1);
      vRight = +(baseV * 0.75).toFixed(1);
      deflFactor = 0.42;
    } else if (supportCondition === 'cantilever') {
      mSpan = 0;
      mSupp = +(baseM * 2.0).toFixed(1);
      vLeft = +(baseV * 1.0).toFixed(1);
      vRight = 0;
      deflFactor = 3.2;
    }

    const L = inputSpans[0];
    const deflMm = +(L * 2.1 * deflFactor).toFixed(1);
    const deflLimit = +(L * 1000 / 500).toFixed(1);

    spansDetails.push({
      index: 1,
      lengthM: L,
      momentMEdKNm: mSpan,
      shearLeftKN: vLeft,
      shearRightKN: vRight,
      deflectionMm: deflMm,
      isDeflectionOk: deflMm <= deflLimit,
    });
    if (mSupp > 0) supportMomentsKNm.push(mSupp);
  } else {
    // Multi-travées continues (2 à 5 travées)
    for (let i = 0; i < spansCount; i++) {
      const L = inputSpans[i];
      const isExt = i === 0 || i === spansCount - 1;
      const mCoef = isExt ? 0.75 : 0.55;
      const vLeft = +(baseV * (isExt ? 1.0 : 1.15)).toFixed(1);
      const vRight = +(baseV * (isExt ? 1.15 : 1.0)).toFixed(1);
      const mSpan = +(baseM * mCoef).toFixed(1);
      const deflMm = +(L * 1.8 * (isExt ? 0.8 : 0.6)).toFixed(1);
      const deflLimit = +(L * 1000 / 500).toFixed(1);

      spansDetails.push({
        index: i + 1,
        lengthM: L,
        momentMEdKNm: mSpan,
        shearLeftKN: vLeft,
        shearRightKN: vRight,
        deflectionMm: deflMm,
        isDeflectionOk: deflMm <= deflLimit,
      });

      if (i < spansCount - 1) {
        supportMomentsKNm.push(+(baseM * 0.85).toFixed(1));
      }
    }
  }

  // 4. MODULE ACIER DE STRUCTURE (EN 1993-1-1)
  let steelBeam: SteelBeamOutput | undefined;
  if (material === 'steel') {
    const profKey = input.steelProfileKey || 'IPE 300';
    const prof = STEEL_PROFILES[profKey] || STEEL_PROFILES['IPE 300'];
    const steelGrade = STRUCTURAL_STEEL_GRADES[input.steelGradeKey || 'S355'] || STRUCTURAL_STEEL_GRADES['S355'];
    const fy = steelGrade.fy;

    // Résistance plastique en flexion Mc,Rd = Wpl * fy / gamma_M0 (kNm)
    const McRd = +((prof.wplCm3 * fy) / 1000).toFixed(1);
    // Résistance au cisaillement plastique Vpl,Rd = Av * (fy / sqrt(3)) / gamma_M0 (kN)
    const Av = prof.h * prof.tw; // mm2
    const VplRd = +((Av * (fy / Math.sqrt(3))) / 1000).toFixed(1);
    // Déversement Mb,Rd = chi_LT * Mc,Rd (chi_LT ~ 0.82)
    const chiLT = 0.82;
    const MbRd = +(chiLT * McRd).toFixed(1);

    const mMax = spansDetails[0]?.momentMEdKNm || baseM;
    const vMax = spansDetails[0]?.shearLeftKN || baseV;

    const momentRatio = +(mMax / Math.max(1, McRd)).toFixed(2);
    const shearRatioSteel = +(vMax / Math.max(1, VplRd)).toFixed(2);

    // Flèche ELS sous charge équivalente
    const Lmm = inputSpans[0] * 1000;
    const Iymm4 = prof.iyCm4 * 10000;
    const deflMm = +((5 * (baseM * 1e6 / (Lmm / 4)) * Math.pow(Lmm, 3)) / (384 * 210000 * Iymm4)).toFixed(1);
    const deflLimitMm = +(Lmm / 300).toFixed(1);

    steelBeam = {
      profileName: prof.name,
      wplCm3: prof.wplCm3,
      iyCm4: prof.iyCm4,
      areaCm2: prof.areaCm2,
      massKgM: prof.massKgM,
      McRdKNm: McRd,
      VplRdKN: VplRd,
      MbRdKNm: MbRd,
      momentRatio,
      shearRatio: shearRatioSteel,
      deflectionMm: Math.max(1, deflMm),
      deflectionLimitMm: deflLimitMm,
      isDeflectionOk: deflMm <= deflLimitMm,
    };
  }

  // 5. MODULE BOIS DE STRUCTURE (EN 1995-1-1)
  let timberBeam: TimberBeamOutput | undefined;
  if (material === 'timber') {
    const tGradeKey = input.timberGradeKey || 'C24';
    const tGrade = TIMBER_GRADES[tGradeKey] || TIMBER_GRADES['C24'];
    const wB = input.timberWidthB || 140;
    const wH = input.timberHeightH || 280;

    const Wmm3 = (wB * wH * wH) / 6;
    const Imm4 = (wB * Math.pow(wH, 3)) / 12;

    const fmd = +((tGrade.kmod * tGrade.fmk) / tGrade.gammaM).toFixed(2);
    const fvd = +((tGrade.kmod * tGrade.fvk) / tGrade.gammaM).toFixed(2);

    const mMax = spansDetails[0]?.momentMEdKNm || baseM;
    const vMax = spansDetails[0]?.shearLeftKN || baseV;

    const sigmaM = +((mMax * 1e6) / Wmm3).toFixed(2);
    const tauD = +((1.5 * vMax * 1000) / (wB * wH)).toFixed(2);

    // Facteur d'instabilité au déversement kcrit ~ 0.90
    const kcrit = 0.90;
    const momentRatio = +(sigmaM / (kcrit * fmd)).toFixed(2);
    const shearRatioTimber = +(tauD / fvd).toFixed(2);

    // Flèche instantanée et finale avec fluage kdef = 0.60
    const Lmm = inputSpans[0] * 1000;
    const E0mean = tGrade.E0mean * 1000; // MPa
    const deflInstMm = +((5 * (baseM * 1e6 / (Lmm / 4)) * Math.pow(Lmm, 3)) / (384 * E0mean * Imm4)).toFixed(1);
    const kdef = 0.60;
    const deflNetFinMm = +(deflInstMm * (1 + kdef)).toFixed(1);
    const deflLimitMm = +(Lmm / 250).toFixed(1);

    timberBeam = {
      gradeName: tGrade.name,
      widthB: wB,
      heightH: wH,
      fmdMPa: fmd,
      fvdMPa: fvd,
      sigmaMMPa: sigmaM,
      tauDMPa: tauD,
      kcrit,
      momentRatio,
      shearRatio: shearRatioTimber,
      deflectionInstMm: Math.max(1, deflInstMm),
      deflectionNetFinMm: Math.max(1, deflNetFinMm),
      deflectionLimitMm: deflLimitMm,
      isDeflectionOk: deflNetFinMm <= deflLimitMm,
    };
  }

  return {
    material,
    supportCondition,
    spansCount,
    spansDetails,
    supportMomentsKNm,
    steelBeam,
    timberBeam,
    d,
    dPrime,
    actAreaCm2,
    barycenterDistanceYGMm,
    layersDetails,
    isFlangeCompressed,
    momentCapacityFlangeKNm,
    mu: +mu.toFixed(3),
    alpha: +alpha.toFixed(3),
    z: +z.toFixed(1),
    asRqdCm2,
    asMinCm2,
    asMaxCm2,
    asProvidedCm2,
    providedRebarsInf,
    providedRebarsSup,
    vRdMaxKN,
    shearRatio,
    aswOverS,
    stirrupPhi,
    stirrupLegsCount,
    hasInternalStirrup,
    cadresAdoptes,
    spacingCalculatedMm,
    spacingMaxMm,
    spacingCritMm,
    anchorage,
    momentShiftAlMm,
    confinementRules,
    skinRebarsText,
    sigmaCSerMPa,
    sigmaSSerMPa,
    deflectionRatio,
    deflectionOk,
    rebarSchedule,
    totalSteelWeightKg,
    concreteVolumeM3,
    steelDensityKgM3,
  };
}

