/**
 * Curriculum tags for Klasse 6 (docs/research.md §2). The KMK Bildungsstandards ESA and MSA (i. d. F. vom 23.06.2022)
 * describe the school-leaving qualifications and set no Klasse-6 waypoint: they give the Leitideen and a frame, while the scope comes from the
 * plans of Bayern, NRW and Berlin-Brandenburg (§2.2, §2.3). Tags are paraphrased content foci in that frame.
 *
 * Every generator references the tag ids and the shared tests check them (isKmkTag): never rename or remove an id once released.
 */
import type { TopicId } from '../core/types';

export type Leitidee =
  | 'Zahl und Operation'
  | 'Größen und Messen'
  | 'Strukturen und funktionaler Zusammenhang'
  | 'Raum und Form'
  | 'Daten und Zufall';

export interface KmkTag {
  leitidee: Leitidee | 'Prozessbezogene Kompetenz';
  text: string;
}

export const KMK_TAGS = {
  'ZO.bruch-bedeutung': { leitidee: 'Zahl und Operation', text: 'Brüche als Teile eines oder mehrerer Ganzer und als relative Anteile verstehen, darstellen und ordnen' },
  'ZO.bruch-erweitern': { leitidee: 'Zahl und Operation', text: 'Brüche erweitern und kürzen, gleichnamig machen und vergleichen' },
  'ZO.bruch-plusminus': { leitidee: 'Zahl und Operation', text: 'Brüche und gemischte Zahlen addieren und subtrahieren' },
  'ZO.bruch-malgeteilt': { leitidee: 'Zahl und Operation', text: 'Brüche multiplizieren und dividieren; Anteile von Anteilen' },
  'ZO.dezimal-darstellen': { leitidee: 'Zahl und Operation', text: 'Dezimalzahlen im Stellenwertsystem darstellen, ordnen und runden' },
  'ZO.dezimal-rechnen': { leitidee: 'Zahl und Operation', text: 'Mit Dezimalzahlen in allen vier Grundrechenarten rechnen und überschlagen' },
  'ZO.darstellung-wechseln': { leitidee: 'Zahl und Operation', text: 'Zwischen Bruch, Dezimalzahl und Prozentzahl wechseln' },
  'ZO.prozent': { leitidee: 'Zahl und Operation', text: 'Prozent vorstellungsbasiert verstehen und berechnen, auch mit dem Prozentstreifen' },
  'ZO.rationale-zahlen': { leitidee: 'Zahl und Operation', text: 'Rationale Zahlen nutzen, Rechenarten und Rechengesetze anwenden' },
  'ZO.negative-zahlen': { leitidee: 'Zahl und Operation', text: 'Negative Zahlen als Zustände und Änderungen beschreiben und ordnen' },
  'ZO.negative-rechnen': { leitidee: 'Zahl und Operation', text: 'Mit positiven und negativen Zahlen rechnen; Vorzeichen und Rechenzeichen unterscheiden' },
  'ZO.terme': { leitidee: 'Zahl und Operation', text: 'Rechenterme strukturieren: Klammern, Punkt vor Strich, vorteilhaftes Rechnen' },
  'GM.einheiten': { leitidee: 'Größen und Messen', text: 'Größen in Kommaschreibweise angeben und Einheiten umwandeln' },
  'GM.massstab': { leitidee: 'Größen und Messen', text: 'Mit Maßstäben zwischen Plan und Wirklichkeit umrechnen' },
  'GM.winkel': { leitidee: 'Größen und Messen', text: 'Winkel schätzen und messen' },
  'GM.flaeche': { leitidee: 'Größen und Messen', text: 'Umfang und Flächeninhalt von Rechteck, Parallelogramm, Dreieck und zusammengesetzten Figuren bestimmen' },
  'GM.flaecheneinheiten': { leitidee: 'Größen und Messen', text: 'Flächeneinheiten umwandeln und vergleichen' },
  'GM.oberflaeche-volumen': { leitidee: 'Größen und Messen', text: 'Oberfläche und Volumen von Würfel und Quader bestimmen' },
  'GM.volumeneinheiten': { leitidee: 'Größen und Messen', text: 'Volumeneinheiten umwandeln und vergleichen' },
  'SF.variablen': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Variablen als Zahlen verstehen, in Terme einsetzen und Terme aufstellen' },
  'SF.gleichungen': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Einfache Gleichungen durch Umkehren und Äquivalenzumformung lösen' },
  'SF.dreisatz': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Proportionale Zusammenhänge erkennen und mit dem Dreisatz nutzen' },
  'SF.koordinaten': { leitidee: 'Strukturen und funktionaler Zusammenhang', text: 'Punkte im Koordinatensystem ablesen und eintragen, in einem oder vier Quadranten' },
  'RF.winkel': { leitidee: 'Raum und Form', text: 'Winkelarten unterscheiden und Winkelbeziehungen an Geraden nutzen' },
  'RF.figuren': { leitidee: 'Raum und Form', text: 'Dreiecke, Vierecke und den Kreis nach ihren Eigenschaften beschreiben' },
  'RF.abbildungen': { leitidee: 'Raum und Form', text: 'Figuren spiegeln und verschieben; die Idee der Kongruenz nutzen' },
  'RF.koerper': { leitidee: 'Raum und Form', text: 'Quader in Netz und Schrägbild darstellen und erkennen' },
  'DZ.diagramme': { leitidee: 'Daten und Zufall', text: 'Diagramme lesen, einschließlich Kreisdiagramm, und täuschende Darstellungen erkennen' },
  'DZ.haeufigkeit': { leitidee: 'Daten und Zufall', text: 'Absolute und relative Häufigkeiten bestimmen und vergleichen' },
  'DZ.kennwerte': { leitidee: 'Daten und Zufall', text: 'Arithmetisches Mittel, Median und Spannweite bestimmen und deuten' },
  'DZ.chancen': { leitidee: 'Daten und Zufall', text: 'Chancen mit relativen Häufigkeiten einstufiger Zufallsversuche vergleichen' },
  'PK.argumentieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch argumentieren (Aussagen prüfen, begründen, Gegenbeispiele finden)' },
  'PK.modellieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch modellieren (Sachsituation und Rechnung verbinden)' },
  'PK.problemloesen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Probleme mathematisch lösen (Rückwärtsarbeiten, systematisches Probieren)' },
  'PK.darstellen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematische Darstellungen verwenden und wechseln' },
} as const satisfies Record<string, KmkTag>;

