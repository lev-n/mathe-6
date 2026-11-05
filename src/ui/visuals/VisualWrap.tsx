import { useRef, type ReactNode } from 'react';
import { useScrollStop } from './useScrollStop';

/** The box around a task picture (.visual-wrap): a data picture that does not fit scrolls sideways inside it. */
export default function VisualWrap({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const stop = useScrollStop(ref, 'Bild. Mit den Pfeiltasten kannst du es verschieben.');
  return (
    <div ref={ref} className={`visual-wrap${className ? ` ${className}` : ''}`} {...stop}>
      {children}
    </div>
  );
}
