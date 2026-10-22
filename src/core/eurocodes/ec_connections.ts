/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Assemblages & Liaisons Métalliques (EN 1993-1-8) & Bois (EN 1995-1-1 §8)
 * Liaisons Poutre/Poteau, Poteau/Poteau et Poutre/Poutre
 */

export type ConnectionFamily = 'steel' | 'timber';
export type ConnectionJointType = 'beam_to_column' | 'column_to_column' | 'beam_to_beam';

export interface BoltSpec {
  diameter: number;         // d en mm (M16, M20, M24)
  grade: '8.8' | '10.9';
  countRows: number;        // Nombre de rangées
  countCols: number;        // Nombre de boulons par rangée (généralement 2)
  pitchP1Mm: number;        // Entraxe longitudinal (mm)
  gaugeP2Mm: number;        // Entraxe transversal (mm)
  endDistE1Mm: number;      // Pince longitudinale (mm)
  edgeDistE2Mm: number;     // Pince transversale (mm)
}

export interface DowelSpec {
  diameterMm: number;       // d en mm (10, 12, 16)
  count: number;            // Nombre de broches / boulons
  steelGrade: 'S235' | 'S275' | 'S355';
  plateThicknessMm: number; // Épaisseur platine / étrier (mm)
  bracketType: 'external_wings' | 'concealed_dovetail';
}

export interface ConnectionInput {
  family: ConnectionFamily;
  jointType: ConnectionJointType;
  
  // Sollicitations de l'assemblage
  momentMEdKNm: number;     // Moment de flexion appliqué
  shearVEdKN: number;       // Effort tranchant transmis
  axialNEdKN: number;       // Effort normal éventuel

  // Éléments connectés
  mainSectionName: string;  // Poteau ou Poutre principale
  subSectionName: string;   // Poutre raccordée ou Poteau supérieur

  // Spécifications acier
  boltSpec?: BoltSpec;
  endPlateThicknessTpMm?: number;
  endPlateWidthBpMm?: number;
  endPlateHeightHpMm?: number;
  weldThicknessAFMm?: number; // Gorge de soudure a (mm)

  // Spécifications bois
  dowelSpec?: DowelSpec;
  timberMemberWidthMm?: number;
  timberMemberHeightMm?: number;
}

export interface ConnectionOutput {
  family: ConnectionFamily;
  jointType: ConnectionJointType;
  jointNameFr: string;
  isSafe: boolean;
  
  // Résistances de calcul
  momentCapacityMRdKNm: number;
  shearCapacityVRdKN: number;
  momentRatio: number;
  shearRatio: number;
  
  // Détails mécaniques
  boltTensionCapacityFtRdKN: number;
  boltShearCapacityFvRdKN: number;
  plateBendingCapacityMplRdKNm: number;
  timberEmbedmentStrengthFhkMPa: number;
  dowelYieldMomentMyRkNmm: number;
  dowelShearCapacityFvRkKN: number;

  componentsList: string[];
  designRecommendations: string[];
}

/**
 * Calcul de la résistance des assemblages Acier (EC3 §1.8) et Bois (EC5 §8)
 */
