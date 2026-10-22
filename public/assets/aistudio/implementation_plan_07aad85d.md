# PLAN D'ACTION DÉTAILLÉ - DEUXIÈME PASSAGE D'AUDIT (EUROCODES STUDIO)

## État : RÉALISÉ ET VALIDÉ ✅

Le deuxième passage d'audit a été implémenté avec succès, validé par `tsc --noEmit` et compilé sans aucune erreur.

### 1. Moteur Normatif des Ancrages & Recouvrements (EN 1992-1-1 §8.4 & §8.7)
- Fichier créé : `/src/core/eurocodes/ec2_anchorage.ts`
- **Contrainte ultime d'adhérence** :
  $$f_{bd} = 2.25 \cdot \eta_1 \cdot \eta_2 \cdot f_{ctd}$$
  - Prise en compte paramétrable des conditions d'adhérence : bonnes conditions ($\eta_1 = 1.0$) vs conditions défavorables ($\eta_1 = 0.7$).
  - Coefficient de diamètre $\eta_2$ pour $\phi \le 32\text{ mm}$ et $\phi > 32\text{ mm}$.
- **Longueur d'ancrage de base requise** :
  $$l_{b,rqd} = \frac{\phi}{4} \cdot \frac{\sigma_{sd}}{f_{bd}}$$
- **Longueur d'ancrage de calcul** :
  $$l_{bd} = \alpha_1 \alpha_2 \alpha_3 \alpha_4 \alpha_5 l_{b,rqd} \ge l_{b,min}$$
  - Calcul direct de la longueur droite ($\alpha_1 = 1.0$) et avec crochet standard à 90° ou crosse à 135°/150° ($\alpha_1 = 0.7$).
- **Longueur de recouvrement des armatures** :
  $$l_0 = \alpha_1 \alpha_2 \alpha_3 \alpha_5 \alpha_6 l_{b,rqd} \ge l_{0,min}$$
  - Prise en compte du pourcentage de barres recouvertes dans une même section (25%, 33%, 50%, 100%) modulant le facteur $\alpha_6$ de $1.0$ à $1.5$.
- **Règle du décalage de la courbe des moments ($a_l$)** :
  $$a_l = 0.5 \cdot d \cdot \cot\theta$$
  pour l'épure d'arrêt des barres sous effort tranchant.
- **Espacements maximaux et zones critiques de confinement** :
  - Espacement maximal en travée : $s_{max} \le 0.75 d \le 400\text{ mm}$ (poutres) et $\min(20\phi, b, 400\text{ mm})$ (poteaux).
  - Espacement resserré en zone critique et de recouvrement : $s_{crit} = 0.6 s_{max} \le \min(12\phi, 200\text{ mm})$.
  - Détection automatique et ajout d'armatures de peau latérales lorsque la hauteur $h \ge 600\text{ mm}$.

### 2. Intégration dans les Modules de Calcul
- **Poutres Multi-Travées (`ec2_beams.ts`)** :
  - Option de calcul en section en Té avec table de compression et largeur participante $b_{eff}$.
  - Calcul des longueurs $l_{bd}$, $l_0$, décalage $a_l$, espacement de cadres en zone critique.
  - Nomenclature d'aciers mise à jour avec longueurs réelles incluant les ancrages terminaux.
- **Poteaux Complexes 7 Formes (`ec2_columns.ts`)** :
  - Calcul exact de la surlongueur d'attente pour recouvrement $l_0$ intégrée à la longueur des barres d'armatures.
  - Cadres de frettage resserrés en tête/pied de poteaux ($s_{crit} \le 150\text{ mm}$).
- **Planchers & Dalles (`ec2_slabs.ts`)** :
  - Ancrage des armatures en abouts d'appuis de rives et espacements maximaux admissibles $s \le \min(2h, 250\text{ mm})$.
- **Poutres Mixtes Acier-Béton (`ec4_composite.ts`)** :
  - Dispositions constructives des goujons Nelson : vérification des espacements minimal ($5 d$) et maximal ($\min(800, 4 h_c)$ mm) et armatures transversales anti-fendage.
- **Semelles de Fondations (`ec2_footings.ts`)** :
  - Vérification de la longueur disponible de patin par rapport à $l_{bd}$ et prescription automatique de crochets de relevage terminaux si nécessaire.
  - Calcul des armatures d'attentes poteau-semelle.

### 3. Interface Utilisateur & Livrables
- **Console Gauche (`App.tsx`)** :
  - Nouveau panneau `3. DISPOSITIONS CONSTRUCTIVES & ANCRAGES (EC2 §8 & §9)` avec sélecteur de conditions d'adhérence, % de barres recouvertes, et affichage instantané de $l_{bd}$ droit, crochet et $l_0$.
  - Contrôle de section en Té pour les poutres (largeur $b_f$, épaisseur $h_f$).
- **Visualiseurs 2D (`Beam2DViewer.tsx`, `Column2DViewer.tsx`)** :
  - Bandeau technique affichant en temps réel les cotes d'ancrage $l_{bd}$, de recouvrement $l_0$ et les espacements en zone critique $s_{crit}$.
- **Note de Calcul Word DOCX (`docx_generator.ts`, `DocxPreviewTab.tsx`)** :
  - Chapitre 4 dédié : *"Dispositions Constructives, Ancrages & Recouvrements (EN 1992-1-1)"* avec tableau normatif des paramètres calculés et justification des règles constructives.
- **Plans d'Exécution CAO DXF (`dxf_generator.ts`, `ExecutionPlanTab.tsx`)** :
  - Calques DXF enrichis avec annotations des longueurs d'ancrage, de recouvrement et d'espacements resserrés.
  - Bloc technique de dispositions constructives dans le visualiseur de blueprint.
