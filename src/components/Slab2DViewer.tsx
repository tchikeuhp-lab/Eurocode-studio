/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Visualiseur 2D Dalles & Planchers (EN 1992-1-1 §9.3)
 */

import React from 'react';
import { SlabInput, SlabOutput } from '../core/eurocodes/ec2_slabs.ts';
import { Ruler, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Slab2DViewerProps {
  input: SlabInput;
  output: SlabOutput;
}

export const Slab2DViewer: React.FC<Slab2DViewerProps> = ({ input, output }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Bandeau technique */}
      <div className="bg-slate-950 border-b border-slate-800 p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Bandeau Dalles & Planchers (EC2 §9.3)
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300">
            Type : <strong className="text-white">{input.slabType === 'one_way' ? 'Portance 1 Sens' : 'Portance 2 Sens'}</strong> (h = {input.thicknessH} mm)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">s_max admissible :</span>
            <span className="text-amber-300 font-mono font-medium tabular-nums">{output.sMaxPermissibleMm} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Ancrage rives lbd :</span>
            <span className="text-cyan-300 font-mono font-medium tabular-nums">{output.anchorageRequiredLengthMm} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Flèche L/d :</span>
            <span className="text-emerald-400 font-mono font-medium tabular-nums">{output.lOverDRatio} ≤ {output.lOverDLimit}</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="text-[11px] text-slate-400 font-medium">COUPE DE COFFRAGE & FERRAILLAGE DE DALLE</div>
        <svg viewBox="0 0 540 220" className="w-full max-w-[540px] h-auto border border-slate-800 rounded bg-slate-900 p-2">
          {/* Coffrage dalle */}
          <rect x="50" y="50" width="440" height="80" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          {/* Voiles / Poutres supports rives */}
          <rect x="50" y="130" width="40" height="60" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          <rect x="450" y="130" width="40" height="60" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />

          {/* Nappe inférieure en X */}
          <line x1="60" y1="115" x2="480" y2="115" stroke="#22c55e" strokeWidth="3" />
          {/* Crochets d'about sur rives */}
          <line x1="60" y1="115" x2="60" y2="80" stroke="#22c55e" strokeWidth="3" />
          <line x1="480" y1="115" x2="480" y2="80" stroke="#22c55e" strokeWidth="3" />

          {/* Barres transversales en Y (points) */}
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx={90 + i * 45} cy="108" r="4" fill="#38bdf8" />
          ))}

          {/* Chapeaux d'appuis de rives */}
          <line x1="50" y1="65" x2="140" y2="65" stroke="#10b981" strokeWidth="2.5" />
          <line x1="50" y1="65" x2="50" y2="95" stroke="#10b981" strokeWidth="2.5" />
          <line x1="490" y1="65" x2="400" y2="65" stroke="#10b981" strokeWidth="2.5" />
          <line x1="490" y1="65" x2="490" y2="95" stroke="#10b981" strokeWidth="2.5" />

          {/* Cotations */}
          <text x="270" y="35" fill="#94a3b8" fontSize="11" textAnchor="middle">Sens X : {output.providedRebarsX}</text>
          <text x="270" y="145" fill="#38bdf8" fontSize="10" textAnchor="middle">Sens Y (répartition) : {output.providedRebarsY}</text>
          <text x="80" y="80" fill="#fbbf24" fontSize="9" textAnchor="middle">lbd = {output.anchorageRequiredLengthMm} mm</text>
        </svg>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 w-full max-w-[540px]">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Dispositions constructives certifiées
          </div>
          <div>• Espacement réel : <strong className="text-white font-mono">{output.sActualMm} mm</strong> ≤ s_max ({output.sMaxPermissibleMm} mm).</div>
          <div>• {output.anchorageAdvice}.</div>
        </div>
      </div>
    </div>
  );
};