export type KmkTagId = keyof typeof KMK_TAGS;

export function isKmkTag(id: string): id is KmkTagId {
  return Object.prototype.hasOwnProperty.call(KMK_TAGS, id);
}

/**
 * Where each topic sits in the plans (shown on the page for adults). The school year of a topic is firm only in Bayern. NRW names the end of 5/6, Berlin-Brandenburg levels (§2.2), so the app can
 * say only "in Klasse 5 oder 6" there. Paraphrased from §2.3, with the same limits: absence claims come from a text search of the pages named and a teacher should confirm them (§8).
 */
export const TOPIC_ALIGNMENT: Record<TopicId, { kmk: Leitidee[]; bayern: string; nrw: string; bb: string }> = {
  brueche: {
    kmk: ['Zahl und Operation'],
    bayern: 'Jgst. 6 in allen Schularten: Bedeutung, Erweitern, Kürzen, plus und minus. Mal und geteilt ebenfalls, an der Mittelschule geteilt nur durch eine natürliche Zahl',
    nrw: 'Ende 5/6: Bedeutung, Erweitern, Kürzen, plus und minus einfacher Brüche. Mal und geteilt am Gymnasium, sonst 7/8',
    bb: 'Niveau D: Kürzen, Erweitern, die vier Grundrechenarten',
  },
  dezimal: {
    kmk: ['Zahl und Operation', 'Größen und Messen'],
    bayern: 'Jgst. 6 in allen Schularten: Stellenwerte, Runden, alle vier Rechenarten; periodische Zahlen am Gymnasium und an der Realschule',
    nrw: 'Ende 5/6: endliche und periodische Dezimalzahlen, alle vier Rechenarten',
    bb: 'Niveau D: alle vier Rechenarten; periodische Zahlen auf Niveau E',
  },
  negativ: {
    kmk: ['Zahl und Operation'],
    bayern: 'Ganze Zahlen in Jgst. 5; in Jgst. 6 rationale Zahlen mit allen Rechenarten, an der Mittelschule begrenzt',
    nrw: 'Ende 5/6: ganze Zahlen für Zustände und Änderungen; das Rechnen mit rationalen Zahlen in 7/8',
    bb: 'Niveau E, in der Planungshilfe zu Jg. 6 nicht enthalten',
  },
  prozent: {
    kmk: ['Zahl und Operation', 'Strukturen und funktionaler Zusammenhang'],
    bayern: 'Gymnasium und Realschule rechnen in Jgst. 6 mit Grundwert, die Mittelschule erst in Jgst. 7. Dreisatz am Gymnasium und an der Realschule ab Jgst. 5',
    nrw: 'Ende 5/6: Prozentzahl als Darstellung, die Rechnung in 7/8. Dreisatz am Gymnasium in 5/6, sonst in 7/8',
    bb: 'Prozent auf Niveau E, in der Planungshilfe „kein Inhalt in der Klassenstufe 6“. Dreisatz auf Niveau D',
  },
  terme: {
    kmk: ['Zahl und Operation', 'Strukturen und funktionaler Zusammenhang'],
    bayern: 'Rechenterme in allen Schularten. Variablen und Gleichungen an der Realschule in Jgst. 6, sonst in Jgst. 7',
    nrw: 'Ende 5/6: Rechenterme, Variablen, einsetzen, umkehren',
    bb: 'Niveau D: Platzhalter, eine Rechenoperation',
  },
  geometrie: {
    kmk: ['Raum und Form', 'Größen und Messen', 'Strukturen und funktionaler Zusammenhang'],
    bayern: 'Winkel und Koordinaten ab Jgst. 5; vier Quadranten an der Mittelschule in Jgst. 6. Achsenspiegelung als Kongruenzabbildung an der Realschule in Jgst. 6',
    nrw: 'Ende 5/6: Winkel messen, Vierecke, Kreis als Figur, Koordinaten, Verschieben und Spiegeln',
    bb: 'Niveau D: 1. Quadrant, Winkelbeziehungen, kongruente Figuren; vier Quadranten auf Niveau E',
  },
  flaechen: {
    kmk: ['Größen und Messen', 'Raum und Form'],
    bayern: 'Jgst. 6: Volumen und Oberfläche; Parallelogramm und Dreieck am Gymnasium und an der Realschule, an der Mittelschule erst in Jgst. 7',
    nrw: 'Ende 5/6: Rechteck, rechtwinkliges Dreieck, Zerlegen, Quader; Parallelogramm in 7/8',
    bb: 'Niveau D: Rechtecke, Quader, Netze; andere Figuren auf Niveau E',
  },
  daten: {
    kmk: ['Daten und Zufall'],
    bayern: 'Mittelwert am Gymnasium und an der Mittelschule in Jgst. 6, an der Realschule in Jgst. 7. Relative Häufigkeit am Gymnasium; Kreisdiagramm am Gymnasium, an der Mittelschule Jgst. 7',
    nrw: 'Ende 5/6: Mittelwert, Median, relative Häufigkeit, Kreisdiagramm; Boxplots nur am Gymnasium',
    bb: 'Niveau D: relative Häufigkeit als Bruch, einstufige Zufallsversuche, Kreisdiagramm lesen; Median und Mittelwert auf Niveau E',
  },
};

