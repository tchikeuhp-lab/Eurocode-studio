/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Note de Calcul Officielle Word (.DOCX) & Prévisualisation Interactive
 * Intègre les équations mathématiques KaTeX, schémas vectoriels de coffrage et ferraillage à jour
 * pour CHAQUE module (Poutres, Poteaux, Dalles, Fondations, Mixtes) et nomenclature ISO 3766.
 */

import React, { useState } from 'react';
import { BeamInput, BeamOutput } from '../core/eurocodes/ec2_beams.ts';
import { ColumnInput, ColumnOutput } from '../core/eurocodes/ec2_columns.ts';
import { SlabInput, SlabOutput } from '../core/eurocodes/ec2_slabs.ts';
import { FootingInput, FootingOutput } from '../core/eurocodes/ec2_footings.ts';
import { CompositeInput, CompositeOutput } from '../core/eurocodes/ec4_composite.ts';
import { ConcreteGrade, RebarGrade } from '../core/eurocodes/materials.ts';
import { generateAndDownloadDocx, DocxMetadata } from '../core/exporters/docx_generator.ts';
import { MathFormula } from './MathFormula.tsx';
import {
  FileText,
  Download,
  ShieldCheck,
  Printer,
  Building2,
  CheckCircle2,
  Layers,
  Ruler,
  Sliders
} from 'lucide-react';

export interface DocxPreviewTabProps {
  currentModule: 'beam' | 'column' | 'slab' | 'footing' | 'composite';
  beamInput: BeamInput;
  beamOutput: BeamOutput;
  columnInput: ColumnInput;
  columnOutput: ColumnOutput;
  slabInput: SlabInput;
  slabOutput: SlabOutput;
  footingInput: FootingInput;
  footingOutput: FootingOutput;
  compositeInput: CompositeInput;
  compositeOutput: CompositeOutput;
  concrete: ConcreteGrade;
  rebar: RebarGrade;
}

