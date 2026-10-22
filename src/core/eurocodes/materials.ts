/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Base Matériaux selon EN 1992-1-1 (EC2) & EN 1993-1-1 (EC3)
 */

export interface ConcreteGrade {
  name: string;
  fck: number;      // Résistance caractéristique à la compression (MPa)
  fcd: number;      // Résistance de calcul à la compression fcd = acc * fck / gamma_c (MPa)
  fcm: number;      // Résistance moyenne fcm = fck + 8 (MPa)
  fctm: number;     // Résistance moyenne en traction fctm = 0.30 * fck^(2/3) (MPa)
  fctk005: number;  // Résistance caractéristique fractile 5% fctk,0.05 = 0.7 * fctm (MPa)
  fctd: number;     // Résistance de calcul en traction fctd = act * fctk,0.05 / gamma_c (MPa)
  Ecm: number;      // Module d'élasticité sécant moyen (GPa)
  density: number;  // Masse volumique non armé / armé (kN/m3)
}

export interface RebarGrade {
  name: string;
  fyk: number;      // Limite d'élasticité caractéristique (MPa)
  fyd: number;      // Limite d'élasticité de calcul fyd = fyk / gamma_s (MPa)
  Es: number;       // Module d'élasticité de l'acier (MPa)
  ftk: number;      // Résistance en traction ultime caractéristique (MPa)
  ductilityClass: 'A' | 'B' | 'C';
}

export interface StructuralSteelGrade {
  name: string;
  fy: number;       // Limite d'élasticité (MPa) pour t <= 40mm
  fu: number;       // Résistance ultime en traction (MPa)
  Ea: number;       // Module d'Young de l'acier profilé (MPa)
}

export const CONCRETE_GRADES: Record<string, ConcreteGrade> = {
  'C20/25': {
    name: 'C20/25',
    fck: 20,
    fcd: +(20 / 1.5).toFixed(2), // 13.33 MPa
    fcm: 28,
    fctm: +(0.3 * Math.pow(20, 2/3)).toFixed(2), // 2.21 MPa
    fctk005: +(0.7 * 0.3 * Math.pow(20, 2/3)).toFixed(2), // 1.55 MPa
    fctd: +((0.7 * 0.3 * Math.pow(20, 2/3)) / 1.5).toFixed(2), // 1.03 MPa
    Ecm: 30, // GPa
    density: 25,
  },
  'C25/30': {
    name: 'C25/30',
    fck: 25,
    fcd: +(25 / 1.5).toFixed(2), // 16.67 MPa
    fcm: 33,
    fctm: +(0.3 * Math.pow(25, 2/3)).toFixed(2), // 2.56 MPa
    fctk005: +(0.7 * 0.3 * Math.pow(25, 2/3)).toFixed(2), // 1.80 MPa
    fctd: +((0.7 * 0.3 * Math.pow(25, 2/3)) / 1.5).toFixed(2), // 1.20 MPa
    Ecm: 31,
    density: 25,
  },
  'C30/37': {
    name: 'C30/37',
    fck: 30,
    fcd: +(30 / 1.5).toFixed(2), // 20.00 MPa
    fcm: 38,
    fctm: +(0.3 * Math.pow(30, 2/3)).toFixed(2), // 2.90 MPa
    fctk005: +(0.7 * 0.3 * Math.pow(30, 2/3)).toFixed(2), // 2.03 MPa
    fctd: +((0.7 * 0.3 * Math.pow(30, 2/3)) / 1.5).toFixed(2), // 1.35 MPa
    Ecm: 33,
    density: 25,
  },
  'C35/45': {
    name: 'C35/45',
    fck: 35,
    fcd: +(35 / 1.5).toFixed(2), // 23.33 MPa
    fcm: 43,
    fctm: +(0.3 * Math.pow(35, 2/3)).toFixed(2), // 3.21 MPa
    fctk005: +(0.7 * 0.3 * Math.pow(35, 2/3)).toFixed(2), // 2.25 MPa
    fctd: +((0.7 * 0.3 * Math.pow(35, 2/3)) / 1.5).toFixed(2), // 1.50 MPa
    Ecm: 34,
    density: 25,
  },
  'C40/50': {
    name: 'C40/50',
    fck: 40,
    fcd: +(40 / 1.5).toFixed(2), // 26.67 MPa
    fcm: 48,
    fctm: +(0.3 * Math.pow(40, 2/3)).toFixed(2), // 3.51 MPa
    fctk005: +(0.7 * 0.3 * Math.pow(40, 2/3)).toFixed(2), // 2.46 MPa
    fctd: +((0.7 * 0.3 * Math.pow(40, 2/3)) / 1.5).toFixed(2), // 1.64 MPa
    Ecm: 35,
    density: 25,
  },
  'C50/60': {
    name: 'C50/60',
    fck: 50,
    fcd: +(50 / 1.5).toFixed(2), // 33.33 MPa
    fcm: 58,
    fctm: +(0.3 * Math.pow(50, 2/3)).toFixed(2), // 4.07 MPa
    fctk005: +(0.7 * 0.3 * Math.pow(50, 2/3)).toFixed(2), // 2.85 MPa
    fctd: +((0.7 * 0.3 * Math.pow(50, 2/3)) / 1.5).toFixed(2), // 1.90 MPa
    Ecm: 37,
    density: 25,
  },
};

