/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Visualiseur 2D Semelles Isolées de Fondations (EC2 & EC7)
 * Affiche la vérification du patin par rapport à lbd et la prescription automatique de crochets
 */

import React from 'react';
import { FootingInput, FootingOutput } from '../core/eurocodes/ec2_footings.ts';
import { Ruler, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Footing2DViewerProps {
  input: FootingInput;
  output: FootingOutput;
}

export const Footing2DViewer: React.FC<Footing2DViewerProps> = ({ input, output }) => {
  const needsHookA = !output.isStraightAnchorageSufficientA;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Bandeau technique */}
      <div className="bg-slate-950 border-b border-slate-800 p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Bandeau Semelles de Fondations (EC2 & DTU 13.12)
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300">
            Patin A : <strong className="text-white font-mono">{output.patinLengthAMm} mm</strong> vs lbd droit ({output.anchorageA.lbdStraight} mm)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Pression Sol :</span>
            <span className={`font-mono font-medium tabular-nums ${output.isSoilStressOk ? 'text-emerald-400' : 'text-rose-400'}`}>
              {output.soilPressureSERKPa} kPa ({output.soilUtilizationPercent}%)
            </span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Crochets de relevage :</span>
            <span className={`font-medium ${needsHookA ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
              {needsHookA ? 'OBLIGATOIRES (90°)' : 'Non requis (barre droite)'}
            </span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Attente poteau l0 :</span>
            <span className="text-cyan-300 font-mono font-medium tabular-nums">{output.starterLapL0Mm} mm</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="text-[11px] text-slate-400 font-medium">COUPE VERTICALE DE LA SEMELLE ET DES ATTENTES POTEAU</div>
        <svg viewBox="0 0 540 320" className="w-full max-w-[540px] h-auto border border-slate-800 rounded bg-slate-900 p-2">
          {/* Béton de propreté */}
          <rect x="30" y="270" width="480" height="20" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <text x="270" y="284" fill="#64748b" fontSize="10" textAnchor="middle">Gros béton / Béton de propreté 5 cm</text>

          {/* Coffrage semelle */}
          <rect x="50" y="170" width="440" height="100" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

          {/* Poteau en élévation */}
          <rect x="220" y="40" width="100" height="130" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <text x="270" y="100" fill="#94a3b8" fontSize="11" textAnchor="middle">Poteau {input.colA}×{input.colB}</text>

          {/* Armatures d'attentes poteau avec crosses équerres dans la semelle */}
          <line x1="235" y1="10" x2="235" y2="245" stroke="#06b6d4" strokeWidth="3" />
          <line x1="235" y1="245" x2="185" y2="245" stroke="#06b6d4" strokeWidth="3" />

          <line x1="305" y1="10" x2="305" y2="245" stroke="#06b6d4" strokeWidth="3" />
          <line x1="305" y1="245" x2="355" y2="245" stroke="#06b6d4" strokeWidth="3" />

          <text x="325" y="25" fill="#22d3ee" fontSize="10" className="font-mono font-bold">Attente l0 = {output.starterLapL0Mm} mm</text>

          {/* Nappe principale de la semelle en fond */}
          <line x1="65" y1="255" x2="475" y2="255" stroke="#22c55e" strokeWidth="4" />

          {/* Crochets de relevage terminaux verticaux si requis par l'audit */}
          {needsHookA ? (
            <>
              <line x1="65" y1="255" x2="65" y2="200" stroke="#f59e0b" strokeWidth="4" />
              <line x1="475" y1="255" x2="475" y2="200" stroke="#f59e0b" strokeWidth="4" />
              <text x="85" y="195" fill="#fbbf24" fontSize="10" className="font-bold">Crochet de relevage (Audit EC2)</text>
            </>
          ) : (
            <text x="85" y="250" fill="#4ade80" fontSize="10">Barre droite continue</text>
          )}

          {/* Cotes de patin */}
          <line x1="50" y1="155" x2="220" y2="155" stroke="#94a3b8" strokeWidth="1" />
          <text x="135" y="145" fill="#cbd5e1" fontSize="10" textAnchor="middle" className="font-mono">
            Patin = {output.patinLengthAMm} mm
          </text>
        </svg>

        {/* Diagnostic technique */}
        <div className={`p-3.5 border rounded-lg text-xs w-full max-w-[540px] ${needsHookA ? 'bg-amber-950/20 border-amber-500/40 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
          <div className="flex items-center gap-2 font-semibold mb-1">
            {needsHookA ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>Diagnostic d'Ancrage en Patin (EN 1992-1-1 & DTU 13.12)</span>
          </div>
          <div className="mt-1 leading-relaxed">{output.hookAdviceA}</div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            • Ferraillage nappe de fond : <strong className="text-white">{output.providedRebarsA}</strong> (Sens A) et <strong className="text-white">{output.providedRebarsB}</strong> (Sens B).
            <br />
            • {output.starterRebarsText}.
          </div>
        </div>
      </div>
    </div>
  );
};
