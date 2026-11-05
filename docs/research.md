# Research summary: Mathe-Portal Klasse 6 ("Mathe 6")

| | |
|---|---|
| **Project** | Free, no-login maths practice portal for Klasse 6 (Sekundarstufe I in most Länder; in Berlin and Brandenburg still Grundschule; children aged 11–12). Sibling of the Klasse 2 and Klasse 4 portals. Static site, progress only in the browser. |
| **Research date** | 2026-11-03 |
| **Language** | English. German curriculum terms and all child-facing strings stay German. |
| **Status** | Basis for implementation. No expert in Fachdidaktik or law has reviewed it. Not legal advice. |
| **Relation to Klasse 4 and 2** | The Klasse 4 research [42] stays valid for general learning science, motivation, privacy and accessibility. IDs such as L8, M16, C3 or P13 mean the findings in [42] unless restated here. The Klasse 2 document [57] is the format template. This document adds only what changes at age 11–12 and what the split by Schulform requires. |

Evidence labels: **N** normative (curriculum, law), **E** empirical, **D** didactic consensus or practitioner material, **H** our own heuristic. Inline numbers refer to section 9. Curriculum wording was read in the original texts. Where only an abstract was seen, the text says so.

**Plan codes used throughout:** **BG** Bayern Gymnasium, **BR** Bayern Realschule, **BM** Bayern Mittelschule (Regelklasse), **NG** NRW Gymnasium (G9), **NR** NRW Realschule, Hauptschule and Gesamtschule/Sekundarschule, **BB** Berlin-Brandenburg Jahrgangsstufe 6 (Grundschule).

## 1. Key takeaways

1. **Land matters as much as Schulform.** The NRW plans for Realschule, Hauptschule and Gesamtschule have the same 5/6 content; our text comparison found only punctuation, layout order and one spelling variant [13][14][15]. Bayern Realschule and NRW Realschule differ far more than NRW Realschule and NRW Hauptschule. A switch that asks only for the Schulform would therefore be wrong.
2. **Three areas split the plans most.** Fraction multiplication and division: Klasse 6 in Bayern, NG and BB, but 7/8 in NR. Percent calculation with Grundwert: Klasse 6 only in BG and BR. Negative rational arithmetic: Klasse 6 in Bayern only (limited in BM), 7/8 in NRW.
3. **A broad shared core exists.** Fraction meaning, Erweitern, Kürzen, comparing, adding and subtracting; decimals with all four operations; Bruch, Dezimalzahl and Prozent as representations; integers in context; angles; Vierecke; Kreis vocabulary; coordinates; Quader surface and volume; reading diagrams. All five Bayern and NRW plans expect these by the end of Klasse 6. Some Bayern content comes in Jgst. 5, so Mathe 6 treats it as review.
4. **Recommendation: core plus one optional plan choice.** The portal works with no choice. One setting, "Welcher Lehrplan passt?", offers six plans plus "Anderes Land oder weiß nicht". It only decides which optional skills count and which Stufen they show (2.5). Nothing is ever locked.
5. **Plan and Stufe stay separate.** A Stufe is difficulty within a skill. It never follows from the school type. Children at any school can work on Stufe 3.
6. **The school type is not a label for the child.** School tracks differ in reputation, and collective school-type identity predicted motivation beyond self-concept and track in a Berlin study (N = 1,278, cross-sectional) [40]. The Schulform appears only inside the plan dialog and on the adult page, never in results, badges or worksheets.
7. **Signature errors are well documented.** Among 6th and 8th graders, 41 % of 6th-grade fraction answers were correct, and division was hardest. Treating numerators and denominators as separate whole numbers made up 14 % of trials, and importing a procedure from another operation 26 % [19]. In Australian Year 6, 33 % showed longer-is-larger on decimals and 19 % shorter-is-larger; only 31 % were task experts [21]. These are the first bugs to build.
8. **The app needs new input.** Required: `fraction` and `point` answer types. Extensions: sign key, tolerance, comma alignment in `written`, fraction labels on `numberline`, inline fractions in text. New visuals: `fractionBar`, `fractionCircle`, `percentBar`, `coordSystem`, `angle`, `cuboid`, `figure`, `pieChart` (section 6).
9. **Recommended default round: 10 items, the same as Klasse 4**, target about 12–15 minutes. This is a heuristic (7.3).
10. **A childish tone is a design risk.** Older-child evidence is indirect, but respect and status matter increasingly from early adolescence [39], and teens reject babyish tone and childish graphics [41]. Sober visuals, no mascot, no "Kinder" in the interface.
11. **Fair-design rules do not change.** No timers, currency, leaderboards or streaks, and no timed mode in v1. Section 7.2 ("Banned patterns") replaces Klasse 4 §6.4, and section 7.4 restates M15.

## 2. Curriculum comparison: what is expected in Klasse 6

### 2.1 What the KMK standards mean for Klasse 6

The KMK Bildungsstandards for the Erster Schulabschluss (ESA) and Mittlerer Schulabschluss (MSA), version of 23.06.2022, describe the end of Jahrgangsstufe 9 and 10 [1]. They set no Klasse-6 waypoint. They give the Leitideen, the process competences and the direction of travel. Points that matter here [1, pp. 15–22]:

- **ESA and MSA are worded identically** for rational-number meaning, operations, fraction concepts ("Teile eines oder mehrerer Ganzer, relative Anteile"), Rechengesetze, Überschlag and percent. Both name "vorstellungsbasiert (z. B. Prozentstreifen)". This supports one shared core.
- **Differences lie mostly in depth, not in early content.** ESA "ermitteln" area of Rechteck, Dreieck and Kreis, MSA "berechnen". Both name the "Idee der Kongruenz". MSA adds Quartile and Boxplot.
- **Proportionality and Dreisatz** are named for both levels. Statistics includes arithmetisches Mittel, Median and Spannweite at both levels, and Kreisdiagramm at both.

Baseline: in the IQB-Bildungstrend 2024, just under 9 % of all ninth graders missed the ESA minimum standard in maths and about 34 % the MSA minimum; among those aiming for at least the MSA, about 24 % did (read in a Bildungsserver summary, not the report) [47]. So support at low Stufen is not a niche need at any school type.

### 2.2 Plans read

| Code | Document | Structure | Note |
|---|---|---|---|
| BG | LehrplanPLUS Gymnasium Mathematik 6 [2]; also 5 [3], 7 [4], 8 [5] | Single year | Content per Lernbereich with hours |
| BR | LehrplanPLUS Realschule Mathematik 6 [6]; also 5 [7]; 7, Wahlpflichtfächergruppe I [8] | Single year | The grade 6 page shows one plan; groups split later |
| BM | LehrplanPLUS Mittelschule Mathematik 6 [9]; also 5 [10]; 7 Regelklasse [11] | Single year | Number sets are images on the page; read from their alt text |
| NG | Kernlehrplan Gymnasium G9, Heft 3401, section 2.3 [12]; QUA-LiS sample school plan [16] | **Double year: "Ende der Erprobungsstufe"** | The sample plan is not binding; it places fraction × and ÷ in Klasse 6 |
| NR | Kernlehrpläne Realschule [13], Hauptschule [14], Gesamtschule/Sekundarschule [15], all 2022, section 2.3 | **Double year: 5/6** | Identical content at 5/6 (takeaway 1) |
| BB | Rahmenlehrplan Teil C [17]; LISUM Planungshilfe Jg. 6 [18] | **Niveaustufen.** Jg. 6: "Niveaustufe D, in Teilen E" [17, p. 14] | The Planungshilfe shows which parts of E appear, and largely stays at D |

**Reading rule for double-year plans:** a 5/6 expectation may fall in either year. A child in NRW in October of Klasse 6 may or may not have met it. Nothing is hard-locked, and core items that Bayern teaches in Jgst. 5 stay in the catalogue as review.

### 2.3 Content by area

"5" or "7/8" means the year where the plan places the content, if not Klasse 6.

| Area | BG | BR | BM | NG | NR | BB Jg. 6 | Decision for Mathe 6 |
|---|---|---|---|---|---|---|---|
| **Bruch: Bedeutung, Erweitern, Kürzen** | 6: Anteile, Flächendiagramme, Hauptnenner also via Primfaktoren [2] | 6: Grundvorstellungen, wertgleiche Brüche [6] | 6: Bruchteile, vergröbern, verfeinern, gleichnamig [9] | 5/6: Anteile, Operatoren, Quotienten, Verhältnisse; Vergröbern, Verfeinern [12] | 5/6: same wording [13][14][15] | D: Kürzen, Erweitern; Dichtheit [17] | Core |
| **Bruch: + und −** | 6: Brüche, gemischte Zahlen [2] | 6 [6] | 6: "schriftlich" [9] | 5/6: "einfacher Brüche" [12] | 5/6: "einfacher Brüche" [13] | D [17] | Core; number sizes limited by Stufe |
| **Bruch: ·** | 6 [2] | 6 [6] | 6: a, b positive rational [9] | 5/6: "einfacher Brüche" [12]; sample plan in 6 [16] | **7/8** [13] | D; Rechteckmodell, Kürzen [18, p. 10] | Optional |
| **Bruch: :** | 6 [2] | 6 [6] | 6: **only a : b with b natural** [9] | 5/6: "einfacher Brüche" [12] | **7/8** [13] | D; Kehrwert [18, p. 11] | Optional; BM sees Stufe 1 only |
| **Dezimalzahlen** | 6: Stellenwerte, runden, Umwandeln, periodisch [2] | 6: Stellenwerte, runden, periodisch [6] | 6: to Tausendstel, Rundungsregeln; "Dezimalbrüche" [9] | 5/6: endlich and periodisch; all four operations [12] | 5/6: endlich and periodisch; all four operations [13] | D: all four; periodic at E [17] | Core; periodic only at Stufe 3 |
| **Prozent** | 6: notation for fractions; **Rabatt, Zins; Grundgleichung, Schlussrechnung** [2] | 6: **Prozentsatz, Grundwert, Prozentwert** with Dreisatz [6] | 6: **only change of representation**; calculation in 7 [9][11] | 5/6: Prozentzahl as representation; calculation 7/8 [12] | 5/6: Prozentzahl as representation; calculation 7/8 [13] | E; aid: "kein Inhalt in der Klassenstufe 6" [18, p. 38] | Representation is core; calculation optional; BB hides it |
| **Negative rationale Zahlen** | 5 integers [3]; 6 all operations [2] | 5 integers [7]; 6 with Vorzeichenregeln [6] | 5 integers [10]; 6: a ± b with b positive; a · b, a : b with b natural [9] | 5/6: integers for states, changes, coordinates; rational 7/8 [12] | 5/6: integers for states, changes; rational 7/8 [13] | E; absent from the Jg. 6 aid [17][18] | Integers in context are core; arithmetic optional |
| **Proportionalität, Dreisatz** | 5: Schlussrechnung, Dreisatz [3]; proportional functions 8 [5] | 5 Dreisatz [7]; **6: direkt proportional, Faktor, Ursprungshalbgerade** [6] | **7** [11] | 5/6: **Dreisatzverfahren** [12]; proportional 7/8 | 5/6: "lösen durch Rechnen"; **Dreisatz named at 7/8** [13] | D: direkt proportional with Dreisatz [17][18, p. 27] | Optional |
| **Terme, Gleichungen** | 5: Struktur, a + x = b by Probieren or Umkehren [3]; 6: Termstruktur [2]; variables 7 [4] | **6: variables, a · x = c, x + b = c** [6] | 5–6: Zahlenrätsel, Probieren, Umkehren [9][10]; variables 7 [11] | 5/6: Variablen, einsetzen, umkehren [12] | 5/6: same [13] | D: Platzhalter, one operation [17] | Number terms and Umkehren core; variables optional |
| **Winkel** | 5: to 360° [3]; Sätze 7 [4] | 5: 0–360°, Scheitel, Neben [7] | 5: to 180° [10] | 5/6: messen, klassifizieren [12] | 5/6: same [13] | D: incl. Scheitel-, Neben-, Stufen-, Innenwinkel [17] | Measure and classify core; relations optional |
| **Dreiecke** | 7 [4] | 5 figures [7]; 6 as symmetric figures [6] | 7 [11] | 5/6: "besondere Dreiecke" (content list) [12] | 5/6: "besondere Dreiecke und Vierecke" [13] | D [17] | Optional |
| **Vierecke** | 5: six types [3] | 5–6 [6][7] | 6: seven types, Sonderformen [9] | 5/6: klassifizieren [12] | 5/6 [13] | Partly C, review [18] | Core |
| **Flächeninhalt Parallelogramm, Dreieck** | 6, also Trapez [2] | 6, also Trapez, Drachen, Raute [6] | **7** [11] | **Only Rechteck, rechtwinkliges Dreieck, Zerlegen**; rest 7/8 [12] | **Same; rest 7/8** [13] | E; D only rectangles [17] | Optional; NG, NR see Stufe 1 only |
| **Kreis** | 5: figure, locus [3]; area 8 [5] | 5: Radius, Durchmesser, Sektor [7] | 6: Mittelpunkt, Radius, Durchmesser [9] | 5/6: named figure [12] | 5/6: named figure [13] | Vocabulary; area at E [17] | Vocabulary only. **Umfang, Fläche, π out** |
| **Volumen, Oberfläche Quader** | 5 surface [3]; 6 volume, units, simple Körper [2] | 6 [6]; nets 5 [7] | 6 [9] | 5/6 [12] | 5/6 [13] | D [17][18] | Core |
| **Koordinaten** | 5 [3] | 5 [7] | 5 first quadrant [10]; **6 four quadrants** [9] | 5/6; integers as coordinates [12] | 5/6: kartesisch [13] | D first quadrant; E four [17] | First quadrant core; four at Stufe 3 |
| **Kongruenz, Abbildungen** | 7 [4] | **6: Achsenspiegelung als Kongruenzabbildung** [6] | Not named in 6 | 5/6: Verschieben, Spiegeln; Sätze 7/8 [12] | 5/6: same [13] | D: kongruente Figuren, Spiegeln, Verschieben [17] | Optional |
| **Mittelwert** | 6 [2] | **7** [8] | 6 [9] | 5/6, also Median, Boxplots [12] | 5/6, also Median, no Boxplots [13] | **Not at D**; E [18, p. 36] | Optional |
| **Relative Häufigkeit** | 6: Bruch, Dezimalbruch, Prozent [2] | Not named in 5–7 | Not named in 5–7 (absolute only in 5) [10] | 5/6 [12] | 5/6 [13] | D: as fraction [17][18, p. 37] | Optional |
| **Kreisdiagramm** | 6: also make, spreadsheet [2] | Kreissektor as form of a fraction [6]; diagram not named in 5–7 | **7: read** [11] | 5/6 [12] | 5/6 [13] | Read only; making is later [18, p. 36] | Optional; reading only, as no drawing input exists |
| **Wahrscheinlichkeit** | Not in 6 | Not in 5–7 pages read | Not in 5–7 pages read | 7/8 [12] | 7/8 [13] | D: relative frequency of one-step experiments [17] | Optional; BB only |