export const REBAR_GRADES: Record<string, RebarGrade> = {
  'B500B': {
    name: 'B500B (Haute Adhérence)',
    fyk: 500,
    fyd: +(500 / 1.15).toFixed(2), // 434.78 MPa
    Es: 200000, // MPa
    ftk: 540,
    ductilityClass: 'B',
  },
  'B500A': {
    name: 'B500A (Treillis soudé standard)',
    fyk: 500,
    fyd: +(500 / 1.15).toFixed(2),
    Es: 200000,
    ftk: 525,
    ductilityClass: 'A',
  },
};

export const STRUCTURAL_STEEL_GRADES: Record<string, StructuralSteelGrade> = {
  'S235': { name: 'S235', fy: 235, fu: 360, Ea: 210000 },
  'S275': { name: 'S275', fy: 275, fu: 430, Ea: 210000 },
  'S355': { name: 'S355', fy: 355, fu: 510, Ea: 210000 },
};

export interface TimberGrade {
  name: string;
  type: 'solid' | 'glulam';
  fmk: number;      // Résistance caractéristique en flexion (MPa)
  ft0k: number;     // Traction axiale (MPa)
  fc0k: number;     // Compression axiale (MPa)
  fvk: number;      // Cisaillement (MPa)
  E0mean: number;   // Module d'élasticité moyen longitudinal (GPa)
  rhok: number;     // Masse volumique caractéristique (kg/m3)
  gammaM: number;   // Coefficient partiel (1.30 pour massif, 1.25 pour lamellé)
  kmod: number;     // Facteur de modification durée/humidité (défaut 0.80)
}

export const TIMBER_GRADES: Record<string, TimberGrade> = {
  'C18': {
    name: 'C18 (Bois massif résineux)',
    type: 'solid',
    fmk: 18,
    ft0k: 11,
    fc0k: 18,
    fvk: 3.4,
    E0mean: 9.0,
    rhok: 320,
    gammaM: 1.30,
    kmod: 0.80,
  },
  'C24': {
    name: 'C24 (Bois massif résineux standard)',
    type: 'solid',
    fmk: 24,
    ft0k: 14,
    fc0k: 21,
    fvk: 4.0,
    E0mean: 11.0,
    rhok: 350,
    gammaM: 1.30,
    kmod: 0.80,
  },
  'C30': {
    name: 'C30 (Bois massif haute résistance)',
    type: 'solid',
    fmk: 30,
    ft0k: 18,
    fc0k: 23,
    fvk: 4.0,
    E0mean: 12.0,
    rhok: 380,
    gammaM: 1.30,
    kmod: 0.80,
  },
  'GL24h': {
    name: 'GL24h (Bois lamellé-collé homogène)',
    type: 'glulam',
    fmk: 24,
    ft0k: 19.2,
    fc0k: 24,
    fvk: 3.5,
    E0mean: 11.5,
    rhok: 385,
    gammaM: 1.25,
    kmod: 0.80,
  },
  'GL28h': {
    name: 'GL28h (Bois lamellé-collé haute performance)',
    type: 'glulam',
    fmk: 28,
    ft0k: 22.3,
    fc0k: 28,
    fvk: 3.5,
    E0mean: 12.6,
    rhok: 425,
    gammaM: 1.25,
    kmod: 0.80,
  },
};

export const SEISMIC_ZONES = [
  { zone: 1, label: 'Zone 1 - Très faible (ag = 0.4 m/s²)', ag: 0.4 },
  { zone: 2, label: 'Zone 2 - Faible (ag = 0.7 m/s²)', ag: 0.7 },
  { zone: 3, label: 'Zone 3 - Modérée (ag = 1.1 m/s²)', ag: 1.1 },
  { zone: 4, label: 'Zone 4 - Moyenne (ag = 1.6 m/s²)', ag: 1.6 },
  { zone: 5, label: 'Zone 5 - Forte (ag = 3.0 m/s²)', ag: 3.0 },
];

export const SOIL_CLASSES = [
  { class: 'A', label: 'Sol A - Rocher sain (S = 1.0)', S: 1.0 },
  { class: 'B', label: 'Sol B - Dépôts très denses (S = 1.2)', S: 1.2 },
  { class: 'C', label: 'Sol C - Dépôts denses / argiles raides (S = 1.5)', S: 1.5 },
  { class: 'D', label: 'Sol D - Dépôts de faible cohésion (S = 1.8)', S: 1.8 },
  { class: 'E', label: 'Sol E - Alluvions sur rocher (S = 1.6)', S: 1.6 },
];

export const FIRE_RATINGS = [
  { code: 'R30', durationMin: 30, label: 'R30 (30 minutes)' },
  { code: 'R60', durationMin: 60, label: 'R60 (60 minutes / 1h)' },
  { code: 'R90', durationMin: 90, label: 'R90 (90 minutes / 1h30)' },
  { code: 'R120', durationMin: 120, label: 'R120 (120 minutes / 2h)' },
];

export const EXPOSURE_CLASSES = [
  { code: 'XC1', label: 'XC1 - Intérieur sec (cmin = 15 mm)' },
  { code: 'XC2', label: 'XC2 - Humide, rarement sec (cmin = 25 mm)' },
  { code: 'XC3', label: 'XC3 - Humidité modérée (cmin = 25 mm)' },
  { code: 'XC4', label: 'XC4 - Alternance humidité et séchage (cmin = 30 mm)' },
  { code: 'XD1', label: 'XD1 - Chlorures non marins (cmin = 35 mm)' },
  { code: 'XS1', label: 'XS1 - Air salin marin (cmin = 35 mm)' },
  { code: 'XF1', label: 'XF1 - Gel sans déverglaçant (cmin = 30 mm)' },
];

