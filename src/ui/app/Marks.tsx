import { MarkIcon } from './icons';

/**
 * 0–3 mastery marks (docs/research.md §7.1): plain, with no star and no reward look. Filled and outlined marks differ in shape fill, not only colour, and the accessible name says the number in words.
 */
export function Marks({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <span className="marks" role="img" aria-label={`${count} von 3 Marken`}>
      {[0, 1, 2].map((i) => (
        <MarkIcon key={i} filled={i < count} />
      ))}
    </span>
  );
}

/** Legend that explains what the marks mean (marks always come with a legend). */
export function MarkLegend() {
  return (
    <ul className="mark-legend" aria-label="So sind die Marken gemeint">
      <li>
        <Marks count={1} /> Geübt
      </li>
      <li>
        <Marks count={2} /> Sicher
      </li>
      <li>
        <Marks count={3} /> Gemeistert
      </li>
    </ul>
  );
}
