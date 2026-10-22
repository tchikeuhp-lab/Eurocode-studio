/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Visualiseur 2D Vectoriel des Liaisons & Assemblages Acier & Bois (EC3 & EC5)
 */

import React, { useState } from 'react';
import { ConnectionInput, ConnectionOutput, calculateConnection } from '../core/eurocodes/ec_connections.ts';
import { ShieldCheck, Layers, Ruler, CheckCircle2, AlertCircle } from 'lucide-react';

interface Connection2DViewerProps {
  initialInput?: Partial<ConnectionInput>;
}

export function Connection2DViewer({ initialInput }: Connection2DViewerProps) {
  const [family, setFamily] = useState<'steel' | 'timber'>(initialInput?.family || 'steel');
  const [jointType, setJointType] = useState<'beam_to_column' | 'column_to_column' | 'beam_to_beam'>(
    initialInput?.jointType || 'beam_to_column'
  );
  const [boltDia, setBoltDia] = useState<number>(20);
  const [boltRows, setBoltRows] = useState<number>(3);
  const [dowelCount, setDowelCount] = useState<number>(6);
  const [appliedMEd, setAppliedMEd] = useState<number>(65);
  const [appliedVEd, setAppliedVEd] = useState<number>(85);

  const connectionInput: ConnectionInput = {
    family,
    jointType,
    momentMEdKNm: appliedMEd,
    shearVEdKN: appliedVEd,
    axialNEdKN: 0,
    mainSectionName: family === 'steel' ? 'Poteau HEA 240' : 'Poteau Bois 200x200',
    subSectionName: family === 'steel' ? 'Poutre IPE 300' : 'Poutre Bois 140x280',
    boltSpec: {
      diameter: boltDia,
      grade: '8.8',
      countRows: boltRows,
      countCols: 2,
      pitchP1Mm: 80,
      gaugeP2Mm: 90,
      endDistE1Mm: 45,
      edgeDistE2Mm: 40,
    },
    endPlateThicknessTpMm: 15,
    dowelSpec: {
      diameterMm: 12,
      count: dowelCount,
      steelGrade: 'S275',
      plateThicknessMm: 3.0,
      bracketType: 'concealed_dovetail',
    },
  };

  const output: ConnectionOutput = calculateConnection(connectionInput);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* En-tête avec sélecteurs de liaisons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Schémas des Liaisons & Assemblages (EN 1993-1-8 / EN 1995-1-1)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{output.jointNameFr}</p>
        </div>

        {/* Boutons de sélection */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFamily('steel')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
                family === 'steel' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Acier (EC3)
            </button>
            <button
              onClick={() => setFamily('timber')}
              className={`px-3 py-1 rounded font-semibold cursor-pointer transition-colors ${
                family === 'timber' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bois (EC5)
            </button>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setJointType('beam_to_column')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                jointType === 'beam_to_column' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Poutre / Poteau
            </button>
            <button
              onClick={() => setJointType('column_to_column')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                jointType === 'column_to_column' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Poteau / Poteau
            </button>
            <button
              onClick={() => setJointType('beam_to_beam')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                jointType === 'beam_to_beam' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Poutre / Poutre
            </button>
          </div>
        </div>
      </div>

      {/* Rendu graphique vectoriel SVG de l'assemblage */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[300px]">
        <svg viewBox="0 0 540 300" className="w-full max-w-[500px] h-[280px]">
          <defs>
            <pattern id="steelHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
            </pattern>
            <pattern id="timberGrain" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="0" y1="5" x2="20" y2="5" stroke="#d97706" strokeWidth="0.5" opacity="0.3" />
              <line x1="0" y1="15" x2="20" y2="15" stroke="#d97706" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {family === 'steel' && jointType === 'beam_to_column' && (
            <g id="steelBeamToColumn">
              {/* Poteau Vertical HEA */}
              <rect x="70" y="20" width="80" height="260" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <line x1="85" y1="20" x2="85" y2="280" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="135" y1="20" x2="135" y2="280" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x="110" y="295" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">Poteau HEA 240</text>

              {/* Platine d'about soudée */}
              <rect x="150" y="55" width="16" height="190" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" rx="1" />
              <text x="158" y="45" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">Platine tp=15mm</text>

              {/* Poutre Horizontale IPE */}
              <rect x="166" y="70" width="280" height="160" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              {/* Semelles IPE */}
              <rect x="166" y="70" width="280" height="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
              <rect x="166" y="216" width="280" height="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
              <text x="300" y="155" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">Poutre IPE 300</text>

              {/* Cordons de soudure */}
              <polygon points="166,70 172,64 166,64" fill="#f59e0b" />
              <polygon points="166,230 172,236 166,236" fill="#f59e0b" />

              {/* Boulons HR (rangées) */}
              {Array.from({ length: boltRows }).map((_, idx) => {
                const yPos = 85 + idx * 60;
                return (
                  <g key={idx}>
                    <line x1="135" y1={yPos} x2="185" y2={yPos} stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="140" cy={yPos} r="5" fill="#facc15" stroke="#713f12" strokeWidth="1.5" />
                    <circle cx="175" cy={yPos} r="5" fill="#facc15" stroke="#713f12" strokeWidth="1.5" />
                    <text x="200" y={yPos + 3} fill="#facc15" fontSize="9" fontFamily="monospace">M{boltDia} (8.8)</text>
                  </g>
                );
              })}

              {/* Cotation d'entraxe */}
              <line x1="470" y1="70" x2="470" y2="230" stroke="#64748b" strokeWidth="1" />
              <text x="478" y="155" fill="#94a3b8" fontSize="9">h = 300</text>
            </g>
          )}

          {family === 'steel' && jointType === 'column_to_column' && (
            <g id="steelColumnSplice">
              {/* Fût inférieur */}
              <rect x="190" y="155" width="160" height="125" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              {/* Fût supérieur */}
              <rect x="190" y="20" width="160" height="130" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              {/* Ligne de joint */}
              <line x1="180" y1="152.5" x2="360" y2="152.5" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />

              {/* Couvre-joints d'ailes */}
              <rect x="180" y="70" width="12" height="165" fill="#475569" stroke="#f59e0b" strokeWidth="1.5" />
              <rect x="348" y="70" width="12" height="165" fill="#475569" stroke="#f59e0b" strokeWidth="1.5" />

              {/* Éclisse d'âme centrale */}
              <rect x="235" y="85" width="70" height="135" fill="#334155" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />

              {/* Boulons d'éclissage */}
              {[95, 125, 180, 210].map((y, i) => (
                <g key={i}>
                  <circle cx="186" cy={y} r="4.5" fill="#facc15" stroke="#713f12" />
                  <circle cx="354" cy={y} r="4.5" fill="#facc15" stroke="#713f12" />
                  <circle cx="255" cy={y} r="4" fill="#38bdf8" />
                  <circle cx="285" cy={y} r="4" fill="#38bdf8" />
                </g>
              ))}
              <text x="270" y="290" textAnchor="middle" fill="#94a3b8" fontSize="10">Éclissage HEA Boulons M20</text>
            </g>
          )}

          {family === 'steel' && jointType === 'beam_to_beam' && (
            <g id="steelBeamToBeam">
              {/* Poutre principale / Sommier */}
              <rect x="60" y="40" width="100" height="220" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <text x="110" y="150" textAnchor="middle" fill="#94a3b8" fontSize="10">Sommier</text>
              {/* Cornière de fixation */}
              <rect x="160" y="80" width="25" height="140" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
              {/* Poutre secondaire raccordée */}
              <rect x="185" y="70" width="280" height="160" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              {/* Boulons */}
              {[105, 150, 195].map((y, i) => (
                <circle key={i} cx="172" cy={y} r="4.5" fill="#facc15" stroke="#713f12" />
              ))}
              <text x="325" y="155" textAnchor="middle" fill="#94a3b8" fontSize="10">Solive IPE raccordée</text>
            </g>
          )}

          {family === 'timber' && jointType === 'beam_to_column' && (
            <g id="timberBeamToColumn">
              {/* Poteau Bois Vertical */}
              <rect x="70" y="20" width="90" height="260" fill="#78350f" stroke="#d97706" strokeWidth="2" fillOpacity="0.7" />
              <text x="115" y="295" textAnchor="middle" fill="#d97706" fontSize="10">Poteau Bois 200x200</text>

              {/* Sabot / Étrier métallique */}
              <rect x="158" y="70" width="30" height="160" fill="#94a3b8" stroke="#f1f5f9" strokeWidth="1.5" rx="2" />

              {/* Poutre Bois Horizontale */}
              <rect x="165" y="60" width="300" height="180" fill="#92400e" stroke="#f59e0b" strokeWidth="2" fillOpacity="0.8" />
              <text x="315" y="155" textAnchor="middle" fill="#fef3c7" fontSize="11" fontWeight="bold">Poutre Bois C24 (140x280)</text>

              {/* Broches métalliques traversantes */}
              {Array.from({ length: dowelCount }).map((_, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const cx = 190 + col * 40;
                const cy = 95 + row * 45;
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="6" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" />
                    <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#ffffff" strokeWidth="1.5" />
                    <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })}
              <text x="210" y="255" fill="#38bdf8" fontSize="9" fontWeight="bold">Broches acier Ø12 (Johansen EC5)</text>
            </g>
          )}

          {family === 'timber' && jointType === 'column_to_column' && (
            <g id="timberPostBase">
              {/* Fondation béton */}
              <rect x="100" y="220" width="340" height="60" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
              <text x="270" y="255" textAnchor="middle" fill="#94a3b8" fontSize="10">Massif Béton</text>

              {/* Pied de poteau métallique réglable */}
              <rect x="180" y="170" width="180" height="50" fill="#64748b" stroke="#cbd5e1" strokeWidth="1.5" />
              <rect x="250" y="150" width="40" height="20" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="210" y1="220" x2="210" y2="245" stroke="#facc15" strokeWidth="4" />
              <line x1="330" y1="220" x2="330" y2="245" stroke="#facc15" strokeWidth="4" />

              {/* Fût du poteau bois */}
              <rect x="200" y="20" width="140" height="130" fill="#78350f" stroke="#d97706" strokeWidth="2" fillOpacity="0.8" />
              <text x="270" y="85" textAnchor="middle" fill="#fef3c7" fontSize="10">Poteau C24</text>

              {/* Broches pied */}
              <circle cx="240" cy="120" r="5" fill="#38bdf8" stroke="#0369a1" />
              <circle cx="300" cy="120" r="5" fill="#38bdf8" stroke="#0369a1" />
            </g>
          )}

          {family === 'timber' && jointType === 'beam_to_beam' && (
            <g id="timberBeamToBeam">
              {/* Poutre principale */}
              <rect x="80" y="40" width="110" height="220" fill="#78350f" stroke="#d97706" strokeWidth="2" fillOpacity="0.8" />
              {/* Connecteur métallique */}
              <rect x="190" y="80" width="20" height="140" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
              {/* Solive secondaire */}
              <rect x="195" y="70" width="270" height="160" fill="#92400e" stroke="#f59e0b" strokeWidth="2" fillOpacity="0.8" />
              <text x="330" y="150" textAnchor="middle" fill="#fef3c7" fontSize="10">Solive bois suspendue</text>
              {[105, 145, 185].map((y, i) => (
                <circle key={i} cx="225" cy={y} r="5" fill="#38bdf8" stroke="#0369a1" />
              ))}
            </g>
          )}
        </svg>

        {/* Badge de statut réglementaire */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 ${
          output.isSafe
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-300 border border-red-500/20'
        }`}>
          {output.isSafe ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>{output.isSafe ? 'Assemblage Conforme' : 'Taux excessif (> 100%)'}</span>
        </div>
      </div>

      {/* Paramètres interactifs & sollicitations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Effort Tranchant VEd (kN)</label>
          <input
            type="number"
            value={appliedVEd}
            onChange={(e) => setAppliedVEd(+e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
          />
        </div>

        {family === 'steel' && (
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Moment MEd (kNm)</label>
            <input
              type="number"
              value={appliedMEd}
              onChange={(e) => setAppliedMEd(+e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            />
          </div>
        )}

        {family === 'steel' ? (
          <>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Diamètre boulons (HR)</label>
              <select
                value={boltDia}
                onChange={(e) => setBoltDia(+e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
              >
                {[16, 20, 24].map((d) => (
                  <option key={d} value={d}>M{d} (Classe 8.8)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Rangées de boulons</label>
              <select
                value={boltRows}
                onChange={(e) => setBoltRows(+e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
              >
                {[2, 3, 4].map((r) => (
                  <option key={r} value={r}>{r} rangées ({r * 2} boulons)</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Nombre de broches</label>
            <select
              value={dowelCount}
              onChange={(e) => setDowelCount(+e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            >
              {[4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>{n} broches acier Ø12</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Synthèse des capacités & composants de l'assemblage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono">
          <div className="text-[11px] font-bold text-slate-300 font-sans uppercase tracking-wider mb-1">
            Résistances Eurocodes de l'Assemblage
          </div>
          {output.momentCapacityMRdKNm > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Capacité en flexion MRd :</span>
              <strong className="text-amber-300">{output.momentCapacityMRdKNm} kNm (Taux: {(output.momentRatio * 100).toFixed(0)}%)</strong>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Capacité au cisaillement VRd :</span>
            <strong className="text-cyan-300">{output.shearCapacityVRdKN} kN (Taux: {(output.shearRatio * 100).toFixed(0)}%)</strong>
          </div>
          {family === 'steel' && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Traction d'un boulon Ft,Rd :</span>
              <strong className="text-white">{output.boltTensionCapacityFtRdKN} kN</strong>
            </div>
          )}
          {family === 'timber' && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Cisaillement par broche Fv,Rd :</span>
              <strong className="text-white">{output.dowelShearCapacityFvRkKN} kN</strong>
            </div>
          )}
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
            Nomenclature des Composants
          </div>
          <ul className="space-y-1 text-slate-300 text-[11px]">
            {output.componentsList.map((comp, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{comp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