### 2.4 Differences that affect the app

- **Vocabulary differs by plan.** BG and BM say "Dezimalbruch", BR and NR "Dezimalzahl". BG and BR tend to say "Zahlengerade", NR and BM often "Zahlenstrahl" for the positive ray. BM uses "Rauminhalt" next to "Volumen". See T13.
- **Percent is the sharpest contrast inside Bayern.** BR calculates with Grundwert in Klasse 6, BM in Klasse 7: a gap of one school year.
- **NG is not simply "more".** NG has fraction × and ÷ and Dreisatz, but not negative rational arithmetic, not Prozentrechnung and not parallelogram area, all of which are Klasse 6 in BG. BG and NG share a Schulform but not a plan.
- **NRW asks early statistics.** Median, Spannweite and Kreisdiagramm are 5/6 in NRW. BR places them in 7. Boxplots appear in NG only.
- **BB's Jg. 6 sits mostly at D.** The Planungshilfe also notes median and mean as outside Stufe D [18, p. 36]. BB children work on the fraction operations early but meet percent and negative numbers later.
- **Timing within the year:** double-year plans do not fix a month, so there are no locks.

### 2.5 Recommended handling in one portal

**Options considered**

| Option | Assessment |
|---|---|
| Separate portals per Schulform | Rejected. Most skills are shared, and there would be a matrix of Land × Schulform. |
| Stufen as Schulform levels ("Stufe 3 = Gymnasium") | Rejected. It mixes difficulty with track, limits children and reproduces status [40]. The KMK requires all Anforderungsbereiche regardless of ability (C3 in [42]). |
| Adaptive inference of the plan | Rejected. Answers do not reveal what the class has covered. |
| Child ticks every topic covered | Rejected as a start. Too much reading and work. A per-skill hide is a useful extra (below). |
| **Core plus one optional plan choice** | **Recommended.** One tap, no personal data, and the portal also works without it. |

**The choice (H for the design, N for the content mapping).**

- **Where:** a small line on the topic overview, "Passt das zu deinem Unterricht? Lehrplan wählen", and on the adult page. It is never a gate.
- **Wording:** "Welcher Lehrplan passt?" Options sorted by Land and then alphabetically by school type, so the list does not read as a ranking: Bayern Gymnasium; Bayern Mittelschule; Bayern Realschule; Berlin/Brandenburg Klasse 6; NRW Gesamtschule, Hauptschule, Realschule, Sekundarschule; NRW Gymnasium; **Anderes Land oder weiß nicht (Standard)**. Note under the list: "Wenn du unsicher bist, frag jemanden aus deiner Klasse oder zu Hause."
- **Effect:** decides which optional skills count as "in deinem Plan" and which Stufen of them appear by default. Skills outside the plan stay reachable under "Extra". They never count towards topic progress and never produce a warning.
- **Default without a choice:** core skills count, optional skills appear as "Extra".
- **Per-skill control:** each skill has "Haben wir noch nicht", which only moves it to the bottom of the list and leaves it out of the review.
- **After the choice:** the screen shows "Lehrplan: eingestellt" with a change link, not the school type.
- **Data:** see the privacy paragraph in section 3.

**Plan map: optional skills per plan** (core skills apply to all, with the BB exceptions noted). This is data, so adding a Land means adding one row.

| Plan | Optional skills in the plan (restriction in brackets) | Hidden core skills |
|---|---|---|
| BG | `brueche.gemischt`, `brueche.mal`, `brueche.geteilt`, `negativ.plus-minus`, `negativ.mal-geteilt`, `prozent.prozentwert`, `prozent.grundwert-satz`, `prozent.dreisatz`, `prozent.massstab`, `flaechen.parallelogramm`, `flaechen.dreieck`, `flaechen.vieleck`, `daten.haeufigkeit`, `daten.kreisdiagramm`, `daten.mittelwert` | none |
| BR | `brueche.gemischt`, `brueche.mal`, `brueche.geteilt`, `negativ.plus-minus`, `negativ.mal-geteilt`, `prozent.prozentwert`, `prozent.grundwert-satz`, `prozent.dreisatz`, `prozent.proportional`, `prozent.massstab`, `terme.variable-einsetzen`, `terme.variable-aufstellen`, `terme.gleichung-loesen`, `geometrie.winkel-beziehungen`, `geometrie.dreiecke`, `geometrie.spiegeln`, `geometrie.kongruenz`, `flaechen.parallelogramm`, `flaechen.dreieck`, `flaechen.vieleck` | none |
| BM | `brueche.gemischt`, `brueche.mal`, `brueche.geteilt` (S1), `negativ.plus-minus` (S1), `negativ.mal-geteilt` (S1), `daten.mittelwert` | none |
| NG | `brueche.mal`, `brueche.geteilt`, `prozent.dreisatz`, `prozent.massstab`, `terme.variable-einsetzen`, `terme.variable-aufstellen`, `geometrie.dreiecke`, `geometrie.spiegeln`, `flaechen.dreieck` (S1), `flaechen.vieleck` (S1), `daten.haeufigkeit`, `daten.kreisdiagramm`, `daten.mittelwert`, `daten.kennwerte` | none |
| NR | `prozent.massstab`, `terme.variable-einsetzen`, `terme.variable-aufstellen`, `geometrie.dreiecke`, `geometrie.spiegeln`, `flaechen.dreieck` (S1), `flaechen.vieleck` (S1), `daten.haeufigkeit`, `daten.kreisdiagramm`, `daten.mittelwert`, `daten.kennwerte` | none |
| BB | `brueche.gemischt` (S1), `brueche.mal`, `brueche.geteilt`, `prozent.dreisatz`, `prozent.proportional`, `geometrie.winkel-beziehungen`, `geometrie.dreiecke`, `geometrie.spiegeln`, `geometrie.kongruenz`, `flaechen.vieleck` (S1), `daten.haeufigkeit` (S1), `daten.kreisdiagramm` (S1), `daten.kennwerte` (S1, S2), `daten.chancen` | All of `negativ`, `prozent.bedeutung`, `prozent.umwandeln` |

**Core rule.** A skill is `core` if all five Bayern and NRW plans expect it by the end of Klasse 6, wherever the year falls. BB is reported separately, as its Jg. 6 is a different stage. Everything else is `opt`.

### 2.6 Out of scope

Kreis Umfang and Fläche, π; Boxplots and quartiles; Laplace and tree diagrams; indirect proportionality; Zinsrechnung beyond a simple Rabatt or Zins item at Stufe 3 in BG and BR; prozentuale Veränderung, vermehrter and verminderter Grundwert; Potenzen with negative exponents (BG only [2]) and Primfaktorzerlegung as its own skill (BG, NG); constructions with Zirkel and Lineal (BR 6 [6]), because free drawing cannot be auto-checked fairly; Prismen and Zylinder; spreadsheets and Geometriesoftware; free-text Antwortsätze; algebraic free input. Förderschule plans were not read.

## 3. Learning science and age-specific findings

General findings carry over from [42]: retrieval practice (L1), spacing (L2), interleaving (L3), elaborated feedback (L4), worked examples (L6), and praise and reward research (M1, M2, M6, M16). Unlike Klasse 2, some of this evidence comes from close to the target age, as F13–F15 show.

| ID | Finding | Evidence | Design consequence |
|---|---|---|---|
| F1 | **Natural number bias in fractions.** Conceptual knowledge of fractions requires inhibiting the tendency to view them as two independent whole numbers [19]. In 60 US 6th graders (mean age 12.04) and 60 8th graders, the independent-whole-numbers strategy (3/5 + 1/4 = 4/9) made up 14 % of trials [19]. A German-language review lists typical errors in fraction addition and subtraction; only its abstract was seen, without frequencies [20]. | E (US, N = 120) | Fraction magnitude first: bars and number lines before algorithms. Bug `zaehler-nenner-addiert`. A plausibility hint ("Ist das mehr als 1/2?"). |
| F2 | **Importing the wrong procedure.** Wrong-operation strategies were more common still, 26 % of trials (3/5 × 4/5 = 12/5) [19]. Accuracy: 60 % addition, 68 % subtraction, 48 % multiplication, 20 % division; 41 % overall in 6th grade, 57 % in 8th; 55 % with equal denominators, 43 % with unequal (pooled figures across grades except where stated) [19]. | E | Mix operations only after each is secure, and then mix on purpose (F14). Bugs `nenner-bleibt`, `hauptnenner-mal`. Division gets its own slow route with "Wie oft passt?". |
| F3 | **Gaps widen.** Accuracy gains from 6th to 8th grade were larger for higher than for lower achievers on all eight problem types [19]. | E (cross-sectional) | Keep Stufe 1 open in all plans, with no sense of being behind. Fraction skills stay in review. |
| F4 | **Decimals.** 3,204 Australian students, 1995–1999, 30-item comparison test. Year 6: 31 % expert, 33 % longer-is-larger, 19 % shorter-is-larger, 18 % other. Year 7: 48 % expert, 17 % and 17 %. Experts reach about two thirds only by Year 10 [21]. Shorter-is-larger is most persistent in secondary school among a subgroup [23]. Whole-number thinking is a common reason for longer-is-larger [22]. | E (Australia, older data) | `dezimal.vergleichen` varies lengths in both directions from Stufe 2, so each rule fails sometimes. Bugs `laenger-groesser`, `kuerzer-groesser`. |
| F5 | **Percent.** A design study links conceptual and language learning through the percent bar for students with low academic language proficiency (qualitative, abstract seen) [24]. The KMK names the Prozentstreifen [1]; LISUM uses it at E [17]. Base-confusion frequencies could not be verified from a primary source (section 8). | D, weak E | `percentBar` in all percent skills. Named terms Grundwert, Prozentwert, Prozentsatz only in plans that use them. Base bugs are marked H. |
| F6 | **Negative numbers.** Minus-sign meanings and whole-number principles are known obstacles, but the studies opened are younger: 61 first graders over-relied on whole-number principles at first [28]; clinical interviews with ages 6–10 identified persistent obstacles [27] (abstracts). | Weak E for this age | Separate Vorzeichen and Rechenzeichen in text and audio. Number line with arrows, as BM requires [9]. Bugs marked H. |
| F7 | **Letters in algebra.** Research finds most students up to age 15 cannot interpret letters as generalised numbers or specific unknowns; they ignore them, replace them by values or use them as shorthand names [29]. About 2,000 students aged 11–15; 67 % of a small Year 7 pre-test (n = 42) gave no response before teaching; after eight weeks, 29 % on one item gave lower-level responses or omissions [29]. | E (Australia) | Variables only as numbers. Never "a = Apfel". `terme.variable-aufstellen` always states "x ist die Anzahl". |
| F8 | **Proportion overused.** 1,062 students in Grades 2–8: errors of overapplying proportional methods rose up to Grade 5; from Grade 6 students began to distinguish more often, but errors remain in Grade 8 (abstract) [30]. | E | `prozent.proportional` and `prozent.dreisatz` include nonproportional traps at Stufe 3. |
| F9 | **Area, perimeter, volume.** 445 sixth graders in Ankara: "confusing area formula with perimeter formula", "believing a box has more than one surface area", "using the volume formula for surface area" (abstract) [31]. A teaching guide citing Van de Walle reports confusion of slanted side and height [32]. | E (abstract), D | `figure` always marks the height. A distractor side from Stufe 2. Bugs `umfang-flaeche`, `schraege-seite`, `volumen-oberflaeche`. |
| F10 | **Mean.** Interviews with 21 children (7 each from grades 4, 6, 8) and 8 teachers found four approaches: average as modal, reasonable, midpoint, algorithmic relationship. Some could recite the algorithm but rarely used it [33]. | Weak E (1990, small) | Mean as levelling out. Stufe 3 asks about a missing value and an outlier, not only computation. |
| F11 | **Angles.** A practitioner article, citing literature, reports angle read as a distance between points, wrong placement of the protractor centre, and failure to start at zero [34]. No primary study was opened. | D | Vary arm length with the same angle. Highlight the scale at Stufe 1. Bugs marked as such. |
| F12 | **Language.** In a study of Zentrale Prüfungen 10 in NRW (Gesamtschule Erweiterungskurse in the Ruhr area), language proficiency affected maths performance more than family language, time of German acquisition, socio-economic status or migration background taken alone [25]; slides from the same group say the same [26]. 25.4 % of fourth graders were below Kompetenzstufe III in reading in IGLU 2021 [48]. Word and sentence length, unfamiliar words and semantic structure make word problems harder [54]. | E (correlational) | Short text (section 4), but keep Fachsprache and teach it. Do not remove the words that the curriculum requires. |
| F13 | **Online practice with feedback.** RCT with 2,850 seventh graders in 43 schools: online homework with hints and teacher reports raised end-of-year scores, and low achievers benefited most (abstract) [35]. The effect includes teacher training, which this portal has no part in. | E, indirect | Keep hints and second attempts. Do not claim this effect size. The adult page explains the portal does not replace the teacher. |
| F14 | **Interleaving at the right age.** RCT with 54 seventh-grade classes (787 students): one month later, interleaved 61 % against blocked 38 %, d = 0.83, on an unannounced test [36]. | E, strong for this age | Mixed rounds and review are a default path after a skill reaches Sicher. Expect lower scores during practice, and say so to adults (M16). |
| F15 | **Games and erroneous examples.** 153 middle-school students on decimals: game against conventional computer work, d = .43 immediate and d = .37 delayed, more enjoyment (d = .95), and low prior knowledge benefited most (abstract) [37]. One comparison cannot isolate which feature worked. | E, single study | No reason to add reward mechanics. Fehlerdetektiv stays, with fictional work ("Diese Rechnung stimmt noch nicht"). |
| F16 | **Motivation falls.** Meta-analysis of 107 longitudinal studies: overall Δ = −.108 over about 1.65 years; largest declines in intrinsic motivation, maths self-concept and mastery goals, and larger in Europe. School stage and transition were not significantly associated (abstract) [38]. German Gymnasium grades 5–6: self-concept fell about 0.37 SD per year; less under a perceived individual reference norm (correlational, M16 in [42]). | E | Compare only with the child's own earlier work. No class or group comparison. Never suggest a fixed level. |
| F17 | **Respect and status.** A review argues interventions fail with middle adolescents (13–17) when they do not honour the desire for status and respect, and notes effects are stronger up to about ages 9–12 [39]. NN/g, testing 100 users aged 13–17: "Avoid anything that sounds condescending or babyish", prefer neutral graphics [41]. Separate research on ages 3–12 calls for targeting content narrowly by age [43]. | D, indirect. No study tests 11–12-year-olds directly | Our users sit at the transition. Choose the older register. Check in a pilot. |
| F18 | **School-type identity.** Berlin, N = 1,278, two tracks: large differences in collective school-type identity, with incremental prediction of motivation beyond self-concept and track (abstract, cross-sectional) [40]. | E, correlational | No school-type label in child-facing results. That labels on an app would have such an effect is our inference (H). |
| F19 | **Type.** For 5th graders a smaller font raised comprehension, with no effect of line length or spacing (100 children across grades 2 and 5, abstract) [44]. NN/g suggests 14 point for young and 12 point for older children [43]. | E small, D | No need for extra-large text. Fractions need more height than plain text (7.1). |
| F20 | **Touch.** Holdover touches: ages 7–10 M = 3.93 %, 11–13 M = 1.59 %, 14–17 M = 0.69 %, adults M = 0.56 %. The 7–10 group had special difficulty with 0.25-inch targets, older groups less so. Inset targets were missed nearly twice as often [45]. | E (small) | Keys can shrink slightly from Klasse 4. Hit areas still reach gaps and edges. Keep a shorter holdover guard. |
| F21 | **Time.** NRW sets homework for Klassen 5–7 to 60 minutes a day across subjects, schools without gebundenen Ganztag [46]. Digital practice works best at about 30–75 minutes a week (L10 in [42]). | N, E | One round should not fill the frame (7.3). |

