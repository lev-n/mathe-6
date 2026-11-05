import { useEffect, useState, type HTMLAttributes, type RefObject } from 'react';

/**
 * A box that scrolls sideways on a narrow screen holds data the task needs, and it has no field to focus. So it is a Tab stop
 * while, and only while, it overflows: the arrow keys then scroll it in every browser (WCAG 2.1.1). Where it fits, nothing changes.
 */
export function useScrollStop(ref: RefObject<HTMLElement | null>, label: string): HTMLAttributes<HTMLElement> {
  const [scrolls, setScrolls] = useState(false);
  // Without dependencies: the picture inside can change while the box stays. An unchanged result does not render again.
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => {
      const overflow = getComputedStyle(box).overflowX;
      setScrolls((overflow === 'auto' || overflow === 'scroll') && box.scrollWidth > box.clientWidth + 1);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    return () => observer.disconnect();
  });
  return scrolls ? { tabIndex: 0, role: 'group', 'aria-label': label } : {};
}
