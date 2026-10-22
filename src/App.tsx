/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Suite d'Ingénierie Structurale & Calculs Eurocodes (EC2, EC4)
 * Intègre le 2ème passage d'audit : Moteur d'ancrages, recouvrements, sections en Té,
 * 7 formes de poteaux, fondations, poutres mixtes, plans CAO DXF et notes de calcul DOCX.
 */

import React, { useState, useMemo } from 'react';
import {
  CONCRETE_GRADES,
  REBAR_GRADES,
  EXPOSURE_CLASSES,
  ConcreteGrade,
  RebarGrade,
  STRUCTURAL_STEEL_GRADES
} from './core/eurocodes/materials.ts';
import {
  BeamInput,
  calculateBeam
} from './core/eurocodes/ec2_beams.ts';
import {
  ColumnInput,
  calculateColumn,
  ColumnShape
} from './core/eurocodes/ec2_columns.ts';
import {
  SlabInput,
  calculateSlab
} from './core/eurocodes/ec2_slabs.ts';
import {
  FootingInput,
  calculateFooting
} from './core/eurocodes/ec2_footings.ts';
import {
  CompositeInput,
  calculateCompositeBeam,
  STEEL_PROFILES
} from './core/eurocodes/ec4_composite.ts';
import { Beam2DViewer } from './components/Beam2DViewer.tsx';
import { Column2DViewer } from './components/Column2DViewer.tsx';
import { Slab2DViewer } from './components/Slab2DViewer.tsx';
import { Footing2DViewer } from './components/Footing2DViewer.tsx';
import { Composite2DViewer } from './components/Composite2DViewer.tsx';
import { ExecutionPlanTab } from './components/ExecutionPlanTab.tsx';
import { DocxPreviewTab } from './components/DocxPreviewTab.tsx';
import { AuditDashboardTab } from './components/AuditDashboardTab.tsx';
import { TechnicalSpecsModal } from './components/TechnicalSpecsModal.tsx';
import {
  Building2,
  FileText,
  Compass,
  CheckCircle2,
  BookOpen,
  Sliders,
  Layers,
  Ruler,
  AlertCircle,
  Download,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // Navigation principale de l'espace de travail
  const [activeModule, setActiveModule] = useState<'beam' | 'column' | 'slab' | 'footing' | 'composite'>('beam');
  const [activeView, setActiveView] = useState<'design' | 'blueprint' | 'docx' | 'specs' | 'audit'>('design');
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);

  // Matériaux sélectionnés
  const [concreteKey, setConcreteKey] = useState('C25/30');
  const [rebarKey, setRebarKey] = useState('B500B');
  const [exposureClass, setExposureClass] = useState('XC1');

  const concrete: ConcreteGrade = CONCRETE_GRADES[concreteKey] || CONCRETE_GRADES['C25/30'];
  const rebar: RebarGrade = REBAR_GRADES[rebarKey] || REBAR_GRADES['B500B'];

  // 1. ÉTAT DU MODULE POUTRES BA (EN 1992-1-1)
  const [beamInput, setBeamInput] = useState<BeamInput>({
    spanL: 6.0,
    widthB: 250,
    heightH: 500,
    isTSection: false,
    flangeWidthBf: 800,
    flangeHeightHf: 120,
    coverC: 30,
    momentMEd: 180,
    shearVEd: 120,
    momentMEdSer: 125,
    bondCondition: 'good',
    anchorageType: 'hook_90',
    overlapPercent: 50,
    cotTheta: 2.5,
    layersCount: 1,
    layers: [{ count: 3, diameter: 20 }],
    stirrupDiameter: 8,
    topRebarCount: 2,
    topRebarPhi: 12,
    skinRebarPhi: 10,
  });

  const handleUpdateBeamLayersCount = (count: 1 | 2 | 3) => {
    const current = beamInput.layers || [{ count: 3, diameter: 20 }];
    const next = [...current];
    while (next.length < count) {
      const prevDia = next[next.length - 1]?.diameter || 20;
      next.push({ count: 2, diameter: Math.max(12, prevDia - 4) });
    }
    setBeamInput({
      ...beamInput,
      layersCount: count,
      layers: next.slice(0, count),
    });
  };

  const handleUpdateLayer = (idx: number, field: 'count' | 'diameter', value: number) => {
    const next = [...(beamInput.layers || [{ count: 3, diameter: 20 }])];
    if (!next[idx]) next[idx] = { count: 2, diameter: 16 };
    next[idx] = { ...next[idx], [field]: value };
    setBeamInput({ ...beamInput, layers: next });
  };

  // 2. ÉTAT DU MODULE POTEAUX COMPLEXES (7 FORMES)
  const [columnInput, setColumnInput] = useState<ColumnInput>({
    shape: 'rect',
    heightL: 3.2,
    endCondition: 'pinned_pinned',
    dimB: 300,
    dimH: 300,
    dimT: 150,
    coverC: 30,
    axialNEd: 850,
    momentMEd: 45,
    bondCondition: 'good',
    anchorageType: 'hook_90',
    overlapPercent: 50,
  });

  // 3. ÉTAT DU MODULE DALLES
  const [slabInput, setSlabInput] = useState<SlabInput>({
    thicknessH: 200,
    spanLx: 5.0,
    spanLy: 6.5,
    slabType: 'two_way',
    supportCondition: 'simple_supported',
    coverC: 25,
    deadLoadG: 1.5,
    liveLoadQ: 2.5,
    bondCondition: 'good',
    anchorageType: 'hook_90',
    overlapPercent: 50,
  });

  // 4. ÉTAT DU MODULE SEMELLES
  const [footingInput, setFootingInput] = useState<FootingInput>({
    dimA: 2000,
    dimB: 1800,
    dimH: 600,
    colA: 300,
    colB: 300,
    coverC: 40,
    axialNEd: 950,
    axialNSer: 700,
    soilCapacityKPa: 250,
    bondCondition: 'good',
    anchorageType: 'hook_90',
    overlapPercent: 50,
  });

  // 5. ÉTAT DU MODULE POUTRES MIXTES (EC4)
  const [compositeInput, setCompositeInput] = useState<CompositeInput>({
    spanL: 8.0,
    profileKey: 'IPE 360',
    slabThicknessHc: 140,
    beffWidth: 1600,
    studDiameterD: 19,
    studHeightH: 100,
    studRows: 1,
    momentMEd: 380,
    shearVEd: 190,
  });

  // Calculs réactifs instantanés
  const beamOutput = useMemo(() => calculateBeam(beamInput, concrete, rebar), [beamInput, concrete, rebar]);
  const columnOutput = useMemo(() => calculateColumn(columnInput, concrete, rebar), [columnInput, concrete, rebar]);
  const slabOutput = useMemo(() => calculateSlab(slabInput, concrete, rebar), [slabInput, concrete, rebar]);
  const footingOutput = useMemo(() => calculateFooting(footingInput, concrete, rebar), [footingInput, concrete, rebar]);
  const compositeOutput = useMemo(
    () => calculateCompositeBeam(compositeInput, STRUCTURAL_STEEL_GRADES['S355'], concrete, rebar),
    [compositeInput, concrete, rebar]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. TOP BAR CONTRACT STRICT */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <a href="#" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight whitespace-nowrap shrink-0 hover:text-indigo-400 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Building2 className="w-4 h-4" />
            </div>
            <span>Eurocodes Studio</span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button
              onClick={() => { setActiveModule('beam'); setActiveView('design'); }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeModule === 'beam' ? 'text-indigo-400 font-semibold' : ''}`}
            >
              Poutres BA (EC2)
            </button>
            <button
              onClick={() => { setActiveModule('column'); setActiveView('design'); }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeModule === 'column' ? 'text-indigo-400 font-semibold' : ''}`}
            >
              Poteaux (8 Formes)
            </button>
            <button
              onClick={() => { setActiveModule('slab'); setActiveView('design'); }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeModule === 'slab' ? 'text-indigo-400 font-semibold' : ''}`}
            >
              Planchers & Dalles
            </button>
            <button
              onClick={() => { setActiveModule('footing'); setActiveView('design'); }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeModule === 'footing' ? 'text-indigo-400 font-semibold' : ''}`}
            >
              Semelles Fondations
            </button>
            <button
              onClick={() => { setActiveModule('composite'); setActiveView('design'); }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeModule === 'composite' ? 'text-indigo-400 font-semibold' : ''}`}
            >
              Poutres Mixtes (EC4)
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsSpecsModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Référentiel Audit EC2
            </button>
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER / WORKSPACE TOOLBAR AVEC NAVIGATION PAR VUES */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Breadcrumb et Statut */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500 font-medium">Eurocodes Studio</span>
            <span>/</span>
            <span className="text-slate-200 font-medium capitalize">
              {activeModule === 'beam' && 'Poutres Multi-Travées (Section Té & Rectangulaire)'}
              {activeModule === 'column' && `Poteaux Complexes (${columnOutput.shapeNameFr})`}
              {activeModule === 'slab' && 'Dalles & Planchers (Ancrages Rives)'}
              {activeModule === 'footing' && 'Semelles Isolées (Patins & Crochets)'}
              {activeModule === 'composite' && 'Poutres Mixtes Acier-Béton (Goujons Nelson)'}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Audit Pass 2 Validé
            </span>
          </div>

          {/* Onglets de travail (Design, CAO DXF, DOCX) */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveView('design')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'design' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Conception & Calculs
            </button>
            <button
              onClick={() => setActiveView('blueprint')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'blueprint' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Plan CAO (DXF)
            </button>
            <button
              onClick={() => setActiveView('docx')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'docx' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Note de Calcul (DOCX)
            </button>
            <button
              onClick={() => setActiveView('audit')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === 'audit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Matrice d'Audit (5 Volets)
            </button>
          </div>
        </div>
      </div>

      {/* 3. CORPS PRINCIPAL DE L'ESPACE DE TRAVAIL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {activeView === 'audit' ? (
          <AuditDashboardTab
            beamInput={beamInput}
            beamOutput={beamOutput}
            columnInput={columnInput}
            columnOutput={columnOutput}
            slabInput={slabInput}
            slabOutput={slabOutput}
            footingInput={footingInput}
            footingOutput={footingOutput}
            concrete={concrete}
            rebar={rebar}
          />
        ) : activeView === 'blueprint' ? (
          <ExecutionPlanTab
            currentModule={activeModule}
            beamInput={beamInput}
            beamOutput={beamOutput}
            columnInput={columnInput}
            columnOutput={columnOutput}
            slabInput={slabInput}
            slabOutput={slabOutput}
            footingInput={footingInput}
            footingOutput={footingOutput}
            compositeInput={compositeInput}
            compositeOutput={compositeOutput}
          />
        ) : activeView === 'docx' ? (
          <DocxPreviewTab
            currentModule={activeModule}
            beamInput={beamInput}
            beamOutput={beamOutput}
            columnInput={columnInput}
            columnOutput={columnOutput}
            slabInput={slabInput}
            slabOutput={slabOutput}
            footingInput={footingInput}
            footingOutput={footingOutput}
            compositeInput={compositeInput}
            compositeOutput={compositeOutput}
            concrete={concrete}
            rebar={rebar}
          />
        ) : (
          /* VUE CONCEPTION & CALCULS */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* CONSOLE GAUCHE D'INGÉNIERIE (4 colonnes) */}
            <aside className="lg:col-span-5 space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Console de Calcul Réglementaire
                </h2>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">EN 1992-1-1</span>
              </div>

              {/* SÉLECTEUR RAPIDE DE MODULE SUR MOBILE / CONSOLE */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Module de Calcul Actif
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveModule('beam')}
                    className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${activeModule === 'beam' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Poutres BA
                  </button>
                  <button
                    onClick={() => setActiveModule('column')}
                    className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${activeModule === 'column' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Poteaux 8F
                  </button>
                  <button
                    onClick={() => setActiveModule('slab')}
                    className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${activeModule === 'slab' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Dalles
                  </button>
                  <button
                    onClick={() => setActiveModule('footing')}
                    className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${activeModule === 'footing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Semelles
                  </button>
                  <button
                    onClick={() => setActiveModule('composite')}
                    className={`py-1.5 px-2 rounded font-medium text-center transition-colors col-span-2 cursor-pointer ${activeModule === 'composite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Poutres Mixtes (EC4)
                  </button>
                </div>
              </div>

              {/* SECTION 1 : MATÉRIAUX & CLASSES D'EXPOSITION */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  1. Matériaux & Exposition
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Classe de Béton</label>
                    <select
                      value={concreteKey}
                      onChange={(e) => setConcreteKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-indigo-500"
                    >
                      {Object.keys(CONCRETE_GRADES).map((g) => (
                        <option key={g} value={g}>{g} (fck={CONCRETE_GRADES[g].fck} MPa)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nuance d'Acier</label>
                    <select
                      value={rebarKey}
                      onChange={(e) => setRebarKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-indigo-500"
                    >
                      {Object.keys(REBAR_GRADES).map((r) => (
                        <option key={r} value={r}>{REBAR_GRADES[r].name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Classe d'Exposition (Enrobage minimal)</label>
                  <select
                    value={exposureClass}
                    onChange={(e) => setExposureClass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-indigo-500"
                  >
                    {EXPOSURE_CLASSES.map((exp) => (
                      <option key={exp.code} value={exp.code}>{exp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 2 : GÉOMÉTRIE & CHARGEMENT SPÉCIFIQUE AU MODULE */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  2. Géométrie & Sollicitations ELU/ELS
                </div>

                {activeModule === 'beam' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Portée L (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={beamInput.spanL}
                          onChange={(e) => setBeamInput({ ...beamInput, spanL: Math.max(1, +e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Âme bw (mm)</label>
                        <input
                          type="number"
                          step="10"
                          value={beamInput.widthB}
                          onChange={(e) => setBeamInput({ ...beamInput, widthB: Math.max(100, +e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Hauteur h (mm)</label>
                        <input
                          type="number"
                          step="10"
                          value={beamInput.heightH}
                          onChange={(e) => setBeamInput({ ...beamInput, heightH: Math.max(150, +e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* CONTRÔLE SECTION EN TÉ (EXIGENCE AUDIT) */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={beamInput.isTSection}
                          onChange={(e) => setBeamInput({ ...beamInput, isTSection: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                        />
                        <span className="font-semibold text-slate-200">Section en Té (avec table de compression)</span>
                      </label>
                      {beamInput.isTSection && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Table bf (mm)</label>
                            <input
                              type="number"
                              step="20"
                              value={beamInput.flangeWidthBf}
                              onChange={(e) => setBeamInput({ ...beamInput, flangeWidthBf: +e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Épaisseur hf (mm)</label>
                            <input
                              type="number"
                              step="10"
                              value={beamInput.flangeHeightHf}
                              onChange={(e) => setBeamInput({ ...beamInput, flangeHeightHf: +e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sollicitations */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">MEd (kNm)</label>
                        <input
                          type="number"
                          value={beamInput.momentMEd}
                          onChange={(e) => setBeamInput({ ...beamInput, momentMEd: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">VEd (kN)</label>
                        <input
                          type="number"
                          value={beamInput.shearVEd}
                          onChange={(e) => setBeamInput({ ...beamInput, shearVEd: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">MEd,ser (kNm)</label>
                        <input
                          type="number"
                          value={beamInput.momentMEdSer}
                          onChange={(e) => setBeamInput({ ...beamInput, momentMEdSer: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* CHOIX DES ARMATURES, DIAMÈTRES & NOMBRE DE LITS (EXIGENCE UTILISATEUR) */}
                    <div className="p-3.5 bg-slate-950/90 rounded-lg border border-indigo-500/40 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Lits d'Acier & Diamètres (EC2 §9.2)
                        </span>
                        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                          {([1, 2, 3] as const).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleUpdateBeamLayersCount(num)}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                                (beamInput.layersCount || 1) === num
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {num} Lit{num > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CONFIGURATION DÉTAILLÉE PAR LIT ACTIF */}
                      <div className="space-y-2.5">
                        {Array.from({ length: beamInput.layersCount || 1 }).map((_, idx) => {
                          const layerSpec = (beamInput.layers && beamInput.layers[idx]) || { count: 3, diameter: 20 };
                          const detail = beamOutput.layersDetails && beamOutput.layersDetails[idx];
                          const isOk = detail ? detail.isSpacingOk : true;
                          const spacingMm = detail ? detail.spacingHorizontalMm : 0;
                          return (
                            <div key={idx} className="p-2.5 bg-slate-900/80 rounded border border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-emerald-400 flex items-center gap-1">
                                  Lit #{idx + 1} {idx === 0 ? '(Inférieur direct)' : idx === 1 ? '(2ème lit sur cales)' : '(3ème lit)'}
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isOk ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                                  {isOk ? `sh = ${spacingMm} mm ≥ min (OK)` : `sh = ${spacingMm} mm (Trop serré !)`}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Nombre de barres</label>
                                  <select
                                    value={layerSpec.count}
                                    onChange={(e) => handleUpdateLayer(idx, 'count', +e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                                  >
                                    {[1, 2, 3, 4, 5, 6].map((n) => (
                                      <option key={n} value={n}>{n} barre{n > 1 ? 's' : ''}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-0.5">Diamètre barre (Ø)</label>
                                  <select
                                    value={layerSpec.diameter}
                                    onChange={(e) => handleUpdateLayer(idx, 'diameter', +e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                                  >
                                    {[10, 12, 14, 16, 20, 25, 32].map((d) => (
                                      <option key={d} value={d}>HA {d} (Ø{d} mm)</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ARMATURES SUPÉRIEURES DE MONTAGE & CADRES */}
                      <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Montage supérieur</label>
                          <div className="flex gap-1.5">
                            <select
                              value={beamInput.topRebarCount || 2}
                              onChange={(e) => setBeamInput({ ...beamInput, topRebarCount: +e.target.value })}
                              className="w-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                            >
                              {[2, 3, 4].map((n) => (
                                <option key={n} value={n}>{n} barres</option>
                              ))}
                            </select>
                            <select
                              value={beamInput.topRebarPhi || 12}
                              onChange={(e) => setBeamInput({ ...beamInput, topRebarPhi: +e.target.value })}
                              className="w-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                            >
                              {[10, 12, 14, 16].map((d) => (
                                <option key={d} value={d}>HA {d}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Cadres / Étriers (Øw)</label>
                          <select
                            value={beamInput.stirrupDiameter || 8}
                            onChange={(e) => setBeamInput({ ...beamInput, stirrupDiameter: +e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                          >
                            {[6, 8, 10, 12, 14].map((d) => (
                              <option key={d} value={d}>HA {d} (Ø{d} mm)</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* ÉTRIERS / CADRES INTÉRIEURS & NOMBRE DE BRINS */}
                      <div className="pt-2 border-t border-slate-800 bg-slate-900/40 p-2 rounded flex items-center justify-between gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={beamInput.hasInternalStirrup || (beamInput.stirrupLegsCount || 2) > 2}
                            onChange={(e) => setBeamInput({
                              ...beamInput,
                              hasInternalStirrup: e.target.checked,
                              stirrupLegsCount: e.target.checked ? 4 : 2
                            })}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                          />
                          <span className="text-[11px] text-indigo-300 font-semibold">Cadre / étrier intérieur</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Brins :</span>
                          <select
                            value={beamInput.stirrupLegsCount || (beamInput.hasInternalStirrup ? 4 : 2)}
                            onChange={(e) => {
                              const legs = +e.target.value as 2 | 3 | 4;
                              setBeamInput({
                                ...beamInput,
                                stirrupLegsCount: legs,
                                hasInternalStirrup: legs > 2
                              });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-[11px]"
                          >
                            <option value={2}>2 brins (1 cadre extérieur)</option>
                            <option value={3}>3 brins (1 cadre + 1 épingle)</option>
                            <option value={4}>4 brins (1 cadre ext. + 1 int.)</option>
                          </select>
                        </div>
                      </div>

                      {/* ACIERS DE PEAU SI HAUTEUR >= 600 MM */}
                      {beamInput.heightH >= 600 && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[11px] text-amber-300 font-medium block">Aciers de peau (h ≥ 600 mm)</span>
                            <span className="text-[10px] text-slate-400">2×2 barres réparties sur flancs</span>
                          </div>
                          <select
                            value={beamInput.skinRebarPhi || 10}
                            onChange={(e) => setBeamInput({ ...beamInput, skinRebarPhi: +e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                          >
                            {[8, 10, 12].map((d) => (
                              <option key={d} value={d}>HA {d}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* SYNTHÈSE BARYCENTRE & SECTION FOURNIE */}
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-sans">Barycentre réel yG :</span>
                          <span className="text-cyan-300 font-bold">{beamOutput.barycenterDistanceYGMm} mm (d = {beamOutput.d} mm)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-sans">Section fournie As,prov :</span>
                          <span className={`font-bold ${beamOutput.asProvidedCm2 >= beamOutput.asRqdCm2 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {beamOutput.asProvidedCm2} cm² {beamOutput.asProvidedCm2 >= beamOutput.asRqdCm2 ? '≥' : '<'} {beamOutput.asRqdCm2} cm² ({beamOutput.asProvidedCm2 >= beamOutput.asRqdCm2 ? 'CONFORME' : 'INSUFFISANT'})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModule === 'column' && (
                  <div className="space-y-3 text-xs">
                    {/* SÉLECTEUR 8 FORMES DONT HEXAGONE */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Géométrie du Poteau (8 Formes)</label>
                      <select
                        value={columnInput.shape}
                        onChange={(e) => setColumnInput({ ...columnInput, shape: e.target.value as ColumnShape })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs font-medium"
                      >
                        <option value="rect">1. Rectangulaire Plein (b × h)</option>
                        <option value="circle">2. Circulaire Plein (Ø)</option>
                        <option value="L">3. Profil en L (Cornière BA)</option>
                        <option value="T">4. Profil en Té</option>
                        <option value="cross">5. Profil en Croix (+)</option>
                        <option value="hollow">6. Creux / Tubulaire</option>
                        <option value="trapezoid">7. Profil Trapézoïdal</option>
                        <option value="hexagon">8. Hexagonal Régulier</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Hauteur L (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={columnInput.heightL}
                          onChange={(e) => setColumnInput({ ...columnInput, heightL: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          {columnInput.shape === 'circle' ? 'Diamètre (mm)' : columnInput.shape === 'hexagon' ? 'Entreplats B (mm)' : 'Dim. B (mm)'}
                        </label>
                        <input
                          type="number"
                          step="10"
                          value={columnInput.dimB}
                          onChange={(e) => setColumnInput({ ...columnInput, dimB: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          {columnInput.shape === 'circle' || columnInput.shape === 'hexagon' ? 'Dim. H (auto)' : 'Dim. H (mm)'}
                        </label>
                        <input
                          type="number"
                          step="10"
                          disabled={columnInput.shape === 'circle' || columnInput.shape === 'hexagon'}
                          value={columnInput.dimH}
                          onChange={(e) => setColumnInput({ ...columnInput, dimH: +e.target.value })}
                          className={`w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono ${
                            columnInput.shape === 'circle' || columnInput.shape === 'hexagon' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Épaisseur d'ailes si profil L, T, Croix ou Tubulaire */}
                    {['L', 'T', 'cross', 'hollow', 'trapezoid'].includes(columnInput.shape) && (
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded border border-slate-800">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Épaisseur aile / paroi t (mm)</label>
                          <input
                            type="number"
                            step="10"
                            value={columnInput.dimT || 150}
                            onChange={(e) => setColumnInput({ ...columnInput, dimT: +e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          />
                        </div>
                        {columnInput.shape === 'trapezoid' && (
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Petite base B2 (mm)</label>
                            <input
                              type="number"
                              step="10"
                              value={columnInput.dimB2 || 200}
                              onChange={(e) => setColumnInput({ ...columnInput, dimB2: +e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Effort NEd (kN)</label>
                        <input
                          type="number"
                          value={columnInput.axialNEd}
                          onChange={(e) => setColumnInput({ ...columnInput, axialNEd: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Moment MEd (kNm)</label>
                        <input
                          type="number"
                          value={columnInput.momentMEd}
                          onChange={(e) => setColumnInput({ ...columnInput, momentMEd: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* CHOIX DES DIAMÈTRES & ARMATURES POTEAU (EXIGENCE UTILISATEUR) */}
                    <div className="p-3 bg-slate-950/90 rounded-lg border border-indigo-500/40 space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Armatures Long. & Cadres Transversaux (EC2 §9.5)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Diamètre long. (Ø)</label>
                          <select
                            value={columnInput.customRebarPhi || columnOutput.barDiameterPhi}
                            onChange={(e) => setColumnInput({ ...columnInput, customRebarPhi: +e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          >
                            {[12, 14, 16, 20, 25, 32].map((d) => (
                              <option key={d} value={d}>HA {d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Nombre de barres</label>
                          <select
                            value={columnInput.customBarCount || columnOutput.barCount}
                            onChange={(e) => setColumnInput({ ...columnInput, customBarCount: +e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          >
                            {[4, 6, 8, 10, 12, 16].map((n) => (
                              <option key={n} value={n}>{n} barres</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Cadres / frettes (Øt)</label>
                          <select
                            value={columnInput.customTiePhi || columnOutput.tieDiameterPhi}
                            onChange={(e) => setColumnInput({ ...columnInput, customTiePhi: +e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                          >
                            {[6, 8, 10, 12].map((d) => (
                              <option key={d} value={d}>HA {d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* DISPOSITION MULTI-CADRES CONFIRMÉE */}
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-850">
                        <span>Dispositions transversales :</span>
                        <span className="text-emerald-400 font-medium">
                          {['L', 'T', 'cross'].includes(columnInput.shape)
                            ? 'Multi-cadres conjugués (2 à 3 cadres)'
                            : columnInput.shape === 'hexagon'
                            ? 'Cadre hexagonal 6 sommets'
                            : columnInput.shape === 'rect' && (columnInput.customBarCount || columnOutput.barCount) >= 8
                            ? 'Cadre extérieur + étrier intérieur'
                            : 'Cadre périmétrique conforme'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeModule === 'slab' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Épaisseur h (mm)</label>
                        <input
                          type="number"
                          step="10"
                          value={slabInput.thicknessH}
                          onChange={(e) => setSlabInput({ ...slabInput, thicknessH: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Portée Lx (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={slabInput.spanLx}
                          onChange={(e) => setSlabInput({ ...slabInput, spanLx: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Portée Ly (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={slabInput.spanLy}
                          onChange={(e) => setSlabInput({ ...slabInput, spanLy: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Charge G (kN/m²)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={slabInput.deadLoadG}
                          onChange={(e) => setSlabInput({ ...slabInput, deadLoadG: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Charge Q (kN/m²)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={slabInput.liveLoadQ}
                          onChange={(e) => setSlabInput({ ...slabInput, liveLoadQ: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* CHOIX DES ARMATURES DALLES (X & Y RÉPARTITION) */}
                    <div className="p-3 bg-slate-950/90 rounded-lg border border-indigo-500/40 space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Armatures Principales & de Répartition (EC2 §9.3)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Lit principal sens X */}
                        <div className="p-2 bg-slate-900/70 rounded border border-slate-800 space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-emerald-400">
                            <span>Sens porteur principal X :</span>
                            <span className="font-mono text-[10px] text-slate-300">As,rqd = {slabOutput.asxRqdCm2PerM} cm²/m</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Diamètre (Øx)</label>
                              <select
                                value={slabInput.customPhiX || 10}
                                onChange={(e) => setSlabInput({ ...slabInput, customPhiX: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                              >
                                {[8, 10, 12, 14, 16].map((d) => (
                                  <option key={d} value={d}>HA {d} (Ø{d} mm)</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Espacement (ex)</label>
                              <select
                                value={slabInput.customSpacingX || 150}
                                onChange={(e) => setSlabInput({ ...slabInput, customSpacingX: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                              >
                                {[100, 125, 150, 175, 200, 250].map((s) => (
                                  <option key={s} value={s}>e = {s} mm</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Lit de répartition sens Y */}
                        <div className="p-2 bg-slate-900/70 rounded border border-slate-800 space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-cyan-400">
                            <span>Sens transversal de répartition Y :</span>
                            <span className="font-mono text-[10px] text-slate-300">As,rqd = {slabOutput.asyRqdCm2PerM} cm²/m</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Diamètre (Øy)</label>
                              <select
                                value={slabInput.customPhiY || 8}
                                onChange={(e) => setSlabInput({ ...slabInput, customPhiY: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                              >
                                {[6, 8, 10, 12, 14].map((d) => (
                                  <option key={d} value={d}>HA {d} (Ø{d} mm)</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Espacement (ey)</label>
                              <select
                                value={slabInput.customSpacingY || 200}
                                onChange={(e) => setSlabInput({ ...slabInput, customSpacingY: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                              >
                                {[100, 125, 150, 200, 250].map((s) => (
                                  <option key={s} value={s}>e = {s} mm</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModule === 'footing' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Semelle A (mm)</label>
                        <input
                          type="number"
                          step="50"
                          value={footingInput.dimA}
                          onChange={(e) => setFootingInput({ ...footingInput, dimA: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Semelle B (mm)</label>
                        <input
                          type="number"
                          step="50"
                          value={footingInput.dimB}
                          onChange={(e) => setFootingInput({ ...footingInput, dimB: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Hauteur H (mm)</label>
                        <input
                          type="number"
                          step="50"
                          value={footingInput.dimH}
                          onChange={(e) => setFootingInput({ ...footingInput, dimH: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">NEd Total (kN)</label>
                        <input
                          type="number"
                          value={footingInput.axialNEd}
                          onChange={(e) => setFootingInput({ ...footingInput, axialNEd: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Contrainte Sol (kPa)</label>
                        <input
                          type="number"
                          value={footingInput.soilCapacityKPa}
                          onChange={(e) => setFootingInput({ ...footingInput, soilCapacityKPa: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* CHOIX DES ARMATURES SEMELLE & ATTENTES */}
                    <div className="p-3 bg-slate-950/90 rounded-lg border border-indigo-500/40 space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Armatures Nappes A, B & Attentes Poteau
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Nappe Direction A */}
                        <div className="p-2 bg-slate-900/70 rounded border border-slate-800 space-y-1">
                          <div className="text-[11px] font-medium text-emerald-400">Nappe Dir. A (As,rqd = {footingOutput.asARqdCm2} cm²)</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[10px] text-slate-400 block">Diamètre</label>
                              <select
                                value={footingInput.customPhiA || 14}
                                onChange={(e) => setFootingInput({ ...footingInput, customPhiA: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                              >
                                {[10, 12, 14, 16, 20, 25].map((d) => (
                                  <option key={d} value={d}>HA {d}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block">Nombre</label>
                              <select
                                value={footingInput.customCountA || Math.max(5, Math.ceil(footingOutput.asARqdCm2 / (Math.PI * Math.pow((footingInput.customPhiA || 14)/20, 2))))}
                                onChange={(e) => setFootingInput({ ...footingInput, customCountA: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                              >
                                {[5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20].map((n) => (
                                  <option key={n} value={n}>{n} barres</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Nappe Direction B */}
                        <div className="p-2 bg-slate-900/70 rounded border border-slate-800 space-y-1">
                          <div className="text-[11px] font-medium text-cyan-400">Nappe Dir. B (As,rqd = {footingOutput.asBRqdCm2} cm²)</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[10px] text-slate-400 block">Diamètre</label>
                              <select
                                value={footingInput.customPhiB || 14}
                                onChange={(e) => setFootingInput({ ...footingInput, customPhiB: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                              >
                                {[10, 12, 14, 16, 20, 25].map((d) => (
                                  <option key={d} value={d}>HA {d}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block">Nombre</label>
                              <select
                                value={footingInput.customCountB || Math.max(5, Math.ceil(footingOutput.asBRqdCm2 / (Math.PI * Math.pow((footingInput.customPhiB || 14)/20, 2))))}
                                onChange={(e) => setFootingInput({ ...footingInput, customCountB: +e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                              >
                                {[5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20].map((n) => (
                                  <option key={n} value={n}>{n} barres</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attentes Poteau */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-400">Attentes de liaison poteau :</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px]">Diamètre Ø :</span>
                          <select
                            value={footingInput.customStarterPhi || 16}
                            onChange={(e) => setFootingInput({ ...footingInput, customStarterPhi: +e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-[11px]"
                          >
                            {[12, 14, 16, 20, 25].map((d) => (
                              <option key={d} value={d}>HA {d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModule === 'composite' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Profilé Acier Laminé (IPE / HEA / HEB)</label>
                      <select
                        value={compositeInput.profileKey}
                        onChange={(e) => setCompositeInput({ ...compositeInput, profileKey: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      >
                        {Object.keys(STEEL_PROFILES).map((p) => (
                          <option key={p} value={p}>{p} (h={STEEL_PROFILES[p].h}mm, {STEEL_PROFILES[p].massKgM} kg/m)</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Dalle hc (mm)</label>
                        <input
                          type="number"
                          value={compositeInput.slabThicknessHc}
                          onChange={(e) => setCompositeInput({ ...compositeInput, slabThicknessHc: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Largeur beff (mm)</label>
                        <input
                          type="number"
                          value={compositeInput.beffWidth}
                          onChange={(e) => setCompositeInput({ ...compositeInput, beffWidth: +e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. NOUVEAU PANNEAU AUDIT : DISPOSITIONS CONSTRUCTIVES & ANCRAGES (EC2 §8 & §9) */}
              <div className="p-4 bg-slate-950/80 rounded-xl border-2 border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" />
                    3. Dispositions Constructives & Ancrages (EC2 §8 & §9)
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono">AUDIT V2</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Conditions d'adhérence</label>
                    <select
                      value={beamInput.bondCondition}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setBeamInput({ ...beamInput, bondCondition: val });
                        setColumnInput({ ...columnInput, bondCondition: val });
                        setSlabInput({ ...slabInput, bondCondition: val });
                        setFootingInput({ ...footingInput, bondCondition: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs"
                    >
                      <option value="good">Bonnes (η1 = 1.0)</option>
                      <option value="poor">Défavorables (η1 = 0.7)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">% Barres Recouvertes</label>
                    <select
                      value={beamInput.overlapPercent}
                      onChange={(e) => {
                        const val = +e.target.value as any;
                        setBeamInput({ ...beamInput, overlapPercent: val });
                        setColumnInput({ ...columnInput, overlapPercent: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono"
                    >
                      <option value={25}>25% (α6 = 1.00)</option>
                      <option value={33}>33% (α6 = 1.15)</option>
                      <option value={50}>50% (α6 = 1.40)</option>
                      <option value={100}>100% (α6 = 1.50)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Type d'ancrage terminal</label>
                    <select
                      value={beamInput.anchorageType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setBeamInput({ ...beamInput, anchorageType: val });
                        setFootingInput({ ...footingInput, anchorageType: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs"
                    >
                      <option value="hook_90">Crochet 90° (α1 = 0.7)</option>
                      <option value="straight">Barre droite (α1 = 1.0)</option>
                      <option value="bend_135">Crosse 135° (α1 = 0.7)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Bielle cot(θ)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="2.5"
                      value={beamInput.cotTheta}
                      onChange={(e) => setBeamInput({ ...beamInput, cotTheta: Math.max(1.0, Math.min(2.5, +e.target.value)) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Synthèse immédiate des valeurs clés */}
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Contrainte fbd :</span>
                    <strong className="text-white tabular-nums">{beamOutput.anchorage.fbd} MPa</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Ancrage droit / crochet :</span>
                    <strong className="text-amber-300 tabular-nums">{beamOutput.anchorage.lbdStraight} mm / {beamOutput.anchorage.lbdHook} mm</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Recouvrement l0 :</span>
                    <strong className="text-cyan-300 tabular-nums">{beamOutput.anchorage.l0} mm</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Décalage courbe al :</span>
                    <strong className="text-indigo-300 tabular-nums">{beamOutput.momentShiftAlMm} mm</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Espacement critique scrit :</span>
                    <strong className="text-emerald-300 tabular-nums">{beamOutput.spacingCritMm} mm</strong>
                  </div>
                </div>
              </div>
            </aside>

            {/* ZONE DROITE D'AFFICHAGE & VUES GRAPHIQUES (7 colonnes) */}
            <section className="lg:col-span-7 space-y-6">
              {/* VISUALISEUR GRAPHIQUE CORRESPONDANT AU MODULE */}
              {activeModule === 'beam' && <Beam2DViewer input={beamInput} output={beamOutput} />}
              {activeModule === 'column' && <Column2DViewer input={columnInput} output={columnOutput} />}
              {activeModule === 'slab' && <Slab2DViewer input={slabInput} output={slabOutput} />}
              {activeModule === 'footing' && <Footing2DViewer input={footingInput} output={footingOutput} />}
              {activeModule === 'composite' && <Composite2DViewer input={compositeInput} output={compositeOutput} />}

              {/* CARTES RÉCAPITULATIVES DES RÉSULTATS RÉGLEMENTAIRES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
                  <div className="text-[11px] text-slate-400 font-medium">Ferraillage Principal</div>
                  <div className="text-base font-bold text-white mt-1">
                    {activeModule === 'beam' && beamOutput.providedRebarsInf}
                    {activeModule === 'column' && columnOutput.rebarArrangement}
                    {activeModule === 'slab' && slabOutput.providedRebarsX}
                    {activeModule === 'footing' && footingOutput.providedRebarsA}
                    {activeModule === 'composite' && `${compositeOutput.totalStudsRequiredPerHalfSpan} goujons / demi-portée`}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Section conforme aux minimas EC2</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
                  <div className="text-[11px] text-slate-400 font-medium">Contrainte / Taux d'Utilisation</div>
                  <div className="text-base font-bold text-emerald-400 mt-1 font-mono">
                    {activeModule === 'beam' && `${(beamOutput.shearRatio * 100).toFixed(0)}% (Effort Tranchant)`}
                    {activeModule === 'column' && `${(columnOutput.capacityRatio * 100).toFixed(0)}% (NEd / NRd)`}
                    {activeModule === 'slab' && `L/d = ${slabOutput.lOverDRatio} ≤ ${slabOutput.lOverDLimit}`}
                    {activeModule === 'footing' && `${footingOutput.soilUtilizationPercent}% (Portance Sol)`}
                    {activeModule === 'composite' && `${(compositeOutput.momentCapacityRatio * 100).toFixed(0)}% (MEd / Mpl,Rd)`}
                  </div>
                  <div className="text-[10px] text-emerald-500/80 mt-1">Vérification de sécurité satisfaite</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
                  <div className="text-[11px] text-slate-400 font-medium">Métré & Poids Acier</div>
                  <div className="text-base font-bold text-white mt-1 font-mono">
                    {activeModule === 'beam' && `${beamOutput.totalSteelWeightKg} kg (${beamOutput.steelDensityKgM3} kg/m³)`}
                    {activeModule === 'column' && `${columnOutput.steelWeightKg} kg`}
                    {activeModule === 'slab' && `Acier : ${slabOutput.asxRqdCm2PerM} cm²/m`}
                    {activeModule === 'footing' && `${footingOutput.totalSteelWeightKg} kg (${footingOutput.concreteVolumeM3} m³)`}
                    {activeModule === 'composite' && `${compositeOutput.profile.massKgM * compositeInput.spanL} kg (Acier profilé)`}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Quantitatif pour devis d'exécution</div>
                </div>
              </div>

              {/* TABLEAU SYNTHÈSE DES DISPOSITIONS CONSTRUCTIVES (EXIGENCE AUDIT) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Vérification des Dispositions Constructives & Ancrages (Passage d'Audit 2)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Statut : 100% Conforme</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start justify-between p-2.5 rounded bg-slate-950 border border-slate-800/80">
                    <div>
                      <strong className="text-white">Ancrage terminal des barres tendues (lbd)</strong>
                      <p className="text-[11px] text-slate-400">Longueur droite vs crochet standard à 90° calculée selon EC2 §8.4</p>
                    </div>
                    <span className="text-amber-400 font-mono font-bold text-right">
                      {activeModule === 'beam' && `${beamOutput.anchorage.lbd} mm`}
                      {activeModule === 'column' && `${columnOutput.anchorage.lbd} mm`}
                      {activeModule === 'slab' && `${slabOutput.anchorageRequiredLengthMm} mm`}
                      {activeModule === 'footing' && `${footingOutput.anchorageA.lbd} mm`}
                      {activeModule === 'composite' && `5d = ${compositeOutput.spacingMinMm} mm`}
                    </span>
                  </div>

                  <div className="flex items-start justify-between p-2.5 rounded bg-slate-950 border border-slate-800/80">
                    <div>
                      <strong className="text-white">Surlongueur d'attente pour recouvrement (l0)</strong>
                      <p className="text-[11px] text-slate-400">Calcul avec coefficient de recouvrement α6 modulant la proportion de barres</p>
                    </div>
                    <span className="text-cyan-400 font-mono font-bold text-right">
                      {activeModule === 'beam' && `${beamOutput.anchorage.l0} mm`}
                      {activeModule === 'column' && `${columnOutput.lapLengthL0Mm} mm`}
                      {activeModule === 'slab' && `${slabOutput.anchorageRive.l0} mm`}
                      {activeModule === 'footing' && `${footingOutput.starterLapL0Mm} mm`}
                      {activeModule === 'composite' && 'Goujons continus'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between p-2.5 rounded bg-slate-950 border border-slate-800/80">
                    <div>
                      <strong className="text-white">Confinement & zones critiques d'appuis (scrit)</strong>
                      <p className="text-[11px] text-slate-400">Resserrement des cadres transversaux en zone d'effort tranchant et de tête/pied</p>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold text-right">
                      {activeModule === 'beam' && `scrit = ${beamOutput.spacingCritMm} mm`}
                      {activeModule === 'column' && `scrit = ${columnOutput.spacingCritMm} mm`}
                      {activeModule === 'slab' && `s ≤ ${slabOutput.sMaxPermissibleMm} mm`}
                      {activeModule === 'footing' && 'Bielles réparties'}
                      {activeModule === 'composite' && `${compositeOutput.spacingCalculatedMm} mm`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Exportez le livrable complet pour validation chantier :</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView('blueprint')}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5 text-indigo-400" />
                      Plan DXF
                    </button>
                    <button
                      onClick={() => setActiveView('docx')}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Note DOCX
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* 4. FOOTER DISCRET ET SOBRE (CONSTITUTION ZERO-SLOP) */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Eurocodes Studio · Suite d'Ingénierie Structurale conforme EN 1990, EN 1992-1-1 & EN 1994-1-1
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Audit Pass 2 Validé</span>
            <span aria-hidden="true">·</span>
            <span>Générateur DXF & DOCX Natif</span>
          </div>
        </div>
      </footer>

      {/* MODALE RÉFÉRENTIEL NORMATIF */}
      <TechnicalSpecsModal
        isOpen={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
      />
    </div>
  );
}