export function calculateConnection(input: ConnectionInput): ConnectionOutput {
  const { family, jointType, momentMEdKNm, shearVEdKN } = input;
  
  if (family === 'steel') {
    // 1. ACIER - EN 1993-1-8 (Méthode des composants simplifiée)
    const bolt = input.boltSpec || {
      diameter: 20,
      grade: '8.8',
      countRows: 3,
      countCols: 2,
      pitchP1Mm: 80,
      gaugeP2Mm: 90,
      endDistE1Mm: 45,
      edgeDistE2Mm: 40,
    };
    const tp = input.endPlateThicknessTpMm || 15;
    const fub = bolt.grade === '8.8' ? 800 : 1000;
    const As = bolt.diameter === 16 ? 157 : bolt.diameter === 20 ? 245 : 353; // mm2

    // Résistance à la traction d'un boulon Ft,Rd = 0.9 * fub * As / gamma_M2 (gamma_M2 = 1.25)
    const FtRd = +((0.9 * fub * As) / (1.25 * 1000)).toFixed(1); // kN
    // Résistance au cisaillement d'un boulon Fv,Rd = 0.6 * fub * As / gamma_M2
    const FvRd = +((0.6 * fub * As) / (1.25 * 1000)).toFixed(1); // kN

    let jointNameFr = 'Liaison Poutre/Poteau par Platine d\'About Boulonnée';
    let momentCapacityMRd = 0;
    let shearCapacityVRd = 0;
    const componentsList: string[] = [];

    if (jointType === 'beam_to_column') {
      jointNameFr = 'Liaison Poutre/Poteau par Platine d\'About (Boulons HR)';
      // Bras de levier moyen z entre rangées tendues et centre de compression
      const zArmMm = Math.max(120, (bolt.countRows - 1) * bolt.pitchP1Mm);
      // Résistance en flexion de l'assemblage MRd = 2 boulons * FtRd * zArm
      momentCapacityMRd = +((2 * FtRd * zArmMm) / 1000).toFixed(1);
      // Résistance au cisaillement total VRd = n_tot * FvRd
      const totalBolts = bolt.countRows * bolt.countCols;
      shearCapacityVRd = +(totalBolts * FvRd).toFixed(1);

      componentsList.push(
        `Platine d'about épaisseur tp = ${tp} mm`,
        `${totalBolts} boulons HR classe ${bolt.grade} (diamètre M${bolt.diameter})`,
        `Gorge de soudure âme/semelles a = ${input.weldThicknessAFMm || 6} mm`,
        `Entraxes boulons : p1 = ${bolt.pitchP1Mm} mm, p2 = ${bolt.gaugeP2Mm} mm`
      );
    } else if (jointType === 'column_to_column') {
      jointNameFr = 'Liaison Poteau/Poteau par Éclissage Boulonné';
      momentCapacityMRd = +(2 * FtRd * 180 / 1000).toFixed(1);
      shearCapacityVRd = +(4 * FvRd).toFixed(1);
      componentsList.push(
        '2 couvre-joints d\'ailes épaisseur 10 mm',
        '2 éclisses d\'âme épaisseur 8 mm',
        '8 boulons M20 classe 8.8'
      );
    } else {
      jointNameFr = 'Liaison Poutre/Poutre par Cornières d\'Âme';
      momentCapacityMRd = 0; // Assemblage articulé
      shearCapacityVRd = +(4 * FvRd).toFixed(1);
      componentsList.push(
        '2 cornières d\'âme L80x80x8',
        '4 boulons d\'âme M16 classe 8.8'
      );
    }

    const mRatio = momentCapacityMRd > 0 ? +(Math.abs(momentMEdKNm) / momentCapacityMRd).toFixed(2) : 0;
    const vRatio = +(Math.abs(shearVEdKN) / Math.max(1, shearCapacityVRd)).toFixed(2);
    const isSafe = mRatio <= 1.0 && vRatio <= 1.0;

    return {
      family: 'steel',
      jointType,
      jointNameFr,
      isSafe,
      momentCapacityMRdKNm: momentCapacityMRd,
      shearCapacityVRdKN: shearCapacityVRd,
      momentRatio: mRatio,
      shearRatio: vRatio,
      boltTensionCapacityFtRdKN: FtRd,
      boltShearCapacityFvRdKN: FvRd,
      plateBendingCapacityMplRdKNm: +(tp * tp * 235 / 4000).toFixed(1),
      timberEmbedmentStrengthFhkMPa: 0,
      dowelYieldMomentMyRkNmm: 0,
      dowelShearCapacityFvRkKN: 0,
      componentsList,
      designRecommendations: [
        isSafe ? 'Assemblage acier conforme aux vérifications de résistance.' : 'Capacité insuffisante : augmenter la classe des boulons ou l\'épaisseur de platine.',
        'Vérifier le cisaillement de bloc et la résistance de l\'âme du poteau au voilement par compression.',
      ],
    };
  } else {
    // 2. BOIS - EN 1995-1-1 §8 (Formules de Johansen pour broches et étriers)
    const dowel = input.dowelSpec || {
      diameterMm: 12,
      count: 6,
      steelGrade: 'S275',
      plateThicknessMm: 3.0,
      bracketType: 'concealed_dovetail',
    };

    // Résistance caractéristique à l'enfoncement dans le bois fh,0,k = 0.082 * (1 - 0.01 * d) * rho_k (avec rho_k = 350 kg/m3)
    const fh0k = +(0.082 * (1 - 0.01 * dowel.diameterMm) * 350).toFixed(1); // ~ 25 MPa
    // Moment d'écoulement plastique de la broche My,Rk = 0.3 * fu * d^2.6
    const fuDowel = 430; // MPa pour S275
    const MyRk = +(0.3 * fuDowel * Math.pow(dowel.diameterMm, 2.6)).toFixed(0); // Nmm (~ 82 000 Nmm)

    // Capacité caractéristique par plan de cisaillement selon Johansen (mode acier/bois)
    // Fv,Rk ~ sqrt(2 * My,Rk * fh0k * d)
    const FvRk = +(Math.sqrt(2 * MyRk * fh0k * dowel.diameterMm) / 1000).toFixed(1); // ~ 7.0 kN
    const kmod = 0.8;
    const gammaM = 1.3;
    const FvRd = +((kmod * FvRk) / gammaM).toFixed(1); // ~ 4.3 kN

    let jointNameFr = 'Liaison Poutre/Poteau par Sabot Métallique à Broches';
    let momentCapacityMRd = 0;
    let shearCapacityVRd = +(dowel.count * FvRd).toFixed(1);
    const componentsList: string[] = [];

    if (jointType === 'beam_to_column') {
      jointNameFr = 'Liaison Poutre/Poteau par Étrier à Queue d\'Aronde / Broches';
      componentsList.push(
        `Sabot / Étrier métallique galvanisé épaisseur ${dowel.plateThicknessMm} mm`,
        `${dowel.count} broches métalliques acier Ø${dowel.diameterMm} mm`,
        'Fixation sur poteau par tirefonds Ø8x100 mm'
      );
    } else if (jointType === 'column_to_column') {
      jointNameFr = 'Pied de Poteau Métallique Réglable sur Platine';
      shearCapacityVRd = +(4 * FvRd).toFixed(1);
      componentsList.push(
        'Pied de poteau métallique réglable galvanisé à chaud',
        'Platine de base 150x150x8 mm fixée par 4 chevilles chimiques M12',
        'Fixation sur fût bois par 4 broches traversantes Ø12 mm'
      );
    } else {
      jointNameFr = 'Liaison Poutre/Poutre par Connecteur Suspendu';
      componentsList.push(
        'Connecteur métallique invisible à âme encastrée',
        `${dowel.count} broches calibrées Ø10 mm`
      );
    }

    const vRatio = +(Math.abs(shearVEdKN) / Math.max(1, shearCapacityVRd)).toFixed(2);
    const isSafe = vRatio <= 1.0;

    return {
      family: 'timber',
      jointType,
      jointNameFr,
      isSafe,
      momentCapacityMRdKNm: 0,
      shearCapacityVRdKN: shearCapacityVRd,
      momentRatio: 0,
      shearRatio: vRatio,
      boltTensionCapacityFtRdKN: 0,
      boltShearCapacityFvRdKN: 0,
      plateBendingCapacityMplRdKNm: 0,
      timberEmbedmentStrengthFhkMPa: fh0k,
      dowelYieldMomentMyRkNmm: MyRk,
      dowelShearCapacityFvRkKN: FvRk,
      componentsList,
      designRecommendations: [
        isSafe ? 'Assemblage bois conforme selon l\'Eurocode 5.' : 'Effort tranchant excessif : augmenter le nombre de broches ou la hauteur de sabot.',
        `Pince d'extrémité requise dans le bois : a1 >= 7d = ${7 * dowel.diameterMm} mm dans le fil du bois.`,
      ],
    };
  }
}
