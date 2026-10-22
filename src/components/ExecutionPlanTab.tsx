/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Planche d'Exécution CAO Blueprint & Inspecteur DXF Avancé
 * Intègre le cartouche ISO 7200 / EN ISO 5457, calques ISO 13567, nomenclature ISO 3766,
 * rendu vectoriel SVG 1:1 de la planche A3 (420 × 297 mm), et compatibilité AutoCAD sans faille.
 */

import React, { useState, useMemo } from 'react';
import { BeamInput, BeamOutput } from '../core/eurocodes/ec2_beams.ts';
import { ColumnInput, ColumnOutput } from '../core/eurocodes/ec2_columns.ts';
import { SlabInput, SlabOutput } from '../core/eurocodes/ec2_slabs.ts';
import { FootingInput, FootingOutput } from '../core/eurocodes/ec2_footings.ts';
import { CompositeInput, CompositeOutput } from '../core/eurocodes/ec4_composite.ts';
import {
  CartoucheData,
  DEFAULT_CARTOUCHE,
  ISO_13567_LAYERS,
  generateBeamDxf,
  generateColumnDxf,
  generateSlabDxf,
  generateFootingDxf,
  generateCompositeDxf
} from '../core/exporters/dxf_generator.ts';
import { saveAs } from 'file-saver';
import {
  Compass,
  Download,
  Printer,
  Layers,
  FileCode,
  Edit3,
  Eye,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

interface ExecutionPlanTabProps {
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
}

export const ExecutionPlanTab: React.FC<ExecutionPlanTabProps> = ({
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
}) => {
  const [viewSubTab, setViewSubTab] = useState<'canvas' | 'raw_dxf'>('canvas');
  const [isCartoucheEditorOpen, setIsCartoucheEditorOpen] = useState(false);
  const [copiedDxf, setCopiedDxf] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // État du cartouche normalisé ISO 7200
  const [cartouche, setCartouche] = useState<CartoucheData>({
    ...DEFAULT_CARTOUCHE,
    dxfVersion: 'AC1009', // AC1009 par défaut (Recommandé pour 100% de compatibilité AutoCAD sans avertissement)
    elementRef:
      currentModule === 'beam'
        ? `POUTRE BA ${beamInput.widthB}×${beamInput.heightH} L=${beamInput.spanL}m`
        : currentModule === 'column'
        ? `POTEAU ${columnOutput.shapeNameFr.toUpperCase()} ${columnInput.dimB}×${columnInput.dimH}`
        : currentModule === 'slab'
        ? `DALLE PLEINE h=${slabInput.thicknessH}mm Lx=${slabInput.spanLx}m`
        : currentModule === 'footing'
        ? `SEMELLE ISOLÉE ${footingInput.dimA}×${footingInput.dimB}×${footingInput.dimH}`
        : `POUTRE MIXTE ${compositeOutput.profile.name} L=${compositeInput.spanL}m`,
  });

  // Contrôleur de visibilité des calques ISO 13567
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    'A-COFF-CONTOUR': true,
    'A-COFF-AXES': true,
    'A-ARMT-LONG-INF': true,
    'A-ARMT-LONG-SUP': true,
    'A-ARMT-TRANS-CADR': true,
    'A-ARMT-ANCR': true,
    'A-COTE-DIM': true,
    'A-TEXT-REPE': true,
    'A-CART-CADRE': true,
    'A-TABL-NOMENCL': true,
  });

  const toggleLayer = (layerKey: string) => {
    setLayerVisibility((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Synchronisation dynamique du nom d'élément si le module change
  const currentElementRef = useMemo(() => {
    switch (currentModule) {
      case 'column':
        return `POTEAU ${columnOutput.shapeNameFr.toUpperCase()} ${columnInput.dimB}×${columnInput.dimH}`;
      case 'slab':
        return `DALLE PLEINE h=${slabInput.thicknessH}mm Lx=${slabInput.spanLx}m`;
      case 'footing':
        return `SEMELLE ISOLÉE ${footingInput.dimA}×${footingInput.dimB}×${footingInput.dimH}`;
      case 'composite':
        return `POUTRE MIXTE ${compositeOutput.profile.name} L=${compositeInput.spanL}m`;
      case 'beam':
      default:
        return `POUTRE BA ${beamInput.widthB}×${beamInput.heightH} L=${beamInput.spanL}m`;
    }
  }, [currentModule, beamInput, columnInput, columnOutput, slabInput, footingInput, compositeInput, compositeOutput]);

  const activeCartouche: CartoucheData = useMemo(() => ({
    ...cartouche,
    elementRef: cartouche.elementRef || currentElementRef,
  }), [cartouche, currentElementRef]);

  // Génération de la chaîne DXF correspondante selon le module actif
  const generatedDxf = useMemo(() => {
    switch (currentModule) {
      case 'column':
        return generateColumnDxf(columnInput, columnOutput, activeCartouche);
      case 'slab':
        return generateSlabDxf(slabInput, slabOutput, activeCartouche);
      case 'footing':
        return generateFootingDxf(footingInput, footingOutput, activeCartouche);
      case 'composite':
        return generateCompositeDxf(compositeInput, compositeOutput, activeCartouche);
      case 'beam':
      default:
        return generateBeamDxf(beamInput, beamOutput, activeCartouche);
    }
  }, [
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
    activeCartouche,
  ]);

  const handleDownloadDxf = () => {
    const filename = `Plan_CAO_${activeCartouche.drawingNumber}_${currentModule.toUpperCase()}_AutoCAD.dxf`;
    const blob = new Blob([generatedDxf], { type: 'application/dxf;charset=utf-8' });
    saveAs(blob, filename);
  };

  const handleCopyDxf = async () => {
    await navigator.clipboard.writeText(generatedDxf);
    setCopiedDxf(true);
    setTimeout(() => setCopiedDxf(false), 2000);
  };

  // Dimensions physiques selon format ISO (mm)
  const sheetWidth = activeCartouche.sheetFormat === 'A1' ? 841 : activeCartouche.sheetFormat === 'A2' ? 594 : 420;
  const sheetHeight = activeCartouche.sheetFormat === 'A1' ? 594 : activeCartouche.sheetFormat === 'A2' ? 420 : 297;

  return (
    <div className="space-y-6">
      {/* 1. BARRE D'OUTILS PRINCIPALE DXF */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Planche CAO & Cartouche Normalisé ISO 7200</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {activeCartouche.dxfVersion === 'AC1015' ? 'AutoCAD 2000+ AC1015' : 'AutoCAD R12 Universel (Sans invite)'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Format A3 Paysage (420 × 297 mm) · Marges reliure 20 mm · Cadrage automatique VPORT · Calques ISO 13567
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bascule Vue Canvas / Code DXF Brut */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs mr-2">
            <button
              onClick={() => setViewSubTab('canvas')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewSubTab === 'canvas' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vue Planche A3
            </button>
            <button
              onClick={() => setViewSubTab('raw_dxf')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewSubTab === 'raw_dxf' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Inspecteur DXF Brut
            </button>
          </div>

          <button
            onClick={() => setIsCartoucheEditorOpen(!isCartoucheEditorOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            Éditer Cartouche
            {isCartoucheEditorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownloadDxf}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Télécharger DXF AutoCAD
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* 2. ÉDITEUR DE CARTOUCHE NORMALISÉ ISO 7200 & VERSION AUTOCAD */}
      {isCartoucheEditorOpen && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-2xl text-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-400" />
              Paramètres du Cartouche Réglementaire (ISO 7200 / EN ISO 5457)
            </span>
            <span className="text-emerald-400 font-mono text-[11px]">Dimensions Cartouche : 180 × 65 mm (Coin inférieur droit)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Compatibilité Version AutoCAD</label>
              <select
                value={cartouche.dxfVersion || 'AC1009'}
                onChange={(e) => setCartouche({ ...cartouche, dxfVersion: e.target.value as any })}
                className="w-full bg-slate-950 border border-indigo-500/40 rounded px-2.5 py-1.5 text-emerald-300 font-mono font-medium"
              >
                <option value="AC1009">AutoCAD R12 Universel (AC1009 - Zéro invite / 100% stable)</option>
                <option value="AC1015">AutoCAD 2000-2026 (AC1015 avec ModelSpace)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nom du Projet / Ouvrage</label>
              <input
                type="text"
                value={cartouche.projectName}
                onChange={(e) => setCartouche({ ...cartouche, projectName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Désignation Élément</label>
              <input
                type="text"
                value={cartouche.elementRef}
                onChange={(e) => setCartouche({ ...cartouche, elementRef: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Maître d'Ouvrage (Client)</label>
              <input
                type="text"
                value={cartouche.clientName}
                onChange={(e) => setCartouche({ ...cartouche, clientName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Bureau d'Études Émetteur</label>
              <input
                type="text"
                value={cartouche.firmName}
                onChange={(e) => setCartouche({ ...cartouche, firmName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Auteur / Dessinateur</label>
              <input
                type="text"
                value={cartouche.authorName}
                onChange={(e) => setCartouche({ ...cartouche, authorName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Vérificateur / Organisme Visa</label>
              <input
                type="text"
                value={cartouche.verifierName}
                onChange={(e) => setCartouche({ ...cartouche, verifierName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Échelle & Indice de Révision</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cartouche.scaleText}
                  onChange={(e) => setCartouche({ ...cartouche, scaleText: e.target.value })}
                  placeholder="Échelle"
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white font-mono"
                />
                <input
                  type="text"
                  value={cartouche.revisionIndex}
                  onChange={(e) => setCartouche({ ...cartouche, revisionIndex: e.target.value })}
                  placeholder="Indice"
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-emerald-400 font-mono font-bold text-center"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTRÔLEUR DE CALQUES ISO 13567 & ZOOM */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Calques ISO 13567 :
          </span>
          {Object.keys(ISO_13567_LAYERS).map((key) => {
            const l = ISO_13567_LAYERS[key];
            const isVisible = layerVisibility[key] !== false;
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer border ${
                  isVisible
                    ? 'bg-slate-950 border-slate-700 text-slate-200'
                    : 'bg-slate-900 border-slate-850 text-slate-600 line-through'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      l.color === 1
                        ? '#ef4444'
                        : l.color === 2
                        ? '#eab308'
                        : l.color === 3
                        ? '#22c55e'
                        : l.color === 4
                        ? '#06b6d4'
                        : l.color === 6
                        ? '#c084fc'
                        : l.color === 8
                        ? '#64748b'
                        : '#ffffff',
                  }}
                />
                {l.name}
              </button>
            );
          })}
        </div>

        {viewSubTab === 'canvas' && (
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="p-1 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Réinitialiser zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 4. ZONE DE RENDU DU PLAN OU INSPECTEUR BRUT */}
      {viewSubTab === 'raw_dxf' ? (
        /* INSPECTEUR DE CODE SOURCE DXF BRUT */
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
            <span className="flex items-center gap-2 text-white font-semibold">
              <FileCode className="w-4 h-4 text-indigo-400" />
              Contenu du Fichier DXF ({activeCartouche.dxfVersion || 'AC1009'}) · {generatedDxf.split('\n').length} lignes
            </span>
            <button
              onClick={handleCopyDxf}
              className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            >
              {copiedDxf ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedDxf ? 'Copié !' : 'Copier tout le DXF'}
            </button>
          </div>
          <pre className="max-h-[500px] overflow-y-auto text-emerald-400/90 leading-tight bg-slate-900/50 p-4 rounded border border-slate-850">
            {generatedDxf}
          </pre>
        </div>
      ) : (
        /* PLANCHE VECTORIELLE BLUEPRINT HAUTE FIDÉLITÉ (SVG 1:1 DU FORMAT A3 420 × 297 mm) */
        <div className="bg-slate-950 border-2 border-indigo-950/80 rounded-xl p-4 sm:p-6 font-mono text-slate-300 shadow-2xl overflow-x-auto">
          {/* NOTICE DE CONFORMITÉ */}
          <div className="flex items-center justify-between mb-4 text-[11px] text-slate-400 border-b border-slate-800 pb-3">
            <span className="flex items-center gap-2 text-white font-semibold">
              <Compass className="w-4 h-4 text-cyan-400" />
              Planche Format A3 Paysage (420 × 297 mm) · Rendu Vectoriel CAD Haute Définition
            </span>
            <span>Marge de reliure : 20 mm gauche · Cartouche ISO 7200 : 180 × 65 mm</span>
          </div>

          <div
            className="flex justify-center transition-transform origin-top"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* SVG PLANCHE A3 COMPLETE (420 × 297 mm) */}
            <svg
              viewBox="0 0 420 297"
              className="w-full max-w-[1050px] bg-[#070b14] border-2 border-slate-600 shadow-2xl rounded"
              style={{ aspectRatio: '420 / 297' }}
            >
              {/* 1. CADRE DE COUPE EXTÉRIEUR (420 × 297 mm) */}
              <rect x="0" y="0" width="420" height="297" fill="#070b14" stroke="#334155" strokeWidth="0.5" />

              {/* 2. CADRE INTÉRIEUR AVEC MARGE DE RELIURE 20 mm GAUCHE ET 10 mm AUTRES (390 × 277 mm) */}
              {layerVisibility['A-CART-CADRE'] && (
                <g>
                  {/* Cadre intérieur principal */}
                  <rect x="20" y="10" width="390" height="277" fill="none" stroke="#e2e8f0" strokeWidth="0.7" />

                  {/* Repères de centrage aux axes médians */}
                  <line x1="210" y1="0" x2="210" y2="8" stroke="#e2e8f0" strokeWidth="0.5" />
                  <line x1="210" y1="289" x2="210" y2="297" stroke="#e2e8f0" strokeWidth="0.5" />
                  <line x1="0" y1="148.5" x2="8" y2="148.5" stroke="#e2e8f0" strokeWidth="0.5" />
                  <line x1="412" y1="148.5" x2="420" y2="148.5" stroke="#e2e8f0" strokeWidth="0.5" />

                  {/* Repères de pliage (190 mm) */}
                  <line x1="190" y1="0" x2="190" y2="5" stroke="#64748b" strokeWidth="0.4" />
                  <line x1="190" y1="292" x2="190" y2="297" stroke="#64748b" strokeWidth="0.4" />

                  {/* Grille de coordonnées ISO 5457 (1..8 et A..D) */}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => {
                    const cx = 20 + (i + 0.5) * (390 / 8);
                    return (
                      <g key={i}>
                        <text x={cx} y="6.5" fill="#64748b" fontSize="2.4" textAnchor="middle" fontFamily="monospace">{num}</text>
                        <text x={cx} y="294" fill="#64748b" fontSize="2.4" textAnchor="middle" fontFamily="monospace">{num}</text>
                      </g>
                    );
                  })}
                  {['D', 'C', 'B', 'A'].map((letter, j) => {
                    const cy = 10 + (j + 0.5) * (277 / 4);
                    return (
                      <g key={j}>
                        <text x="5" y={cy + 1} fill="#64748b" fontSize="2.4" textAnchor="middle" fontFamily="monospace">{letter}</text>
                        <text x="415" y={cy + 1} fill="#64748b" fontSize="2.4" textAnchor="middle" fontFamily="monospace">{letter}</text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 3. GÉOMÉTRIE VECTORIELLE DU MODULE ACTIF DANS LA ZONE DE DESSIN (Y inversé SVG : Y_svg = 297 - Y_dxf) */}
              {/* Le repère DXF a l'origine en bas à gauche, le SVG a l'origine en haut à gauche */}
              <g transform="translate(0, 297) scale(1, -1)">
                {/* --- A. MODULE POUTRE (Centrage dynamique & Multi-lits) --- */}
                {currentModule === 'beam' && (() => {
                  const L = beamInput.spanL * 1000;
                  const H = beamInput.heightH;
                  const B = beamInput.widthB;
                  const C = beamInput.coverC;
                  const stirrupPhi = beamInput.stirrupDiameter || 8;
                  const topRebarPhi = beamInput.topRebarPhi || 12;

                  const sc = Math.min(0.038, 220 / (L + 600));
                  const elevW = L * sc;
                  const elevH = H * sc;

                  const scSec = Math.min(0.08, 120 / H);
                  const sectW = B * scSec;
                  const sectH = H * scSec;

                  const gap = 35;
                  const totalW = elevW + gap + sectW + 35;
                  const totalH = Math.max(elevH, sectH) + 40;

                  const originX = 20 + Math.max(15, (390 - totalW) / 2) + 15;
                  const originY = 80 + Math.max(15, (205 - totalH) / 2) + 15;
                  const appuiW = 300 * sc;
                  const appuiH = 350 * sc;
                  const lbdScaled = Math.min(60, beamOutput.anchorage.lbd * sc);

                  // Coupe transversale position
                  const secX = originX + elevW + gap;
                  const secY = originY;

                  return (
                    <g>
                      {/* ÉLÉVATION LONGITUDINALE */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <g>
                          {/* Poutre */}
                          <rect x={originX} y={originY} width={elevW} height={elevH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                          {/* Appuis poteaux */}
                          <rect x={originX - appuiW} y={originY - appuiH} width={appuiW} height={appuiH} fill="none" stroke="#64748b" strokeWidth="0.4" strokeDasharray="3,1" />
                          <rect x={originX + elevW} y={originY - appuiH} width={appuiW} height={appuiH} fill="none" stroke="#64748b" strokeWidth="0.4" strokeDasharray="3,1" />
                        </g>
                      )}
                      {layerVisibility['A-COFF-AXES'] && (
                        <line x1={originX - 10} y1={originY + elevH / 2} x2={originX + elevW + 10} y2={originY + elevH / 2} stroke="#ef4444" strokeWidth="0.3" strokeDasharray="6,2,2,2" />
                      )}

                      {/* Armatures longitudinales inférieures (par lit) */}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          {beamOutput.layersDetails.map((layer) => {
                            const isFirstLayer = layer.layerIndex === 1;
                            const ySc = originY + layer.yPositionMm * sc;
                            const leftX = isFirstLayer ? originX - lbdScaled : originX;
                            const rightX = isFirstLayer ? originX + elevW + lbdScaled : originX + elevW;
                            return (
                              <g key={layer.layerIndex}>
                                <line x1={leftX} y1={ySc} x2={rightX} y2={ySc} stroke="#22c55e" strokeWidth={isFirstLayer ? 0.9 : 0.7} />
                                {isFirstLayer && beamInput.anchorageType === 'hook_90' && (
                                  <>
                                    <line x1={leftX} y1={ySc} x2={leftX} y2={ySc + 120 * sc} stroke="#22c55e" strokeWidth={0.9} />
                                    <line x1={rightX} y1={ySc} x2={rightX} y2={ySc + 120 * sc} stroke="#22c55e" strokeWidth={0.9} />
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {/* Armatures supérieures de montage */}
                      {layerVisibility['A-ARMT-LONG-SUP'] && (() => {
                        const supY = originY + (H - C - stirrupPhi - topRebarPhi / 2) * sc;
                        return (
                          <g>
                            <line x1={originX - 120 * sc} y1={supY} x2={originX + elevW + 120 * sc} y2={supY} stroke="#22c55e" strokeWidth={0.7} />
                            <line x1={originX - 120 * sc} y1={supY} x2={originX - 120 * sc} y2={supY - 80 * sc} stroke="#22c55e" strokeWidth={0.7} />
                            <line x1={originX + elevW + 120 * sc} y1={supY} x2={originX + elevW + 120 * sc} y2={supY - 80 * sc} stroke="#22c55e" strokeWidth={0.7} />
                            {/* Aciers de peau si requis */}
                            {beamOutput.confinementRules.requiresSkinRebars && (
                              <line x1={originX} y1={originY + (H / 2) * sc} x2={originX + elevW} y2={originY + (H / 2) * sc} stroke="#34d399" strokeWidth={0.6} strokeDasharray="4,1" />
                            )}
                          </g>
                        );
                      })()}

                      {/* Étriers / cadres */}
                      {layerVisibility['A-ARMT-TRANS-CADR'] && (
                        <g>
                          {Array.from({ length: 25 }).map((_, i) => {
                            const x = originX + (i + 0.5) * (elevW / 25);
                            return (
                              <line
                                key={i}
                                x1={x}
                                y1={originY + (C + stirrupPhi) * sc}
                                x2={x}
                                y2={originY + (H - C - stirrupPhi) * sc}
                                stroke="#eab308"
                                strokeWidth="0.4"
                              />
                            );
                          })}
                        </g>
                      )}

                      {/* COUPE TRANSVERSALE A-A */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <g>
                          {beamInput.isTSection ? (
                            <>
                              <rect x={secX} y={secY} width={sectW} height={sectH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                              <rect x={secX - ((beamInput.flangeWidthBf || 800) - B) / 2 * scSec} y={secY + sectH - (beamInput.flangeHeightHf || 120) * scSec} width={(beamInput.flangeWidthBf || 800) * scSec} height={(beamInput.flangeHeightHf || 120) * scSec} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                            </>
                          ) : (
                            <rect x={secX} y={secY} width={sectW} height={sectH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                          )}
                        </g>
                      )}

                      {/* Cadre de la coupe transversale */}
                      {layerVisibility['A-ARMT-TRANS-CADR'] && (
                        <>
                          <rect
                            x={secX + (C + stirrupPhi / 2) * scSec}
                            y={secY + (C + stirrupPhi / 2) * scSec}
                            width={sectW - 2 * (C + stirrupPhi / 2) * scSec}
                            height={sectH - 2 * (C + stirrupPhi / 2) * scSec}
                            fill="none"
                            stroke="#eab308"
                            strokeWidth="0.5"
                            rx="1"
                          />
                          {(beamOutput.hasInternalStirrup || (beamOutput.stirrupLegsCount && beamOutput.stirrupLegsCount > 2)) && (
                            <rect
                              x={secX + sectW * 0.28}
                              y={secY + (C + stirrupPhi / 2) * scSec}
                              width={sectW * 0.44}
                              height={sectH - 2 * (C + stirrupPhi / 2) * scSec}
                              fill="none"
                              stroke="#eab308"
                              strokeWidth="0.4"
                              strokeDasharray="2,1"
                              rx="1"
                            />
                          )}
                        </>
                      )}

                      {/* Barres des lits dans la coupe transversale */}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          {beamOutput.layersDetails.map((layer) => {
                            const yRebarSc = secY + layer.yPositionMm * scSec;
                            const count = layer.count;
                            const r = Math.max(1.0, (layer.diameter / 2) * scSec);
                            const startX = secX + (C + stirrupPhi + layer.diameter / 2) * scSec;
                            const spacing = layer.spacingHorizontalMm * scSec;
                            return (
                              <g key={layer.layerIndex}>
                                {Array.from({ length: count }).map((_, barIdx) => {
                                  const xPos = count > 1 ? startX + barIdx * spacing : secX + sectW / 2;
                                  return (
                                    <circle key={barIdx} cx={xPos} cy={yRebarSc} r={r} fill="#22c55e" />
                                  );
                                })}
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {/* Barres supérieures et de peau dans la coupe */}
                      {layerVisibility['A-ARMT-LONG-SUP'] && (
                        <g>
                          {/* Barres supérieures */}
                          {Array.from({ length: beamInput.topRebarCount || 2 }).map((_, i) => {
                            const count = beamInput.topRebarCount || 2;
                            const x1 = secX + (C + stirrupPhi + topRebarPhi / 2) * scSec;
                            const x2 = secX + sectW - (C + stirrupPhi + topRebarPhi / 2) * scSec;
                            const xPos = count > 1 ? x1 + i * ((x2 - x1) / (count - 1)) : secX + sectW / 2;
                            const yPos = secY + (H - C - stirrupPhi - topRebarPhi / 2) * scSec;
                            return <circle key={i} cx={xPos} cy={yPos} r={Math.max(1.0, (topRebarPhi / 2) * scSec)} fill="#22c55e" />;
                          })}
                          {/* Aciers de peau */}
                          {beamOutput.confinementRules.requiresSkinRebars && (
                            <>
                              <circle cx={secX + (C + stirrupPhi + 5) * scSec} cy={secY + (H / 2) * scSec} r={1.2} fill="#34d399" />
                              <circle cx={secX + sectW - (C + stirrupPhi + 5) * scSec} cy={secY + (H / 2) * scSec} r={1.2} fill="#34d399" />
                            </>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* --- B. MODULE POTEAU (Centré avec barres intermédiaires & frettage) --- */}
                {currentModule === 'column' && (() => {
                  const L = columnInput.heightL * 1000;
                  const B = columnInput.dimB;
                  const H = columnInput.dimH;
                  const C = columnInput.coverC;

                  const scElev = Math.min(0.04, 180 / L);
                  const elevW = B * scElev * 1.5;
                  const elevH = L * scElev;

                  const scSec = Math.min(0.18, 90 / Math.max(B, H));
                  const secW = B * scSec;
                  const secH = H * scSec;

                  const totalW = elevW + 50 + secW;
                  const originX = 20 + Math.max(15, (390 - totalW) / 2) + 10;
                  const originY = 80 + Math.max(15, (205 - Math.max(elevH, secH)) / 2) + 10;

                  const secX = originX + elevW + 50;
                  const secY = originY + (elevH - secH) / 2;

                  return (
                    <g>
                      {/* Élévation poteau */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <rect x={originX} y={originY} width={elevW} height={elevH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                      )}
                      {layerVisibility['A-COFF-AXES'] && (
                        <line x1={originX + elevW / 2} y1={originY - 10} x2={originX + elevW / 2} y2={originY + elevH + 15} stroke="#ef4444" strokeWidth="0.3" strokeDasharray="6,2,2,2" />
                      )}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          <line x1={originX + 3} y1={originY - 10} x2={originX + 3} y2={originY + elevH + 12} stroke="#22c55e" strokeWidth="0.9" />
                          <line x1={originX + elevW - 3} y1={originY - 10} x2={originX + elevW - 3} y2={originY + elevH + 12} stroke="#22c55e" strokeWidth="0.9" />
                          <line x1={originX + 3} y1={originY - 10} x2={originX - 5} y2={originY - 10} stroke="#22c55e" strokeWidth="0.9" />
                          <line x1={originX + elevW - 3} y1={originY - 10} x2={originX + elevW + 5} y2={originY - 10} stroke="#22c55e" strokeWidth="0.9" />
                        </g>
                      )}
                      {layerVisibility['A-ARMT-TRANS-CADR'] && (
                        <g>
                          {Array.from({ length: 20 }).map((_, i) => (
                            <line key={i} x1={originX + 3} y1={originY + (i + 0.5) * (elevH / 20)} x2={originX + elevW - 3} y2={originY + (i + 0.5) * (elevH / 20)} stroke="#eab308" strokeWidth="0.4" />
                          ))}
                        </g>
                      )}

                      {/* Section transversale détaillée (8 formes & multi-cadres) */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        columnInput.shape === 'circle' ? (
                          <circle cx={secX + secW / 2} cy={secY + secH / 2} r={secW / 2} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                        ) : columnInput.shape === 'hexagon' ? (
                          <polygon
                            points={Array.from({ length: 6 }).map((_, i) => {
                              const ang = (i * 60 * Math.PI) / 180;
                              return `${(secX + secW / 2 + (secW / 2) * Math.cos(ang)).toFixed(1)},${(secY + secH / 2 + (secW / 2) * Math.sin(ang)).toFixed(1)}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="0.6"
                          />
                        ) : (
                          <rect x={secX} y={secY} width={secW} height={secH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                        )
                      )}

                      {/* Cadres transversaux */}
                      {layerVisibility['A-ARMT-TRANS-CADR'] && (
                        columnInput.shape === 'circle' ? (
                          <circle cx={secX + secW / 2} cy={secY + secH / 2} r={secW / 2 - C * scSec} fill="none" stroke="#eab308" strokeWidth="0.5" />
                        ) : columnInput.shape === 'hexagon' ? (
                          <polygon
                            points={Array.from({ length: 6 }).map((_, i) => {
                              const ang = (i * 60 * Math.PI) / 180;
                              return `${(secX + secW / 2 + (secW / 2 - C * scSec) * Math.cos(ang)).toFixed(1)},${(secY + secH / 2 + (secW / 2 - C * scSec) * Math.sin(ang)).toFixed(1)}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#eab308"
                            strokeWidth="0.5"
                          />
                        ) : columnInput.shape === 'cross' ? (
                          <>
                            <rect x={secX + secW * 0.3} y={secY + C * scSec} width={secW * 0.4} height={secH - 2 * C * scSec} fill="none" stroke="#eab308" strokeWidth="0.5" />
                            <rect x={secX + C * scSec} y={secY + secH * 0.3} width={secW - 2 * C * scSec} height={secH * 0.4} fill="none" stroke="#eab308" strokeWidth="0.5" strokeDasharray="2,1" />
                          </>
                        ) : columnInput.shape === 'L' ? (
                          <>
                            <rect x={secX + C * scSec} y={secY + C * scSec} width={secW * 0.5} height={secH - 2 * C * scSec} fill="none" stroke="#eab308" strokeWidth="0.5" />
                            <rect x={secX + C * scSec} y={secY + C * scSec} width={secW - 2 * C * scSec} height={secH * 0.5} fill="none" stroke="#eab308" strokeWidth="0.5" strokeDasharray="2,1" />
                          </>
                        ) : (
                          <>
                            <rect x={secX + C * scSec} y={secY + C * scSec} width={secW - 2 * C * scSec} height={secH - 2 * C * scSec} fill="none" stroke="#eab308" strokeWidth="0.5" />
                            {columnOutput.cadresCountPerSet > 1 && (
                              <rect x={secX + secW * 0.25} y={secY + C * scSec} width={secW * 0.5} height={secH - 2 * C * scSec} fill="none" stroke="#eab308" strokeWidth="0.4" strokeDasharray="2,1" />
                            )}
                          </>
                        )
                      )}

                      {/* Barres longitudinales */}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          {columnInput.shape === 'hexagon' ? (
                            Array.from({ length: 6 }).map((_, i) => {
                              const ang = (i * 60 * Math.PI) / 180;
                              const bx = secX + secW / 2 + (secW / 2 - C * scSec) * Math.cos(ang);
                              const by = secY + secH / 2 + (secW / 2 - C * scSec) * Math.sin(ang);
                              return <circle key={i} cx={bx} cy={by} r="1.5" fill="#22c55e" />;
                            })
                          ) : (
                            <>
                              <circle cx={secX + C * scSec + 2} cy={secY + C * scSec + 2} r="1.6" fill="#22c55e" />
                              <circle cx={secX + secW - C * scSec - 2} cy={secY + C * scSec + 2} r="1.6" fill="#22c55e" />
                              <circle cx={secX + C * scSec + 2} cy={secY + secH - C * scSec - 2} r="1.6" fill="#22c55e" />
                              <circle cx={secX + secW - C * scSec - 2} cy={secY + secH - C * scSec - 2} r="1.6" fill="#22c55e" />
                              {columnOutput.barCount > 4 && (
                                <>
                                  <circle cx={secX + secW / 2} cy={secY + C * scSec + 2} r="1.4" fill="#22c55e" />
                                  <circle cx={secX + secW / 2} cy={secY + secH - C * scSec - 2} r="1.4" fill="#22c55e" />
                                </>
                              )}
                            </>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* --- C. MODULE DALLE (Centré avec aciers de répartition Y et rives U) --- */}
                {currentModule === 'slab' && (() => {
                  const Lx = slabInput.spanLx * 1000;
                  const Ly = slabInput.spanLy * 1000;
                  const H = slabInput.thicknessH;
                  const sc = Math.min(0.024, 160 / Math.max(Lx, Ly));
                  const planW = Lx * sc;
                  const planH = Ly * sc;
                  const scSec = Math.min(0.18, 30 / H);
                  const secW = planW;
                  const secH = H * scSec;

                  const totalW = planW + 40 + secW;
                  const originX = 20 + Math.max(15, (390 - totalW) / 2) + 10;
                  const originY = 80 + Math.max(15, (205 - planH) / 2) + 10;
                  const secX = originX + planW + 40;
                  const secY = originY + planH / 2 - secH / 2;

                  return (
                    <g>
                      {/* Vue en plan */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <rect x={originX} y={originY} width={planW} height={planH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                      )}
                      {/* Armatures principales X */}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          {Array.from({ length: 8 }).map((_, i) => (
                            <line key={i} x1={originX + (i + 0.5) * (planW / 8)} y1={originY + 2} x2={originX + (i + 0.5) * (planW / 8)} y2={originY + planH - 2} stroke="#22c55e" strokeWidth="0.5" />
                          ))}
                          {/* Nappe de répartition transversale Y (Asy >= 0.20 Asx) */}
                          {Array.from({ length: 8 }).map((_, j) => (
                            <line key={j} x1={originX + 2} y1={originY + (j + 0.5) * (planH / 8)} x2={originX + planW - 2} y2={originY + (j + 0.5) * (planH / 8)} stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="3,1" />
                          ))}
                        </g>
                      )}

                      {/* Coupe transversale */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <rect x={secX} y={secY} width={secW} height={secH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                      )}
                      {/* Nappes et épingles de rive en U */}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          <line x1={secX + 4} y1={secY + 3} x2={secX + secW - 4} y2={secY + 3} stroke="#22c55e" strokeWidth="0.7" />
                          {/* U de rive gauche et droite */}
                          <line x1={secX + 4} y1={secY + 3} x2={secX + 4} y2={secY + secH - 3} stroke="#22c55e" strokeWidth="0.7" />
                          <line x1={secX + 4} y1={secY + secH - 3} x2={secX + 16} y2={secY + secH - 3} stroke="#22c55e" strokeWidth="0.7" />
                          <line x1={secX + secW - 4} y1={secY + 3} x2={secX + secW - 4} y2={secY + secH - 3} stroke="#22c55e" strokeWidth="0.7" />
                          <line x1={secX + secW - 4} y1={secY + secH - 3} x2={secX + secW - 16} y2={secY + secH - 3} stroke="#22c55e" strokeWidth="0.7" />
                          {/* Barres de répartition transversale visibles en coupe */}
                          {Array.from({ length: 7 }).map((_, k) => (
                            <circle key={k} cx={secX + 10 + k * ((secW - 20) / 6)} cy={secY + 6} r="1.1" fill="#38bdf8" />
                          ))}
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* --- D. MODULE SEMELLE (Centré avec quadrillage croisé A/B) --- */}
                {currentModule === 'footing' && (() => {
                  const A = footingInput.dimA;
                  const B = footingInput.dimB;
                  const H = footingInput.dimH;
                  const colA = footingInput.colA;
                  const colB = footingInput.colB;
                  const sc = Math.min(0.065, 140 / Math.max(A, B));
                  const footW = A * sc;
                  const footH = B * sc;
                  const scSec = Math.min(0.065, 140 / A);
                  const secW = A * scSec;
                  const secH = H * scSec;

                  const totalW = footW + 40 + secW;
                  const originX = 20 + Math.max(15, (390 - totalW) / 2) + 10;
                  const originY = 80 + Math.max(15, (205 - footH) / 2) + 10;
                  const secX = originX + footW + 40;
                  const secY = originY + footH / 2 - secH / 2;

                  return (
                    <g>
                      {/* Vue en plan semelle */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <g>
                          <rect x={originX} y={originY} width={footW} height={footH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                          <rect x={originX + (footW - colA * sc) / 2} y={originY + (footH - colB * sc) / 2} width={colA * sc} height={colB * sc} fill="none" stroke="#64748b" strokeWidth="0.4" />
                        </g>
                      )}
                      {/* Nappe principale Dir A et nappe répartition Dir B */}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          {Array.from({ length: 7 }).map((_, i) => (
                            <line key={i} x1={originX + 4} y1={originY + (i + 0.5) * (footH / 7)} x2={originX + footW - 4} y2={originY + (i + 0.5) * (footH / 7)} stroke="#22c55e" strokeWidth="0.6" />
                          ))}
                          {Array.from({ length: 7 }).map((_, j) => (
                            <line key={j} x1={originX + (j + 0.5) * (footW / 7)} y1={originY + 4} x2={originX + (j + 0.5) * (footW / 7)} y2={originY + footH - 4} stroke="#38bdf8" strokeWidth="0.6" />
                          ))}
                        </g>
                      )}

                      {/* Élévation / Coupe de semelle */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <g>
                          <rect x={secX} y={secY} width={secW} height={secH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                          <rect x={secX + (secW - colA * scSec) / 2} y={secY + secH} width={colA * scSec} height={30} fill="none" stroke="#64748b" strokeWidth="0.4" />
                        </g>
                      )}
                      {layerVisibility['A-ARMT-LONG-INF'] && (
                        <g>
                          {/* Nappe inférieure avec crochets */}
                          <line x1={secX + 4} y1={secY + 4} x2={secX + secW - 4} y2={secY + 4} stroke="#22c55e" strokeWidth="0.8" />
                          {!footingOutput.isStraightAnchorageSufficientA && (
                            <>
                              <line x1={secX + 4} y1={secY + 4} x2={secX + 4} y2={secY + secH * 0.6} stroke="#22c55e" strokeWidth="0.8" />
                              <line x1={secX + secW - 4} y1={secY + 4} x2={secX + secW - 4} y2={secY + secH * 0.6} stroke="#22c55e" strokeWidth="0.8" />
                            </>
                          )}
                          {/* Points barres nappe B */}
                          {Array.from({ length: 6 }).map((_, k) => (
                            <circle key={k} cx={secX + 10 + k * ((secW - 20) / 5)} cy={secY + 8} r="1.4" fill="#38bdf8" />
                          ))}
                          {/* Attentes poteau */}
                          <line x1={secX + secW / 2 - 8} y1={secY + secH + 25} x2={secX + secW / 2 - 8} y2={secY + 6} stroke="#c084fc" strokeWidth="0.7" />
                          <line x1={secX + secW / 2 - 8} y1={secY + 6} x2={secX + secW / 2 - 18} y2={secY + 6} stroke="#c084fc" strokeWidth="0.7" />
                          <line x1={secX + secW / 2 + 8} y1={secY + secH + 25} x2={secX + secW / 2 + 8} y2={secY + 6} stroke="#c084fc" strokeWidth="0.7" />
                          <line x1={secX + secW / 2 + 8} y1={secY + 6} x2={secX + secW / 2 + 18} y2={secY + 6} stroke="#c084fc" strokeWidth="0.7" />
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* --- E. MODULE MIXTE (Centré avec armatures anti-fendage transversales) --- */}
                {currentModule === 'composite' && (() => {
                  const L = compositeInput.spanL * 1000;
                  const sc = Math.min(0.024, 210 / (L + 600));
                  const elevW = L * sc;
                  const profileH = (compositeOutput.profile?.h || 360) * sc;
                  const slabH = compositeInput.slabThicknessHc * sc;
                  const totalH = profileH + slabH;

                  const totalW = elevW + 50 + 60;
                  const originX = 20 + Math.max(15, (390 - totalW) / 2) + 10;
                  const originY = 80 + Math.max(15, (205 - totalH) / 2) + 15;
                  const secX = originX + elevW + 50;

                  return (
                    <g>
                      {/* Élévation poutre mixte */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <g>
                          <rect x={originX} y={originY} width={elevW} height={profileH} fill="none" stroke="#64748b" strokeWidth="0.6" />
                          <rect x={originX} y={originY + profileH} width={elevW} height={slabH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                        </g>
                      )}
                      {/* Goujons et barres anti-fendage transversales */}
                      {layerVisibility['A-ARMT-ANCR'] && (
                        <g>
                          {Array.from({ length: 14 }).map((_, i) => {
                            const x = originX + (i + 0.5) * (elevW / 14);
                            return (
                              <g key={i}>
                                <line x1={x} y1={originY + profileH} x2={x} y2={originY + profileH + slabH * 0.7} stroke="#c084fc" strokeWidth="0.7" />
                                <circle cx={x} cy={originY + profileH + slabH * 0.7} r="1.2" fill="#c084fc" />
                              </g>
                            );
                          })}
                        </g>
                      )}
                      {/* Coupe transversale */}
                      {layerVisibility['A-COFF-CONTOUR'] && (
                        <g>
                          <rect x={secX} y={originY + profileH} width={60} height={slabH} fill="none" stroke="#06b6d4" strokeWidth="0.6" />
                          <rect x={secX + 22} y={originY} width={16} height={profileH} fill="none" stroke="#64748b" strokeWidth="0.5" />
                        </g>
                      )}
                      {layerVisibility['A-ARMT-ANCR'] && (
                        <g>
                          <line x1={secX + 30} y1={originY + profileH} x2={secX + 30} y2={originY + profileH + slabH * 0.7} stroke="#c084fc" strokeWidth="0.8" />
                          <circle cx={secX + 30} cy={originY + profileH + slabH * 0.7} r="1.4" fill="#c084fc" />
                          {/* Armatures anti-fendage transversales */}
                          <line x1={secX + 4} y1={originY + profileH + slabH * 0.4} x2={secX + 56} y2={originY + profileH + slabH * 0.4} stroke="#22c55e" strokeWidth="0.7" />
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* --- F. TABLEAU NOMENCLATURE / RECAPITULATIF (Bas Gauche : x=25 à 220 mm, y=12 à 72 mm) --- */}
                {layerVisibility['A-TABL-NOMENCL'] && (
                  <g>
                    <rect x="25" y="12" width="195" height="60" fill="#030712" stroke="#e2e8f0" strokeWidth="0.5" />
                    <line x1="25" y1="62" x2="220" y2="62" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="25" y1="54" x2="220" y2="54" stroke="#e2e8f0" strokeWidth="0.4" />
                  </g>
                )}

                {/* --- G. CARTOUCHE ISO 7200 NORMALISÉ (Bas Droite : x=230 à 410 mm, y=10 à 75 mm) --- */}
                {layerVisibility['A-CART-CADRE'] && (
                  <g>
                    {/* Cadre du cartouche */}
                    <rect x="230" y="10" width="180" height="65" fill="#030712" stroke="#e2e8f0" strokeWidth="0.7" />
                    {/* Séparations horizontales */}
                    <line x1="230" y1="62" x2="410" y2="62" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="230" y1="48" x2="410" y2="48" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="230" y1="34" x2="410" y2="34" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="230" y1="22" x2="410" y2="22" stroke="#e2e8f0" strokeWidth="0.4" />
                    {/* Séparations verticales */}
                    <line x1="365" y1="62" x2="365" y2="75" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="320" y1="48" x2="320" y2="62" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="290" y1="34" x2="290" y2="48" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="350" y1="34" x2="350" y2="48" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="265" y1="22" x2="265" y2="34" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="295" y1="22" x2="295" y2="34" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="330" y1="22" x2="330" y2="34" stroke="#e2e8f0" strokeWidth="0.4" />
                    <line x1="365" y1="22" x2="365" y2="34" stroke="#e2e8f0" strokeWidth="0.4" />
                  </g>
                )}
              </g>

              {/* 4. TEXTES SVG DU CARTOUCHE ET DES ANNOTATIONS EN POLICE ARIAL NARROW */}
              {layerVisibility['A-CART-CADRE'] && (
                <g style={{ fontFamily: "'Arial Narrow', 'Nimbus Sans Narrow', 'Helvetica Neue', Arial, sans-serif" }}>
                  {/* Cartouche : En-tête Titre Projet & Élément */}
                  <text x="233" y="228" fill="#94a3b8" fontSize="2.0">PROJET / OUVRAGE :</text>
                  <text x="233" y="233.5" fill="#ffffff" fontSize="3.2" fontWeight="bold">
                    {activeCartouche.projectName.substring(0, 34)}
                  </text>
                  <text x="233" y="241" fill="#94a3b8" fontSize="2.0">ÉLÉMENT STRUCTURAL :</text>
                  <text x="233" y="246" fill="#38bdf8" fontSize="3.0" fontWeight="bold">
                    {activeCartouche.elementRef.substring(0, 34)}
                  </text>
                  <text x="387" y="228" fill="#94a3b8" fontSize="2.0" textAnchor="middle">INDICE</text>
                  <text x="387" y="236" fill="#4ade80" fontSize="4.5" fontWeight="bold" textAnchor="middle">
                    {activeCartouche.revisionIndex}
                  </text>

                  {/* Maître d'ouvrage & Bureau d'études */}
                  <text x="233" y="253" fill="#94a3b8" fontSize="1.8">MAÎTRE D'OUVRAGE :</text>
                  <text x="233" y="258" fill="#e2e8f0" fontSize="2.6">{activeCartouche.clientName.substring(0, 24)}</text>
                  <text x="323" y="253" fill="#94a3b8" fontSize="1.8">BUREAU D'ÉTUDES :</text>
                  <text x="323" y="258" fill="#e2e8f0" fontSize="2.6">{activeCartouche.firmName.substring(0, 24)}</text>

                  {/* Auteur, Visa & Réf plan */}
                  <text x="233" y="267" fill="#94a3b8" fontSize="1.8">DESSINÉ PAR :</text>
                  <text x="233" y="272" fill="#e2e8f0" fontSize="2.4">{activeCartouche.authorName.substring(0, 16)}</text>
                  <text x="293" y="267" fill="#94a3b8" fontSize="1.8">VÉRIFIÉ (VISA) :</text>
                  <text x="293" y="272" fill="#4ade80" fontSize="2.4">{activeCartouche.verifierName.substring(0, 16)}</text>
                  <text x="353" y="267" fill="#94a3b8" fontSize="1.8">RÉF. PLAN :</text>
                  <text x="353" y="272" fill="#e2e8f0" fontSize="2.6" fontWeight="bold">{activeCartouche.drawingNumber}</text>

                  {/* Métadonnées inférieures */}
                  <text x="247" y="278" fill="#94a3b8" fontSize="1.6" textAnchor="middle">ÉCHELLE</text>
                  <text x="247" y="283" fill="#ffffff" fontSize="2.4" textAnchor="middle" fontWeight="bold">{activeCartouche.scaleText}</text>
                  <text x="280" y="278" fill="#94a3b8" fontSize="1.6" textAnchor="middle">FORMAT</text>
                  <text x="280" y="283" fill="#ffffff" fontSize="2.4" textAnchor="middle" fontWeight="bold">{activeCartouche.sheetFormat}</text>
                  <text x="312" y="278" fill="#94a3b8" fontSize="1.6" textAnchor="middle">DATE</text>
                  <text x="312" y="283" fill="#ffffff" fontSize="2.4" textAnchor="middle">{activeCartouche.dateStr}</text>
                  <text x="347" y="278" fill="#94a3b8" fontSize="1.6" textAnchor="middle">PLANCHE</text>
                  <text x="347" y="283" fill="#ffffff" fontSize="2.4" textAnchor="middle">1 / 1</text>
                  <text x="387" y="278" fill="#94a3b8" fontSize="1.6" textAnchor="middle">STATUT</text>
                  <text x="387" y="283" fill="#4ade80" fontSize="2.2" textAnchor="middle" fontWeight="bold">BON POUR EXEC</text>

                  {/* Ligne inférieure de signature */}
                  <text x="233" y="291" fill="#64748b" fontSize="1.8">
                    EUROCODES STUDIO · CONFORME EN 1992-1-1 / EN 1994-1-1 / EN 1998-1 · POLICE ARIAL NARROW
                  </text>
                </g>
              )}

              {/* Textes du Tableau Bas Gauche (Police Arial Narrow) */}
              {layerVisibility['A-TABL-NOMENCL'] && (
                <g style={{ fontFamily: "'Arial Narrow', 'Nimbus Sans Narrow', 'Helvetica Neue', Arial, sans-serif" }}>
                  <text x="28" y="230" fill="#ffffff" fontSize="2.4" fontWeight="bold">
                    NOMENCLATURE DÉTAILLÉE DES ACIERS FAÇONNÉS (EN ISO 3766)
                  </text>

                  <text x="28" y="238" fill="#94a3b8" fontSize="1.8">Rep.</text>
                  <text x="45" y="238" fill="#94a3b8" fontSize="1.8">Désignation / Rôle</text>
                  <text x="100" y="238" fill="#94a3b8" fontSize="1.8">Nb & Ø</text>
                  <text x="135" y="238" fill="#94a3b8" fontSize="1.8">Long.</text>
                  <text x="165" y="238" fill="#94a3b8" fontSize="1.8">Code ISO 3766</text>
                  <text x="202" y="238" fill="#94a3b8" fontSize="1.8">Masse</text>

                  {currentModule === 'beam' && (
                    <g>
                      {beamOutput.rebarSchedule.slice(0, 5).map((bar, i) => (
                        <g key={i}>
                          <text x="28" y={244 + i * 6.5} fill="#38bdf8" fontSize="1.9">#{i + 1}</text>
                          <text x="45" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.details || 'Armature'}</text>
                          <text x="100" y={244 + i * 6.5} fill="#ffffff" fontSize="1.9">{bar.count} HA {bar.diameter}</text>
                          <text x="135" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.unitLengthM} m</text>
                          <text x="165" y={244 + i * 6.5} fill="#94a3b8" fontSize="1.7">
                            {bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : bar.shape === 'u_frame' ? 'Code 31 (Cadre fermé)' : 'Code 00 (Droit)'}
                          </text>
                          <text x="202" y={244 + i * 6.5} fill="#4ade80" fontSize="1.9" fontWeight="bold">{bar.totalWeightKg} kg</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {currentModule === 'column' && (
                    <g>
                      {columnOutput.rebarSchedule.slice(0, 5).map((bar, i) => (
                        <g key={i}>
                          <text x="28" y={244 + i * 6.5} fill="#38bdf8" fontSize="1.9">#{i + 1}</text>
                          <text x="45" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.details.substring(0, 24)}</text>
                          <text x="100" y={244 + i * 6.5} fill="#ffffff" fontSize="1.9">{bar.count} HA {bar.diameter}</text>
                          <text x="135" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.unitLengthM} m</text>
                          <text x="165" y={244 + i * 6.5} fill="#94a3b8" fontSize="1.7">
                            {bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : bar.shape === 'u_frame' ? 'Code 31 (Cadre/Étrier)' : 'Code 00 (Droit)'}
                          </text>
                          <text x="202" y={244 + i * 6.5} fill="#4ade80" fontSize="1.9" fontWeight="bold">{bar.totalWeightKg} kg</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {currentModule === 'slab' && (
                    <g>
                      {slabOutput.rebarSchedule.slice(0, 5).map((bar, i) => (
                        <g key={i}>
                          <text x="28" y={244 + i * 6.5} fill="#38bdf8" fontSize="1.9">#{i + 1}</text>
                          <text x="45" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.details.substring(0, 24)}</text>
                          <text x="100" y={244 + i * 6.5} fill="#ffffff" fontSize="1.9">{bar.count} HA {bar.diameter}</text>
                          <text x="135" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.unitLengthM} m</text>
                          <text x="165" y={244 + i * 6.5} fill="#94a3b8" fontSize="1.7">
                            {bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : 'Code 00 (Droit)'}
                          </text>
                          <text x="202" y={244 + i * 6.5} fill="#4ade80" fontSize="1.9" fontWeight="bold">{bar.totalWeightKg} kg</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {currentModule === 'footing' && (
                    <g>
                      {footingOutput.rebarSchedule.slice(0, 5).map((bar, i) => (
                        <g key={i}>
                          <text x="28" y={244 + i * 6.5} fill="#38bdf8" fontSize="1.9">#{i + 1}</text>
                          <text x="45" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.details.substring(0, 24)}</text>
                          <text x="100" y={244 + i * 6.5} fill="#ffffff" fontSize="1.9">{bar.count} HA {bar.diameter}</text>
                          <text x="135" y={244 + i * 6.5} fill="#e2e8f0" fontSize="1.8">{bar.unitLengthM} m</text>
                          <text x="165" y={244 + i * 6.5} fill="#94a3b8" fontSize="1.7">
                            {bar.shape === 'hooked' ? 'Code 12 (Crochet 90°)' : 'Code 00 (Droit)'}
                          </text>
                          <text x="202" y={244 + i * 6.5} fill="#4ade80" fontSize="1.9" fontWeight="bold">{bar.totalWeightKg} kg</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {currentModule === 'composite' && (
                    <g fontSize="2.0" fill="#e2e8f0">
                      <text x="28" y="244" fill="#4ade80">• Résistance Mpl,Rd = {compositeOutput.plasticResistanceMplRdKNm} kNm (MEd = {compositeInput.momentMEd} kNm)</text>
                      <text x="28" y="252">• Connexion : Eta = {compositeOutput.degreeOfConnectionEta} ({compositeOutput.degreeOfConnectionEta >= 1.0 ? 'Complète' : 'Partielle'})</text>
                      <text x="28" y="260" fill="#38bdf8">• Goujons Nelson : ~{compositeOutput.totalStudsRequiredPerHalfSpan * 2} goujons (s = {compositeOutput.spacingCalculatedMm} mm)</text>
                      <text x="28" y="268">• Aciers anti-fendage : {compositeOutput.providedTransverseRebars}</text>
                      <text x="28" y="276" fill="#4ade80">• Avis constructif : {compositeOutput.constructiveAdvice}</text>
                    </g>
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
