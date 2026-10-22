# Plan d'Implémentation - Eurocodes Studio : Multi-Matériaux, Séisme, Feu, Multi-Travées, Assemblages, Corps Creux & Pieux

## 1. Contexte & Objectifs
Ce plan structure l'extension majeure d'**Eurocodes Studio** pour transformer la suite de calcul en une plateforme pluridisciplinaire conforme aux Eurocodes (EC1, EC2, EC3, EC4, EC5, EC7, EC8) :
1. **Modules transversaux Séisme, Feu & ELS** (EC8, Eurocodes Feu, vérification des contraintes $\sigma_c, \sigma_s$ et fissuration $w_k$).
2. **Poutres Multi-Travées (1 à 5 travées) & Multi-Matériaux** (Béton armé, Profilés acier laminés IPE/HEA/HEB, Bois massif C24 / Lamellé GL24h).
3. **Poteaux Multi-Matériaux & Conditions aux appuis** (Flambement $\beta$, Béton 8 formes, Acier, Bois).
4. **Schémas de Liaisons & Assemblages Acier / Bois** (Poutre/Poteau par platine ou étrier, Poteau/Poteau par éclisse ou pied métallique, Poutre/Poutre).
5. **Dalles & Planchers à Corps Creux** (Hourdis 12+4, 16+4, 20+5, 25+5 cm avec poutrelles précontraintes/BA, dalles alvéolées, collaborantes).
6. **Fondations Avancées & Semelles sur Pieux** (Isolées, filantes, 1 à 4 pieux selon Blévot sous les 8 formes de poteaux).
7. **Poutres Mixtes Complètes** (Profilé, goujons, vérifications table comprimée, âme, pied, degré de connexion $\eta$).

---

## 2. Architecture Technique & Nouveaux Modules

### A. Moteur Multi-Matériaux & Normes (`src/core/eurocodes/`)
* **`materials.ts`** :
  * Nuances d'acier de construction : S235, S275, S355 ($f_y, f_u, E = 210000$ MPa, $G = 81000$ MPa).
  * Nuances de bois : Résineux massif C18, C24, C30 et Lamellé-collé GL24h, GL28h ($f_{m,k}, f_{t,0,k}, f_{c,0,k}, f_{v,k}, E_{0,mean}, k_{mod}, \gamma_M$).
  * Classes d'exposition au feu (R30, R60, R90, R120) et paramètres sismiques (Zones 1 à 5, classes de sol A à E, $a_g, \gamma_I, q$).
* **`ec_fire_seismic.ts` (Nouveau)** :
  * Calcul de l'enrobage thermique minimal et réduction des résistances au feu pour le béton ($a_{min}, b_{min}$ selon EN 1992-1-2).
  * Facteurs de réduction thermique acier $k_{y,\theta}, k_{E,\theta}$ (EN 1993-1-2).
  * Vitesse de carbonisation du bois $\beta_0 = 0.65$ mm/min, profondeur carbonisée efficace $d_{ef} = d_{char} + k_0 \cdot d_0$ (EN 1995-1-2).
  * Vérifications sismiques EC8 : confinement critique $s_{max}$, armatures minimales transversales, ductilité DCM/DCH.
