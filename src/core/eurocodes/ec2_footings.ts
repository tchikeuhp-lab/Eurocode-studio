/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Semelles Isolées de Fondations (EN 1992-1-1 & EN 1997-1)
 * Intègre la méthode des bielles, choix des diamètres pour sens A, sens B et attentes,
 * vérification du patin vs lbd, crochets de relevage et nomenclature ISO 3766.
 */

import { ConcreteGrade, RebarGrade } from './materials.ts';
import {
  calculateAnchorage,
  BondCondition,
  AnchorageType,
  AnchorageResults
} from './ec2_anchorage.ts';

export interface FootingInput {
  dimA: number;              // Longueur de la semelle A en mm (ex: 2000 mm)
  dimB: number;              // Largeur de la semelle B en mm (ex: 1800 mm)
  dimH: number;              // Hauteur totale de la semelle H en mm (ex: 600 mm)
  
  colA: number;              // Dimension poteau dans le sens A (ex: 300 mm)
  colB: number;              // Dimension poteau dans le sens B (ex: 300 mm)
  
  coverC: number;            // Enrobage minimal cnom en mm (ex: 40 mm pour contact sol)
  
  // Sollicitations de calcul
  axialNEd: number;          // Effort normal ELU en kN (ex: 950 kN)
  axialNSer: number;         // Effort normal ELS en kN (ex: 700 kN)
  soilCapacityKPa: number;   // Contrainte admissible du sol q_adm en kPa (ex: 250 kPa = 0.25 MPa)
  
  // Paramètres normatifs d'ancrage
  bondCondition: BondCondition;
  anchorageType: AnchorageType;
  overlapPercent: 25 | 33 | 50 | 100;

  // Choix personnalisés des armatures
  customPhiA?: number;       // Diamètre des barres sens A (10, 12, 14, 16, 20, 25 mm)
  customCountA?: number;     // Nombre de barres sens A
  customPhiB?: number;       // Diamètre des barres sens B (10, 12, 14, 16, 20, 25 mm)
  customCountB?: number;     // Nombre de barres sens B
  customStarterPhi?: number; // Diamètre des barres d'attente poteau (14, 16, 20, 25 mm)
}

export interface FootingRebarBar {
  count: number;
  diameter: number;
  layer: 'nappe_A' | 'nappe_B' | 'starter';
  shape: 'straight' | 'hooked' | 'u_frame';
  unitLengthM: number;
  totalWeightKg: number;
  details: string;
}

export interface FootingOutput {
  selfWeightKN: number;
  totalNEdKN: number;
  totalNSerKN: number;
  
  // Pression sur le sol
  soilPressureELUKPa: number;
  soilPressureSERKPa: number;
  isSoilStressOk: boolean;
  soilUtilizationPercent: number;
  
  // Hauteur utile d et condition de rigidité
  d: number;                 // mm
  isRigidFooting: boolean;   // d >= (A - a) / 4 (condition méthode des bielles)
  patinLengthAMm: number;    // Longueur de patin disponible sens A (A - a) / 2
  patinLengthBMm: number;    // Longueur de patin disponible sens B (B - b) / 2
  
  // Armatures nappe inférieure (méthode des bielles)
  asARqdCm2: number;
  asBRqdCm2: number;
  asAProvidedCm2: number;
  asBProvidedCm2: number;
  providedRebarsA: string;   // ex: "11 HA 14"
  providedRebarsB: string;   // ex: "10 HA 14"
  barDiameterPhiA: number;
  barDiameterPhiB: number;
  countA: number;
  countB: number;
  starterPhi: number;
  
  // Vérification de l'ancrage dans le patin vs lbd
  anchorageA: AnchorageResults;
  isStraightAnchorageSufficientA: boolean;
  hookAdviceA: string;       // Prescription automatique de crochets de relevage terminaux si nécessaire
  
  anchorageB: AnchorageResults;
  isStraightAnchorageSufficientB: boolean;
  hookAdviceB: string;
  
  // Armatures d'attente poteau-semelle
  starterRebarsText: string;
  starterLapL0Mm: number;    // Attente supérieure pour recouvrement
  starterEmbedmentMm: number; // Ancrage dans la semelle avec retour équerre
  totalStarterLengthM: number;
  
  concreteVolumeM3: number;
  totalSteelWeightKg: number;

  // Nomenclature d'aciers ISO 3766
  rebarSchedule: FootingRebarBar[];
}