/** Where the plans differ at this level, and what the app does about it (§2.3, §2.4, §2.5; for the page for adults). */
export const LAENDER_DIFFERENCES: readonly { topic: string; text: string }[] = [
  { topic: 'Das Land zählt so viel wie die Schulart', text: 'Die NRW-Pläne für Realschule, Hauptschule und Gesamtschule haben für 5/6 denselben Inhalt. Die Realschule in Bayern und die Realschule in NRW unterscheiden sich viel stärker. Eine Frage nur nach der Schulart passt deshalb nicht.' },
  { topic: 'Bruchrechnung', text: 'Multiplizieren und Dividieren stehen in Bayern, am NRW-Gymnasium und in Berlin-Brandenburg in Klasse 6, in den anderen NRW-Plänen in 7/8. Die bayerische Mittelschule teilt nur durch natürliche Zahlen und sieht deshalb Stufe 1. Beide Übungen bleiben sonst ein Extra.' },
  { topic: 'Prozentrechnung', text: 'Rechnen mit dem Grundwert steht nur am bayerischen Gymnasium und an der bayerischen Realschule in Klasse 6, an der Mittelschule in Klasse 7. Prozent als Darstellung gehört zum Kern, außer in Berlin-Brandenburg.' },
  { topic: 'Negative Zahlen', text: 'Rechnen mit negativen rationalen Zahlen steht in Klasse 6 nur in Bayern, an der Mittelschule begrenzt. NRW nutzt ganze Zahlen für Zustände und Änderungen. Die Planungshilfe aus Berlin-Brandenburg nennt sie für Jahrgangsstufe 6 nicht.' },
  { topic: 'Terme und Gleichungen', text: 'Variablen und Gleichungen kommen an der bayerischen Realschule in Klasse 6, in NRW in 5/6, sonst später. Rechenterme und Umkehraufgaben gehören zum Kern.' },
  { topic: 'Flächen', text: 'Parallelogramm und allgemeines Dreieck stehen am bayerischen Gymnasium und an der Realschule in Klasse 6, in NRW in 7/8. In NRW zählt beim Dreieck und beim Zerlegen deshalb nur Stufe 1.' },
  { topic: 'Daten und Zufall', text: 'Median, Spannweite und Kreisdiagramm sind in NRW Stoff von 5/6, an der bayerischen Realschule erst von Klasse 7. Einstufige Zufallsversuche stehen nur in Berlin-Brandenburg.' },
  { topic: 'Andere Bundesländer', text: 'Gelesen wurden nur Bayern, NRW und Berlin-Brandenburg. Für jedes andere Land gilt die Voreinstellung „Anderes Land oder weiß nicht“: Der gemeinsame Kern zählt, alles andere bleibt als Extra erreichbar.' },
];

