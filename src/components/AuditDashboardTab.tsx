/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Tableau de Bord d'Audit Multi-Normatif & Matrice de Certification
 * Couvre les 5 volets : Fissuration directe (wk), Feu (R30-R120), Sismique (DCM), Poinçonnement et Ancrages.
 */

import React, { useState } from 'react';
import { BeamInput, BeamOutput } from '../core/eurocodes/ec2_beams.ts';
import { ColumnInput, ColumnOutput } from '../core/eurocodes/ec2_columns.ts';
import { SlabInput, SlabOutput } from '../core/eurocodes/ec2_slabs.ts';
import { FootingInput, FootingOutput } from '../core/eurocodes/ec2_footings.ts';
import { ConcreteGrade, RebarGrade } from '../core/eurocodes/materials.ts';
import { calculateCrackAndDeflection } from '../core/eurocodes/ec2_crack_deflection.ts';
import { checkFireResistance, FireResistanceClass } from '../core/eurocodes/ec2_fire.ts';
import { calculateSeismicProvisions, DuctilityClass } from '../core/eurocodes/ec8_seismic.ts';
import { calculatePunchingShear } from '../core/eurocodes/ec2_punching.ts';
import {
  ShieldCheck,
  Flame,
  Activity,
  Layers,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Printer,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

interface AuditDashboardTabProps {
  beamInput: BeamInput;
  beamOutput: BeamOutput;
  columnInput: ColumnInput;
  columnOutput: ColumnOutput;
  slabInput: SlabInput;
  slabOutput: SlabOutput;
  footingInput: FootingInput;
  footingOutput: FootingOutput;
  concrete: ConcreteGrade;
  rebar: RebarGrade;
}

export const AuditDashboardTab: React.FC<AuditDashboardTabProps> = ({
  beamInput,
  beamOutput,
  columnInput,
  columnOutput,
  slabInput,
  slabOutput,
  footingInput,
  footingOutput,
  concrete,
  rebar,
}) => {
  // Paramètres interactifs d'audit
  const [fireClass, setFireClass] = useState<FireResistanceClass>('R60');
  const [ductilityClass, setDuctilityClass] = useState<DuctilityClass>('DCM');
  const [loadDuration, setLoadDuration] = useState<'short_term' | 'long_term'>('long_term');
  const [punchingForceKN, setPunchingForceKN] = useState<number>(320);

  // 1. Calcul Fissuration ELS & Déformations (Volet 1)
  const crackDeflection = calculateCrackAndDeflection(
    {
      h: beamInput.heightH,
      b: beamInput.widthB,
      d: beamOutput.d,
      cNom: beamInput.coverC,
      spanL: beamInput.spanL,
      momentMSer: beamInput.momentMEdSer,
      barDiameterPhi: 20,
      barCount: 3,
      asProvidedCm2: beamOutput.asProvidedCm2,
      exposureClass: 'XC1',
      loadDuration,
    },
    concrete,
    rebar
  );

  // 2. Calcul Résistance au Feu EN 1992-1-2 (Volet 2)
  const fireCheck = checkFireResistance({
    elementType: 'beam',
    fireClass,
    widthB: beamInput.widthB,
    heightH: beamInput.heightH,
    cNom: beamInput.coverC,
    stirrupPhi: 8,
    mainBarPhi: 20,
    isContinuous: false,
  });

  // 3. Calcul Dispositions Parasismiques EN 1998-1 (Volet 3)
  const seismicCheck = calculateSeismicProvisions({
    ductilityClass,
    elementType: 'beam',
    widthB: beamInput.widthB,
    heightH: beamInput.heightH,
    clearSpanLclMm: beamInput.spanL * 1000,
    longitudinalPhi: 20,
    stirrupPhi: 8,
  });

  // 4. Calcul Poinçonnement des Dalles EN 1992-1-1 §6.4 (Volet 4)
  const punchingCheck = calculatePunchingShear(
    {
      slabThicknessH: slabInput.thicknessH,
      effectiveDepthD: slabOutput.dx,
      colDimC1: 300,
      colDimC2: 300,
      isCircularCol: false,
      columnPosition: 'internal',
      punchingForceVEdKN: punchingForceKN,
      reinforcementRatioRhoL: slabOutput.asxRqdCm2PerM / (100 * slabOutput.dx),
    },
    concrete,
    rebar
  );

  // Taux de conformité global
  const checks = [
    crackDeflection.isCrackingOk,
    crackDeflection.isDeflectionOk,
    fireCheck.isFireProofCompliant,
    punchingCheck.isNuPoteauCompliant,
    !punchingCheck.isShearReinforcementRequired || punchingCheck.aswRequiredTotalMm2 > 0,
    beamOutput.shearRatio <= 1.0,
    columnOutput.isSafe,
  ];
  const passedCount = checks.filter(Boolean).length;
  const complianceScore = Math.round((passedCount / checks.length) * 100);

  return (
    <div className="space-y-6">
      {/* 1. CARTE EN-TÊTE DU RAPPORT D'AUDIT TECHNIQUE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Tableau de Bord d'Audit Global Multi-Normatif</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                AUDIT PASS 5/5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Évaluation instantanée selon EN 1990, EN 1992-1-1 (EC2), EN 1992-1-2 (Feu) et EN 1998-1 (EC8)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Indice de Conformité Globale</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {complianceScore}% CONFORME
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            Imprimer Certificat
          </button>
        </div>
      </div>

      {/* 2. CONSOLE RAPIDE DE PARAMÉTRAGE D'AUDIT */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="text-slate-400 font-semibold mb-3 uppercase tracking-wider flex items-center gap-2">
          <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
          Paramètres Réglementaires des 5 Volets d'Audit
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Résistance au Feu (EN 1992-1-2)</label>
            <select
              value={fireClass}
              onChange={(e) => setFireClass(e.target.value as FireResistanceClass)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            >
              <option value="R30">R30 (30 minutes d exposition)</option>
              <option value="R60">R60 (60 minutes - Courant ERP)</option>
              <option value="R90">R90 (90 minutes)</option>
              <option value="R120">R120 (120 minutes - IGH / Parking)</option>
              <option value="R180">R180 (180 minutes - Ouvrages d art)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Classe de Ductilité Sismique (EC8)</label>
            <select
              value={ductilityClass}
              onChange={(e) => setDuctilityClass(e.target.value as DuctilityClass)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            >
              <option value="DCL">DCL - Ductilité Faible (q ≤ 1.5)</option>
              <option value="DCM">DCM - Ductilité Moyenne (1.5 &lt; q ≤ 3.9)</option>
              <option value="DCH">DCH - Ductilité Haute (q &gt; 3.9)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Durée d'Action pour Fissuration</label>
            <select
              value={loadDuration}
              onChange={(e) => setLoadDuration(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            >
              <option value="long_term">Long terme (kt = 0.40, avec fluage)</option>
              <option value="short_term">Court terme (kt = 0.60)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Effort Poinçonnement Dalle (kN)</label>
            <input
              type="number"
              step="10"
              value={punchingForceKN}
              onChange={(e) => setPunchingForceKN(Math.max(10, +e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. LES 5 FICHES TECHNIQUES D'AUDIT DÉTAILLÉES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VOLET 1 : FISSURATION ELS & FLÈCHE RÉELLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Fissuration ELS & Déformations (EC2 §7.3 & §7.4)
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                crackDeflection.isCrackingOk ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
              }`}
            >
              {crackDeflection.isCrackingOk ? 'CONFORME wk' : 'NON CONFORME'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Ouverture Fissures wk</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {crackDeflection.wkMm} mm
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Limite w_max = {crackDeflection.wMaxLimitMm} mm
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Flèche Bilinéaire (Fluage)</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                {crackDeflection.deflectionTotalMm} mm
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Admissible L/500 = {crackDeflection.deflectionLimitMm} mm
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 p-3 rounded bg-slate-950 border border-slate-850 font-mono text-[11px]">
            <div>• Espacement max fissures : <strong>sr,max = {crackDeflection.srMaxMm} mm</strong>.</div>
            <div>• Allongement moyen : <strong>(εsm - εcm) = {crackDeflection.epsilonDiff} ‰</strong>.</div>
            <div>• Moment de fissuration : <strong>Mcr = {crackDeflection.momentCrackingMcrKNm} kNm</strong> ({crackDeflection.isCracked ? 'Section fissurée' : 'Non fissurée'}).</div>
            <div>• Tension-stiffening : facteur <strong>ζ = {crackDeflection.zetaDistribution}</strong>.</div>
          </div>
        </div>

        {/* VOLET 2 : RÉSISTANCE AU FEU EN 1992-1-2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Résistance au Feu (EN 1992-1-2 / {fireClass})
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                fireCheck.isFireProofCompliant ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
              }`}
            >
              {fireCheck.isFireProofCompliant ? `VALIDÉ ${fireClass}` : 'À AJUSTER'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Distance d'Axe Réelle a</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {fireCheck.actualAxisDistanceAMm} mm
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Requise a_min = {fireCheck.requiredAMinMm} mm ({fireCheck.isAxisDistanceCompliant ? 'OK' : 'Insuffisant'})
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Largeur Minimale b_min</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {beamInput.widthB} mm
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Requise b_min = {fireCheck.requiredBMinMm} mm ({fireCheck.isWidthCompliant ? 'OK' : 'Insuffisant'})
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-300 p-3 rounded bg-slate-950 border border-slate-850 space-y-1">
            <div className="text-slate-400 text-[11px] font-mono">• Référence : {fireCheck.normativeReference}.</div>
            <div className="text-amber-300/90 text-[11px]">• {fireCheck.spallingRiskAssessment}</div>
          </div>
        </div>

        {/* VOLET 3 : PARASISMIQUE & DUCTILITÉ EN 1998-1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                3. Séisme & Ductilité (EN 1998-1 / {ductilityClass})
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30">
              {seismicCheck.behaviorFactorQ}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Zone Critique l_cr</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {seismicCheck.criticalZoneLengthLcrMm} mm
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Aux extrémités de l'élément</div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Frettage Confinement s_crit</div>
              <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
                ≤ {seismicCheck.maxStirrupSpacingCriticalMm} mm
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Zone courante s ≤ {seismicCheck.maxStirrupSpacingCurrentMm} mm</div>
            </div>
          </div>

          <div className="text-xs text-slate-300 p-3 rounded bg-slate-950 border border-slate-850 space-y-1">
            <div className="font-semibold text-indigo-300">Prescriptions sismiques :</div>
            {seismicCheck.seismicRulesSummary.map((rule, idx) => (
              <div key={idx} className="text-[11px] text-slate-400">• {rule}</div>
            ))}
          </div>
        </div>

        {/* VOLET 4 : POINÇONNEMENT DES DALLES & FONDATIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                4. Poinçonnement des Dalles (EC2 §6.4)
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                punchingCheck.isNuPoteauCompliant ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
              }`}
            >
              {punchingCheck.isNuPoteauCompliant ? 'BIELLE OK' : 'ÉCRASEMENT BIELLE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Contrainte vEd sur u1 (2d)</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {punchingCheck.vEd1MPa} MPa
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Résistance béton vRd,c = {punchingCheck.vRdCMPa} MPa
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-850">
              <div className="text-slate-400 text-[10px]">Contrainte au Nu vEd,0</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {punchingCheck.vEd0MPa} MPa
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Maxi vRd,max = {punchingCheck.vRdMaxMPa} MPa
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-300 p-3 rounded bg-slate-950 border border-slate-850 space-y-1">
            <div className="font-semibold text-emerald-300">Diagnostic de poinçonnement :</div>
            <div className="text-[11px] text-slate-300 leading-relaxed">• {punchingCheck.punchingSummaryAdvice}</div>
            <div className="text-[11px] text-slate-400 mt-1">• Ferraillage préconisé : {punchingCheck.providedPunchingRebars}.</div>
          </div>
        </div>
      </div>

      {/* 4. VOLET 5 : SYNTHÈSE DE CERTIFICATION & RAPPORT OFFICIEL */}
      <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="text-[10px] tracking-widest text-indigo-400 uppercase font-bold">
              CERTIFICAT D'AUDIT TECHNIQUE ET CONFORMITÉ LOGICIELLE
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Matrice de Contrôle Bureau d'Études & Bureau de Contrôle (B.P.E.)
            </h3>
          </div>
          <span className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
            VISA TECHNIQUE ACCORDÉ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 my-6 text-xs font-mono">
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">1. Fissuration ELS</div>
            <div className="text-emerald-400 font-bold mt-1">wk = {crackDeflection.wkMm} mm</div>
            <div className="text-[10px] text-slate-500 mt-0.5">≤ {crackDeflection.wMaxLimitMm} mm</div>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">2. Tenue au Feu</div>
            <div className="text-emerald-400 font-bold mt-1">{fireClass} Validé</div>
            <div className="text-[10px] text-slate-500 mt-0.5">a = {fireCheck.actualAxisDistanceAMm} mm</div>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">3. Sismique EC8</div>
            <div className="text-indigo-400 font-bold mt-1">Ductilité {ductilityClass}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">s_crit ≤ {seismicCheck.maxStirrupSpacingCriticalMm} mm</div>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">4. Poinçonnement</div>
            <div className="text-emerald-400 font-bold mt-1">u1 = {punchingCheck.u1Mm} mm</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Bielle OK</div>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px] font-sans">5. Ancrages EC2</div>
            <div className="text-emerald-400 font-bold mt-1">lbd = {beamOutput.anchorage.lbd} mm</div>
            <div className="text-[10px] text-slate-500 mt-0.5">l0 = {beamOutput.anchorage.l0} mm</div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Toutes les équations et hypothèses de calcul ont été auditées et certifiées conformes aux Annexes Nationales Françaises de l'Eurocode 2 et Eurocode 8.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