**Privacy (no change).** Art. 8 DSGVO applies only where processing rests on consent for a service offered directly to a child; below 16 a parent must give or authorise it, and member states may lower the age to no less than 13 [49]. Germany has not lowered it [50]. All users of Mathe 6 are under 16. Mathe 6 keeps the same no-consent-data approach as Klasse 4 and Klasse 2 (P1, P2): no accounts, no personal data, no third-party requests, storage only after opt-in, so Art. 8 is not triggered apart from the unavoidable hosting logs. The plan choice follows this too: it stays on the device, is held in memory only unless the child has opted in to storage, never goes into a URL, and is never printed on a worksheet. Land and school type alone with no identifier and no transmission do not identify anyone in our reading, but see section 8.

## 4. Text rules for 11–12-year-olds

**What is known.** F12 shows that language matters and which factors make text harder. It gives no numerical limits for German 11–12-year-olds, and we opened no reading norm for Klasse 6. All numbers below are heuristics (H), chosen to be checkable by a unit test. Words are whitespace tokens; symbols + − · : = □ do not count, and a fraction such as 3/4 counts as one word. Klasse-4 Sachaufgaben (3–4 lines) are the starting point. The aim differs from Klasse 2: reduce unnecessary load, but keep and teach the language of the subject [24][25].

| # | Rule | Basis |
|---|---|---|
| T1 | Non-story tasks: at most 18 words. | H |
| T2 | Sachaufgaben: at most 30 words on Stufe 1, 40 on Stufe 2, 50 on Stufe 3. | H |
| T3 | At most 4 sentences including the question (5 on Stufe 3). | H |
| T4 | At most 14 words per sentence (18 on Stufe 3). | H; sentence length [54] |
| T5 | At most one subordinate clause per task, none on Stufe 1. Allowed: `weil, wenn, dass`. Banned: `obwohl, nachdem, während, falls, sofern, indem`. No relative clauses on Stufe 1. | H; structure [54] |
| T6 | Present tense. Ban `würde, hätte, wäre`. Passive only in fixed price phrases: "wird um 20 % gesenkt". | H |
| T7 | One question, always last. At most 3 numbers per sentence. | H |
| T8 | Words of at most 16 letters outside the Fachwort allowlist. | H; unfamiliar words [54] |
| T9 | No idioms and no double negatives. Repeat the noun rather than `sie`, `er`, `es` across sentences. | H |
| T10 | Digits for quantities. Decimal comma, space as thousands separator, units with a space: "3,50 €", "12 cm²". | N, convention |
| T11 | Notation: fractions stacked, in text as inline fractions. · and : for operations. Coordinates P(3 \| 5). Minus always U+2212. Negative second operand in brackets: 5 − (−3). | H, from common class notation; check with teachers |
| T12 | Fachwörter from the plans are allowed and wanted, each with a short tap-to-see explanation: Zähler, Nenner, erweitern, kürzen, gleichnamig, Hauptnenner, Kehrwert, gemischte Zahl, Zehntel, Hundertstel, Tausendstel, Vorzeichen, Gegenzahl, Betrag, Term, Variable, Schenkel, Scheitel, Radius, Durchmesser, Grundseite, Höhe, Mittelwert, relative Häufigkeit. Grundwert, Prozentwert, Prozentsatz only inside percent-calculation skills. | N [1][2][6][9][13]; F12 |
| T13 | One term per concept in a plan. Aliases by plan: Dezimalbruch/Dezimalzahl, Zahlenstrahl/Zahlengerade, Rauminhalt/Volumen, Oberflächeninhalt/Oberfläche. Without a plan use Dezimalzahl, Zahlenstrahl (positive) or Zahlengerade (with negatives), Volumen. | N [2][6][9][13] |
| T14 | Varied names of everyday German classes, no stereotypes. Contexts: Schule, Klassenfahrt, Sport, Musik, Kochen, Fahrrad, Taschengeld, Temperatur, Wetter, Bauen. No brands. | H; C13 in [42] |
| T15 | Banned contexts: body weight or diets, family income comparisons, alcohol, gambling for money. Spinner or dice only as a game or experiment. | H |
| T16 | Words such as "Kinder" and "Kids" do not appear in interface text. In tasks, say "die Klasse 6b", "fünf Personen" or names. | D [41], F17 |
| T17 | A keyword must not predict the operation. "von" also appears in non-multiplication text; "mehr" in subtraction. | E [54] |
| T18 | Pictures show the story or data. No decoration in the task area. Data only in a diagram is fine in `daten`. | E, carried from T14 in [57] |
| T19 | Hints: at most 14 words and 2 short sentences. Praise: at most 10 words. Worked steps: one line each, at most 5 steps. | H |
| T20 | "Vorlesen" reads the whole task and hint. Spoken forms need checking per skill: "drei Viertel", "minus drei", "drei Komma eins vier" (never "drei Komma vierzehn"), "Punkt P mit den Koordinaten drei und fünf". | H; P12 in [42] |

**Heuristic checks to automate:** a test that runs T1–T8 and T16 on sampled generator output; a word allowlist report. LIX was considered and not used: we opened no German norm at this age.

## 5. Typical misconceptions and bug hints

Basis: [n] means the pattern is documented in that source. **H** means a plausible pattern from our own didactic reasoning, with no source opened; check these in the pilot. A bug is matched only when the wrong answer computes exactly from the pattern; otherwise a generic step hint is used. Hints never contain "falsch" or "leider". Numbers in hints are examples and are filled by the generator.

