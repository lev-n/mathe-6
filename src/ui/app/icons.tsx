/**
 * Inline SVG icons (no external assets). Colours come from CSS (currentColor / classes), never hard-coded.
 * Decorative icons are aria-hidden; the visible text next to them carries the meaning.
 */
import type { ComponentType } from 'react';
import type { TopicId } from '../../core/types';

/** App logo mark: a rounded tile with a drawn "6". */
export function LogoMark({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width="40" height="40" aria-hidden="true" focusable="false">
      <rect className="logo-mark__bg" x="0" y="0" width="64" height="64" rx="16" />
      <path className="logo-mark__fg" d="M42 13C30 15 20 26 20 41a12 12 0 1 0 24 0a12 12 0 1 0-24 0" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_PROPS = {
  viewBox: '0 0 48 48',
  width: 48,
  height: 48,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

function BruecheIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Zähler über Bruchstrich über Nenner, daneben ein Viertelkreis */}
      <circle cx="33" cy="24" r="11" />
      <path d="M33 24V13a11 11 0 0 1 11 11z" fill="currentColor" fillOpacity="0.25" />
      <path d="M6 24h14" strokeWidth="3" />
      <path d="M10 10h6v8M13 30c4-1 7 1 5 4l-5 5h7" />
    </svg>
  );
}

function DezimalIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Stellen um ein Komma */}
      <rect x="5" y="12" width="14" height="24" rx="2" />
      <rect x="27" y="12" width="14" height="24" rx="2" />
      <path d="M22 34c1.500 0 2 1 2 2 0 2-1 3.500-3 4.500" strokeWidth="3" />
      <path d="M9 19l3-2v14M31 19c5-3 8 2 4 6l-4 6h7" />
    </svg>
  );
}

function NegativIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Zahlengerade mit Pfeilen an beiden Enden, die Null in der Mitte */}
      <path d="M4 28h40M8 23l-5 5 5 5M40 23l5 5-5 5" />
      <path d="M14 24v8M24 21v14M34 24v8" />
      <path d="M11 12h8" strokeWidth="3" />
      <path d="M29 12h8M33 8v8" strokeWidth="3" />
    </svg>
  );
}

function ProzentIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="15" cy="15" r="6" />
      <circle cx="33" cy="33" r="6" />
      <path d="M36 9L12 39" strokeWidth="3" />
    </svg>
  );
}

function TermeIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Klammern um einen Platzhalter */}
      <path d="M12 8c-6 9-6 23 0 32M36 8c6 9 6 23 0 32" strokeWidth="3" />
      <rect x="17" y="17" width="14" height="14" rx="2" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function GeometrieIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Winkel mit Bogen und ein Dreieck */}
      <path d="M6 40h36M6 40L28 10" />
      <path d="M18 40a12 12 0 0 0-4.900-9.700" />
      <path d="M32 40l6-16 6 16" fill="currentColor" fillOpacity="0.15" strokeWidth="2" />
    </svg>
  );
}

function FlaechenIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Quader im Schrägbild */}
      <path d="M6 18h24v22H6zM6 18l10-10h24L30 18M40 8v22L30 40" fill="currentColor" fillOpacity="0.1" />
      <path d="M16 8v22M16 30H40M16 30L6 40" strokeDasharray="3 3" strokeWidth="1.500" />
    </svg>
  );
}

function DatenIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Säulen auf einer Achse */}
      <path d="M6 6v36h36" />
      <rect x="12" y="24" width="7" height="18" fill="currentColor" fillOpacity="0.15" />
      <rect x="23" y="14" width="7" height="28" fill="currentColor" fillOpacity="0.15" />
      <rect x="34" y="30" width="7" height="12" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

const TOPIC_ICONS: Record<TopicId, ComponentType> = {
  brueche: BruecheIcon,
  dezimal: DezimalIcon,
  negativ: NegativIcon,
  prozent: ProzentIcon,
  terme: TermeIcon,
  geometrie: GeometrieIcon,
  flaechen: FlaechenIcon,
  daten: DatenIcon,
};

/** The icon of a topic (colour from the topic's CSS class). */
export function TopicIcon({ topicId }: { topicId: TopicId }) {
  const Icon = TOPIC_ICONS[topicId];
  return <Icon />;
}

/** A plain mark: a filled or an outlined circle. */
export function MarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg className={filled ? 'mark mark--on' : 'mark mark--off'} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" strokeWidth="2.5" />
    </svg>
  );
}

/** Generic small icons used next to text labels. */
export function ArrowIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
    </svg>
  );
}

export function PrintIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Navigation icons (top app bar): outlined, 24 px; the current page tints the inside (app.css). */
const NAV_ICON_PROPS = {
  className: 'site-nav__icon',
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function HomeIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" />
    </svg>
  );
}

export function ProgressIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-5h3v5zM13 16V7h3v9z" />
    </svg>
  );
}

export function SheetIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}

export function AdultsIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20z" />
      <path d="M16 15.5h1.5a3.5 3.5 0 0 1 3.5 3.5v1h-4" />
    </svg>
  );
}
