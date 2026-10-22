/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Module Fissuration ELS & Déformations (EN 1992-1-1 §7.3 & §7.4)
 * Calcul direct de l'ouverture des fissures wk (Eq. 7.8) et flèche bilinéaire avec tension-stiffening
 */

import { ConcreteGrade, RebarGrade } from './materials.ts';

export interface CrackDeflectionInput {
  h: number;                 // Hauteur totale section en mm (ex: 500)
  b: number;                 // Largeur de la section en mm (ex: 250)
  d: number;                 // Hauteur utile en mm (ex: 450)
  cNom: number;              // Enrobage nominal en mm (ex: 30)
  spanL: number;             // Portée en m (ex: 6.0)
  momentMSer: number;        // Moment de flexion de service quasi-permanent en kNm (ex: 125)
  barDiameterPhi: number;    // Diamètre des barres tendues en mm (ex: 20)
  barCount: number;          // Nombre de barres tendues (ex: 3)
  asProvidedCm2: number;     // Section d'acier réelle en cm2 (ex: 9.42)
  exposureClass: string;     // 'XC1', 'XC2', 'XC3', 'XC4', 'XS1', 'XD1'
  loadDuration: 'short_term' | 'long_term'; // kt = 0.6 (court terme) ou 0.4 (long terme)
}

export interface CrackDeflectionOutput {
  // Contraintes en phase fissurée
  neutralAxisXSerMm: number; // Position de l'axe neutre x en mm
  inertiaCrackedMm4: number; // Inertie fissurée I_II en mm4
  sigmaSSerMPa: number;      // Contrainte dans les aciers tendus à l'ELS en MPa
  sigmaCSerMPa: number;      // Contrainte maximale de compression du béton en MPa
  
  // Fissuration directe (EC2 §7.3.4)
  hcEffMm: number;           // Hauteur de la zone efficace de béton tendu hc,eff
  acEffMm2: number;          // Aire de la zone efficace Ac,eff
  rhoPEff: number;           // Taux effectif d'armature rho_p,eff = As / Ac,eff
  srMaxMm: number;           // Espacement maximal des fissures sr,max (Eq. 7.11)
  epsilonDiff: number;       // Différence d'allongement moyen (eps_sm - eps_cm)
  wkMm: number;              // Ouverture de fissure calculée wk en mm
  wMaxLimitMm: number;       // Ouverture de fissure admissible w_max (0.30 ou 0.20 mm)
  isCrackingOk: boolean;     // wk <= w_max
  
  // Flèche avec tension-stiffening (EC2 §7.4.3)
  momentCrackingMcrKNm: number; // Moment de fissuration Mcr
  isCracked: boolean;        // MSer > Mcr
  zetaDistribution: number;  // Facteur de distribution d'endommagement zeta
  deflectionUncrackedMm: number; // Flèche élastique non fissurée f_I
  deflectionCrackedMm: number;   // Flèche fissurée état II f_II
  deflectionTotalMm: number;     // Flèche réelle pondérée f_tot
  deflectionLimitMm: number;     // Limite admissible L/500 (ou L/250)
  isDeflectionOk: boolean;
}