| Area | Bug | Wrong pattern | Hint | Basis |
|---|---|---|---|---|
| Brüche | `zaehler-nenner-addiert` | 1/2 + 1/3 = 2/5 | Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich. | [19] |
| Brüche | `plausibel-kleiner` | Sum smaller than a summand, 1/2 + 1/3 = 2/5 | Schau noch einmal: 2/5 ist kleiner als 1/2. Kann das stimmen? | H, cf. [19] |
| Brüche | `nenner-bleibt` | 3/5 · 4/5 = 12/5 | Beim Malnehmen gilt: Zähler mal Zähler, Nenner mal Nenner. | [19] |
| Brüche | `hauptnenner-mal` | Finds a common denominator, multiplies numerators only | Für Malaufgaben brauchst du keine gleichen Nenner. | H, cf. [19] |
| Brüche | `nur-zaehler-erweitert` | 2/3 erweitert mit 2 gives 4/3 | Beim Erweitern verfeinerst du: Zähler und Nenner ändern sich beide. | H, cf. [12] |
| Brüche | `kuerzen-subtrahiert` | 6/8 gekürzt gives 4/6 (minus 2) | Kürzen heißt teilen: Zähler und Nenner durch dieselbe Zahl. | H |
| Brüche | `groesserer-nenner` | 1/8 > 1/4 because 8 > 4 | Je mehr Teile das Ganze hat, desto kleiner ist ein Teil. | [19], natural number bias |
| Brüche | `abstand-ganzes` | 7/8 and 3/4 compared by numerator only | Vergleiche mit dem Rest bis zum Ganzen: 1/8 und 1/4. | H |
| Brüche | `gemischt-umgewandelt` | 2 1/3 becomes 3/3 or 21/3 | 2 Ganze sind 6 Drittel. Dazu kommt noch 1 Drittel. | H, cf. [20] |
| Brüche | `kehrwert-zweite-zahl` | 2/3 : 4/5 with the first fraction inverted | Du nimmst den Kehrwert der zweiten Zahl, nicht der ersten. | [19] (inverting the wrong fraction) |
| Brüche | `teilen-macht-kleiner` | Rejects 2 : 1/4 = 8 as too large | Wie oft passt 1/4 in 2? Zähl die Viertel in 2 Ganzen. | H, cf. [18] |
| Brüche | `anteil-ganzes` | 3/4 sind 12, gives 9 | Gesucht ist das Ganze. Wenn 3/4 zwölf sind, wie viel ist 1/4? | H |
| Dezimal | `laenger-groesser` | 3,14 > 3,5 | Vergleiche Stelle für Stelle: zuerst die Zehntel, dann die Hundertstel. | [21][22] |
| Dezimal | `kuerzer-groesser` | 0,4 > 0,45; 3,5 > 3,57 | Beide haben 4 Zehntel. Die zweite Zahl hat noch etwas dazu. | [21][23] |
| Dezimal | `null-ignoriert` | 3,05 read as 3,5 | Die 0 steht für 0 Zehntel. Die 5 sind Hundertstel. | H, cf. [22] |
| Dezimal | `komma-rechtsbuendig` | 3,5 + 1,25 = 1,60 | Schreibe Komma unter Komma. Dann stehen die Stellen richtig. | H |
| Dezimal | `komma-wie-plus` | 0,4 · 0,3 = 1,2 | Zähle die Stellen nach dem Komma in beiden Faktoren zusammen. | H |
| Dezimal | `mal-groesser` | Rejects 0,5 · 8 = 4 as too small | Die Hälfte von 8 ist weniger als 8. Das passt hier. | H, cf. [18] |
| Dezimal | `komma-nicht-verschoben` | 0,8 : 0,2 = 0,4 | Wie oft passt 0,2 in 0,8? Verschiebe das Komma bei beiden Zahlen. | H, cf. [18] |
| Dezimal | `zehner-bruch-direkt` | 3/4 = 3,4 | 3/4 heißt 3 : 4. Erweitere den Bruch auf Hundertstel. | H |
| Dezimal | `runden-abschneiden` | 2,96 auf Zehntel gives 2,9 | Schau auf die nächste Stelle. Eine 6 bedeutet: aufrunden. | H |
| Dezimal | `einheit-100-1000` | 1,5 kg = 150 g | 1 kg sind 1000 g. Wie viel sind dann 1,5 kg? | H |
| Negativ | `vorzeichen-ignoriert` | −7 > −3 | Auf der Zahlengeraden liegt −7 weiter links. Links ist kleiner. | H, cf. [28] |
| Negativ | `minus-richtung` | −3 + 5 = −8 | Plus 5 heißt: 5 Schritte nach rechts auf der Zahlengeraden. | H, cf. [27] |
| Negativ | `ueber-null` | −3 + 5 = 8 | Geh von −3 zuerst bis 0. Wie viele Schritte bleiben dann? | H, cf. [28] |
| Negativ | `zeichen-verwechselt` | 5 − (−3) = 2 | Eine negative Zahl abziehen heißt: die Gegenzahl addieren. | H, cf. [17] |
| Negativ | `produkt-vorzeichen` | (−3) · (−4) = −12 | Zwei negative Faktoren ergeben ein positives Produkt. | H |
| Negativ | `aenderung-betrag` | From −3 °C to 5 °C gives 2 | Zähle bis 0 und dann weiter bis 5. Beides gehört dazu. | H |
| Prozent | `prozent-als-zahl` | 25 % von 200 = 25 | 25 % heißt 25 von 100. Wie viel ist das von 200? | H, cf. [24] |
| Prozent | `grundwert-vertauscht` | 20 % sind 12, gives 2,4 | Hier ist 12 der Teil. Gesucht ist das Ganze, also 100 %. | H, cf. [24] |
| Prozent | `satz-wert-verwechselt` | 15 von 50 answered as 15 % | 15 ist der Anteil. Rechne ihn auf 100 um: Wie viel von 100? | H, cf. [24] |
| Prozent | `prozent-subtrahiert` | Discount: answers the discount, not the new price | Gefragt ist der neue Preis. Wie viel bleibt nach dem Rabatt? | H |
| Prozent | `bruch-prozent-ziffern` | 1/4 = 14 %; 3/5 = 35 % | Erweitere den Bruch auf Hundertstel. Dann siehst du die Prozent. | H |
| Dreisatz | `additiv-statt-multiplikativ` | 3 Hefte 6 €, 5 Hefte gives 8 € | Rechne zuerst den Preis für 1 Heft aus. | H, cf. [30] |
| Dreisatz | `immer-proportional` | Height at age 20 from height at age 10 | Prüfe zuerst: Wächst beides im gleichen Verhältnis? | [30] |
| Dreisatz | `massstab-richtung` | 1 : 100, 3 cm gives 0,03 cm | Auf der Karte ist es kleiner. In echt ist es 100-mal so lang. | H |
| Terme | `links-nach-rechts` | 2 + 3 · 4 = 20 | Punktrechnung kommt vor Strichrechnung. | H, [9] names the rule |
| Terme | `buchstabe-als-wort` | "h" read as Höhe object, not a number | Die Variable steht für eine Zahl. Setze eine Zahl ein. | [29] |
| Terme | `buchstabe-weg` | 2x + 1 with x = 3 gives 24 (or 6) | 2x heißt 2 · x. Rechne 2 · 3, dann plus 1. | [29] (letter given a value, ignored) |
| Terme | `umkehr-gleiche-rechnung` | x + 5 = 12 gives 17 | Die Umkehrung von plus 5 ist minus 5. | H |
| Terme | `klammer-teilweise` | 3 · (4 + 2) = 14 | In der Klammer steht eine Summe. Rechne sie zuerst aus. | H |
| Geometrie | `winkel-armlaenge` | Longer arms read as larger angle | Die Länge der Schenkel ist egal. Es zählt die Drehung. | [34] |
| Geometrie | `skala-verwechselt` | Reads 130° instead of 50° | Der Schenkel liegt auf der 0 dieser Skala? Lies auf derselben Skala ab. | [34] |
| Geometrie | `winkel-art` | 100° called spitz | Ein spitzer Winkel ist kleiner als 90°. | H |
| Geometrie | `radius-durchmesser` | d = 6 cm gives r = 12 cm | Der Durchmesser geht durch den ganzen Kreis. Der Radius ist die Hälfte. | H |
| Geometrie | `quadrat-kein-rechteck` | Square denied as Rechteck or Parallelogramm | Prüfe die Eigenschaften: Vier rechte Winkel hat auch das Quadrat. | H, cf. [9] |
| Geometrie | `koord-getauscht` | P(3 \| 5) placed at (5, 3) | Zuerst nach rechts: x. Dann nach oben: y. | H |
| Geometrie | `koord-ab-eins` | Counts from 1 rather than 0 | Der Ursprung ist 0. Zähle die Schritte ab dem Ursprung. | H |
| Geometrie | `spiegel-abstand` | Mirror image at wrong distance | Original und Bild haben denselben Abstand zur Achse. | H, cf. [6] |
| Geometrie | `kongruent-gedreht` | Rotated figure called not congruent | Die Lage ist egal. Passen die Figuren genau aufeinander? | H, cf. [17] |
| Fläche | `umfang-flaeche` | Rectangle 3 × 5: gives 16 for area, or 15 for perimeter | Fläche misst das Innere, Umfang den Rand. Was ist gefragt? | [31] |
| Fläche | `schraege-seite` | Parallelogram: base · slanted side | Die Höhe steht senkrecht auf der Grundseite. Nimm nicht die schräge Seite. | [32] |
| Fläche | `dreieck-ohne-halb` | Triangle: g · h with no half | Ein Dreieck ist die Hälfte eines Parallelogramms. Denk an die Hälfte. | H |
| Fläche | `flaecheneinheit-10` | 1 m² = 10 dm²; 1 dm² = 10 cm² | 1 dm² ist ein Quadrat: 10 Reihen mit je 10 cm². | H, cf. [31] |
| Fläche | `volumeneinheit-10` | 1 dm³ = 10 cm³ or 100 cm³ | 1 dm³ hat 10 Schichten mit je 100 cm³. | H, cf. [31] |
| Fläche | `volumen-oberflaeche` | a · b · c given as surface | Für die Oberfläche addierst du alle sechs Flächen. | [31] |
| Fläche | `oberflaeche-drei-flaechen` | ab + ac + bc without doubling | Der Quader hat sechs Flächen. Je zwei sind gleich groß. | H, cf. [31] |
| Fläche | `netz-ueberlappt` | Accepts a net with overlapping faces | Falte das Netz im Kopf. Liegen zwei Flächen aufeinander? | H, cf. [9] |
| Daten | `achse-von-null` | Truncated axis read as true proportion | Schau, wo die Achse beginnt. Die Säulen täuschen dann leicht. | H, cf. [2][9] |
| Daten | `achse-schritt` | Reads bar height as count | Schau an der Achse, wie viel ein Kästchen zählt. | H |
| Daten | `mittel-groesster-haeufigster` | Mean given as the most frequent value | Das ist der häufigste Wert. Der Mittelwert verteilt alles gleichmäßig. | [33] |
| Daten | `mittel-anzahl` | Forgets to divide, or divides by a wrong count | Teile die Summe durch die Anzahl aller Werte. | H, cf. [33] |
| Daten | `mittel-ohne-null` | Leaves a 0 out of the count | Auch die 0 ist ein Wert. Zähle sie mit. | H |
| Daten | `median-ungeordnet` | Median of unsorted list | Ordne die Werte zuerst der Größe nach. | H |
| Daten | `absolut-relativ` | Compares 12 of 30 with 10 of 20 by counts | Die Gruppen sind verschieden groß. Vergleiche die Anteile. | H, cf. [2] |
| Daten | `kreis-sektor-winkel` | 25 % as 25° | Der ganze Kreis hat 360°. Wie viel davon sind 25 %? | H |
| Daten | `kreis-gesamtzahl` | 50 % answered as count without total | Gefragt ist die Anzahl. Wie viele Personen sind es insgesamt? | H |

## 6. Skill catalogue

**Format.** S1, S2, S3 are Stufen; each cell is the content of that Stufe, and AB varies the demand inside it; each cell is at most 12 words. Answer types and visuals use the existing app vocabulary; **NEW** marks one from the lists at the end of this section, and **EXT** an extension of an existing one. **Basis** cites the plans, with the year if not Klasse 6. **Status** is `core` or `opt` under the rule in 2.5. **Passt zu** lists plans; "alle" means all six, "alle außer BB" the five others. Plan restrictions per Stufe are in 2.5. Skills appear in teaching order. Subsections are deliberately unnumbered: this section has no §6.4 (see 7.2).

Eight topics, with stable ids: `brueche`, `dezimal`, `negativ`, `prozent`, `terme`, `geometrie`, `flaechen`, `daten`.

### `brueche` (Brüche)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `brueche.anteil` | Anteile als Bruch | Du siehst einen Anteil und schreibst ihn als Bruch. | Bar or circle; Nenner 2, 3, 4, 5, 6, 8, 10 | Unsorted parts, Nenner ≤ 12; several Ganze | Find the Ganzes from a drawn part; Bruch as division | fraction NEW, choice | fractionBar, fractionCircle NEW | BG 1.1; BR LB1; BM 1.1; NG/NR Ari; BB D | core | alle |
| `brueche.von-groessen` | Bruchteile von Größen | Du rechnest aus, wie viel ein Bruchteil von einer Größe ist. | 1/n of ≤ 60, exact, € or cm | a/b of ≤ 120, g, m, min | From part to Ganzes: 3/4 sind 12 € | number | fractionBar NEW | BG 1.1; BR LB1; BM 1.1; NG Ari 13; NR Ari 11; BB D | core | alle |
| `brueche.zahlenstrahl` | Brüche am Zahlenstrahl | Du liest Brüche am Zahlenstrahl ab und trägst sie ein. | 0–1, Nenner 2, 4, 5, 10, ticks given | 0–3, unechte Brüche, ticks given | 0–2, no matching ticks; estimate with tolerance | numberline EXT, fraction NEW | numberLine EXT | BG 1.1; BR LB1; BM 1.1; NG/NR Ari; BB D | core | alle |
| `brueche.erweitern-kuerzen` | Erweitern und Kürzen | Du änderst die Einteilung, und der Wert bleibt gleich. | Given factor 2, 3, 5; Nenner ≤ 20 | Find the factor; fully kürzen, Nenner ≤ 60 | Target Nenner; find the unequal fraction in a set | fraction NEW, choice | fractionBar NEW | BG 1.1; BR LB1; BM 1.1; NG Ari 12; NR Ari 12; BB D | core | alle |
| `brueche.vergleichen` | Brüche vergleichen | Du findest heraus, welcher Bruch größer ist. | Same Nenner or same Zähler | One Nenner a multiple of the other, ≤ 20 | Nenner ≤ 12 unrelated; compare with 1/2; order 4 | choice, order EXT | fractionBar NEW, numberLine EXT | BG 1.1; BR LB1; BM 1.1; NG/NR Ari; BB D | core | alle |
| `brueche.gemischt` | Gemischte Zahlen | Du wandelst gemischte Zahlen und unechte Brüche um. | 1 1/2 and 2 3/4 to unechter Bruch | Both directions, Nenner ≤ 10 | Order mixed and unechte Brüche; place on the line | fraction NEW, order EXT | fractionCircle NEW | BG 1.3; BR LB1; BM 1.1; NRW not named; BB Alltag | opt | BG, BR, BM, BB |
| `brueche.plus-minus` | Brüche addieren und subtrahieren | Du rechnest plus und minus mit Brüchen. | Gleichnamig, Nenner ≤ 12 | One Nenner a multiple of the other, ≤ 20 | Hauptnenner ≤ 24; gemischte Zahlen only where planned | fraction NEW | fractionBar NEW | BG 1.3; BR LB1; BM 1.2; NG Ari 14; NR Ari 13; BB D | core | alle |
| `brueche.mal` | Brüche multiplizieren | Du nimmst Brüche mal und rechnest Anteile von Anteilen. | Bruch · natürliche Zahl, Nenner ≤ 10 | Bruch · Bruch, Nenner ≤ 10; vorher kürzen | Anteil vom Anteil, story; result smaller than factors | fraction NEW | fractionBar NEW | BG 1.4; BR LB1; BM 1.2; NG Ari 14; BB D; NR 7/8 | opt | BG, BR, BM, NG, BB |
| `brueche.geteilt` | Brüche dividieren | Du teilst Brüche und überlegst, wie oft etwas passt. | Bruch : natürliche Zahl, Nenner ≤ 10 | Bruch : Bruch by Kehrwert, Nenner ≤ 10 | Wie oft passt? Result larger than the Dividend | fraction NEW, number | fractionBar NEW | BG 1.4; BR LB1; BM 1.2 S1; NG Ari 14; BB D; NR 7/8 | opt | BG, BR, BM (S1), NG, BB |

