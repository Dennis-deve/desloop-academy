import { createHash } from 'node:crypto';
import { z } from 'zod';

const sentence = z.string().trim().min(3).max(100);
export const visualDocumentSchema = z
  .object({
    format: z.literal('desloop-visual-v1'),
    steps: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('START') }).strict(),
          z.object({ kind: z.literal('SAY'), text: sentence }).strict(),
          z
            .object({
              kind: z.literal('REPEAT'),
              count: z.number().int().min(2).max(4),
              text: sentence,
            })
            .strict(),
          z
            .object({ kind: z.literal('CHOICE'), prompt: sentence, yes: sentence, no: sentence })
            .strict(),
        ]),
      )
      .min(1)
      .max(24),
  })
  .strict();
export type VisualDocument = z.infer<typeof visualDocumentSchema>;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
export function visualHash(document: VisualDocument) {
  return createHash('sha256').update(canonicalJson(document)).digest('hex');
}
function privateLooking(text: string) {
  return /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s.-]*){9,})/i.test(text);
}

/** Deterministic interpretation of a bounded data format; NEVER executes user JS/Python/HTML. */
export function evaluateVisual(document: VisualDocument) {
  const startPositions = document.steps.flatMap((step, index) =>
    step.kind === 'START' ? [index] : [],
  );
  const spoken = document.steps.filter(
    (step): step is Extract<VisualDocument['steps'][number], { kind: 'SAY' }> =>
      step.kind === 'SAY',
  );
  const starts = startPositions.length === 1 && startPositions[0] === 0;
  const ordered =
    starts &&
    spoken.length >= 2 &&
    spoken[0].text.toLowerCase() !== spoken[1].text.toLowerCase() &&
    document.steps.findIndex((step) => step === spoken[0]) <
      document.steps.findIndex((step) => step === spoken[1]);
  const safe = !privateLooking(canonicalJson(document));
  const checks = [
    { id: 'event', label: 'One event starts the sequence', passed: starts },
    { id: 'sequence', label: 'Two different spoken steps follow in order', passed: ordered },
    { id: 'privacy', label: 'No obvious URLs, emails or phone numbers', passed: safe },
  ];
  const trace = document.steps
    .flatMap((step) => {
      if (step.kind === 'START') return ['Start event'];
      if (step.kind === 'SAY') return [`Say: ${step.text}`];
      if (step.kind === 'REPEAT')
        return Array.from({ length: step.count }, () => `Say: ${step.text}`);
      return [`If ${step.prompt}: ${step.yes} / otherwise: ${step.no}`];
    })
    .slice(0, 100);
  return { passed: checks.every((check) => check.passed), checks, trace };
}