export function calculateCrackAndDeflection(
  input: CrackDeflectionInput,
  concrete: ConcreteGrade,
  rebar: RebarGrade
): CrackDeflectionOutput {
  const { h, b, d, cNom, spanL, momentMSer, barDiameterPhi, asProvidedCm2, exposureClass, loadDuration } = input;
  
  const mSerNmm = momentMSer * 1e6;
  const asMm2 = asProvidedCm2 * 100;
  const alphaE = +(rebar.Es / (concrete.Ecm * 1000)).toFixed(2); // Coeff d'équivalence n ≈ 15
  const nEquiv = 15;
  
  // 1. Calcul de l'axe neutre et de l'inertie en section fissurée (État II)
  // b * x^2 / 2 + n * As' * (x - d') - n * As * (d - x) = 0
  const rho = asMm2 / (b * d);
  const xSer = d * (Math.sqrt(nEquiv * rho * (2 + nEquiv * rho)) - nEquiv * rho);
  const neutralAxisXSerMm = Math.round(xSer);
  
  const iII = (b * Math.pow(xSer, 3)) / 3 + nEquiv * asMm2 * Math.pow(d - xSer, 2);
  const inertiaCrackedMm4 = Math.round(iII);
  
  // Contraintes de service
  const sigmaCSerMPa = +((mSerNmm * xSer) / iII).toFixed(2);
  const sigmaSSerMPa = +(nEquiv * (mSerNmm * (d - xSer)) / iII).toFixed(1);
  
  // 2. Zone efficace de béton tendu (EC2 §7.3.2 & Fig. 7.1)
  // hc,eff = min(2.5 * (h - d), (h - x) / 3, h / 2)
  const hcEff = Math.min(2.5 * (h - d), (h - xSer) / 3, h / 2);
  const hcEffMm = Math.round(hcEff);
  const acEffMm2 = Math.round(b * hcEff);
  const rhoPEff = +(asMm2 / acEffMm2).toFixed(4);
  
  // Coefficients normatifs
  const k1 = 0.8; // Barres à haute adhérence B500B
  const k2 = 0.5; // Flexion simple
  const k3 = 3.4;
  const k4 = 0.425;
  const kt = loadDuration === 'long_term' ? 0.4 : 0.6;
  
  // Espacement maximal des fissures sr,max (EC2 Eq. 7.11)
  // sr,max = k3 * c + k1 * k2 * k4 * phi / rho_p,eff
  const srMax = k3 * cNom + (k1 * k2 * k4 * barDiameterPhi) / rhoPEff;
  const srMaxMm = Math.round(srMax);
  
  // Allongement relatif moyen (eps_sm - eps_cm) (EC2 Eq. 7.9)
  const fctEff = concrete.fctm; // fct,eff = fctm pour fissuration
  const es = rebar.Es; // 200 000 MPa
  const term1 = sigmaSSerMPa - kt * (fctEff / rhoPEff) * (1 + alphaE * rhoPEff);
  const epsilonDiffRaw = term1 / es;
  const epsilonDiffMin = (0.6 * sigmaSSerMPa) / es;
  const epsilonDiff = Math.max(epsilonDiffRaw, epsilonDiffMin);
  
  // Ouverture caractéristique des fissures wk (EC2 Eq. 7.8)
  const wk = srMax * epsilonDiff;
  const wkMm = +(wk).toFixed(3);
  
  // Seuil admissible w_max selon classe d'exposition (EC2 Tableau 7.1N)
  // XC1 -> 0.40 mm ; XC2, XC3, XC4 -> 0.30 mm ; XD1, XS1 -> 0.20 mm
  let wMaxLimitMm = 0.30;
  if (exposureClass === 'XC1') wMaxLimitMm = 0.40;
  else if (exposureClass === 'XD1' || exposureClass === 'XS1') wMaxLimitMm = 0.20;
  else wMaxLimitMm = 0.30;
  
  const isCrackingOk = wkMm <= wMaxLimitMm;
  
  // 3. Flèche avec prise en compte du tension-stiffening (EC2 §7.4.3)
  // Moment de fissuration Mcr = fctm * I_I / (h - v)
  const iI = (b * Math.pow(h, 3)) / 12; // Section homogène brute
  const mcrNmm = (concrete.fctm * iI) / (h / 2);
  const momentCrackingMcrKNm = +(mcrNmm / 1e6).toFixed(2);
  const isCracked = mSerNmm > mcrNmm;
  
  // Facteur de distribution zeta = 1 - beta * (sigma_sr / sigma_s)^2 ≈ 1 - beta * (Mcr / MSer)^2
  const betaLoad = loadDuration === 'long_term' ? 0.5 : 1.0;
  let zeta = 0;
  if (isCracked) {
    zeta = 1 - betaLoad * Math.pow(mcrNmm / mSerNmm, 2);
    zeta = Math.max(0, Math.min(1.0, zeta));
  }
  const zetaDistribution = +(zeta).toFixed(3);
  
  // Flèches élastiques non fissurée et fissurée
  const spanMm = spanL * 1000;
  const ecmEffective = loadDuration === 'long_term' ? (concrete.Ecm * 1000) / 3 : (concrete.Ecm * 1000); // Prise en compte du fluage
  
  const fI = (5 / 48) * (mSerNmm * Math.pow(spanMm, 2)) / (ecmEffective * iI);
  const fII = (5 / 48) * (mSerNmm * Math.pow(spanMm, 2)) / (ecmEffective * iII);
  const deflectionUncrackedMm = +(fI).toFixed(1);
  const deflectionCrackedMm = +(fII).toFixed(1);
  
  // Flèche bilinéaire interpolée : f_tot = zeta * f_II + (1 - zeta) * f_I
  const fTot = zeta * fII + (1 - zeta) * fI;
  const deflectionTotalMm = +(fTot).toFixed(1);
  const deflectionLimitMm = +(spanMm / 500).toFixed(1); // L/500
  const isDeflectionOk = deflectionTotalMm <= deflectionLimitMm;
  
  return {
    neutralAxisXSerMm,
    inertiaCrackedMm4,
    sigmaSSerMPa,
    sigmaCSerMPa,
    hcEffMm,
    acEffMm2,
    rhoPEff,
    srMaxMm,
    epsilonDiff: +(epsilonDiff * 1000).toFixed(3), // en mm/m
    wkMm,
    wMaxLimitMm,
    isCrackingOk,
    momentCrackingMcrKNm,
    isCracked,
    zetaDistribution,
    deflectionUncrackedMm,
    deflectionCrackedMm,
    deflectionTotalMm,
    deflectionLimitMm,
    isDeflectionOk,
  };
}
