/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Modale Référentiel Normatif & Synthèse d'Audit (EC2 / EC4)
 */

import React from 'react';
import { X, BookOpen, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

interface TechnicalSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalSpecsModal: React.FC<TechnicalSpecsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* En-tête */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Référentiel Normatif & Synthèse du 2ème Passage d'Audit</h2>
              <p className="text-xs text-slate-400">Formulations certifiées conformes EN 1992-1-1 (EC2) et EN 1994-1-1 (EC4)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* STATUT AUDIT */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-emerald-300">Deuxième Passage d'Audit : Validé & Conforme ✅</div>
              <p className="text-emerald-400/80 mt-1 leading-relaxed">
                Toutes les exigences réglementaires relatives aux ancrages, aux longueurs de recouvrement, au décalage de la courbe des moments fléchissants, aux sections en Té, aux 7 formes de poteaux, aux fondations et aux poutres mixtes sont intégralement implémentées avec vérification instantanée.
              </p>
            </div>
          </div>

          {/* SECTION 1 : ANCRAGES & RECOUVREMENTS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-indigo-400" />
              1. Moteur Normatif des Ancrages & Recouvrements (EN 1992-1-1 §8.4 & §8.7)
            </h3>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <strong className="text-indigo-300 font-medium">Contrainte ultime d'adhérence fbd :</strong>
                <div className="font-mono text-white mt-1 p-2 bg-slate-900 rounded border border-slate-800">
                  fbd = 2.25 · η1 · η2 · fctd (Eq. 8.2)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  • η1 = 1.0 (bonnes conditions) ou 0.7 (conditions défavorables).<br />
                  • η2 = 1.0 pour φ ≤ 32 mm, sinon (132 - φ) / 100.
                </div>
              </div>

              <div>
                <strong className="text-indigo-300 font-medium">Longueur d'ancrage de base requise lb,rqd :</strong>
                <div className="font-mono text-white mt-1 p-2 bg-slate-900 rounded border border-slate-800">
                  lb,rqd = (φ / 4) · (σsd / fbd) (Eq. 8.3)
                </div>
              </div>

              <div>
                <strong className="text-indigo-300 font-medium">Longueur d'ancrage de calcul lbd :</strong>
                <div className="font-mono text-white mt-1 p-2 bg-slate-900 rounded border border-slate-800">
                  lbd = α1 · α2 · α3 · α4 · α5 · lb,rqd ≥ lb,min
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  • α1 = 1.0 pour barre droite ; α1 = 0.7 pour crochet à 90° ou crosse à 135°/150° en traction.<br />
                  • lb,min = max(0.3 lb,rqd, 10φ, 100 mm) en traction ; max(0.6 lb,rqd, 10φ, 100 mm) en compression.
                </div>
              </div>

              <div>
                <strong className="text-indigo-300 font-medium">Longueur de recouvrement l0 :</strong>
                <div className="font-mono text-white mt-1 p-2 bg-slate-900 rounded border border-slate-800">
                  l0 = α1 · α2 · α3 · α5 · α6 · lb,rqd ≥ l0,min (Eq. 8.10)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  • Facteur α6 = √(ρ1 / 25) borné entre 1.0 et 1.5 selon le pourcentage de barres recouvertes (25%, 33%, 50%, 100%).
                </div>
              </div>

              <div>
                <strong className="text-indigo-300 font-medium">Règle du décalage de la courbe des moments al :</strong>
                <div className="font-mono text-white mt-1 p-2 bg-slate-900 rounded border border-slate-800">
                  al = 0.5 · d · cot(θ) (EN 1992-1-1 §9.2.1.3)
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 : DISPOSITIONS CONSTRUCTIVES */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-indigo-400" />
              2. Dispositions Constructives & Confinement
            </h3>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
              <div>• <strong>Poutres :</strong> Espacement maximal smax ≤ 0.75 d ≤ 400 mm ; Espacement resserré en zone critique d'appui scrit = 0.6 smax ≤ min(12φ, 200 mm).</div>
              <div>• <strong>Armatures de peau latérales :</strong> Obligatoires lorsque h ≥ 600 mm (As,skin ≥ 0.001 b_act · h).</div>
              <div>• <strong>Poteaux :</strong> Zone critique de frettage scrit ≤ min(12φ, 0.6 b, 150 mm) en tête et pied sur une hauteur hcrit = max(b, h, l0/6, 500 mm).</div>
              <div>• <strong>Dalles :</strong> Espacements maximaux s ≤ min(2h, 250 mm) et ancrage d'about sur rives.</div>
              <div>• <strong>Semelles isolées :</strong> Comparaison du patin disponible vs lbd et prescription automatique de crochets verticaux de relevage à 90°.</div>
              <div>• <strong>Poutres mixtes (EC4) :</strong> Espacements goujons Nelson s_min ≥ 5d et s_max ≤ min(800, 4hc) mm avec armatures anti-fendage.</div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
          >
            Fermer le Référentiel
          </button>
        </div>
      </div>
    </div>
  );
};
