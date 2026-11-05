/**
 * Lineal in cm with mm ticks (long tick every cm, medium every 5 mm) and an object (bar) above it from startMm to
 * startMm + lengthMm; dashed guide lines lead from the bar ends down to the scale. minCm > 0 draws a broken ruler that starts at this
 * number; `second` is a second object above the first (compare two lengths). Long rulers label every 2nd cm, so the labels stay
 * readable on a phone.
 */
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './RulerVisual.css';

type Ruler = VisualOf<'ruler'>;

const MARGIN = 18;
/** Room on the right for the unit label 'cm'. */
const RIGHT = 42;
const BAR_H = 22;
const BAR_GAP = 10;
const RULER_H = 58;
const LONG_RULER_CM = 15;
/** Never wider than a phone card can show at the 0.72 floor below (311 px), so a ruler up to 25 cm needs no sideways scrolling. */
const pxPerMm = (cm: number) => Math.min(cm > LONG_RULER_CM ? 1.8 : 2.8, 37 / cm);

/** '7 cm' or '7 cm 4 mm' */
function pos(mm: number): string {
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  return rest === 0 ? `${cm} cm` : `${cm} cm ${rest} mm`;
}

export function rulerLabel(v: Ruler): string {
  return `Lineal von 0 bis ${v.maxCm} cm. Ein Streifen beginnt bei ${pos(v.startMm)} und endet bei ${pos(v.startMm + v.lengthMm)}.`;
}

export default function RulerVisual({ visual, print }: VisualProps<Ruler>) {
  const maxCm = Math.max(1, Math.round(visual.maxCm));
  const px = pxPerMm(maxCm);
  const rulerY = BAR_H + BAR_GAP + 8;
  const width = MARGIN + maxCm * 10 * px + RIGHT;
  const height = rulerY + RULER_H + 8;
  const x = (mm: number) => MARGIN + mm * px;
  const clamp = (mm: number) => Math.max(0, Math.min(maxCm * 10, mm));
  const labelEvery = maxCm > LONG_RULER_CM ? 2 : 1;
  const start = clamp(Math.round(visual.startMm));
  const end = Math.max(start, clamp(start + Math.round(visual.lengthMm)));
  return (
    <svg
      className={`visual visual-ruler ${READABLE}${print ? ' visual--print' : ''}`}
      style={readableStyle(width, 0.72)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={rulerLabel(visual)}
    >
      <rect className="rl-bar" x={x(start)} y={8} width={x(end) - x(start)} height={BAR_H} rx={5} data-testid="ruler-bar" />
      <line className="rl-guide" x1={x(start)} y1={8 + BAR_H} x2={x(start)} y2={rulerY} />
      <line className="rl-guide" x1={x(end)} y1={8 + BAR_H} x2={x(end)} y2={rulerY} />
      <rect className="rl-body" x={MARGIN - 12} y={rulerY} width={maxCm * 10 * px + 24} height={RULER_H} rx={4} />
      {Array.from({ length: maxCm * 10 + 1 }, (_, mm) => {
        const cm = mm % 10 === 0;
        const h = cm ? 22 : mm % 5 === 0 ? 15 : 9;
        return <line key={mm} className={`rl-tick${cm ? ' rl-tick--cm' : ''}`} data-tick={cm ? 'cm' : 'mm'} x1={x(mm)} y1={rulerY} x2={x(mm)} y2={rulerY + h} />;
      })}
      {Array.from({ length: maxCm + 1 }, (_, cm) => cm)
        .filter((cm) => cm % labelEvery === 0)
        .map((cm) => (
          <text key={cm} className="rl-num" x={x(cm * 10)} y={rulerY + 46} textAnchor="middle">
            {cm}
          </text>
        ))}
      <text className="rl-unit" x={x(maxCm * 10) + 28} y={rulerY + 46} textAnchor="middle">
        cm
      </text>
    </svg>
  );
}