### `dezimal` (Dezimalzahlen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `dezimal.stellenwert` | Stellen nach dem Komma | Du liest Zehntel, Hundertstel und Tausendstel in der Stellentafel. | Name a digit's place, up to 2 decimals | Up to 3 decimals, inner zeros: 3,05 | Bundling: 12 h = 0,12; split into places | number, multi | placeValue EXT | BG 1.2; BR LB1; BM 1.1; NG/NR Darstellung; BB D | core | alle |
| `dezimal.bruch-umwandeln` | Bruch und Dezimalzahl | Du schreibst Brüche als Dezimalzahlen und umgekehrt. | Zehnerbrüche: 7/10, 23/100 | Erweitern auf 10 or 100: 3/4, 2/5, 7/20 | Zähler : Nenner; periodic 1/3, 1/6 where planned | number, fraction NEW | placeValue EXT, fractionBar NEW | BG 1.2; BR LB1; BM 1.1; NG/NR Darstellung; BB D, periodic E | core | alle |
| `dezimal.vergleichen` | Dezimalzahlen vergleichen | Du vergleichst Dezimalzahlen Stelle für Stelle. | Same number of decimals; different whole part | Different lengths: 3,14 and 3,5; 0,4 and 0,45 | Order 5 numbers; find a number in between | choice, order | numberLine, placeValue EXT | BG 1.2; BR LB1; BM 1.1; NG/NR Ari; BB D | core | alle |
| `dezimal.zahlenstrahl` | Dezimalzahlen am Zahlenstrahl | Du liest Dezimalzahlen ab und trägst sie ein. | 0–1, ticks every 0,1 | 0–5, ticks every 0,1, labels every 1 | Section 3,4–3,5, ticks every 0,01 | numberline | numberLine | BM 1.1; BG, BR, NG, NR Zahlendarstellung; BB D | core | alle |
| `dezimal.runden` | Dezimalzahlen runden | Du rundest auf die passende Stelle. | To whole numbers, one decimal | To Zehntel or Hundertstel; 2,96 to 3,0 | Sensible rounding: price, length, Überschlag | number | numberLine | BG 1.2; BR LB1; BM 1.2; NG Ari 10; NR Ari 2; BB D | core | alle |
| `dezimal.plus-minus` | Dezimalzahlen addieren und subtrahieren | Du rechnest plus und minus mit Dezimalzahlen. | Same decimals, ≤ 100, no carry past the comma | Different lengths: 3,5 + 1,25; with carry | Three numbers; Überschlag first; money stories | number, written EXT | written EXT | BG 1.3; BR LB1; BM 1.2; NG/NR Ari; BB D | core | alle |
| `dezimal.mal` | Dezimalzahlen multiplizieren | Du nimmst Dezimalzahlen mal und setzt das Komma. | · 10, 100, 1000; one digit · decimal | 0,4 · 0,3; one decimal in each factor | Two digits each, written; place comma by Überschlag | number, written EXT | written EXT | BG 1.4; BR LB1; BM 1.2; NG/NR Grundrechenarten; BB D | core | alle |
| `dezimal.geteilt` | Dezimalzahlen dividieren | Du teilst Dezimalzahlen und verschiebst das Komma. | : 10, 100; : one-digit number, result ends | Divisor with one decimal: 0,8 : 0,2 | Result does not end, round; stories | number, written EXT | written EXT | BG 1.4; BR LB1; BM 1.2; NG/NR Grundrechenarten; BB D | core | alle |
| `dezimal.groessen` | Kommazahlen bei Größen | Du wandelst Größen um und schreibst sie mit Komma. | € to ct; m to cm; 1,25 m | kg to g; km to m; 0,75 kg | l to ml; order mixed units | number, order | table | BG 1.2; BR LB1; BM 5 and 1.1; NG/NR Größen; BB D | core | alle |

### `negativ` (Negative Zahlen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `negativ.kontext` | Negative Zahlen im Alltag | Du beschreibst Temperatur, Konto und Höhe mit negativen Zahlen. | Read a thermometer, −20 to 20 | Konto, Stockwerke, Meereshöhe; choose the number | Which statement fits; Gegenzahl in context | number EXT, choice | numberLine EXT | BG 5; BR 5; BM 5; NG Ari 15; NR Ari 14; BB E | core | alle außer BB |
| `negativ.zahlengerade` | Die Zahlengerade | Du liest ganze Zahlen ab und trägst sie ein. | −10 to 10, ticks every 1 | −50 to 50, ticks every 5 | −2 to 2, halves or quarters, where planned | numberline EXT | numberLine EXT | BG 5, 6; BR 5, 6; BM 5, 6; NG/NR Ganze Zahlen | core | alle außer BB |
| `negativ.vergleichen` | Negative Zahlen vergleichen | Du ordnest positive und negative Zahlen. | One negative and one positive, or 0 | Two negatives: −3 and −7 | Order 5 numbers; Betrag and Gegenzahl | choice, order | numberLine EXT | BG 5; BR 5; BM 5; NG Ari 8; NR Ari 15 | core | alle außer BB |
| `negativ.aenderung` | Zustand und Änderung | Du rechnest aus, wie sich ein Stand ändert. | Start and change, ±20, no zero crossing | Crossing zero: −3 °C, 5 Grad wärmer | Find the change or the start | number EXT | numberLine EXT | BM 2.2; NG Ari 15; NR Ari 14; BG 5; BR 5 | core | alle außer BB |
| `negativ.plus-minus` | Plus und Minus mit negativen Zahlen | Du addierst und subtrahierst mit positiven und negativen Zahlen. | a ± b, b positive, integers ≤ 50 | a + (−b), a − (−b), integers ≤ 50 | Decimals and fractions ≤ 10, with signs | number EXT, fraction NEW | numberLine EXT | BG 5, 1.3; BR 5, LB1; BM 2.2 S1; NRW 7/8 | opt | BG, BR, BM (S1) |
| `negativ.mal-geteilt` | Mal und Geteilt mit negativen Zahlen | Du nimmst mal und teilst und findest das Vorzeichen. | Negative · natural number, factors ≤ 10 | Two negative factors; a : (−b), integers | Decimals and fractions; three factors | number EXT, fraction NEW | numberLine EXT | BG 5, 1.4; BR 5, LB1; BM 2.2 S1; NRW 7/8 | opt | BG, BR, BM (S1) |

### `prozent` (Prozent und Dreisatz)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `prozent.bedeutung` | Was heißt Prozent? | Du verstehst Prozent als Anteil von 100. | Hunderterfeld: 25 of 100 cells | Percent bar with 10 parts; 10 % steps | Same share with other totals: 3 of 20 | number, cells | grid, percentBar NEW | BG 1.1; BR LB1; BM 1.1; NG/NR Darstellung; BB E | core | alle außer BB |
| `prozent.umwandeln` | Bruch, Dezimalzahl, Prozent | Du wechselst zwischen Bruch, Dezimalzahl und Prozent. | 1/2, 1/4, 3/4, 1/10, 1/5 | Fünftel, Zwanzigstel; 0,35 and 35 % | Order mixed forms; 1/8 = 12,5 % | multi, order EXT, fraction NEW | percentBar, fractionBar NEW | BG 1.1; BR LB1; BM 1.1; NG Ari 8; NR Ari 15; BB E | core | alle außer BB |
| `prozent.prozentwert` | Prozent von einer Größe | Du rechnest aus, wie viel ein Prozentsatz vom Ganzen ist. | 50, 25, 10 % of ≤ 200 | 5, 20, 75 % of ≤ 500 | Any whole percent; Rabatt story, new price | number | percentBar NEW | BG LB3; BR LB6; BM 7; NRW 7/8 | opt | BG, BR |
| `prozent.grundwert-satz` | Prozentsatz und Grundwert | Du findest den Prozentsatz oder das Ganze. | Prozentsatz: 15 von 50 | Grundwert: 20 % sind 12 | Identify G, W, p in a story; simple Zins | number, choice | percentBar NEW | BG LB3; BR LB6; BM 7; NRW 7/8 | opt | BG, BR |
| `prozent.dreisatz` | Dreisatz | Du schließt über eine Einheit auf die gesuchte Größe. | Whole results: 3 Hefte 6 €, 5 Hefte? | Decimal unit price; three-column table | Decide first whether Dreisatz fits; two-step story | number, multi | table EXT | BG 5, LB3; BR 5, LB6; NG Fkt 2; BB D; BM 7; NR 7/8 | opt | BG, BR, NG, BB |
| `prozent.proportional` | Proportional oder nicht? | Du erkennst, ob zwei Größen proportional zueinander sind. | Complete a doubling table | Decide from table or graph; first quadrant | Find the Faktor; traps like age and height | choice, multi | table EXT, coordSystem NEW | BR LB6; BB D; BG 8; BM 7; NRW 7/8 | opt | BR, BB |
| `prozent.massstab` | Maßstab | Du rechnest mit Maßstäben von Plänen und Karten. | 1 : 100, plan to real length | 1 : 25 000, both directions, with unit change | Find the Maßstab from two lengths | number | ruler | BG 5; BR 5; NG Fkt 4; NR Fkt 4; BB E | opt | BG, BR, NG, NR |

### `terme` (Terme und Gleichungen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `terme.rechenterm` | Reihenfolge beim Rechnen | Du rechnest Terme mit Punkt vor Strich und Klammern. | Natural numbers, two operations | Klammern; decimals with one place | Fractions; three operations; find the planted step | number, fraction NEW, choice | none | BG 5, 1.5; BR 5, LB1; BM 1.2; NG/NR Ari; BB D | core | alle |
| `terme.text-term` | Vom Text zum Term | Du übersetzt Sätze in Terme und Terme in Sätze. | One operation: Addiere 3 zu 5 | Summe, Differenz, Produkt, Quotient; two operations | Klammern needed; which Term fits the story | choice | none | BG 1.5; BR LB5; BM 2.2; NG Ari 4; NR Ari 4; BB D | core | alle |
| `terme.geschickt` | Geschickt rechnen | Du nutzt Rechengesetze und rechnest einfacher. | Tauschen zu glatten Zahlen, natural numbers | Distributiv: 12 · 7 = 10 · 7 + 2 · 7 | Decimals and fractions; choose the better form | number, choice | none | BG 1.3–1.5; BR LB1; BM 1.2; NG Ari 3; NR Ari 3; BB D | core | alle |
| `terme.platzhalter` | Gleichungen durch Umkehren | Du findest den Platzhalter mit der Umkehraufgabe. | □ + a = b, natural numbers ≤ 100 | a · □ = b; □ : a = b | Fractions or decimals; number riddle in words | number, fraction NEW | none | BG 5; BR LB5; BM 5, LB7; NG Ari 5; NR Ari 7; BB D | core | alle |
| `terme.variable-einsetzen` | Zahlen einsetzen | Du setzt Zahlen in Terme mit Variablen ein. | 2 · x + 1, x ≤ 10 | Value table for x = 1, 2, 3 | Decimals; Umfang as a formula | number, multi | table | BR LB5; NG Ari 7; NR Ari 6; BG 7; BM 7 | opt | BR, NG, NR |
| `terme.variable-aufstellen` | Term aufstellen | Du beschreibst einen Zusammenhang mit einer Variablen. | x Hefte zu je 2 €: choose Term | Umfang of a figure; choose or complete | Muster in Zahlenfolgen; equal Terme | choice | figure NEW, table | BR LB5; NG Ari 6, Fkt 3; NR Ari 5, Fkt 3; BG 7 | opt | BR, NG, NR |
| `terme.gleichung-loesen` | Gleichungen lösen | Du löst Gleichungen mit gleichen Schritten auf beiden Seiten. | x + b = c, natural numbers | a · x = c, whole result | From text to equation; fractions | number, choice | none | BR LB5; BG 7; others later | opt | BR |

### `geometrie` (Winkel, Figuren, Koordinaten)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `geometrie.winkel-arten` | Winkelarten | Du erkennst spitze, rechte und stumpfe Winkel. | Spitz, recht, stumpf; usual position | Rotated; gestreckt; überstumpf where planned | Estimate against 45°, 90°, 180° | choice | angle NEW | BG 5; BR 5; BM 5; NG/NR Geo 9; BB D | core | alle |
| `geometrie.winkel-messen` | Winkel messen | Du liest Winkel mit dem Geodreieck ab. | Arm on 0, 10° steps, scale highlighted | 5° steps; rotated; both scales shown | 1° steps; choose the scale; different arm lengths | number EXT | angle NEW | BG 5; BR 5; BM 5; NG/NR Geo 9; BB D | core | alle |
| `geometrie.winkel-beziehungen` | Winkel an Geraden | Du findest Nebenwinkel und Scheitelwinkel. | Nebenwinkel sum to 180° | Scheitelwinkel; find one of four angles | Innenwinkel: sum in a triangle, Stufenwinkel | number EXT | angle NEW, figure NEW | BR 5; BB D; BG 7; BM 7; NRW 7/8 | opt | BR, BB |
| `geometrie.dreiecke` | Dreiecke einteilen | Du ordnest Dreiecke nach Seiten und Winkeln. | By sides: gleichseitig, gleichschenklig | By angles: spitz-, recht-, stumpfwinklig | Both; which combination is impossible | choice | figure NEW | BR 5, LB2; NG content list; NR Geo 2; BB D; BG 7; BM 7 | opt | BR, NG, NR, BB |
| `geometrie.vierecke` | Vierecke | Du erkennst Vierecke an ihren Eigenschaften. | Quadrat, Rechteck, Parallelogramm, usual position | Raute, Trapez, Drachen; rotated; properties | Sonderformen: Jedes Quadrat ist auch ein Parallelogramm | choice, multi | shape EXT, figure NEW | BG 5; BR 5, LB2; BM LB3; NG/NR Geo 2; BB C | core | alle |
| `geometrie.kreis` | Kreis | Du kennst Mittelpunkt, Radius und Durchmesser. | Name the parts on a drawing | r from d and back, whole and decimal | Points at a distance; two circles touching | choice, number | figure NEW | BG 5; BR 5; BM LB3; NG/NR Geo; BB D | core | alle |
| `geometrie.koordinaten` | Koordinatensystem | Du liest Punkte ab und trägst sie ein. | First quadrant, 0–10, read point | Pick points; fourth corner of a Rechteck | Four quadrants, −6 to 6, where planned | point NEW, multi | coordSystem NEW | BG 5; BR 5; BM 5, LB3; NG Geo 6; NR Geo 6; BB D | core | alle |
| `geometrie.spiegeln` | Spiegeln und Verschieben | Du spiegelst und verschiebst Figuren. | Vertical axis on a grid, 8 × 8 | Horizontal or diagonal axis; count Symmetrieachsen | Verschieben; Punktspiegelung; with coordinates | cells, point NEW, number | grid, coordSystem NEW | BR LB2; NG/NR Geo 5, 7; BB D; BG 7 | opt | BR, NG, NR, BB |
| `geometrie.kongruenz` | Kongruente Figuren | Du erkennst Figuren, die genau aufeinanderpassen. | Same figure rotated: kongruent or not | Find the congruent figure on a grid | What stays equal: Längen, Winkel; flipped figures | choice | grid, figure NEW | BR LB2, LB3; BB D; BG 7; KMK Idee der Kongruenz | opt | BR, BB |

