/**
 * 'So geht's': a freshly generated exercise with its complete worked solution (docs/research.md L6).
 * Shown inline (never as a pop-up): before the first item of a new Stufe, after two items in a row that
 * needed the solution, or whenever the child opens it from the header.
 */
import type { MouseEvent, Ref } from 'react';
import { correctResponse, formatAnswer } from '../../core/check';
import { keepTermsTogether } from '../../core/format';
import type { Exercise, Step, Visual } from '../../core/types';
import AnswerInput from '../answers/AnswerInput';
import { MathText } from '../app/MathText';
import { srTextWithPicture } from '../visuals/describe';
import VisualView from '../visuals/Visual';
import VisualWrap from '../visuals/VisualWrap';
import { SOLUTION_PREFIX } from './phrases';

/** Worked solution steps: strings or text with a visual. */
export function StepList({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="pr-steps">
      {steps.map((step, i) => {
        const text = typeof step === 'string' ? step : step.text;
        const visual = typeof step === 'string' ? undefined : step.visual;
        return (
          <li key={i} className="pr-steps__step">
            <span className="pr-steps__text"><MathText text={text} /></span>
            {visual && (
              <VisualWrap className="pr-steps__visual">
                <VisualView visual={visual} />
              </VisualWrap>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The picture of the option a choice answer names: the options are not on screen in an example, so 'Die Lösung: C' alone points
 * at nothing. Undefined when the option has no picture, or a step already draws it.
 */
export function solutionPictureOf(ex: Exercise): Visual | undefined {
  if (ex.answer.kind !== 'choice') return undefined;
  const picture = ex.answer.options[ex.answer.correct].visual;
  if (!picture) return undefined;
  const same = JSON.stringify(picture);
  return ex.steps.some((step) => typeof step !== 'string' && JSON.stringify(step.visual) === same) ? undefined : picture;
}

/** Answer kinds whose solution is best shown in their own (read-only) input. */
const SHOW_SOLVED_INPUT = new Set(['written', 'cells', 'numberline']);

/**
 * The solved answer input is only a fallback for steps without a picture: generators normally end the steps
 * with the finished calculation / drawing / number line, and a second copy would only repeat it.
 */
export function showsSolvedInput(ex: Exercise): boolean {
  return SHOW_SOLVED_INPUT.has(ex.answer.kind) && !ex.steps.some((step) => typeof step !== 'string' && step.visual);
}

export interface WorkedExampleProps {
  id: string;
  exercise: Exercise;
  /** Intro line, e.g. 'Hier siehst du ein Beispiel.' */
  intro?: string;
  doneLabel: string;
  onDone: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Primary button (intro) vs. secondary close button (opened from the header). */
  primary?: boolean;
  ref?: Ref<HTMLElement>;
}

export default function WorkedExample({ id, exercise: ex, intro, doneLabel, onDone, primary = false, ref }: WorkedExampleProps) {
  const headingId = `${id}-heading`;
  const solutionPicture = solutionPictureOf(ex);
  return (
    <section id={id} ref={ref} tabIndex={-1} className="pr-example card" aria-labelledby={headingId}>
      <h2 className="pr-example__heading" id={headingId}>
        So geht&apos;s
      </h2>
      {intro && <p className="pr-example__intro">{intro}</p>}
      <div className="pr-example__task">
        <p className="pr-example__label">Beispiel</p>
        {ex.context && (
          <p className="pr-context">
            <MathText text={keepTermsTogether(ex.context)} />
          </p>
        )}
        <p className="pr-prompt"><MathText text={keepTermsTogether(ex.prompt)} /></p>
        {ex.expression && (
          <p className="pr-expression pr-expression--sm" aria-hidden="true">
            <MathText text={keepTermsTogether(ex.expression)} />
          </p>
        )}
        <p className="visually-hidden">{srTextWithPicture(ex)}</p>
        {ex.visual && (
          <VisualWrap>
            <VisualView visual={ex.visual} />
          </VisualWrap>
        )}
      </div>
      <h3 className="pr-example__subheading">So rechnest du:</h3>
      <StepList steps={ex.steps} />
      {showsSolvedInput(ex) && (
        // A static picture of the solution: no tab stops, no input instructions (the text below says it).
        <div className="pr-example__solved" inert aria-hidden="true">
          <AnswerInput
            answer={ex.answer}
            literalComma={ex.literalComma}
            response={correctResponse(ex.answer)}
            onChange={() => {}}
            onSubmit={() => {}}
            disabled
            result={null}
            reveal
            idBase={`${id}-solved`}
            keypad={false}
          />
        </div>
      )}
      <p className="pr-solution">
        <strong>{SOLUTION_PREFIX}</strong>
        <MathText text={formatAnswer(ex.answer)} />
      </p>
      {solutionPicture && (
        <VisualWrap>
          <VisualView visual={solutionPicture} />
        </VisualWrap>
      )}
      <div className="pr-actions no-print">
        <button type="button" className={`btn btn--lg${primary ? ' btn--primary' : ''}`} onClick={onDone}>
          {doneLabel}
        </button>
      </div>
    </section>
  );
}