/** What is not verified (§8), in plain words for adults. */
export const UNVERIFIED: readonly string[] = [
  'Die Inhalte wurden mit automatischen Tests und einer KI-Durchsicht geprüft. Keine Lehrkraft und keine Fachdidaktik hat sie bisher durchgesehen.',
  'Gelesen wurden sechs Pläne in drei Ländergruppen. Baden-Württemberg und die übrigen Länder wurden nicht gelesen, ebenso wenig Förderschulpläne und M-Klassen der bayerischen Mittelschule.',
  'Aussagen wie „nicht in 5 bis 7 genannt“ stammen aus einer Textsuche auf den genannten Seiten. Eine Lehrkraft sollte sie bestätigen, vor allem zur relativen Häufigkeit an Real- und Mittelschule in Bayern.',
  'Die Einschränkung der bayerischen Mittelschule beim Dividieren beruht auf dem Alternativtext eines Formelbilds. Ob sie auch für das Teilen durch eine Dezimalzahl gilt, ist offen.',
  'Der Rahmenlehrplan Berlin-Brandenburg lag als Kopie einer Schule vor. Die Planungshilfe ist amtlich, aber nicht verbindlich.',
  'Alle Grenzen für Textlänge, Rundenlänge und Bedienung sind begründete Faustregeln. Eine Lesenorm für Klasse 6 wurde nicht gefunden, und ein Versuch mit Lernenden steht noch aus.',
  'Viele typische Fehler sind ohne eine Quelle für dieses Alter eingebaut, darunter alle zu negativen Zahlen und zur Prozentrechnung. Wie häufig sie vorkommen, ist nicht bekannt.',
  'Die Schreibweise P(3 | 5) und die Begriffe je Plan stammen aus einer begrenzten Lektüre. Mathe 6 nutzt für alle Pläne Dezimalzahl, Zahlenstrahl, Zahlengerade und Volumen.',
  'Die rechtliche Einschätzung, dass die Angabe zum Lehrplan keine personenbezogene Angabe ist, ist eine Auslegung und noch nicht rechtlich geprüft.',
];