### `flaechen` (Fläche und Volumen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `flaechen.rechteck` | Rechteck: Fläche und Umfang | Du rechnest Fläche und Umfang von Rechtecken. | Whole cm, sides ≤ 20 | Decimal sides; from area to missing side | L-shapes; same area with different Umfang | number | figure NEW, grid | BG 5; BR 5; BM 5; NG/NR Geo 12; BB D | core | alle |
| `flaechen.einheiten` | Flächeneinheiten | Du wandelst Flächeneinheiten um. | cm² and dm², whole numbers | m² and cm²; decimals | a and ha; order mixed units | number, order | grid | BG 5; BR 5; BM 5; NG/NR Größen; BB D | core | alle |
| `flaechen.parallelogramm` | Parallelogramm | Du rechnest die Fläche mit Grundseite und Höhe. | g and h given, whole numbers | Slanted side also given as distractor | Find h from A; several base-height pairs | number | figure NEW | BG 2.1; BR LB3; BM 7; NRW 7/8; BB E | opt | BG, BR |
| `flaechen.dreieck` | Dreieck | Du rechnest die Fläche als halbes Parallelogramm oder Rechteck. | Rechtwinkliges Dreieck, half a Rechteck | General triangle, distractor side, height outside | Find h from A; composite figures | number | figure NEW | BG 2.1; BR LB3; NG/NR Geo 12 S1; BM 7; BB E | opt | BG, BR, NG (S1), NR (S1) |
| `flaechen.vieleck` | Zerlegen und Ergänzen | Du zerlegst Figuren in bekannte Teile. | Grid figure into rectangles, ≤ 40 Kästchen | Trapez; Drachen, Raute by decomposition | Polygon from measures; choose a decomposition | number, choice | grid, figure NEW | BG 2.1; BR LB3; NG/NR Geo 13 S1; BB D S1 | opt | BG, BR, NG (S1), NR (S1), BB (S1) |
| `flaechen.netz` | Netz und Schrägbild | Du erkennst Quader in Netz und Schrägbild. | Which net folds into a Würfel | Quader net with measures; match to Schrägbild | Opposite faces; find the wrong drawing | choice, number | net EXT, cuboid NEW | BG 5; BR 5; BM LB3; NG/NR Geo 15; BB D | core | alle |
| `flaechen.oberflaeche` | Oberfläche | Du addierst alle Flächen von Würfel und Quader. | Würfel, edge ≤ 10 cm | Quader, edges ≤ 15 cm, via net | Box with no lid; composite Quader in stories | number | cuboid NEW, net EXT | BG 5, 2.1; BR LB3; BM LB4; NG/NR Geo 12; BB D | core | alle |
| `flaechen.volumen` | Volumen | Du rechnest das Volumen von Quadern. | Count layers of unit cubes | a · b · c, edges ≤ 12 cm | Missing edge; composite Quader; decimals | number | cuboid NEW, cubeBuilding | BG 2.2; BR LB4; BM LB5; NG/NR Geo 12; BB D | core | alle |
| `flaechen.volumeneinheiten` | Volumeneinheiten | Du wandelst cm³, dm³, m³, ml und l um. | cm³ and ml; dm³ and l | m³ and dm³; whole numbers | Decimals; order mixed units; plausible volume | number, order, choice | cuboid NEW, container | BG 2.2; BR LB4; BM LB5; NG/NR Größen; BB D | core | alle |

### `daten` (Daten und Zufall)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Passt zu |
|---|---|---|---|---|---|---|---|---|---|---|
| `daten.diagramm` | Diagramme lesen | Du liest Werte ab und vergleichst sie. | Bars, axis step 5, one value | Difference and sum; axis step 20 or 50 | Two questions from one chart; table to chart | number, choice | barChart, table | BG LB3; BR 5; BM LB6; NG/NR Sto 4; BB D | core | alle |
| `daten.kritisch` | Diagramme prüfen | Du prüfst, ob ein Diagramm und eine Aussage zusammenpassen. | Which statement fits the chart | Shortened axis: Täuscht das Bild? | Choose the fitting chart; find the wrong claim | choice | barChart, pieChart NEW | BG LB3; BR 5; BM LB6; NG Sto 6; NR Sto 5 | core | alle |
| `daten.haeufigkeit` | Absolute und relative Häufigkeit | Du rechnest aus, welchen Anteil ein Wert hat. | Tally to count; 8 of 20 as Bruch | Bruch, Dezimalzahl, Prozent where planned | Compare groups of different sizes | fraction NEW, number, multi | tally, table | BG LB3; NG/NR Sto 3; BB D; BR, BM not named | opt | BG, NG, NR, BB (S1) |
| `daten.kreisdiagramm` | Kreisdiagramme lesen | Du liest Anteile aus Kreisdiagrammen ab. | Halves and quarters; largest part | Percent labels; count from a given total | Match table and chart; degree share of 360° | number, choice | pieChart NEW | BG LB3; NG/NR Sto; BB read; BM 7 | opt | BG, NG, NR, BB (S1) |
| `daten.mittelwert` | Mittelwert | Du verteilst Werte gleichmäßig und findest den Mittelwert. | 3–4 values, whole mean, ≤ 50 | 5–6 values, decimal mean, with a zero | Missing value; effect of an outlier | number, choice | barChart, table | BG LB3; BM LB6; NG/NR Sto; BR 7; BB E | opt | BG, BM, NG, NR |
| `daten.kennwerte` | Spannweite und Median | Du findest kleinsten und größten Wert, Spannweite und Median. | Minimum and Maximum, ≤ 8 values | Spannweite, unsorted values | Median, odd number of values, where planned | number, choice | table | NG/NR Sto; BB D without Median; BR 7; BM 7 | opt | NG, NR, BB (S1, S2) |
| `daten.chancen` | Chancen vergleichen | Du vergleichst Chancen mit relativen Häufigkeiten. | Which bag gives the better chance | Relative frequency of dice rolls as Bruch | Change the bag to reach a given chance | choice, fraction NEW | bag, dice, spinner | BB D; NRW 7/8 | opt | BB |

### New answer types and extensions

**A new answer type is required**, because a Bruch answer cannot be expressed in `number`, and a point is not a cell.

| Type | Status | Exact semantics |
|---|---|---|
| `fraction` | **NEW kind** | Fields: `num`, `den`, optional `whole`. Spec: `{ kind: 'fraction', num, den, whole?, form: 'value' \| 'reduced' \| 'exact', allowMixed: boolean, allowNegative: boolean }`. Response: `{ kind: 'fraction', whole?: string, num: string, den: string }`. Compare by integer cross-multiplication, never floats. `value` accepts every equal value, including equivalent or mixed forms if `allowMixed`. `reduced` also requires a fully reduced result, and a correct unreduced answer is **not an attempt**: "Das Ergebnis stimmt. Kannst du noch kürzen?" `exact` requires the stated numerator and denominator, for use in Erweitern tasks with a target Nenner. Empty field or denominator 0 gives a parse reason, no attempt. Stacked layout with fraction bar. Screen reader labels: "Ganze", "Zähler", "Nenner". Keyboard: digits, `/` or Tab moves to the Nenner. Bugs: `match: { num, den }`, matched on exact form before value. Free-text is still banned. |
| `point` | **NEW kind** | Spec: `{ kind: 'point', xMin, xMax, yMin, yMax, step, value: { x, y } }`, optionally `values` for up to 3 points in any order. Tap sets a marker at the nearest grid intersection, with hit area to half the grid spacing, at least 32 px spacing. Tap again moves it; no drag. Keyboard: arrows move, Enter places. A live read-out shows P(3 \| 5). Response: `{ kind: 'point', points: { x, y }[] }`. Exact match. Bug `koord-getauscht` matches swapped x and y. |
| `number`: sign entry | EXT | New `allowNegative: true`. Shows a **± key** that toggles the sign at any time. Display uses U+2212. `+5` and `-5` are accepted; `parse.ts` already accepts both minus forms. −0 equals 0. To avoid giving away the answer, the key appears for **every item of a skill** whose answers can be negative, including positive results. |
| `number`: comma | Existing | `decimals` exists. To avoid a hint from the keypad, the comma key is shown for every item of a skill with decimal answers. |
| `number`: tolerance (angle reading) | EXT | New `tolerance`, absolute. `geometrie.winkel-messen`: ±2° at S1–S2 and ±1° at S3 (H). Unit ° after the field. No separate angle kind; drawing an angle is out of scope in v1. |
| `numberline` | EXT | Negative `min` is allowed. New `denominator`: positions are integers in units of 1/denominator, so thirds do not accumulate float error. New `labelFormat: 'decimal' \| 'fraction' \| 'mixed'`. |
| `written` | EXT | Decimal operands and results. Stored as integers plus `decimalPlaces` per operand. add/sub: comma under comma. mul: comma placed by child in the result. div: shows the shift of the comma as a worked step. Plain `written` for natural numbers stays. |
| `choice`, `order`, `multi` | EXT | Labels render inline fractions and signs through one markup, e.g. `{3/4}`. Screen reader text "drei Viertel". The same renderer serves prompts, hints and steps. |

No free-form term input is planned. Term and equation skills use `choice`, `number` and `multi`, which fits auto-checking and the ban on free text.

### New visuals needed

| Visual | Purpose | Exact semantics | Sources |
|---|---|---|---|
| `fractionBar` | Bruchstreifen | `{ parts, filled, wholes?: number, compare?: { parts, filled } }`. Equal parts; optional second bar aligned to the same length, for Erweitern and comparing. Pattern as well as colour for filled parts. | [18][9] |
| `fractionCircle` | Kreisanteile | `{ parts, filled, wholes? }`. Starts at 12 o'clock, clockwise. | [2][6] |
| `percentBar` | Prozentstreifen | `{ total, percent?, ticks, labels: 'percent' \| 'value' \| 'both', unknown?: 'G' \| 'W' \| 'p' }`. Two parallel scales, percent and value, aligned; the unknown is a □. | [1][17][24] |
| `coordSystem` | Koordinatensystem | `{ xMin, xMax, yMin, yMax, step, labelStep, points?: { x, y, label }[], segments?, polygon?, axisNames?, showGrid }`. Equal unit lengths; arrows on axes; origin labelled 0; any of 1 or 4 quadrants. | [3][7][9][12] |
| `angle` | Winkel, Geodreieck | `{ degrees, rotation, armLengths: [a, b], showArc, label?, tool: 'none' \| 'geodreieck', highlightScale?: 'inner' \| 'outer' }`. Tool centre lies on the Scheitel, baseline on one arm; both scales (0–180 in each direction) visible; arm lengths vary independently of the angle. | [3][10][34] |
| `cuboid` | Quader im Schrägbild | `{ a, b, c, labels?, hiddenEdges: 'dashed', unitCubes?: boolean, cutout?, schematic?: boolean }`. Depth edges at 45° and half length, as in LISUM [18, p. 13]; drawing is not to the numbers shown if `schematic` is set, which is then stated in text. | [9][12][18] |
| `figure` | Figur mit Maßen | `{ points, sides?: label[], height?: { from, to, outside?: boolean }, rightAngles?, parallelMarks?, equalMarks?, circle? }`. Covers Parallelogramm, Dreieck, Trapez, Drachen, Raute, Kreis with Radius. Height dashed with a right-angle mark, outside the figure if needed. | [2][6][32] |
| `pieChart` | Kreisdiagramm (read only) | `{ title, slices: { label, value, pattern }[], showValues: 'none' \| 'percent' \| 'count' }`. Starts at 12 o'clock, clockwise, direct labels on or next to slices; never colour alone; sum checked to 100 %. | [2][11][12] |

Extensions of existing visuals: `placeValue` gets columns `z`, `h`, `t` after the comma. `numberLine` gets negative ranges, `denominator` and `labelFormat` as above, **arrows** for changes (Pfeile, BM [9]), and `vertical` for a thermometer. `shape` gets `drachen`. `net` gets **rectangular Quader faces** with side lengths. `table` gets **arrow annotations** between rows such as `: 3` and `· 5` for the LISUM Minitabelle [18, p. 29]. `barChart` already has `axisStart`, used for shortened axes. Not needed: `clock`, `money`, `pictogram`, `tree`, `dotArray`, `scale`. `written` stays. Existing `solid` has no measures, so it stays for naming only.

## 7. Design consequences compared with the Klasse 4 portal

### 7.1 What stays and what changes

