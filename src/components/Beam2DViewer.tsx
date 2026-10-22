/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Visualiseur 2D Poutre BA & Bandeau Technique Normatif
 * Affiche en temps réel la coupe longitudinale, transversale et le bandeau d'ancrage (lbd, l0, al, scrit)
 */

import React, { useState } from 'react';
import { BeamInput, BeamOutput } from '../core/eurocodes/ec2_beams.ts';
import { Maximize2, Layers, Ruler } from 'lucide-react';

interface Beam2DViewerProps {
  input: BeamInput;
  output: BeamOutput;
}

export const Beam2DViewer: React.FC<Beam2DViewerProps> = ({ input, output }) => {
  const [viewMode, setViewMode] = useState<'both' | 'elevation' | 'section'>('both');
  const [showRebarLabels, setShowRebarLabels] = useState(true);

  const L = input.spanL * 1000; // mm
  const H = input.heightH;
  const B = input.widthB;
  const lbd = output.anchorage.lbd;
  const l0 = output.anchorage.l0;
  const al = output.momentShiftAlMm;
  const sCrit = output.spacingCritMm;
  const sMax = output.spacingMaxMm;

  // Échelle d'affichage SVG élévation
  const svgWidth = 860;
  const svgHeight = 320;
  const marginX = 80;
  const marginY = 50;
  
  const scaleX = (svgWidth - 2 * marginX) / (L + 600); // 300mm de chaque côté pour appuis
  const scaleY = (svgHeight - 2 * marginY) / (H + 300);
  const scale = Math.min(scaleX, scaleY);
  
  const beamPixelL = L * scale;
  const beamPixelH = H * scale;
  const beamStartX = marginX + 300 * scale;
  const beamStartY = marginY + 100 * scale;
  
  // Appuis poteaux
  const supportWidth = 300 * scale;
  const supportHeight = 120 * scale;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* 1. BANDEAU TECHNIQUE NORMATIF TEMPS RÉEL (EXIGENCE AUDIT) */}
      <div className="bg-slate-950 border-b border-slate-800 p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Bandeau Normatif EC2 §8 & §9
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300">
            Adhérence : <strong className="text-white font-mono tabular-nums">{output.anchorage.fbd} MPa</strong> ({input.bondCondition === 'good' ? 'Bonnes η1=1.0' : 'Défav. η1=0.7'})
          </span>
        </div>

        {/* METRICS CLÉS */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">lbd (droit / crochet) :</span>
            <span className="text-amber-300 font-mono font-medium tabular-nums">{output.anchorage.lbdStraight} mm / {output.anchorage.lbdHook} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">l0 (recouvr.) :</span>
            <span className="text-cyan-300 font-mono font-medium tabular-nums">{l0} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">al (décalage) :</span>
            <span className="text-indigo-300 font-mono font-medium tabular-nums">{al} mm</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">s_crit / s_max :</span>
            <span className="text-emerald-300 font-mono font-medium tabular-nums">{sCrit} mm / {sMax} mm</span>
          </div>
        </div>
      </div>

      {/* 2. BARRE D'OUTILS DU VISUALISEUR */}
      <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${viewMode === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Élévation & Coupe
          </button>
          <button
            onClick={() => setViewMode('elevation')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${viewMode === 'elevation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Élévation Seule
          </button>
          <button
            onClick={() => setViewMode('section')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${viewMode === 'section' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Coupe Transversale
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showRebarLabels}
              onChange={(e) => setShowRebarLabels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
            />
            Cotes & Repères
          </label>
        </div>
      </div>

      {/* 3. CANVAS SVG TECHNIQUE */}
      <div className="p-4 bg-slate-950 flex flex-col md:flex-row items-center justify-center gap-6 min-h-[360px] overflow-x-auto">
        {(viewMode === 'both' || viewMode === 'elevation') && (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-[11px] text-slate-400 mb-2 font-medium tracking-wide">
              ÉLÉVATION LONGITUDINALE (PORTÉE L = {input.spanL} m, H = {H} mm)
            </div>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full max-w-[800px] h-auto border border-slate-800/80 rounded bg-slate-900/90 shadow-inner"
            >
              {/* Grille technique subtile */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Poteaux d'appui */}
              <rect
                x={beamStartX - supportWidth}
                y={beamStartY + beamPixelH}
                width={supportWidth}
                height={supportHeight}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <rect
                x={beamStartX + beamPixelL}
                y={beamStartY + beamPixelH}
                width={supportWidth}
                height={supportHeight}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text x={beamStartX - supportWidth / 2} y={beamStartY + beamPixelH + 30} fill="#94a3b8" fontSize="11" textAnchor="middle">
                Appui A
              </text>
              <text x={beamStartX + beamPixelL + supportWidth / 2} y={beamStartY + beamPixelH + 30} fill="#94a3b8" fontSize="11" textAnchor="middle">
                Appui B
              </text>

              {/* Coffrage Poutre Béton */}
              <rect
                x={beamStartX}
                y={beamStartY}
                width={beamPixelL}
                height={beamPixelH}
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="2"
              />

              {/* Table de compression si section en Té */}
              {input.isTSection && (
                <rect
                  x={beamStartX}
                  y={beamStartY}
                  width={beamPixelL}
                  height={input.flangeHeightHf * scale}
                  fill="#0284c7"
                  fillOpacity="0.15"
                  stroke="#0284c7"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Armatures supérieures de montage */}
              <line
                x1={beamStartX - 10}
                y1={beamStartY + input.coverC * scale + 5}
                x2={beamStartX + beamPixelL + 10}
                y2={beamStartY + input.coverC * scale + 5}
                stroke="#10b981"
                strokeWidth="3"
              />

              {/* Armatures longitudinales inférieures principales */}
              <line
                x1={beamStartX - (lbd * scale) + 20}
                y1={beamStartY + beamPixelH - input.coverC * scale - 5}
                x2={beamStartX + beamPixelL + (lbd * scale) - 20}
                y2={beamStartY + beamPixelH - input.coverC * scale - 5}
                stroke="#22c55e"
                strokeWidth="4"
              />

              {/* Crochets d'ancrage si sélectionnés */}
              {input.anchorageType === 'hook_90' && (
                <>
                  <line
                    x1={beamStartX - (lbd * scale) + 20}
                    y1={beamStartY + beamPixelH - input.coverC * scale - 5}
                    x2={beamStartX - (lbd * scale) + 20}
                    y2={beamStartY + beamPixelH - input.coverC * scale - 45}
                    stroke="#22c55e"
                    strokeWidth="4"
                  />
                  <line
                    x1={beamStartX + beamPixelL + (lbd * scale) - 20}
                    y1={beamStartY + beamPixelH - input.coverC * scale - 5}
                    x2={beamStartX + beamPixelL + (lbd * scale) - 20}
                    y2={beamStartY + beamPixelH - input.coverC * scale - 45}
                    stroke="#22c55e"
                    strokeWidth="4"
                  />
                </>
              )}

              {/* Armatures de peau si h >= 600 mm */}
              {output.confinementRules.requiresSkinRebars && (
                <line
                  x1={beamStartX}
                  y1={beamStartY + beamPixelH / 2}
                  x2={beamStartX + beamPixelL}
                  y2={beamStartY + beamPixelH / 2}
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
              )}

              {/* Cadres et étriers */}
              {Array.from({ length: 28 }).map((_, i) => {
                const ratio = i / 27;
                const xPos = beamStartX + ratio * beamPixelL;
                const isCritZone = ratio < 0.22 || ratio > 0.78;
                return (
                  <line
                    key={i}
                    x1={xPos}
                    y1={beamStartY + input.coverC * scale}
                    x2={xPos}
                    y2={beamStartY + beamPixelH - input.coverC * scale}
                    stroke={isCritZone ? '#f59e0b' : '#64748b'}
                    strokeWidth={isCritZone ? 2 : 1}
                  />
                );
              })}

              {/* Cotes graphiques */}
              {showRebarLabels && (
                <>
                  {/* Cote portée */}
                  <line
                    x1={beamStartX}
                    y1={beamStartY + beamPixelH + 50}
                    x2={beamStartX + beamPixelL}
                    y2={beamStartY + beamPixelH + 50}
                    stroke="#94a3b8"
                    strokeWidth="1"
                  />
                  <text
                    x={beamStartX + beamPixelL / 2}
                    y={beamStartY + beamPixelH + 68}
                    fill="#cbd5e1"
                    fontSize="11"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    L = {input.spanL} m
                  </text>

                  {/* Cote ancrage lbd gauche */}
                  <line
                    x1={beamStartX - (lbd * scale) + 20}
                    y1={beamStartY - 15}
                    x2={beamStartX}
                    y2={beamStartY - 15}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <text
                    x={beamStartX - (lbd * scale) / 2}
                    y={beamStartY - 22}
                    fill="#fbbf24"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono font-bold"
                  >
                    lbd = {lbd} mm
                  </text>

                  {/* Étiquettes barres */}
                  <text
                    x={beamStartX + beamPixelL / 2}
                    y={beamStartY + beamPixelH - 12}
                    fill="#4ade80"
                    fontSize="12"
                    textAnchor="middle"
                    className="font-semibold"
                  >
                    {output.providedRebarsInf}
                  </text>
                  <text
                    x={beamStartX + beamPixelL / 2}
                    y={beamStartY + 20}
                    fill="#6ee7b7"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {output.providedRebarsSup}
                  </text>
                </>
              )}
            </svg>
          </div>
        )}

        {(viewMode === 'both' || viewMode === 'section') && (
          <div className="flex flex-col items-center">
            <div className="text-[11px] text-slate-400 mb-2 font-medium tracking-wide">
              {input.isTSection ? `SECTION EN TÉ (${input.flangeWidthBf} / ${B} × ${H} mm)` : `COUPE TRANSVERSALE (${B} × ${H} mm)`}
            </div>
            <svg
              viewBox="0 0 260 300"
              className="w-56 h-auto border border-slate-800/80 rounded bg-slate-900/90 shadow-inner p-2"
            >
              {/* Grille */}
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Coffrage section */}
              {input.isTSection ? (
                <path
                  d="M 30 50 L 230 50 L 230 90 L 165 90 L 165 250 L 95 250 L 95 90 L 30 90 Z"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              ) : (
                <rect
                  x="60"
                  y="50"
                  width="140"
                  height="200"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              )}

              {/* Cadre transversal extérieur */}
              <rect
                x="70"
                y="60"
                width="120"
                height="180"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                rx="6"
              />

              {/* Étrier / Cadre intérieur (3 ou 4 brins) */}
              {(output.hasInternalStirrup || (output.stirrupLegsCount && output.stirrupLegsCount > 2)) && (
                <rect
                  x="100"
                  y="60"
                  width="60"
                  height="180"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                  rx="4"
                />
              )}

              {/* Barres inférieures multi-lits */}
              {output.layersDetails && output.layersDetails.length > 0 ? (
                output.layersDetails.map((layer) => {
                  const count = layer.count;
                  const yOffset = (layer.yPositionMm - output.layersDetails[0].yPositionMm) * 0.45;
                  const yPos = 228 - yOffset;
                  const r = Math.max(3, Math.min(8, layer.diameter * 0.35));
                  const xStart = 82;
                  const xEnd = 178;
                  const step = count > 1 ? (xEnd - xStart) / (count - 1) : 0;
                  return (
                    <g key={layer.layerIndex}>
                      {Array.from({ length: count }).map((_, barIdx) => (
                        <circle
                          key={barIdx}
                          cx={count > 1 ? xStart + barIdx * step : 130}
                          cy={yPos}
                          r={r}
                          fill="#22c55e"
                        />
                      ))}
                    </g>
                  );
                })
              ) : (
                <>
                  <circle cx="82" cy="228" r="6" fill="#22c55e" />
                  <circle cx="130" cy="228" r="6" fill="#22c55e" />
                  <circle cx="178" cy="228" r="6" fill="#22c55e" />
                </>
              )}

              {/* Barres supérieures */}
              {Array.from({ length: input.topRebarCount || 2 }).map((_, i) => {
                const count = input.topRebarCount || 2;
                const xStart = 82;
                const xEnd = 178;
                const step = count > 1 ? (xEnd - xStart) / (count - 1) : 0;
                return (
                  <circle
                    key={i}
                    cx={count > 1 ? xStart + i * step : 130}
                    cy="72"
                    r={Math.max(3.5, (input.topRebarPhi || 12) * 0.32)}
                    fill="#10b981"
                  />
                );
              })}

              {/* Barres de peau si h >= 600 mm */}
              {output.confinementRules.requiresSkinRebars && (
                <>
                  <circle cx="78" cy="150" r="4.5" fill="#34d399" />
                  <circle cx="182" cy="150" r="4.5" fill="#34d399" />
                </>
              )}

              {/* Cotations */}
              <text x="130" y="35" fill="#94a3b8" fontSize="10" textAnchor="middle">
                b = {B} mm
              </text>
              <text x="240" y="150" fill="#94a3b8" fontSize="10" textAnchor="start">
                h = {H} mm
              </text>
            </svg>
            <div className="mt-2 text-[10px] text-slate-400 text-center">
              Aciers tendus : <span className="text-emerald-400 font-semibold">{output.providedRebarsInf}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
