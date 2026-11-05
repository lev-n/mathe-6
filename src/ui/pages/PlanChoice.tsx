/**
 * The optional plan choice (docs/research.md §2.5): a small line on the topic overview and on the adult page, never a gate and never at first start. After the choice the screen shows
 * "Lehrplan: eingestellt" with a change link, never the school type. Stored only after consent, like every setting; without it the choice holds for this visit.
 * A radio only marks a plan: the arrow keys walk the list and nothing changes until 'Übernehmen' (WCAG 3.2.2). The focus moves with the swap between the line and the list (WCAG 2.4.3).
 */
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PLAN, PLAN_OPTIONS, PLAN_TEXT } from '../../data/plans';
import type { PlanId } from '../../core/types';
import { store } from '../../state/store';
import { useSettings } from '../../state/useProgress';

/** The line, the seven options and the state after the choice. intro: a sentence above the options for adults. */
export function PlanChoice({ intro }: { intro?: string }) {
  const { plan } = useSettings();
  const [open, setOpen] = useState(false);
  // 'Anderes Land oder weiß nicht' is a choice too, even though it is the default: the screen confirms it for this visit.
  const [chosen, setChosen] = useState(false);
  const [marked, setMarked] = useState<PlanId>(plan);
  const checkedRadio = useRef<HTMLInputElement>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (open ? checkedRadio : changeButton).current?.focus();
  }, [open]);

  const openList = () => {
    setMarked(plan);
    moveFocus.current = true;
    setOpen(true);
  };

  const confirm = () => {
    store.updateSettings({ plan: marked });
    setChosen(true);
    moveFocus.current = true;
    setOpen(false);
  };

  if (open) {
    return (
      <fieldset className="choice-group setting plan-choice" data-testid="plan-choice">
        <legend>{PLAN_TEXT.question}</legend>
        {intro && <p className="hint setting__hint">{intro}</p>}
        <div className="check-list">
          {PLAN_OPTIONS.map((o) => (
            <label key={o.id} className="check-row">
              <input ref={o.id === plan ? checkedRadio : undefined} type="radio" name="set-plan" value={o.id} checked={marked === o.id} onChange={() => setMarked(o.id)} />
              <span>
                <span className="check-row__title">{o.label}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="hint setting__hint">{PLAN_TEXT.note}</p>
        <button type="button" className="btn" onClick={confirm}>
          {PLAN_TEXT.confirm}
        </button>
      </fieldset>
    );
  }

  if (plan !== DEFAULT_PLAN || chosen) {
    return (
      <p className="plan-line" data-testid="plan-set">
        <span className="plan-line__set">{PLAN_TEXT.set}</span>
        <button ref={changeButton} type="button" className="btn btn--text" onClick={openList}>
          {PLAN_TEXT.change}
        </button>
      </p>
    );
  }
  return (
    <p className="plan-line" data-testid="plan-line">
      <button type="button" className="btn btn--text" onClick={openList}>
        {PLAN_TEXT.line}
      </button>
    </p>
  );
}