* **`ec_cracking_stress.ts` (Nouveau)** :
  * Contraintes de service en section fissurée : $\sigma_c \le 0.60 f_{ck}$, $\sigma_s \le 0.80 f_{yk}$.
  * Ouverture calculée des fissures : $w_k = s_{r,max} \cdot (\epsilon_{sm} - \epsilon_{cm}) \le w_{max}$ ($0.2$ à $0.4$ mm selon classe d'exposition).

### B. Module Poutres Étendu (`src/core/eurocodes/ec2_beams.ts` & multi-matériaux)
* **Poutres Multi-Travées (1 à 5 travées)** :
  * Saisie de $N \in [1..5]$ travées avec longueurs individuelles $L_1, \dots, L_N$.
  * Conditions aux appuis modulables : Articulé-Articulé, Encastré-Encastré, Encastré-Articulé, Console/Encorbellement, Appuis intermédiaires continus.
  * Résolution des moments fléchissants et efforts tranchants sur appuis et en travée (méthode de Caquot et 3 moments de Clapeyron).
* **Poutres Métalliques (EN 1993-1-1)** :
  * Profilés IPE 140 à 600, HEA 100 à 500, HEB 100 à 500.
  * Moment résistant plastique $M_{c,Rd} = W_{pl} \cdot f_y / \gamma_{M0}$, effort tranchant $V_{pl,Rd} = A_v (f_y/\sqrt{3})/\gamma_{M0}$.
  * Vérification au déversement $M_{b,Rd} = \chi_{LT} W_{pl,y} f_y / \gamma_{M1}$ et flèche admissible $L/300$ - $L/500$.
* **Poutres Bois (EN 1995-1-1)** :
  * Sections rectangulaires $b \times h$ en C24 ou GL24h.
  * Contrainte de flexion $\sigma_{m,d} \le k_{crit} \cdot f_{m,d}$, cisaillement $\tau_d \le f_{v,d}$.
  * Flèche instantanée $w_{inst}$ et flèche finale $w_{net,fin} = w_{inst,G}(1+k_{def}) + w_{inst,Q}(1+\psi_2 k_{def})$.

### C. Module Poteaux Étendu (`src/core/eurocodes/ec2_columns.ts`)
* **Conditions aux appuis & coefficient de longueur de flambement $\beta$** :
  * Bi-articulé ($\beta = 1.0$).
  * Encastré-Articulé ($\beta = 0.7$).
  * Bi-encastré ($\beta = 0.5$).
  * Console / Tête libre ($\beta = 2.0$).
* **Poteaux Acier (EN 1993-1-1)** :
  * Flambement flexon avec courbes de flambement Eurocode 3 (courbes a, b, c selon l'axe fort et faible).
  * Résistance au flambement $N_{b,Rd} = \chi A f_y / \gamma_{M1}$.
* **Poteaux Bois (EN 1995-1-1)** :
  * Élancement $\lambda = l_0 / i$, coefficient d'instabilité $k_c$ selon EC5 §6.3.2.
  * Vérification en compression axiale centrée $\sigma_{c,0,d} \le k_c \cdot f_{c,0,d}$.

### D. Module Assemblages & Liaisons Acier / Bois (`src/core/eurocodes/ec_connections.ts` & Visualiseurs)
* **Assemblages Métalliques (EC3 §1.8)** :
  * **Liaison Poutre / Poteau** : Platine d'about soudée avec rangées de boulons HR (8.8 / 10.9), calcul de la résistance en traction des rangées de boulons, moment résistant $M_{j,Rd}$ et rigidité rotationnelle $S_{j,ini}$.
  * **Liaison Poteau / Poteau** : Éclissage boulonné d'ailes et d'âme avec couvre-joints.
  * **Liaison Poutre / Poutre** : Éclissage de continuité et cornières de raccordement d'âme.
* **Assemblages Bois (EC5 §8)** :
  * **Liaison Poutre / Poteau** : Étrier métallique à queue d'aronde ou sabot métallique fixé par vis torx/pointes annelées avec broches métalliques.
  * **Liaison Poteau / Poteau** : Pied de poteau métallique galvanisé scellé dans la dalle avec goujons d'ancrage.
  * **Liaison Poutre / Poutre** : Ferrures moisées intérieures et broches en acier.
* **Composant Visualiseur Dédié** : `Connection2DViewer.tsx` avec schémas techniques vectoriels clairs et cotés.

### E. Module Dalles & Planchers Hourdis (`src/core/eurocodes/ec2_slabs.ts`)
* **Planchers à Corps Creux (Hourdis)** :
  * Gamme standard : 12+4 cm, 16+4 cm, 20+5 cm, 25+5 cm.
  * Entraxe standard des poutrelles : 600 mm.
  * Calcul de la section de la nervure en Té : table de compression béton armé + âme de la poutrelle.
  * Ferraillage de la poutrelle (armatures tendues de travée, aciers de chapeau sur appui $0.15 M_0$, treillis de dalle de compression anti-fissuration).
* **Dalles Alvéolées & Dalles Collaborantes** (options supplémentaires sélectionnables).

### F. Module Fondations & Semelles sur Pieux (`src/core/eurocodes/ec2_footings.ts`)
* **Types de semelles** :
  1. Semelle isolée superficielle (rectangulaire, carrée homothétique $A/B = a/b$).
  2. Semelle filante sous mur ou rangée de poteaux.
  3. Semelle sur pieux :
     * 1 pieu centré (avec longrines de redressement).
     * 2 pieux sous bielle longitudinale.
     * 3 pieux sous disposition triangulaire équilatérale.
     * 4 pieux sous disposition carrée/rectangulaire.
* **Mécanique de calcul selon la méthode des bielles de Blévot** :
  * Inclinaison des bielles de béton $\theta \ge 45^\circ$.
  * Traction dans les tirants $T = \frac{N_{Ed} \cdot (d_{pieux} - 0.5 a_{poteau})}{8 d}$.
  * Section d'armatures des tirants $A_s = T / f_{yd}$.
  * Vérification du poinçonnement de la semelle au droit du poteau et au droit des têtes de pieux.
* **Compatibilité totale avec les 8 formes de poteaux** :
  * Rectangulaire, Circulaire, L, T, Croix, Creux, Trapézoïdal, Hexagonal.

### G. Module Poutres Mixtes Étendu (`src/core/eurocodes/ec4_composite.ts`)
* **Dessin de coupe transversale enrichi & détails des composants** :
  * Profilé IPE / HEA / HEB avec semelle supérieure, âme et semelle inférieure.
  * Goujons connecteurs à tête Nelson : tracé réaliste, diamètre $d$, hauteur $h$, rangée simple ou double.
  * Bac acier nervuré ou dalle pleine en béton avec armatures transversales d'armement de la dalle.
* **Formules KaTeX et vérifications normatives détaillées** :
  * Résistance individuelle $P_{Rd} = \min\left(0.8 f_u \frac{\pi d^2}{4}, 0.29 \alpha d^2 \sqrt{f_{ck} E_{cm}}\right) / \gamma_v$.
  * Résistance de la table en compression : $N_c = 0.85 f_{cd} b_{eff} h_c$.
  * Résistance plastique de l'âme et semelles du profilé : $N_{pl,a} = A_a f_{yd}$.
  * Degré de connexion $\eta = N_{studs} P_{Rd} / \min(N_c, N_{pl,a})$ (connexion totale si $\ge 1.0$, partielle si autorisée $\ge 0.40$).
  * Cisaillement longitudinal dans le béton et armatures transversales minimales de dalle.

### H. Moteur de Restitution Graphique & Export DXF/DOCX
* **`dxf_generator.ts`** :
  * Dessin DXF multi-travées avec diagramme des moments et dispositions des armatures.
  * Nouveaux blocs DXF pour les semelles sur 1, 2, 3 et 4 pieux avec leurs armatures de cerclage et tirants.
  * Schémas DXF des assemblages acier (platine boulonnée) et bois (étrier à broches).
  * Détail de coupe de plancher à corps creux en DXF avec entrevous et poutrelles.
* **`DocxPreviewTab.tsx` & KaTeX** :
  * Insertion des équations mathématiques pour EC3, EC5, EC8, Eurocodes Feu, Blévot et hourdis.
  * Schémas vectoriels SVG dynamiques pour les assemblages, poutrelles hourdis et pieux.

---

## 3. Plan d'Exécution par Étapes

1. **Étape 1 : Moteur de Matériaux, Feu, Séisme & ELS**
   * Enrichir `materials.ts` (acier S235/S275/S355, bois C24/GL24h, feu R30-R120, séisme EC8).
   * Créer `ec_fire_seismic.ts` et `ec_cracking_stress.ts` pour centraliser les contrôles feu, séisme, contraintes et fissuration.
2. **Étape 2 : Poutres Multi-Travées & Multi-Matériaux**
   * Mettre à jour `ec2_beams.ts` pour gérer le choix du matériau (béton, acier, bois), le nombre de travées (1 à 5), les conditions aux appuis et la résolution continue.
3. **Étape 3 : Poteaux Multi-Matériaux & Conditions aux Appuis**
   * Mettre à jour `ec2_columns.ts` avec la sélection du matériau (béton 8 formes, acier, bois) et les longueurs efficaces $\beta \cdot L$.
4. **Étape 4 : Moteur d'Assemblages Acier & Bois**
   * Créer `ec_connections.ts` et le composant `Connection2DViewer.tsx` pour modéliser et visualiser les liaisons Poutre/Poteau, Poteau/Poteau, Poutre/Poutre.
5. **Étape 5 : Dalles & Planchers à Corps Creux**
   * Mettre à jour `ec2_slabs.ts` avec les options Dalle pleine, Plancher à corps creux (12+4, 16+4, 20+5, 25+5), Dalle alvéolée, Dalle collaborante, et adapter `Slab2DViewer.tsx`.
6. **Étape 6 : Fondations, Semelles Filantes & Semelles sur Pieux**
   * Mettre à jour `ec2_footings.ts` pour implémenter les semelles isolées, semelles filantes et semelles sur pieux (1, 2, 3, 4 pieux) selon Blévot sous les 8 formes de poteaux, et adapter `Footing2DViewer.tsx`.
7. **Étape 7 : Poutres Mixtes Détaillées**
   * Enrichir `ec4_composite.ts` et `Composite2DViewer.tsx` avec les vérifications de la table, de l'âme, des semelles et le détail des goujons.
8. **Étape 8 : Interface Utilisateur & Intégration Générale**
   * Mettre à jour `App.tsx` avec les cases à cocher Séisme et Feu, les vérifications ELS, les nouveaux sélecteurs de matériaux, de travées, de fondations et d'assemblages.
9. **Étape 9 : Génération DXF & Note de Calcul Word DOCX avec KaTeX**
   * Mettre à jour `dxf_generator.ts` et `DocxPreviewTab.tsx` pour intégrer toutes les nouvelles équations et schémas vectoriels.
10. **Étape 10 : Vérification & Compilation**
    * Exécuter `lint_applet` et `compile_applet` pour valider la compilation sans régression.
