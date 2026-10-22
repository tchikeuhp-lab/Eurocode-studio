/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EUROCODES STUDIO - Composant de Rendu Mathématique KaTeX Haute Définition
 */

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathFormulaProps {
  tex: string;
  block?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({ tex, block = false, className = '' }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (err) {
      console.warn('Erreur rendu KaTeX:', err);
      return tex;
    }
  }, [tex, block]);

  if (block) {
    return (
      <div
        className={`my-2 overflow-x-auto text-slate-800 py-1 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block align-middle text-slate-900 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
