/**
 * A picture in words, for the description of a task (docs/research.md T20). A child who tabs to the answer field never meets a picture's own aria-label,
 * so srText alone would ask about data it does not hold. Every text here comes from the picture's aria-label, which never states an answer.
 */
import { toSpeech } from '../../core/format';
import type { Exercise, Visual } from '../../core/types';
import { angleAriaLabel } from './AngleVisual';
import { bagLabel } from './BagVisual';
import { barChartLabel } from './BarChartVisual';
import { containerLabel } from './ContainerVisual';
import { coordinateAriaLabel } from './CoordinateGridVisual';
import { cubeBuildingAriaLabel } from './CubeBuildingVisual';
import { diceLabel } from './DiceVisual';
import { figureAriaLabel } from './FigureVisual';
import { fractionModelLabel } from './FractionModelVisual';
import { gridAriaLabel } from './GridVisual';
import { linesAriaLabel } from './LinesVisual';
import { netAriaLabel, netRectsLabel } from './NetVisual';
import { numberLineAriaLabel } from './NumberLineVisual';
import { percentBarLabel } from './PercentBarVisual';
import { pieChartLabel } from './PieChartVisual';
import { placeValueAriaLabel } from './PlaceValueVisual';
import { quaderAriaLabel } from './QuaderVisual';
import { rulerLabel } from './RulerVisual';
import { shapeAriaLabel } from './ShapeVisual';
import { spinnerLabel } from './SpinnerVisual';
import { tallyLabel } from './TallyVisual';
import { termAriaLabel } from './TermVisual';
import { tableArrowsText } from './TableVisual';
import { thermometerLabel } from './ThermometerVisual';
import { describeWritten } from './WrittenVisual';

export function describeVisual(v: Visual): string {
  switch (v.type) {
    case 'angle':
      return angleAriaLabel(v);
    case 'barChart':
      return barChartLabel(v);
    case 'container':
      return containerLabel(v);
    case 'coordinateGrid':
      return coordinateAriaLabel(v);
    case 'cubeBuilding':
      return cubeBuildingAriaLabel(v);
    case 'fractionModel':
      return fractionModelLabel(v);
    case 'grid':
      return gridAriaLabel(v);
    case 'lines':
      return linesAriaLabel(v);
    case 'net':
      return 'rects' in v ? netRectsLabel(v.rects) : netAriaLabel(v.cells, v.faces, v.groups);
    case 'numberLine':
      return numberLineAriaLabel(v);
    case 'placeValue':
      return placeValueAriaLabel(v);
    case 'quader':
      return quaderAriaLabel(v);
    case 'ruler':
      return rulerLabel(v);
    case 'shape':
      return shapeAriaLabel(v.shape, v.rotate, v.named, v.showAxes);
    case 'tally':
      return tallyLabel(v);
    case 'table':
      return toSpeech(`Tabelle${v.caption ? ` ${v.caption}` : ''}: ${[v.header, ...v.rows].map((row) => row.join(', ')).join('; ')}.${tableArrowsText(v)}`);
    case 'term':
      return termAriaLabel(v);
    case 'thermometer':
      return thermometerLabel(v);
    case 'written':
      return describeWritten(v);
    case 'percentBar':
      return percentBarLabel(v);
    case 'figure':
      return figureAriaLabel(v);
    case 'pieChart':
      return pieChartLabel(v);
    case 'bag':
      return bagLabel(v);
    case 'dice':
      return diceLabel(v);
    case 'spinner':
      return spinnerLabel(v);
  }
}

/** Words that show a generator's srText already describes this kind of picture in its own way (its tick counts, its grid size, the figure's name). */
const NAMED_IN_TEXT: Partial<Record<Visual['type'], RegExp>> = {
  numberLine: /Zahlenstrahl|Zahlengerade|Rechenstrich/,
  thermometer: /Thermometer/,
  container: /Messbecher/,
  ruler: /Lineal/,
  placeValue: /Stellen(wert)?tafel/,
  grid: /Gitter/,
  coordinateGrid: /Koordinatensystem/,
  percentBar: /Prozentstreifen/,
  pieChart: /Kreisdiagramm/,
  lines: /Linie|Gerade|Strecke/,
  shape: /Viereck|Rechteck|Quadrat|Kreis|Dreieck|Sechseck|Raute|Parallelogramm|Trapez|Drachen|L-Form/,
  written: /\b(plus|minus|mal|geteilt)\b/,
};

/** A picture that holds nothing a child could use: an empty Stellentafel to fill, an angle with no tool. */
function holdsNoData(v: Visual): boolean {
  if (v.type === 'placeValue') return v.rows.every((row) => row.values.every((x) => x === null));
  return v.type === 'angle' && v.tool !== 'geodreieck' && !v.labels?.arc;
}

/**
 * srText with the picture's description, unless srText has its data already: it names the picture, or holds all of the description's numbers (digits
 * only, as '6,25 €' is said '6 Euro 25'). A picture without numbers and without a name in srText is described: tally, net.
 */
export function srTextWithPicture(ex: Pick<Exercise, 'srText' | 'visual'>): string {
  const v = ex.visual;
  if (!v || holdsNoData(v) || NAMED_IN_TEXT[v.type]?.test(ex.srText)) return ex.srText;
  const said = describeVisual(v);
  const numbers = said.match(/\d+/g) ?? [];
  const told = new Set(ex.srText.match(/\d+/g) ?? []);
  const known = numbers.length > 0 ? numbers.every((n) => told.has(n)) : ex.srText.includes(said);
  return known ? ex.srText : `${ex.srText} ${said}`;
}
