/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Visualiseur 2D Poteaux Complexes (7 Formes) & Frettage
 * Affiche en temps réel l'élévation avec attente l0, zones de frettage scrit et la section transversale
 */

import React, { useState } from 'react';
import { ColumnInput, ColumnOutput } from '../core/eurocodes/ec2_columns.ts';
import { Ruler, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Column2DViewerProps {
  input: ColumnInput;
  output: ColumnOutput;
}

export const Column2DViewer: React.FC<Column2DViewerProps> = ({ input, output }) => {
  const [activeTab, setActiveTab] = useState<'both' | 'elevation' | 'section'>('both');

  const H = input.heightL * 1000; // mm
  const B = input.dimB;
  const l0 = output.lapLengthL0Mm;
  const sCrit = output.spacingCritMm;
  const sCourant = output.spacingCourantMm;
  const zCritH = output.zoneCritHeightMm;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* 1. BANDEAU TECHNIQUE NORMATIF TEMPS RÉEL (EXIGENCE AUDIT) */}
      <div className="bg-slate-950 border-b border-slate-800 p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Bandeau Normatif Poteau (EC2 §8 & §9.5)
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300">
            Forme : <strong className="text-white">{output.shapeNameFr}</strong> (Ac = {output.actAreaCm2} cm²)
          </span>
        </div>

        {/* METRICS D'ATTENTE ET FRETTAGE */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Attente l0 :</span>
            <span className="text-cyan-300 font-mono font-medium tabular-nums">{l0} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">s_crit tête/pied :</span>
            <span className="text-amber-300 font-mono font-medium tabular-nums">{sCrit} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">s_courant :</span>
            <span className="text-indigo-300 font-mono font-medium tabular-nums">{sCourant} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">Taux NEd/NRd :</span>
            <span className={`font-mono font-medium tabular-nums ${output.isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(output.capacityRatio * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. BOUTONS D'AFFICHAGE */}
      <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${activeTab === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Élévation & Section
          </button>
          <button
            onClick={() => setActiveTab('elevation')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${activeTab === 'elevation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Élévation Complète
          </button>
          <button
            onClick={() => setActiveTab('section')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${activeTab === 'section' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Section {output.shapeNameFr}
          </button>
        </div>
        <div className="text-[11px] text-slate-400">
          Longueur totale des barres avec attente : <strong className="text-white font-mono tabular-nums">{output.totalBarLengthM} m</strong>
        </div>
      </div>

      {/* 3. VISUALISATION SVG */}
      <div className="p-4 bg-slate-950 flex flex-col md:flex-row items-center justify-center gap-8 min-h-[380px] overflow-x-auto">
        {(activeTab === 'both' || activeTab === 'elevation') && (
          <div className="flex flex-col items-center">
            <div className="text-[11px] text-slate-400 mb-2 font-medium tracking-wide">
              ÉLÉVATION TECHNIQUE (H = {input.heightL} m + ATTENTE l0 = {l0} mm)
            </div>
            <svg viewBox="0 0 340 400" className="w-64 h-auto border border-slate-800/80 rounded bg-slate-900/90 shadow-inner p-2">
              <defs>
                <pattern id="gridCol" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridCol)" />

              {/* Coffrage poteau */}
              <rect x="120" y="80" width="100" height="260" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

              {/* Sol / Semelle inférieure */}
              <rect x="70" y="340" width="200" height="40" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
              <text x="170" y="365" fill="#94a3b8" fontSize="10" textAnchor="middle">Semelle de Fondation</text>

              {/* Attentes l0 en tête */}
              <line x1="135" y1="80" x2="135" y2="25" stroke="#06b6d4" strokeWidth="3" />
              <line x1="205" y1="80" x2="205" y2="25" stroke="#06b6d4" strokeWidth="3" />
              <text x="220" y="55" fill="#22d3ee" fontSize="10" className="font-mono font-bold">l0 = {l0} mm</text>

              {/* Armatures longitudinales internes */}
              <line x1="135" y1="80" x2="135" y2="350" stroke="#22c55e" strokeWidth="3.5" />
              <line x1="205" y1="80" x2="205" y2="350" stroke="#22c55e" strokeWidth="3.5" />
              {/* Retours d'ancrage en pied */}
              <line x1="135" y1="350" x2="110" y2="350" stroke="#22c55e" strokeWidth="3" />
              <line x1="205" y1="350" x2="230" y2="350" stroke="#22c55e" strokeWidth="3" />

              {/* Zone critique de frettage en tête */}
              <rect x="122" y="82" width="96" height="55" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeDasharray="3 3" />
              <line x1="125" y1="92" x2="215" y2="92" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="125" y1="106" x2="215" y2="106" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="125" y1="120" x2="215" y2="120" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="125" y1="134" x2="215" y2="134" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="75" y="112" fill="#fbbf24" fontSize="9" textAnchor="middle">s_crit</text>

              {/* Zone courante */}
              <line x1="125" y1="165" x2="215" y2="165" stroke="#64748b" strokeWidth="1" />
              <line x1="125" y1="200" x2="215" y2="200" stroke="#64748b" strokeWidth="1" />
              <line x1="125" y1="235" x2="215" y2="235" stroke="#64748b" strokeWidth="1" />
              <text x="80" y="200" fill="#94a3b8" fontSize="9" textAnchor="middle">s_courant</text>

              {/* Zone critique de frettage en pied */}
              <rect x="122" y="280" width="96" height="58" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeDasharray="3 3" />
              <line x1="125" y1="288" x2="215" y2="288" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="125" y1="302" x2="215" y2="302" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="125" y1="316" x2="215" y2="316" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="125" y1="330" x2="215" y2="330" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="75" y="310" fill="#fbbf24" fontSize="9" textAnchor="middle">s_crit</text>

              {/* Cote hauteur */}
              <line x1="235" y1="80" x2="235" y2="340" stroke="#94a3b8" strokeWidth="1" />
              <text x="250" y="215" fill="#cbd5e1" fontSize="10" textAnchor="start" className="font-mono">
                H = {input.heightL} m
              </text>
            </svg>
          </div>
        )}

        {(activeTab === 'both' || activeTab === 'section') && (
          <div className="flex flex-col items-center">
            <div className="text-[11px] text-slate-400 mb-2 font-medium tracking-wide">
              SECTION TRANSVERSALE : {output.shapeNameFr.toUpperCase()} ({B} × {input.dimH} mm)
            </div>
            <svg viewBox="0 0 280 280" className="w-64 h-auto border border-slate-800/80 rounded bg-slate-900/90 shadow-inner p-2">
              <rect width="100%" height="100%" fill="url(#gridCol)" />

              {/* Dessin selon la forme sélectionnée */}
              {input.shape === 'rect' && (
                <>
                  <rect x="50" y="50" width="180" height="180" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  {/* Cadre principal extérieur */}
                  <rect x="65" y="65" width="150" height="150" fill="none" stroke="#f59e0b" strokeWidth="2" rx="4" />
                  {/* Étrier intérieur si plus de 4 barres ou large section */}
                  {output.cadresCountPerSet > 1 && (
                    <rect x="95" y="65" width="90" height="150" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" rx="3" />
                  )}
                  {/* Barres aux 4 coins */}
                  <circle cx="78" cy="78" r="6" fill="#22c55e" />
                  <circle cx="202" cy="78" r="6" fill="#22c55e" />
                  <circle cx="78" cy="202" r="6" fill="#22c55e" />
                  <circle cx="202" cy="202" r="6" fill="#22c55e" />
                  {output.barCount > 4 && (
                    <>
                      <circle cx="140" cy="78" r="6" fill="#22c55e" />
                      <circle cx="140" cy="202" r="6" fill="#22c55e" />
                    </>
                  )}
                  {output.barCount > 6 && (
                    <>
                      <circle cx="78" cy="140" r="6" fill="#22c55e" />
                      <circle cx="202" cy="140" r="6" fill="#22c55e" />
                    </>
                  )}
                </>
              )}

              {input.shape === 'circle' && (
                <>
                  <circle cx="140" cy="140" r="90" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="140" cy="140" r="75" fill="none" stroke="#f59e0b" strokeWidth="2" />
                  {Array.from({ length: Math.max(6, output.barCount) }).map((_, i, arr) => {
                    const angle = (i * 2 * Math.PI) / arr.length;
                    const bx = 140 + 75 * Math.cos(angle);
                    const by = 140 + 75 * Math.sin(angle);
                    return <circle key={i} cx={bx} cy={by} r="5.5" fill="#22c55e" />;
                  })}
                </>
              )}

              {input.shape === 'hexagon' && (
                <>
                  {/* Contour coffrage hexagonal */}
                  <polygon
                    points={Array.from({ length: 6 }).map((_, i) => {
                      const ang = (i * 60 * Math.PI) / 180;
                      return `${(140 + 85 * Math.cos(ang)).toFixed(1)},${(140 + 85 * Math.sin(ang)).toFixed(1)}`;
                    }).join(' ')}
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />
                  {/* Cadre hexagonal fermé */}
                  <polygon
                    points={Array.from({ length: 6 }).map((_, i) => {
                      const ang = (i * 60 * Math.PI) / 180;
                      return `${(140 + 70 * Math.cos(ang)).toFixed(1)},${(140 + 70 * Math.sin(ang)).toFixed(1)}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  {/* 6 Barres d'angle */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const ang = (i * 60 * Math.PI) / 180;
                    const bx = 140 + 70 * Math.cos(ang);
                    const by = 140 + 70 * Math.sin(ang);
                    return <circle key={i} cx={bx} cy={by} r="6" fill="#22c55e" />;
                  })}
                  <text x="140" y="144" fill="#fbbf24" fontSize="10" textAnchor="middle" className="font-semibold">
                    Cadre Hexagonal
                  </text>
                </>
              )}

              {input.shape === 'L' && (
                <>
                  <path d="M 50 50 L 130 50 L 130 150 L 230 150 L 230 230 L 50 230 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  {/* Cadre 1 (aile horizontale basse) */}
                  <rect x="60" y="160" width="160" height="60" fill="none" stroke="#f59e0b" strokeWidth="2" rx="3" />
                  {/* Cadre 2 (aile verticale gauche avec chevauchement) */}
                  <rect x="60" y="60" width="60" height="160" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" rx="3" />
                  <text x="140" y="42" fill="#fbbf24" fontSize="9" textAnchor="middle">2 cadres avec chevauchement en angle</text>
                  <circle cx="70" cy="70" r="5" fill="#22c55e" />
                  <circle cx="110" cy="70" r="5" fill="#22c55e" />
                  <circle cx="70" cy="140" r="5" fill="#22c55e" />
                  <circle cx="70" cy="210" r="5" fill="#22c55e" />
                  <circle cx="150" cy="210" r="5" fill="#22c55e" />
                  <circle cx="210" cy="210" r="5" fill="#22c55e" />
                  <circle cx="210" cy="170" r="5" fill="#22c55e" />
                  <circle cx="125" cy="155" r="5" fill="#22c55e" />
                </>
              )}

              {input.shape === 'T' && (
                <>
                  <path d="M 50 60 L 230 60 L 230 120 L 165 120 L 165 230 L 115 230 L 115 120 L 50 120 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  {/* Cadre 1 : Table horizontale */}
                  <rect x="60" y="70" width="160" height="40" fill="none" stroke="#f59e0b" strokeWidth="2" rx="3" />
                  {/* Cadre 2 : Âme verticale pénétrant la table */}
                  <rect x="122" y="70" width="36" height="150" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" rx="3" />
                  <text x="140" y="48" fill="#fbbf24" fontSize="9" textAnchor="middle">2 cadres (Table + Âme pénétrante)</text>
                  <circle cx="70" cy="90" r="5" fill="#22c55e" />
                  <circle cx="140" cy="90" r="5" fill="#22c55e" />
                  <circle cx="210" cy="90" r="5" fill="#22c55e" />
                  <circle cx="140" cy="160" r="5" fill="#22c55e" />
                  <circle cx="140" cy="215" r="5" fill="#22c55e" />
                </>
              )}

              {input.shape === 'cross' && (
                <>
                  <path d="M 105 50 L 175 50 L 175 105 L 230 105 L 230 175 L 175 175 L 175 230 L 105 230 L 105 175 L 50 175 L 50 105 L 105 105 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  {/* Cadre 1 (vertical) */}
                  <rect x="115" y="60" width="50" height="160" fill="none" stroke="#f59e0b" strokeWidth="2" rx="3" />
                  {/* Cadre 2 (horizontal) */}
                  <rect x="60" y="115" width="160" height="50" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" rx="3" />
                  <text x="140" y="40" fill="#fbbf24" fontSize="9" textAnchor="middle">2 cadres orthogonaux croisés (+)</text>
                  <circle cx="140" cy="70" r="5" fill="#22c55e" />
                  <circle cx="140" cy="210" r="5" fill="#22c55e" />
                  <circle cx="70" cy="140" r="5" fill="#22c55e" />
                  <circle cx="210" cy="140" r="5" fill="#22c55e" />
                  <circle cx="140" cy="140" r="6" fill="#22c55e" />
                </>
              )}

              {input.shape === 'hollow' && (
                <>
                  <rect x="50" y="50" width="180" height="180" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="85" y="85" width="110" height="110" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                  <rect x="62" y="62" width="156" height="156" fill="none" stroke="#f59e0b" strokeWidth="2" rx="3" />
                  <circle cx="68" cy="68" r="5" fill="#22c55e" />
                  <circle cx="212" cy="68" r="5" fill="#22c55e" />
                  <circle cx="68" cy="212" r="5" fill="#22c55e" />
                  <circle cx="212" cy="212" r="5" fill="#22c55e" />
                </>
              )}

              {input.shape === 'trapezoid' && (
                <>
                  <polygon points="70,60 210,60 240,220 40,220" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <polygon points="80,72 200,72 226,208 54,208" fill="none" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="85" cy="80" r="5" fill="#22c55e" />
                  <circle cx="195" cy="80" r="5" fill="#22c55e" />
                  <circle cx="60" cy="200" r="5" fill="#22c55e" />
                  <circle cx="220" cy="200" r="5" fill="#22c55e" />
                  <circle cx="140" cy="200" r="5" fill="#22c55e" />
                </>
              )}

              <text x="140" y="260" fill="#38bdf8" fontSize="11" textAnchor="middle" className="font-semibold">
                {output.rebarArrangement}
              </text>

            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