| Area | Klasse 4 | Klasse 6 | Why |
|---|---|---|---|
| Core loop, hints | §6.1 in [42]: answer, hint, second try, worked steps, Zwillingsaufgabe | Stays. Worked steps at most 5 lines. | L4, L6, F13 |
| **Round length** | 10 items | **10 items**, target about 12–15 min; see 7.3 | F14, F21; H |
| **AB mix per round** | 7/2/1, 4/4/2, 2/5/3 on Stufe 1, 2, 3 | **Same: 7/2/1, 4/4/2, 2/5/3.** No evidence for a change. | C3; H |
| Stufen | 3, default suggestion Stufe 2 | 3, **default suggestion Stufe 1 for a new skill**. Never derived from the plan. | 2.3, F3, F18; H |
| Plan | NRW extras | **Optional plan choice** (2.5) with 7 options. Optional skills not in the plan appear as "Extra" and never count toward progress. | 2.4; F18 |
| Mastery | Geübt, Sicher (≥ 8 of last 10 first try), Gemeistert | Stays, including the spaced check. | L8 (heuristic) |
| Mixed practice | Warm-up plus review | Warm-up stays. **"Gemischte Runde" offered after two Sicher skills in a topic**, with a note for adults that scores in mixed practice run lower. | F14 |
| **Timed mode** | Optional Blitzrunde on Gemeistert facts | **None. No timers by default and no timed mode in v1.** The plans ask for "im Kopf", not for speed. | M10; [55]; 2.3 |
| Silent response time | About 3 s keeps a fact in review | **Not used.** Items take several steps. | H |
| **Font size** | 20 px body, 60ch | **18 px body, at most 65ch**; task expression at least 2rem; numerals in a stacked fraction at least 20 px, line height to fit. | F19; H for the numbers |
| **Touch targets** | 64 px primary, 48 px others | **56 px keypad and Prüfen, 48 px others**, hit areas to gaps and edges. Point-picking spacing at least 32 px with snapping. | F20; about 11 and 9 mm by the P8 estimate; H |
| Holdover guard | 400 ms | **300 ms** on screen changes. | F20; H |
| **Keypad default** | Free numeric; Ziffernblock on touch | Same device rule: **Ziffernblock on touch, physical keyboard elsewhere**, with the on-screen pad one tap away. | P13 |
| **Keypad keys** | 0–9, ⌫, Prüfen, comma where needed | **0–9, ⌫, Prüfen; `,` for all items of decimal skills; `±` for all items of skills with negative answers; `↓` next field for `fraction`; a "Ganze" toggle if mixed numbers are allowed.** No `/` key on the pad: the stacked field already shows the bar. On a physical keyboard `/` and Tab move fields. | 6, new answer types |
| Choice items | Up to 8 options | Same. `order` at most 6, `multi` at most 4 fields. | H |
| Order and drag | Tap and keyboard alternatives | Same. Drag allowed only as an extra to tap, never required. | P17 |
| Text | Sachaufgaben 3–4 lines | Section 4. Fachsprache kept, with tap explanations. | F12 |
| Read-aloud | Optional button, local voices only | Same; small button, never autoplay. Speech forms for fractions and signs checked. | T20; P12 |
| Warm-up, reviews | 3–5 items, 8 reviews per day | Stays. | L2 |
| Break prompt | After 20 min | Stays, shorter wording. | F21 |
| Fehlerdetektiv | Stufe 3 or after Sicher | Stays and used more: "Diese Rechnung stimmt noch nicht" with a fictional work. | L6, F15 |
| **Tone of voice** | Warm, simple, du-form | **Du-form, factual, respectful, without exclamation-heavy praise.** No mascot, no baby talk, no "Super!", no "Kinder" in the UI. Praise names the step. | F17; T16 |
| Visual style | Friendly, some stars and icons | **Sober.** Stars become plain filled marks (1–3) with a legend. No confetti or sound by default. Dark mode as in siblings. | F17; H |
| **Badges** | Mastery and M16 improvement badges | **Only factual titles:** "Brüche: Sicher", "Brüche: Gemeistert", "Prozent: Sicher" and so on; "Alle Themen geübt"; "Stufe 3 gemeistert"; plus the M16 set "Stolperstein überwunden", "Besser geworden", "Gut behalten", "Vieles behalten". Not "Profi", "Meister", "Held". Never name a Schulform or plan. Never announced in advance. | M6, M16, F17, F18 |
| Worksheets, adult page, phrase rotation | Per [42] | Stay. Adult page adds the plan table and an honest list of what is unverified. Worksheets print no plan. | M7, M14, F18 |
| Privacy, security, performance | P1–P6, P14–P15 | No change. Storage key `mathe6.v1`. Plan only stored after opt-in. | Section 3 |

### 7.2 Banned patterns (equivalent of Klasse 4 §6.4)

**This section is what code, tests and reviews mean when they cite "docs/research.md §6.4".** It is part of code review. The list is copied from [42] §6.4; Radesky et al. [53] show why it is needed.

- Praise for traits or speed, and superlatives (see M15 in 7.4).
- "Falsch!", "Leider falsch.", "Schon wieder falsch.", "Das war doch einfach!", "Konzentrier dich!", "Alle anderen schaffen das."
- A red X, a buzzer, alarm red for errors, or feedback shown by colour alone.
- Timers or countdowns by default, and "Zu langsam!" or "Schneller!".
- Leaderboards, rankings, percentiles or participation badges.
- Currency, a shop, loot or mystery boxes, random bonus stars, or rewards announced before a task.
- Consecutive-day streaks, and messages about losing anything ("Serie verloren", "0 Tage").
- Push notifications, reminders or e-mail.
- A mascot that guilt-trips on exit, a hidden or delayed exit button, autoplay into the next round, or pop-ups during a round.
- Any third-party request: fonts, CDNs, analytics, embeds or external images.
- Storage writes before opt-in, and cookies.
- Free-text inputs and fields for personal data.
- `type="number"` inputs, and drag-only interactions.

Added for Klasse 6:

- Any Schulform shown as a level, rank, comparison or result, or a list ordered from Gymnasium down.
- Tying a Stufe to a Schulform, or suggesting that a task is "für Gymnasiasten" or "nur für die Hauptschule".
- A plan question as a gate before practice, or asking for a school name, class or age.
- Childish tone: mascots, baby talk, "Kids", "Mathe-Held", "Bruch-Profi", confetti.
- "Das hattest du doch schon in Klasse 5.", "Das muss man in Klasse 6 können."
- Showing the `±` or comma key only when the answer needs it, as it gives the answer away.

Accessibility targets stay at WCAG 2.2 AA plus the Klasse-4 AAA criteria [51].

### 7.3 Round length: recommendation

**Default 10 items (target about 12–15 minutes), a heuristic.** Reasoning: Klasse 4 uses 10 items for about 10–15 minutes; items here have more steps, such as Hauptnenner or percent stories, but children read and type faster; NRW allows 60 minutes of homework a day across subjects in Klassen 5–7 [46], which one round should not fill; about three rounds a week reach the lower end of the 30–75 minutes linked to better results (L10); the strong evidence for spaced and mixed practice [36] argues for more short rounds rather than one long one. We found no experiment on round length at this age, and the time estimate is our own. Measure it in the pilot. A round may offer "5 Aufgaben" as a short option, with no penalty.

AB mix: **Stufe 1: 7/2/1, Stufe 2: 4/4/2, Stufe 3: 2/5/3** (AB I/II/III), unchanged from C3 in [42]. "At least one harder item per round" stays [1]. The 3-item Einstiegs-Check counts inside the round.

### 7.4 M15 phrase bank (Klasse 6 wording)

Same rules as M15 in [42], which code and tests cite as "M15". Use short forms and name the action.

| Situation | Use (rotate) | Never use |
|---|---|---|
| Correct | "Richtig. Du hast zuerst die Nenner gleich gemacht." · "Stimmt. Du hast Stelle für Stelle verglichen." · "Richtig. Du hast die Höhe statt der schrägen Seite genommen." · "Passt. Dein Überschlag hat geholfen." | "Du bist so schlau!" · "Du bist ein Mathe-Genie!" · "Du bist ein Naturtalent!" · "Du warst so schnell!" · "PERFEKT!" · "Unglaublich!" · "Fantastisch!" · "Weltklasse!" · "Super gemacht!" |
| 1st wrong attempt | "Noch nicht ganz. Probier es noch einmal." · "Fast. Schau noch einmal auf den Nenner." · "Das passt noch nicht. Hier ist ein Tipp." | "Falsch!" · "Leider falsch." · "Konzentrier dich!" |
| 2nd wrong attempt | "Schauen wir es zusammen an." · "So kannst du rechnen: …" · "Jetzt weißt du, worauf es ankommt. Hier ist eine ähnliche Aufgabe." | "Schon wieder falsch." · "Das war doch einfach!" · "Alle anderen schaffen das." · "Das hattest du doch schon." |
| Normalising (at most once per session) | "Fehler helfen beim Lernen." · "Das ist eine knifflige Stelle. Vielen geht das bei Brüchen so." · "Gemischte Aufgaben sind schwerer. Das bringt mehr beim Üben." | "Dein Gehirn wächst bei jedem Fehler." |
| Round summary | "8 von 10 geschafft. 2 Aufgaben waren noch knifflig." | "2 Fehler!" · "Nicht bestanden" · "Note 3" |
| Improvement (M16) | "Brüche addieren, Stufe 2: Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10." · "Dezimalzahlen vergleichen: Das war vor ein paar Tagen noch knifflig. Heute hat es auf Anhieb geklappt." | "Endlich!" · "Na also!" · "Viel besser!" · "Besser als die anderen" · "Jetzt machst du keine Fehler mehr" |
| Speed | (nothing) | "Zu langsam!" · "Schneller!" |
| Leaving or a break | "Gut, dass du geübt hast. Bis zum nächsten Mal." · "Eine Pause ist eine gute Idee." | "Willst du wirklich aufhören?" · "Dein Freund ist traurig, wenn du gehst." |
| Plan | "Lehrplan: eingestellt." · "Das kommt in manchen Plänen später. Du kannst es trotzdem üben." | "Das ist nur fürs Gymnasium." · "Das brauchst du auf deiner Schule nicht." |
| Status labels | "Geübt" → "Sicher" → "Gemeistert" (1–3 marks with a legend) | "Serie verloren" · "Deine Serie ist in Gefahr!" · "0 Tage" |

## 8. Limitations and open questions

**Could not be verified**

- **Sources not opened**, so not relied on: Ni & Zhou 2005 and Van Hoof et al. 2015 on natural number bias (the Leuven manuscript returned 404); Vlassis 2004 on the minus sign; Hafner 2012 and a Friedrich-Verlag article on percent errors (login redirect), so **percent-base error frequencies remain unverified**; Parker & Leinhardt 1995; Cai 2000; Devichi & Munier 2013 on angles (no abstract available); Haag et al. 2015 on simplifying item language, which no search returned; Prediger et al. 2015 full text (publisher blocked). Pöhler & Prediger 2015, Eichelmann et al. 2012, Bishop et al., Bofferding, Van Dooren et al., Tan Şişman & Aksu, Knigge & Hannover, Scherrer & Preckel, Roschelle et al. and McLaren et al. were seen only as abstracts or their catalogue pages.
- **Bugs marked H have no source showing them at this age.** That includes all negative-number bugs (the sources opened study ages 6–10), the percent bugs, and coordinate and unit bugs. Their frequency is unknown.
- **No numerical reading norm for Klasse 6** was opened. All text limits are heuristics.
- **IQB 2024 figures** come from a Bildungsserver summary [47], not the report.
- **Carried-over figures** ([50][52][53][55][56]): URLs re-checked on 2026-11-03; the figures rely on the fact-check in [42].

**Weak spots in the evidence**

- Key quantitative misconception data are foreign and old in part: US (N = 120) [19], Australia 1995–1999 [21], Turkey [31]. German frequencies are missing.
- F17 is indirect. No study we found tests childish design with 11–12-year-olds; NN/g's teen data start at 13, and its children's data end at 12 without this question.
- F18 is correlational and from Berlin, comparing two tracks, and it does not test an app label. The ban is a precaution.
- F13 includes teacher training, F14 uses teacher-run assignments, and F15 a story game. None of them tests this portal's design.
- All thresholds in sections 4, 7.1 and 7.3 are heuristics. A pilot should check: time per item, fraction input errors, use of `±`, whether 10 items feel long, whether the tone reads as respectful, and whether children can pick their plan.

**Curriculum questions**

- Six plans in three Länder groups were read. **Other Länder are unverified**, which is why "Anderes Land oder weiß nicht" is the default. Baden-Württemberg was not read.
- BE-BB's Rahmenlehrplan was read in a copy hosted by a school [17]; the Planungshilfe [18] is official but a planning aid, not binding. We treat its "kein Inhalt" notes as a good guide to Jg. 6, and "in Teilen E" leaves room for schools to go further.
- BB rows also apply on paper to weiterführende Schulen with Jg. 5–6 [17, p. 14]; schools of that kind were not studied separately.
- Bayern Realschule 7 was read for Wahlpflichtfächergruppe I only [8]. Bayern Mittelschule M-Klassen were not read.
- Absence claims ("not named in 5–7") come from our text search of the pages named. A teacher should confirm them, especially relative frequency in BR and BM.
- BM's division restriction rests on the alt text of formula images [9]. Whether the same restriction covers division by a decimal is unclear, as the text adds "und Dezimalbrüche" after the sets; `dezimal.geteilt` S2 may overreach in BM. A teacher should check this.
- The `core` rule treats Jgst. 5 content as review. A Mathe 5 portal, if built, will overlap here.
- Notation P(3 | 5) and the plan-specific term assignments in T13 come from limited reading. Check with teachers.