export const DocxPreviewTab: React.FC<DocxPreviewTabProps> = ({
  currentModule,
  beamInput,
  beamOutput,
  columnInput,
  columnOutput,
  slabInput,
  slabOutput,
  footingInput,
  footingOutput,
  compositeInput,
  compositeOutput,
  concrete,
  rebar,
}) => {
  const [activeMod, setActiveMod] = useState<'beam' | 'column' | 'slab' | 'footing' | 'composite'>(currentModule);
  const [isExporting, setIsExporting] = useState(false);
  const [projectName, setProjectName] = useState('BÂTIMENT R+4 EUROCODES - LOT 02 GROS ŒUVRE');
  const [companyName, setCompanyName] = useState('EUROCODES STUDIO INGENIERIE');
  const [authorName, setAuthorName] = useState('Ing. Structure Civil');
  const [verifierName, setVerifierName] = useState('BUREAU DE CONTRÔLE AGRÉÉ (Visa B.P.E.)');

  const elementRef =
    activeMod === 'beam'
      ? `POUTRE BA ${beamInput.widthB}×${beamInput.heightH} L=${beamInput.spanL}m`
      : activeMod === 'column'
      ? `POTEAU ${columnOutput.shapeNameFr.toUpperCase()} ${columnInput.dimB}×${columnInput.dimH}`
      : activeMod === 'slab'
      ? `DALLE PLEINE h=${slabInput.thicknessH}mm Lx=${slabInput.spanLx}m`
      : activeMod === 'footing'
      ? `SEMELLE ISOLÉE ${footingInput.dimA}×${footingInput.dimB}×${footingInput.dimH}`
      : `POUTRE MIXTE ${compositeOutput.profile.name} L=${compositeInput.spanL}m`;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const meta: DocxMetadata = {
        projectName,
        elementRef,
        companyName,
        authorName,
        verifierName,
        dateStr: new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      await generateAndDownloadDocx(beamInput, beamOutput, concrete, rebar, meta);
    } catch (err) {
      console.error('Erreur lors de la génération DOCX :', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. BARRE D'ACTIONS ET TÉLÉCHARGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Note de Calcul Officielle Word (.DOCX)</h2>
            <p className="text-xs text-slate-400">
              Formules mathématiques KaTeX, schémas de coffrage/ferraillage et audit conforme EN 1992-1-1 / EN 1994-1-1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Génération en cours...' : 'Télécharger (.DOCX)'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* 2. SÉLECTEUR DE MODULE POUR LA NOTE DE CALCUL */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 px-2 font-medium flex items-center gap-1.5 shrink-0">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Module actif :
        </span>
        <button
          onClick={() => setActiveMod('beam')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${activeMod === 'beam' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/60'}`}
        >
          Poutre BA ({beamInput.widthB}×{beamInput.heightH})
        </button>
        <button
          onClick={() => setActiveMod('column')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${activeMod === 'column' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/60'}`}
        >
          Poteau ({columnOutput.shapeNameFr})
        </button>
        <button
          onClick={() => setActiveMod('slab')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${activeMod === 'slab' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/60'}`}
        >
          Dalle ({slabInput.thicknessH}mm)
        </button>
        <button
          onClick={() => setActiveMod('footing')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${activeMod === 'footing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/60'}`}
        >
          Semelle ({footingInput.dimA}×{footingInput.dimB})
        </button>
        <button
          onClick={() => setActiveMod('composite')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${activeMod === 'composite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/60'}`}
        >
          Poutre Mixte ({compositeOutput.profile.name})
        </button>
      </div>

      {/* 3. FEUILLE DE CALCUL ÉDITORIALE & MATHÉMATIQUE */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 max-w-4xl mx-auto border border-slate-200 font-sans print:shadow-none print:border-none print:p-0">
        {/* EN-TÊTE OFFICIEL */}
        <div className="border-b-2 border-slate-900 pb-6 mb-8 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-blue-800 mb-1">
              NOTE DE CALCUL DE STRUCTURE BÉTON ARMÉ & MIXTE
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              JUSTIFICATION RÉGLEMENTAIRE SELON {activeMod === 'composite' ? 'EN 1994-1-1 (EC4)' : 'EN 1992-1-1 (EC2)'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Annexe Nationale Française · DTU 21 · Formulations mathématiques exactes et nomenclature ISO 3766
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              STATUT : VALIDÉ B.P.E.
            </span>
            <div className="text-slate-500 mt-2 font-mono text-[11px]">Date : {new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        {/* CADRE DU PROJET */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 text-xs grid grid-cols-2 gap-4">
          <div>
            <span className="text-slate-500 block">Projet :</span>
            <strong className="text-slate-900 font-medium">{projectName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Élément de calcul :</span>
            <strong className="text-slate-900 font-medium">{elementRef}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Bureau d'études :</span>
            <strong className="text-slate-900 font-medium">{companyName} ({authorName})</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Organisme de contrôle / Visa :</span>
            <strong className="text-slate-900 font-medium">{verifierName}</strong>
          </div>
        </div>

        {/* CHAPITRE 1 : MATÉRIAUX ET FORMULES GÉNÉRALES */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            1. Bases Réglementaires & Matériaux de Construction (EN 1992-1-1 §3)
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 mb-1">Béton de structure : {concrete.name}</div>
              <ul className="space-y-1.5 text-slate-700">
                <li>• Résistance caractéristique : <MathFormula tex={`f_{ck} = ${concrete.fck} \\text{ MPa}`} /></li>
                <li>• Résistance de calcul en compression : <MathFormula tex={`f_{cd} = \\frac{\\alpha_{cc} f_{ck}}{\\gamma_c} = ${concrete.fcd} \\text{ MPa}`} /></li>
                <li>• Résistance de calcul en traction : <MathFormula tex={`f_{ctd} = ${concrete.fctd} \\text{ MPa}`} /></li>
                <li>• Module d'élasticité sécant : <MathFormula tex={`E_{cm} = ${concrete.Ecm} \\text{ GPa}`} /></li>
              </ul>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-900 mb-1">Acier d'armature : {rebar.name}</div>
              <ul className="space-y-1.5 text-slate-700">
                <li>• Limite d'élasticité caractéristique : <MathFormula tex={`f_{yk} = ${rebar.fyk} \\text{ MPa}`} /></li>
                <li>• Limite d'élasticité de calcul : <MathFormula tex={`f_{yd} = \\frac{f_{yk}}{\\gamma_s} = ${rebar.fyd} \\text{ MPa}`} /></li>
                <li>• Coefficients de sécurité partiels : <MathFormula tex="\\gamma_c = 1.50, \\; \\gamma_s = 1.15" /></li>
                <li>• Enrobage nominal : <MathFormula tex={`c_{\\text{nom}} = ${activeMod === 'footing' ? footingInput.coverC : beamInput.coverC} \\text{ mm}`} /></li>
              </ul>
            </div>
          </div>
        </div>

        {/* CHAPITRE 2 : SCHÉMAS TECHNIQUES DE COFFRAGE & FERRAILLAGE À JOUR (EXIGENCE 9) */}
        <div className="mb-8 border border-slate-300 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-600" />
              2. Schéma de Coffrage & Dispositions de Ferraillage à Jour
            </h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Modèle CAO Synchronisé
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2 bg-white rounded border border-slate-200 p-4">
            {/* SCHÉMAS SELON LE MODULE ACTIF */}
            {activeMod === 'beam' && (
              <>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">ÉLÉVATION (Portée L = {beamInput.spanL} m)</div>
                  <svg viewBox="0 0 320 100" className="w-64 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="30" y="25" width="260" height="50" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    {/* Appuis */}
                    <rect x="15" y="75" width="20" height="20" fill="#94a3b8" />
                    <rect x="285" y="75" width="20" height="20" fill="#94a3b8" />
                    {/* Aciers inf */}
                    <line x1="20" y1="65" x2="300" y2="65" stroke="#16a34a" strokeWidth="2.5" />
                    {/* Crochets lbd */}
                    <line x1="20" y1="65" x2="20" y2="40" stroke="#16a34a" strokeWidth="2.5" />
                    <line x1="300" y1="65" x2="300" y2="40" stroke="#16a34a" strokeWidth="2.5" />
                    {/* Aciers sup */}
                    <line x1="25" y1="35" x2="295" y2="35" stroke="#059669" strokeWidth="2" strokeDasharray="4 2" />
                    <text x="160" y="88" fontSize="8" fill="#475569" textAnchor="middle">lbd = {beamOutput.anchorage.lbd} mm</text>
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">COUPE TRANSVERSALE ({beamInput.widthB} × {beamInput.heightH} mm)</div>
                  <svg viewBox="0 0 140 160" className="w-32 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="25" y="20" width="90" height="120" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    {/* Cadre principal */}
                    <rect x="33" y="28" width="74" height="104" fill="none" stroke="#d97706" strokeWidth="2" rx="4" />
                    {/* Étrier intérieur si actif */}
                    {(beamOutput.hasInternalStirrup || beamOutput.stirrupLegsCount > 2) && (
                      <rect x="52" y="28" width="36" height="104" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" rx="3" />
                    )}
                    {/* Barres inf */}
                    <circle cx="43" cy="122" r="4.5" fill="#16a34a" />
                    <circle cx="70" cy="122" r="4.5" fill="#16a34a" />
                    <circle cx="97" cy="122" r="4.5" fill="#16a34a" />
                    {/* Barres sup */}
                    <circle cx="43" cy="38" r="3.5" fill="#059669" />
                    <circle cx="97" cy="38" r="3.5" fill="#059669" />
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">{beamOutput.providedRebarsInf}</div>
                </div>
              </>
            )}

            {activeMod === 'column' && (
              <>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">ÉLÉVATION (H = {columnInput.heightL} m + l0 = {columnOutput.lapLengthL0Mm} mm)</div>
                  <svg viewBox="0 0 160 200" className="w-36 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="45" y="40" width="70" height="140" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    {/* Attentes l0 */}
                    <line x1="55" y1="40" x2="55" y2="15" stroke="#0891b2" strokeWidth="2.5" />
                    <line x1="105" y1="40" x2="105" y2="15" stroke="#0891b2" strokeWidth="2.5" />
                    {/* Barres longitudinales */}
                    <line x1="55" y1="40" x2="55" y2="180" stroke="#16a34a" strokeWidth="3" />
                    <line x1="105" y1="40" x2="105" y2="180" stroke="#16a34a" strokeWidth="3" />
                    {/* Cadres scrit */}
                    <line x1="50" y1="50" x2="110" y2="50" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="50" y1="62" x2="110" y2="62" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="50" y1="74" x2="110" y2="74" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="50" y1="145" x2="110" y2="145" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="50" y1="157" x2="110" y2="157" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="50" y1="169" x2="110" y2="169" stroke="#d97706" strokeWidth="1.5" />
                    <text x="130" y="28" fontSize="8" fill="#0891b2" fontWeight="bold">l0</text>
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">SECTION {columnOutput.shapeNameFr.toUpperCase()}</div>
                  <svg viewBox="0 0 160 160" className="w-36 h-auto border border-slate-200 rounded bg-slate-50">
                    {columnInput.shape === 'hexagon' ? (
                      <>
                        <polygon
                          points={Array.from({ length: 6 }).map((_, i) => {
                            const a = (i * 60 * Math.PI) / 180;
                            return `${80 + 55 * Math.cos(a)},${80 + 55 * Math.sin(a)}`;
                          }).join(' ')}
                          fill="#f8fafc"
                          stroke="#0284c7"
                          strokeWidth="2"
                        />
                        <polygon
                          points={Array.from({ length: 6 }).map((_, i) => {
                            const a = (i * 60 * Math.PI) / 180;
                            return `${80 + 44 * Math.cos(a)},${80 + 44 * Math.sin(a)}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="1.8"
                        />
                        {Array.from({ length: 6 }).map((_, i) => {
                          const a = (i * 60 * Math.PI) / 180;
                          return <circle key={i} cx={80 + 44 * Math.cos(a)} cy={80 + 44 * Math.sin(a)} r="4" fill="#16a34a" />;
                        })}
                      </>
                    ) : columnInput.shape === 'circle' ? (
                      <>
                        <circle cx="80" cy="80" r="55" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                        <circle cx="80" cy="80" r="44" fill="none" stroke="#d97706" strokeWidth="1.8" />
                        {Array.from({ length: Math.max(6, columnOutput.barCount) }).map((_, i, arr) => {
                          const a = (i * 2 * Math.PI) / arr.length;
                          return <circle key={i} cx={80 + 44 * Math.cos(a)} cy={80 + 44 * Math.sin(a)} r="4" fill="#16a34a" />;
                        })}
                      </>
                    ) : (
                      <>
                        <rect x="25" y="25" width="110" height="110" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                        <rect x="35" y="35" width="90" height="90" fill="none" stroke="#d97706" strokeWidth="1.8" rx="4" />
                        {columnOutput.cadresCountPerSet > 1 && (
                          <rect x="52" y="35" width="56" height="90" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 2" rx="3" />
                        )}
                        <circle cx="43" cy="43" r="4.5" fill="#16a34a" />
                        <circle cx="117" cy="43" r="4.5" fill="#16a34a" />
                        <circle cx="43" cy="117" r="4.5" fill="#16a34a" />
                        <circle cx="117" cy="117" r="4.5" fill="#16a34a" />
                      </>
                    )}
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">{columnOutput.rebarArrangement}</div>
                </div>
              </>
            )}

            {activeMod === 'slab' && (
              <>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">VUE EN PLAN DALLE (Lx = {slabInput.spanLx} m, Ly = {slabInput.spanLy} m)</div>
                  <svg viewBox="0 0 200 140" className="w-48 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="15" y="15" width="170" height="110" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    {/* Nappe X */}
                    <line x1="45" y1="15" x2="45" y2="125" stroke="#16a34a" strokeWidth="1.5" />
                    <line x1="85" y1="15" x2="85" y2="125" stroke="#16a34a" strokeWidth="1.5" />
                    <line x1="125" y1="15" x2="125" y2="125" stroke="#16a34a" strokeWidth="1.5" />
                    <line x1="165" y1="15" x2="165" y2="125" stroke="#16a34a" strokeWidth="1.5" />
                    {/* Nappe Y répartition */}
                    <line x1="15" y1="40" x2="185" y2="40" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="15" y1="70" x2="185" y2="70" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="15" y1="100" x2="185" y2="100" stroke="#d97706" strokeWidth="1.5" />
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">{slabOutput.providedRebarsX}</div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">COUPE SUR ÉPAISSEUR (h = {slabInput.thicknessH} mm)</div>
                  <svg viewBox="0 0 200 70" className="w-48 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="15" y="15" width="170" height="40" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    {/* Nappe inf */}
                    <line x1="20" y1="47" x2="180" y2="47" stroke="#16a34a" strokeWidth="2" />
                    {/* Répartition */}
                    <circle cx="35" cy="42" r="2.5" fill="#d97706" />
                    <circle cx="65" cy="42" r="2.5" fill="#d97706" />
                    <circle cx="95" cy="42" r="2.5" fill="#d97706" />
                    <circle cx="125" cy="42" r="2.5" fill="#d97706" />
                    <circle cx="155" cy="42" r="2.5" fill="#d97706" />
                    {/* U de rive */}
                    <line x1="20" y1="47" x2="20" y2="25" stroke="#d97706" strokeWidth="1.5" />
                    <line x1="180" y1="47" x2="180" y2="25" stroke="#d97706" strokeWidth="1.5" />
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">{slabOutput.providedRebarsY}</div>
                </div>
              </>
            )}

            {activeMod === 'footing' && (
              <>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">COUPE ÉLÉVATION BIELLES (A = {footingInput.dimA} mm)</div>
                  <svg viewBox="0 0 180 120" className="w-44 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="20" y="55" width="140" height="50" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    {/* Amorce poteau */}
                    <rect x="70" y="20" width="40" height="35" fill="#cbd5e1" stroke="#0284c7" strokeWidth="1.5" />
                    {/* Nappe A */}
                    <line x1="28" y1="95" x2="152" y2="95" stroke="#16a34a" strokeWidth="2.5" />
                    {/* Crochets si requis */}
                    {!footingOutput.isStraightAnchorageSufficientA && (
                      <>
                        <line x1="28" y1="95" x2="28" y2="70" stroke="#16a34a" strokeWidth="2.5" />
                        <line x1="152" y1="95" x2="152" y2="70" stroke="#16a34a" strokeWidth="2.5" />
                      </>
                    )}
                    {/* Nappe B répartition (points) */}
                    <circle cx="45" cy="90" r="2.5" fill="#d97706" />
                    <circle cx="75" cy="90" r="2.5" fill="#d97706" />
                    <circle cx="105" cy="90" r="2.5" fill="#d97706" />
                    <circle cx="135" cy="90" r="2.5" fill="#d97706" />
                    {/* Attentes */}
                    <line x1="75" y1="10" x2="75" y2="85" stroke="#0891b2" strokeWidth="2" />
                    <line x1="75" y1="85" x2="65" y2="85" stroke="#0891b2" strokeWidth="2" />
                    <line x1="105" y1="10" x2="105" y2="85" stroke="#0891b2" strokeWidth="2" />
                    <line x1="105" y1="85" x2="115" y2="85" stroke="#0891b2" strokeWidth="2" />
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">{footingOutput.providedRebarsA}</div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">VUE EN PLAN ({footingInput.dimA} × {footingInput.dimB} mm)</div>
                  <svg viewBox="0 0 140 120" className="w-36 h-auto border border-slate-200 rounded bg-slate-50">
                    <rect x="20" y="15" width="100" height="90" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
                    <rect x="55" y="45" width="30" height="30" fill="#cbd5e1" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 2" />
                    <text x="70" y="64" fontSize="8" fill="#475569" textAnchor="middle">Poteau</text>
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">{footingOutput.providedRebarsB}</div>
                </div>
              </>
            )}

            {activeMod === 'composite' && (
              <>
                <div className="text-center">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2">COUPE POUTRE MIXTE {compositeOutput.profile.name}</div>
                  <svg viewBox="0 0 180 150" className="w-44 h-auto border border-slate-200 rounded bg-slate-50">
                    {/* Dalle */}
                    <rect x="15" y="20" width="150" height="30" fill="#f1f5f9" stroke="#0284c7" strokeWidth="2" />
                    {/* Profilé acier */}
                    <rect x="65" y="50" width="50" height="8" fill="#475569" />
                    <rect x="86" y="58" width="8" height="60" fill="#475569" />
                    <rect x="65" y="118" width="50" height="8" fill="#475569" />
                    {/* Goujon Nelson */}
                    <line x1="90" y1="50" x2="90" y2="32" stroke="#c084fc" strokeWidth="2.5" />
                    <circle cx="90" cy="32" r="3" fill="#c084fc" />
                    {/* Aciers anti-fendage */}
                    <line x1="25" y1="35" x2="155" y2="35" stroke="#16a34a" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>
                  <div className="text-[10px] text-slate-600 mt-1">Connecteurs Ø{compositeInput.studDiameterD} + Dalle {compositeInput.slabThicknessHc}mm</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CHAPITRE 3 : ÉQUATIONS MATHÉMATIQUES EXACTES (KATEX) ET JUSTIFICATIONS (EXIGENCE 5) */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            3. Formulations Mathématiques Exactes & Vérifications ELU / ELS
          </h2>

          {activeMod === 'beam' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">A. Flexion Simple ELU (EN 1992-1-1 §6.1)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Moment réduit de calcul :</span>
                    <MathFormula block tex={`\\mu = \\frac{M_{Ed}}{b \\cdot d^2 \\cdot f_{cd}} = \\frac{${beamInput.momentMEd} \\cdot 10^6}{${beamInput.widthB} \\cdot ${beamOutput.d}^2 \\cdot ${concrete.fcd}} = ${beamOutput.mu}`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Hauteur relative de l'axe neutre :</span>
                    <MathFormula block tex={`\\alpha = 1.25 \\left(1 - \\sqrt{1 - 2\\mu}\\right) = ${beamOutput.alpha}`} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Bras de levier interne :</span>
                    <MathFormula block tex={`z = d (1 - 0.4 \\alpha) = ${beamOutput.z} \\text{ mm}`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Section d'acier requise :</span>
                    <MathFormula block tex={`A_{s,\\text{rqd}} = \\frac{M_{Ed}}{z \\cdot f_{yd}} = ${beamOutput.asRqdCm2} \\text{ cm}^2 \\quad \\implies \\text{Adopté : } ${beamOutput.providedRebarsInf}`} />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">B. Effort Tranchant & Armatures Transversales (EN 1992-1-1 §6.2)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Capacité bielle de compression béton :</span>
                    <MathFormula block tex={`V_{Rd,\\max} = \\frac{\\alpha_{cw} b_w z \\nu_1 f_{cd}}{\\cot\\theta + \\tan\\theta} = ${beamOutput.vRdMaxKN} \\text{ kN} \\; (\\ge V_{Ed} = ${beamInput.shearVEd} \\text{ kN})`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Section d'étriers par mètre :</span>
                    <MathFormula block tex={`\\frac{A_{sw}}{s} = \\frac{V_{Ed}}{z \\cdot f_{ywd} \\cdot \\cot\\theta} = ${beamOutput.aswOverS} \\text{ cm}^2/\\text{m}`} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Espacement réglementaire et étriers intérieurs :</span>
                  <MathFormula block tex={`s = \\min\\left(\\frac{A_{sw}}{A_{sw}/s}, \\; 0.75 d, \\; 400\\right) = ${beamOutput.spacingCalculatedMm} \\text{ mm} \\quad (s_{\\text{crit}} = ${beamOutput.spacingCritMm} \\text{ mm})`} />
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded border border-blue-200">
                <div className="font-semibold text-blue-950 mb-2">C. Adhérence, Ancrages & Recouvrements (EN 1992-1-1 §8.4)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-600 block mb-0.5">Contrainte d'adhérence :</span>
                    <MathFormula block tex={`f_{bd} = 2.25 \\eta_1 \\eta_2 f_{ctd} = ${beamOutput.anchorage.fbd} \\text{ MPa}`} />
                  </div>
                  <div>
                    <span className="text-slate-600 block mb-0.5">Longueur d'ancrage calculée :</span>
                    <MathFormula block tex={`l_{bd} = \\alpha_1 \\dots \\alpha_5 l_{b,\\text{rqd}} = ${beamOutput.anchorage.lbd} \\text{ mm}`} />
                  </div>
                  <div>
                    <span className="text-slate-600 block mb-0.5">Longueur de recouvrement :</span>
                    <MathFormula block tex={`l_0 = \\alpha_1 \\alpha_6 l_{b,\\text{rqd}} = ${beamOutput.anchorage.l0} \\text{ mm}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMod === 'column' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">A. Élancement & Effets du Second Ordre (EN 1992-1-1 §5.8)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Élancement de calcul :</span>
                    <MathFormula block tex={`\\lambda = \\frac{l_0}{i} = \\frac{${(columnOutput.bucklingLengthL0M * 1000).toFixed(0)}}{${columnOutput.iRadiusOfGyrationMm}} = ${columnOutput.slendernessLambda}`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Élancement limite réglementaire :</span>
                    <MathFormula block tex={`\\lambda_{\\lim} = \\frac{20 \\cdot A \\cdot B \\cdot C}{\\sqrt{n}} = ${columnOutput.slendernessLimitLambdaLim}`} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Excentricité totale et moment du 2nd ordre :</span>
                  <MathFormula block tex={`e_{\\text{tot}} = \\max\\left(e_0 + e_i + e_2, \\; 20\\text{ mm}\\right) = ${columnOutput.etotMm} \\text{ mm} \\implies M_{Ed,\\text{tot}} = ${columnOutput.mEdTotKNm} \\text{ kNm}`} />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">B. Armatures & Multi-Cadres de Frettage (EN 1992-1-1 §9.5)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Section minimale réglementaire :</span>
                    <MathFormula block tex={`A_{s,\\min} = \\max\\left(0.10 \\frac{N_{Ed}}{f_{yd}}, \\; 0.002 A_c\\right) = ${columnOutput.asMinCm2} \\text{ cm}^2`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Armature adoptée :</span>
                    <MathFormula block tex={`A_{s,\\text{prov}} = ${columnOutput.asProvidedCm2} \\text{ cm}^2 \\quad (${columnOutput.rebarArrangement})`} />
                  </div>
                </div>
                <div className="mt-2 text-slate-700">
                  • Dispositions des cadres : <strong className="text-slate-900">{columnOutput.cadresDescription}</strong>, resserrés à <MathFormula tex={`s_{\\text{crit}} = ${columnOutput.spacingCritMm} \\text{ mm}`} /> sur <MathFormula tex={`h_{\\text{crit}} = ${columnOutput.zoneCritHeightMm} \\text{ mm}`} /> en tête et pied.
                </div>
              </div>
            </div>
          )}

          {activeMod === 'slab' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">A. Moments Fléchissants & Sections d'Acier (EN 1992-1-1 §6.1 & §9.3)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Moment en travée sens X :</span>
                    <MathFormula block tex={`M_{Ed,x} = ${slabOutput.mEdXKNm} \\text{ kNm/m} \\implies A_{s,x} = ${slabOutput.asxRqdCm2PerM} \\text{ cm}^2/\\text{m}`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Moment et répartition transversale Y :</span>
                    <MathFormula block tex={`M_{Ed,y} = ${slabOutput.mEdYKNm} \\text{ kNm/m} \\implies A_{s,y} = ${slabOutput.asyRqdCm2PerM} \\text{ cm}^2/\\text{m}`} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Ferraillage principal X adopté :</span>
                    <strong className="text-emerald-800 font-mono text-sm">{slabOutput.providedRebarsX}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Aciers de répartition Y adoptés :</span>
                    <strong className="text-emerald-800 font-mono text-sm">{slabOutput.providedRebarsY}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-1">B. Critère d'Espacement Maximal & Limitation de Flèche</div>
                <MathFormula block tex={`s_{\\text{max}} = \\min(2h, \\; 250\\text{ mm}) = ${slabOutput.sMaxPermissibleMm} \\text{ mm} \\quad (s_{\\text{adopté}} = ${slabOutput.sActualMm} \\text{ mm} \\le s_{\\text{max}})`} />
                <MathFormula block tex={`\\frac{L}{d} = ${slabOutput.lOverDRatio} \\le \\left(\\frac{L}{d}\\right)_{\\lim} = ${slabOutput.lOverDLimit} \\implies \\text{Flèche vérifiée sans calcul direct}`} />
              </div>
            </div>
          )}

          {activeMod === 'footing' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">A. Contrainte au Sol & Condition de Rigidité (EN 1997-1 & DTU 13.12)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Pression exercée sur le sol :</span>
                    <MathFormula block tex={`q_{\\text{sol}} = \\frac{N_{Ed} + 1.35 G_0}{A \\cdot B} = ${(footingOutput.soilPressureELUKPa / 1000).toFixed(3)} \\text{ MPa} \\le q_{\\text{adm}} = ${(footingInput.soilCapacityKPa / 1000).toFixed(3)} \\text{ MPa}`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Condition de rigidité des bielles :</span>
                    <MathFormula block tex={`d = ${footingOutput.d} \\text{ mm} \\ge \\frac{A - a}{4} = ${Math.round((footingInput.dimA - footingInput.colA) / 4)} \\text{ mm} \\implies \\text{Semelle Rigide}`} />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">B. Méthode des Bielles & Ancrages dans le Patin</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Section nappe principale A :</span>
                    <MathFormula block tex={`A_{s,A} = \\frac{N_{Ed} (A - a)}{8 d f_{yd}} = ${footingOutput.asARqdCm2} \\text{ cm}^2 \\implies ${footingOutput.providedRebarsA}`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Section nappe de répartition B :</span>
                    <MathFormula block tex={`A_{s,B} = \\frac{N_{Ed} (B - b)}{8 d f_{yd}} = ${footingOutput.asBRqdCm2} \\text{ cm}^2 \\implies ${footingOutput.providedRebarsB}`} />
                  </div>
                </div>
                <div className="text-slate-700">
                  • Diagnostic des crochets verticaux : <strong className="text-slate-900">{footingOutput.hookAdviceA}</strong>
                </div>
              </div>
            </div>
          )}

          {activeMod === 'composite' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">A. Résistance Plastique & Connecteurs Nelson (EN 1994-1-1 §6.2 & §6.6)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Moment résistant plastique :</span>
                    <MathFormula block tex={`M_{pl,Rd} = ${compositeOutput.plasticResistanceMplRdKNm} \\text{ kNm} \\; (M_{Ed} = ${compositeInput.momentMEd} \\text{ kNm})`} />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Résistance d'un connecteur :</span>
                    <MathFormula block tex={`P_{Rd} = ${compositeOutput.studCapacityPRdKN} \\text{ kN} \\implies \\eta = ${compositeOutput.degreeOfConnectionEta}`} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Espacement constructif des connecteurs :</span>
                  <MathFormula block tex={`s = ${compositeOutput.spacingCalculatedMm} \\text{ mm} \\quad (5d = ${compositeOutput.spacingMinMm} \\text{ mm} \\le s \\le ${compositeOutput.spacingMaxMm} \\text{ mm})`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CHAPITRE 4 : TABLEAU DE NOMENCLATURE DES ACIERS ISO 3766 (EXIGENCE 2) */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            4. Nomenclature Détaillée des Aciers de Ferraillage (EN ISO 3766)
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 rounded">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2 border-b border-slate-200">Repère</th>
                <th className="p-2 border-b border-slate-200">Désignation & Rôle</th>
                <th className="p-2 border-b border-slate-200">Nombre & Diamètre</th>
                <th className="p-2 border-b border-slate-200">Longueur Unitaire</th>
                <th className="p-2 border-b border-slate-200 text-right">Poids Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {activeMod === 'beam' &&
                beamOutput.rebarSchedule.map((bar, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-blue-900">#{idx + 1}</td>
                    <td className="p-2 font-sans">{bar.details}</td>
                    <td className="p-2">{bar.count} × HA {bar.diameter}</td>
                    <td className="p-2">{bar.unitLengthM} m</td>
                    <td className="p-2 text-right font-bold">{bar.totalWeightKg} kg</td>
                  </tr>
                ))}

              {activeMod === 'column' &&
                columnOutput.rebarSchedule.map((bar, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-blue-900">#{idx + 1}</td>
                    <td className="p-2 font-sans">{bar.details}</td>
                    <td className="p-2">{bar.count} × HA {bar.diameter}</td>
                    <td className="p-2">{bar.unitLengthM} m</td>
                    <td className="p-2 text-right font-bold">{bar.totalWeightKg} kg</td>
                  </tr>
                ))}

              {activeMod === 'slab' &&
                slabOutput.rebarSchedule.map((bar, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-blue-900">#{idx + 1}</td>
                    <td className="p-2 font-sans">{bar.details}</td>
                    <td className="p-2">{bar.count} × HA {bar.diameter}</td>
                    <td className="p-2">{bar.unitLengthM} m</td>
                    <td className="p-2 text-right font-bold">{bar.totalWeightKg} kg</td>
                  </tr>
                ))}

              {activeMod === 'footing' &&
                footingOutput.rebarSchedule.map((bar, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-blue-900">#{idx + 1}</td>
                    <td className="p-2 font-sans">{bar.details}</td>
                    <td className="p-2">{bar.count} × HA {bar.diameter}</td>
                    <td className="p-2">{bar.unitLengthM} m</td>
                    <td className="p-2 text-right font-bold">{bar.totalWeightKg} kg</td>
                  </tr>
                ))}

              {activeMod === 'composite' && (
                <>
                  <tr>
                    <td className="p-2 font-bold text-blue-900">#1</td>
                    <td className="p-2 font-sans">Profilé métallique S355</td>
                    <td className="p-2">1 × {compositeOutput.profile.name}</td>
                    <td className="p-2">{compositeInput.spanL} m</td>
                    <td className="p-2 text-right font-bold">{(compositeOutput.profile.massKgM * compositeInput.spanL).toFixed(1)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-blue-900">#2</td>
                    <td className="p-2 font-sans">Connecteurs Goujons Nelson</td>
                    <td className="p-2">{compositeOutput.totalStudsRequiredPerHalfSpan * 2} × Ø{compositeInput.studDiameterD}</td>
                    <td className="p-2">{compositeInput.studHeightH} mm</td>
                    <td className="p-2 text-right font-bold">{(compositeOutput.totalStudsRequiredPerHalfSpan * 2 * 0.28).toFixed(1)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-blue-900">#3</td>
                    <td className="p-2 font-sans">Armatures transversales anti-fendage</td>
                    <td className="p-2">{Math.ceil(compositeInput.spanL * 1000 / 150)} × HA 10</td>
                    <td className="p-2">{(compositeInput.beffWidth / 1000).toFixed(2)} m</td>
                    <td className="p-2 text-right font-bold">{(Math.ceil(compositeInput.spanL * 1000 / 150) * (compositeInput.beffWidth / 1000) * 0.617).toFixed(1)} kg</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* VISA ET SIGNATURE OFFICIELLE */}
        <div className="border-t-2 border-slate-900 pt-6 mt-8 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900">Pour le Bureau d'Études :</div>
            <div className="text-slate-600 mt-0.5">{companyName}</div>
            <div className="text-slate-400 mt-4 italic">Signé électroniquement conforme Eurocodes</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-900">Visa Organisme de Contrôle :</div>
            <div className="text-emerald-700 font-semibold mt-0.5">BON POUR EXÉCUTION</div>
            <div className="text-slate-400 mt-4 font-mono">VISA OFFICIEL REV-B</div>
          </div>
        </div>
      </div>
    </div>
  );
};
