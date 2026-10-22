/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Visualiseur 2D Poutres Mixtes Acier-Béton (EN 1994-1-1 - EC4)
 * Affiche la connexion par goujons Nelson (s_min >= 5d, s_max <= min(800, 4hc)) et armatures anti-fendage
 */

import React from 'react';
import { CompositeInput, CompositeOutput } from '../core/eurocodes/ec4_composite.ts';
import { Ruler, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Composite2DViewerProps {
  input: CompositeInput;
  output: CompositeOutput;
}

export const Composite2DViewer: React.FC<Composite2DViewerProps> = ({ input, output }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Bandeau technique */}
      <div className="bg-slate-950 border-b border-slate-800 p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Bandeau Poutres Mixtes (EN 1994-1-1 §6.6)
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300">
            Profilé : <strong className="text-white">{output.profile.name}</strong> + Dalle hc = {input.slabThicknessHc} mm (beff = {input.beffWidth} mm)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Goujons PRd :</span>
            <span className="text-amber-300 font-mono font-medium tabular-nums">{output.studCapacityPRdKN} kN / goujon</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Espacement s :</span>
            <span className="text-emerald-300 font-mono font-medium tabular-nums">{output.spacingCalculatedMm} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Bornes normatives :</span>
            <span className="text-cyan-300 font-mono font-medium tabular-nums">{output.spacingMinMm} mm ≤ s ≤ {output.spacingMaxMm} mm</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="text-[11px] text-slate-400 font-medium">COUPE MIXTE : DALLE BÉTON + GOUJONS NELSON + PROFILÉ {output.profile.name}</div>
        <svg viewBox="0 0 540 320" className="w-full max-w-[540px] h-auto border border-slate-800 rounded bg-slate-900 p-2">
          {/* Dalle béton participante beff */}
          <rect x="40" y="40" width="460" height="70" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <text x="270" y="30" fill="#94a3b8" fontSize="11" textAnchor="middle">Dalle béton comprimée (beff = {input.beffWidth} mm, hc = {input.slabThicknessHc} mm)</text>

          {/* Armatures transversales anti-fendage */}
          <line x1="60" y1="75" x2="480" y2="75" stroke="#22c55e" strokeWidth="2.5" />
          <text x="470" y="70" fill="#4ade80" fontSize="10" textAnchor="end">Armatures anti-fendage Asf/sf</text>

          {/* Goujons Nelson (soudés sur la semelle supérieure) */}
          <rect x="255" y="90" width="10" height="25" fill="#f59e0b" stroke="#d97706" />
          <circle cx="260" cy="88" r="7" fill="#fbbf24" stroke="#d97706" />

          {input.studRows === 2 && (
            <>
              <rect x="275" y="90" width="10" height="25" fill="#f59e0b" stroke="#d97706" />
              <circle cx="280" cy="88" r="7" fill="#fbbf24" stroke="#d97706" />
            </>
          )}

          {/* Profilé métallique IPE / HEA */}
          {/* Semelle supérieure */}
          <rect x="180" y="110" width="180" height="18" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Âme */}
          <rect x="264" y="128" width="12" height="130" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Semelle inférieure */}
          <rect x="180" y="258" width="180" height="18" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />

          <text x="270" y="200" fill="#cbd5e1" fontSize="12" textAnchor="middle" className="font-bold">
            {output.profile.name} (Acier S355 / S275)
          </text>
        </svg>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 w-full max-w-[540px]">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Dispositions constructives Eurocode 4 validées
          </div>
          <div>• {output.constructiveAdvice}</div>
          <div className="mt-1 text-slate-400">• Armatures transversales anti-fendage prescrites : <strong className="text-white">{output.providedTransverseRebars}</strong>.</div>
        </div>
      </div>
    </div>
  );
};