**Legal question**

Art. 8 is not triggered in our analysis, because nothing relies on consent for personal data. The plan choice adds a small point for review: on a shared device, a stored plan and progress are visible to the next user. Land plus school type is coarse, has no identifier and never leaves the device, so we do not regard it as personal data, but this is interpretation. The storage opt-in addresses the child (P1). An 11-year-old understands it better than a 7-year-old; that does not change the analysis. All of it should be part of the legal review before launch. The memory-only default also means the plan is lost on reload without an opt-in, and this is intended.

**Code note**

Source comments in the sibling repositories cite IDs such as L8, M16 or P13. These live in [42]; only §6.4 and M15 are restated here (7.2, 7.4).

## 9. Sources

All accessed 2026-11-03. Sources were opened unless marked. *Abstract* means only the abstract or catalogue record was seen. *Carried over* means checked in [42]; here only the URL was re-checked.

1. KMK (2022). Bildungsstandards für das Fach Mathematik: Erster Schulabschluss (ESA) und Mittlerer Schulabschluss (MSA), i. d. F. vom 23.06.2022. https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-ESA-MSA-Mathe.pdf
2. ISB Bayern. LehrplanPLUS Gymnasium, Mathematik 6. https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/6/mathematik
3. ISB Bayern. LehrplanPLUS Gymnasium, Mathematik 5. https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/5/mathematik
4. ISB Bayern. LehrplanPLUS Gymnasium, Mathematik 7. https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/mathematik
5. ISB Bayern. LehrplanPLUS Gymnasium, Mathematik 8. https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/8/mathematik
6. ISB Bayern. LehrplanPLUS Realschule, Mathematik 6. https://www.lehrplanplus.bayern.de/fachlehrplan/realschule/6/mathematik
7. ISB Bayern. LehrplanPLUS Realschule, Mathematik 5. https://www.lehrplanplus.bayern.de/fachlehrplan/realschule/5/mathematik
8. ISB Bayern. LehrplanPLUS Realschule, Mathematik 7, Wahlpflichtfächergruppe I. https://www.lehrplanplus.bayern.de/fachlehrplan/realschule/7/mathematik/wpfg1
9. ISB Bayern. LehrplanPLUS Mittelschule, Mathematik 6. https://www.lehrplanplus.bayern.de/fachlehrplan/mittelschule/6/mathematik
10. ISB Bayern. LehrplanPLUS Mittelschule, Mathematik 5. https://www.lehrplanplus.bayern.de/fachlehrplan/mittelschule/5/mathematik
11. ISB Bayern. LehrplanPLUS Mittelschule, Mathematik 7, Regelklasse. https://www.lehrplanplus.bayern.de/fachlehrplan/mittelschule/7/mathematik/regelklasse
12. MSB NRW (2019). Kernlehrplan für die Sekundarstufe I Gymnasium, Mathematik, Heft 3401. https://lehrplannavigator.nrw.de/system/files/media/document/file/g9_m_klp_3401_2019_06_23_0.pdf
13. MSB NRW (2022). Kernlehrplan Realschule, Mathematik. https://www.qua-lis.nrw.de/system/files/media/document/file/rs_m_klp_2022_06_17.pdf
14. MSB NRW (2022). Kernlehrplan Hauptschule, Mathematik. https://lehrplannavigator.nrw.de/system/files/media/document/file/hs_m_klp_2022_06_17_0.pdf
15. MSB NRW (2022). Kernlehrplan Gesamtschule/Sekundarschule, Mathematik, Heft 3106. https://lehrplannavigator.nrw.de/system/files/media/document/file/gesk_m_klp_2022_06_17.pdf
16. QUA-LiS NRW (2020). Beispiel für einen schulinternen Lehrplan Gymnasium, Mathematik. https://www.qua-lis.nrw.de/system/files/media/document/file/g9_m_silp_2020_01_31.pdf
17. LISUM (2023). Rahmenlehrplan Berlin-Brandenburg, Teil C Mathematik, Jg. 1–10 (copy hosted by a school). https://hcg-berlin.de/wp-content/uploads/rahmenlehrplan-teil-c_mathe-1-10.pdf
18. LISUM (2024). Planungshilfe für einen kompetenzorientierten Mathematikunterricht, Jahrgangsstufe 6. https://bildungsserver.berlin-brandenburg.de/fileadmin/bbb/unterricht/faecher/naturwissenschaften/mathematik/Planungshilfen_kompetenzorientierter_Unterricht/Grundschule/Jahrgangsstufe_6_Planungshilfe_fuer_den_MU.pdf
19. Siegler, R. S., & Pyke, A. A. (2013). Developmental and individual differences in understanding of fractions. *Developmental Psychology, 49*(10). https://pmc.ncbi.nlm.nih.gov/articles/PMC4103412/
20. Eichelmann, A., Narciss, S., Schnaubert, L., & Melis, E. (2012). Typische Fehler bei der Addition und Subtraktion von Brüchen. *Journal für Mathematik-Didaktik, 33*(1). *Abstract.* https://fis.tu-dresden.de/portal/en/publications/typische-fehler-bei-der-addition-und-subtraktion-von-bruchen--ein-review-zu-empirischen-fehleranalysen(9afee9aa-9529-4407-9845-c426faa8f0de).html
21. Stacey, K., & Steinle, V. Prevalence and persistence of misconceptions: Years 4 to 10. University of Melbourne. https://extranet.education.unimelb.edu.au/SME/TNMY/Decimals/Decimals/tests/incidenc.htm
22. University of Melbourne. Summary of misconceptions about decimal numbers. https://extranet.education.unimelb.edu.au/SME/TNMY/Decimals/Decimals/tests/miscon.htm
23. Steinle, V., & Stacey, K. (2004). A longitudinal study of students' understanding of decimal notation. MERGA 27. https://merga.net.au/wp-content/uploads/DOCS/common/Uploaded%20files/Annual%20Conference%20Proceedings/2004%20Annual%20Conference%20Proceedings/RP652004%20Steinle%20Stacey.pdf
24. Pöhler, B., & Prediger, S. (2015). Intertwining lexical and conceptual learning trajectories: dual macro-scaffolding towards percentages. *Eurasia Journal of Mathematics, Science & Technology Education, 11*(6). *Abstract.* https://www.ejmste.com/article/intertwining-lexical-and-conceptual-learning-trajectories-a-design-research-study-on-dual-4460
25. Gürsoy, E., Benholz, C., Renk, N., Prediger, S., & Büchter, A. (2013). Erlös = Erlösung? Sprachliche und konzeptuelle Hürden in Prüfungsaufgaben zur Mathematik. Web version. https://wwwold.mathematik.tu-dortmund.de/~prediger/veroeff/13-MuM-ZP-DaZ_Guersoy-etal-Webversion.pdf
26. Prediger, S. Sprachsensibler Mathematikunterricht: Ansätze und Herausforderungen (slides, DZLM). https://www.dzlm.de/files/uploads/WS-L07-Prediger.pdf
27. Bishop, J. P., et al. (2014). Obstacles and affordances for integer reasoning. *Journal for Research in Mathematics Education, 45*(1). *Abstract (OpenAlex).* https://doi.org/10.5951/jresematheduc.45.1.0019
28. Bofferding, L. (2014). Negative integer understanding: Characterizing first graders' mental models. *Journal for Research in Mathematics Education, 45*(2). *Abstract (OpenAlex).* https://doi.org/10.5951/jresematheduc.45.2.0194
29. MacGregor, M., & Stacey, K. (1997). Students' understanding of algebraic notation: 11–15. *Educational Studies in Mathematics, 33*(1). https://faculty.weber.edu/eamsel/Research%20Groups/Math%20Research/MacGregor%20&%20Stacey%20(1997).pdf
30. Van Dooren, W., De Bock, D., Hessels, A., Janssens, D., & Verschaffel, L. (2005). Not everything is proportional. *Cognition and Instruction, 23*(1). *Abstract (OpenAlex).* https://doi.org/10.1207/s1532690xci2301_3
31. Tan Şişman, G., & Aksu, M. (2016). A study on sixth grade students' misconceptions and errors in spatial measurement. *International Journal of Science and Mathematics Education, 14*(7). *Abstract.* https://avesis.metu.edu.tr/yayin/b1b0cdda-c3ac-4d7c-bdf8-3a846339a0c2/a-study-on-sixth-grade-students-misconceptions-and-errors-in-spatial-measurement-length-area-and-volume
32. Project STAIR, SMU (2022). Ideas in Mathematics: Geometric Measurement (citing Van de Walle et al., 2019). Practitioner material. https://blog.smu.edu/projectstair/files/2022/04/Geometric-Measurement-.pdf
33. Russell, S. J., & Mokros, J. R. (1990). What's typical? Children's and teachers' ideas about average. ICOTS 3. https://fpce.uc.pt/iase-web/documents/papers/icots3/BOOK1/A9-3.pdf
34. Francome, T. Can empty protractors help pupils to measure angles? (Loughborough University Centre for Mathematical Cognition blog). Practitioner article. https://blog.lboro.ac.uk/cmc/?p=131
35. Roschelle, J., Feng, M., Murphy, R. F., & Mason, C. A. (2016). Online mathematics homework increases student achievement. *AERA Open.* *Abstract.* https://www.sri.com/publication/education-learning-pubs/online-mathematics-homework-increases-student-achievement/
36. Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). A randomized controlled trial of interleaved mathematics practice. *Journal of Educational Psychology, 112*(1). https://www.gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf
37. McLaren, B. M., Adams, D. M., Mayer, R. E., & Forlizzi, J. (2017). A computer-based game that promotes mathematics learning more than a conventional approach. *International Journal of Game-Based Learning, 7*(1). *Abstract (OpenAlex).* https://doi.org/10.4018/IJGBL.2017010103
38. Scherrer, V., & Preckel, F. (2019). Development of motivational variables and self-esteem during the school career. *Review of Educational Research, 89*(2). *Abstract (OpenAlex).* https://doi.org/10.3102/0034654318819127
39. Yeager, D. S., Dahl, R. E., & Dweck, C. S. (2018). Why interventions to influence adolescent behavior often fail but could succeed. *Perspectives on Psychological Science, 13*(1). https://pmc.ncbi.nlm.nih.gov/articles/PMC5758430/
40. Knigge, M., & Hannover, B. (2011). Collective school-type identity: Predicting students' motivation beyond academic self-concept. *International Journal of Psychology, 46*(3). *Abstract (OpenAlex).* https://doi.org/10.1080/00207594.2010.529907
41. Kendrick, A., & Nielsen, J. Teenager's UX: Designing for teens. Nielsen Norman Group. https://www.nngroup.com/articles/usability-of-websites-for-teenagers/
42. Mathe 4 (2026). Research summary: Mathe-Portal Klasse 4. https://github.com/lev-n/mathe-4/blob/main/docs/research.md
43. Sherwin, K., & Nielsen, J. (2019). Children's UX: Usability issues in designing for young people. Nielsen Norman Group. https://www.nngroup.com/articles/childrens-websites-usability-issues/
44. Katzir, T., Hershko, S., & Halamish, V. (2013). The effect of font size on reading comprehension on second and fifth grade children. *PLoS ONE, 8*(9), e74061. *Abstract.* https://pmc.ncbi.nlm.nih.gov/articles/PMC3777945/
45. Anthony, L., Brown, Q., Tate, B., Nias, J., Brewer, R., & Irwin, G. (2013). Designing smarter touch-based interfaces for educational contexts. *Personal and Ubiquitous Computing* (preprint). https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf
46. Ministerium für Schule und Bildung NRW. Hausaufgaben. https://www.schulministerium.nrw/hausaufgaben
47. Deutscher Bildungsserver. Schwache Ergebnisse in Mathematik und in den Naturwissenschaften (summary of IQB-Bildungstrend 2024). https://www.bildungsserver.de/bildung+innovation/schwache-ergebnisse-in-mathematik-und-in-den-naturwissenschaften-1401.html
48. BMBF (2023). Pressemitteilung 36/2023 zu IGLU 2021. https://www.bmftr.bund.de/SharedDocs/Pressemitteilungen/DE/2023/05/160523-IGLU21.html
49. Art. 8 DSGVO. https://dsgvo-gesetz.de/art-8-dsgvo/
50. Wissenschaftliche Dienste des Deutschen Bundestages (2023). WD 10 – 019/23. *Carried over.* https://www.bundestag.de/resource/blob/959324/WD-10-019-23-pdf.pdf
51. W3C. Web Content Accessibility Guidelines (WCAG) 2.2. *Carried over.* https://www.w3.org/TR/WCAG22/
52. Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin, 125*(6). *Carried over.* https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
53. Radesky, J., et al. (2022). Prevalence and characteristics of manipulative design in mobile applications used by children. *JAMA Network Open, 5*(6). *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/
54. Daroczy, G., Wolska, M., Meurers, W. D., & Nuerk, H.-C. (2015). Word problems: a review of linguistic and numerical factors contributing to their difficulty. *Frontiers in Psychology, 6*, 348. *Carried over from [57].* https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00348/pdf
55. Caviola, S., Carey, E., Mammarella, I. C., & Szucs, D. (2017). Stress, time pressure, strategy selection and math anxiety in mathematics. *Frontiers in Psychology, 8*, 1488. *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC5585192
56. Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning. *Psychological Bulletin, 147*(4). *Carried over.* https://gwern.net/docs/spacedrepetition/2021-yang.pdf
57. Mathe 2 (2026). Research summary: Mathe-Portal Klasse 2. Local sibling document, `mathe_2/docs/research.md`.