export function calculateFooting(
  input: FootingInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): FootingOutput {
  const { dimA, dimB, dimH, colA, colB, coverC } = input;
  
  const footingAreaM2 = (dimA * dimB) / 1e6;
  const concreteVolumeM3 = +(footingAreaM2 * (dimH / 1000)).toFixed(3);
  const selfWeightKN = +(concreteVolumeM3 * 25).toFixed(1);
  
  const totalNEdKN = +(input.axialNEd + 1.35 * selfWeightKN).toFixed(1);
  const totalNSerKN = +(input.axialNSer + selfWeightKN).toFixed(1);
  
  // Pression sur le sol à l'ELS et ELU
  const soilPressureSERKPa = +(totalNSerKN / footingAreaM2).toFixed(1);
  const soilPressureELUKPa = +(totalNEdKN / footingAreaM2).toFixed(1);
  const isSoilStressOk = soilPressureSERKPa <= input.soilCapacityKPa;
  const soilUtilizationPercent = +((soilPressureSERKPa / input.soilCapacityKPa) * 100).toFixed(1);
  
  // Hauteur utile d (enrobage de 40mm pour fondation sur béton de propreté)
  const d = dimH - coverC - 10;
  
  // Patins
  const patinLengthAMm = Math.round((dimA - colA) / 2);
  const patinLengthBMm = Math.round((dimB - colB) / 2);
  
  // Condition de semelle rigide selon DTU 13.12 / Eurocode 2 : d >= (A - a) / 4
  const isRigidFooting = d >= (dimA - colA) / 4 && d >= (dimB - colB) / 4;
  
  // Méthode des bielles pour le calcul des aciers
  // AsA = NEd * (A - a) / (8 * d * fyd)
  const fyd = rebar.fyd;
  const nEdN = input.axialNEd * 1000;
  
  const asAMm2 = (nEdN * (dimA - colA)) / (8 * d * fyd);
  const asBMm2 = (nEdN * (dimB - colB)) / (8 * d * fyd);
  
  const asARqdCm2 = +(asAMm2 / 100).toFixed(2);
  const asBRqdCm2 = +(asBMm2 / 100).toFixed(2);
  
  // Choix des barres réelles
  // Sens A (lits répartis sur la largeur B)
  const phiA = input.customPhiA || 14;
  const unitAreaA = Math.PI * Math.pow(phiA / 2, 2) / 100; // cm2
  const minCountA = Math.max(6, Math.ceil(asARqdCm2 / unitAreaA));
  const countA = input.customCountA || minCountA;
  const asAProvidedCm2 = +(countA * unitAreaA).toFixed(2);
  const spacingA = Math.round((dimB - 2 * coverC) / Math.max(1, countA - 1));
  const providedRebarsA = `${countA} HA ${phiA} (e ≈ ${spacingA} mm, total ${asAProvidedCm2} cm²)`;
  
  // Sens B (lits répartis sur la longueur A)
  const phiB = input.customPhiB || 14;
  const unitAreaB = Math.PI * Math.pow(phiB / 2, 2) / 100;
  const minCountB = Math.max(6, Math.ceil(asBRqdCm2 / unitAreaB));
  const countB = input.customCountB || minCountB;
  const asBProvidedCm2 = +(countB * unitAreaB).toFixed(2);
  const spacingB = Math.round((dimA - 2 * coverC) / Math.max(1, countB - 1));
  const providedRebarsB = `${countB} HA ${phiB} (e ≈ ${spacingB} mm, total ${asBProvidedCm2} cm²)`;
  
  // Moteur d'ancrage normatif
  const anchorageA = calculateAnchorage({
    barDiameter: phiA,
    fctd: concrete.fctd,
    fyd: rebar.fyd,
    bondCondition: input.bondCondition,
    anchorageType: input.anchorageType,
    stressType: 'tension',
    overlapRatioPercent: input.overlapPercent,
    coverCd: input.coverC,
  });
  
  const anchorageB = calculateAnchorage({
    barDiameter: phiB,
    fctd: concrete.fctd,
    fyd: rebar.fyd,
    bondCondition: input.bondCondition,
    anchorageType: input.anchorageType,
    stressType: 'tension',
    overlapRatioPercent: input.overlapPercent,
    coverCd: input.coverC,
  });
  
  // Vérification de la longueur de patin disponible par rapport à lbd
  const isStraightAnchorageSufficientA = patinLengthAMm >= anchorageA.lbdStraight;
  const isStraightAnchorageSufficientB = patinLengthBMm >= anchorageB.lbdStraight;
  
  const hookAdviceA = isStraightAnchorageSufficientA
    ? `Patin disponible (${patinLengthAMm} mm) ≥ lbd droit (${anchorageA.lbdStraight} mm) : Ancrage droit suffisant.`
    : `Patin disponible (${patinLengthAMm} mm) < lbd droit (${anchorageA.lbdStraight} mm) : Crochets de relevage verticaux à 90° OBLIGATOIRES (lbd crochet = ${anchorageA.lbdHook} mm).`;
    
  const hookAdviceB = isStraightAnchorageSufficientB
    ? `Patin disponible (${patinLengthBMm} mm) ≥ lbd droit (${anchorageB.lbdStraight} mm) : Ancrage droit suffisant.`
    : `Patin disponible (${patinLengthBMm} mm) < lbd droit (${anchorageB.lbdStraight} mm) : Crochets de relevage verticaux à 90° OBLIGATOIRES (lbd crochet = ${anchorageB.lbdHook} mm).`;
  
  // Attentes poteau-semelle
  const starterPhi = input.customStarterPhi || 16;
  const starterAnchorage = calculateAnchorage({
    barDiameter: starterPhi,
    fctd: concrete.fctd,
    fyd: rebar.fyd,
    bondCondition: input.bondCondition,
    anchorageType: 'hook_90',
    stressType: 'compression',
    overlapRatioPercent: input.overlapPercent,
    coverCd: input.coverC,
  });
  
  const starterLapL0Mm = starterAnchorage.l0;
  const starterEmbedmentMm = Math.min(dimH - 2 * coverC, starterAnchorage.lbd);
  const starterFootingHookMm = 300; // Retour équerre horizontal
  const totalStarterLengthM = +((starterLapL0Mm + starterEmbedmentMm + starterFootingHookMm) / 1000).toFixed(2);
  const starterRebarsText = `4 HA ${starterPhi} d'attentes (longueur totale ${totalStarterLengthM} m, attente l0 = ${starterLapL0Mm} mm, retour équerre ${starterFootingHookMm} mm)`;
  
  // Poids total d'acier et nomenclature ISO 3766
  const hookLenA = isStraightAnchorageSufficientA ? 0 : 2 * 0.35;
  const hookLenB = isStraightAnchorageSufficientB ? 0 : 2 * 0.35;
  const barLenAM = +((dimA - 2 * coverC) / 1000 + hookLenA).toFixed(2);
  const barLenBM = +((dimB - 2 * coverC) / 1000 + hookLenB).toFixed(2);
  
  const steelWeightA = +(countA * barLenAM * (phiA * phiA * 0.00617)).toFixed(2);
  const steelWeightB = +(countB * barLenBM * (phiB * phiB * 0.00617)).toFixed(2);
  const steelWeightStarters = +(4 * totalStarterLengthM * (starterPhi * starterPhi * 0.00617)).toFixed(2);
  const totalSteelWeightKg = +(steelWeightA + steelWeightB + steelWeightStarters).toFixed(1);

  const rebarSchedule: FootingRebarBar[] = [
    {
      count: countA,
      diameter: phiA,
      layer: 'nappe_A',
      shape: isStraightAnchorageSufficientA ? 'straight' : 'hooked',
      unitLengthM: barLenAM,
      totalWeightKg: steelWeightA,
      details: `Nappe principale inférieure sens A (${countA} barres réparties)`,
    },
    {
      count: countB,
      diameter: phiB,
      layer: 'nappe_B',
      shape: isStraightAnchorageSufficientB ? 'straight' : 'hooked',
      unitLengthM: barLenBM,
      totalWeightKg: steelWeightB,
      details: `Nappe transversale de répartition sens B (${countB} barres réparties)`,
    },
    {
      count: 4,
      diameter: starterPhi,
      layer: 'starter',
      shape: 'hooked',
      unitLengthM: totalStarterLengthM,
      totalWeightKg: steelWeightStarters,
      details: `Attentes poteau-semelle avec retour équerre ${starterFootingHookMm}mm`,
    },
  ];
  
  return {
    selfWeightKN,
    totalNEdKN,
    totalNSerKN,
    soilPressureELUKPa,
    soilPressureSERKPa,
    isSoilStressOk,
    soilUtilizationPercent,
    d,
    isRigidFooting,
    patinLengthAMm,
    patinLengthBMm,
    asARqdCm2,
    asBRqdCm2,
    asAProvidedCm2,
    asBProvidedCm2,
    providedRebarsA,
    providedRebarsB,
    barDiameterPhiA: phiA,
    barDiameterPhiB: phiB,
    countA,
    countB,
    starterPhi,
    anchorageA,
    isStraightAnchorageSufficientA,
    hookAdviceA,
    anchorageB,
    isStraightAnchorageSufficientB,
    hookAdviceB,
    starterRebarsText,
    starterLapL0Mm,
    starterEmbedmentMm,
    totalStarterLengthM,
    concreteVolumeM3,
    totalSteelWeightKg,
    rebarSchedule,
  };
}
