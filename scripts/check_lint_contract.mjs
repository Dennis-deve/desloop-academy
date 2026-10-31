// CI guard: changing ESLint dependencies must not silently remove JSX accessibility,
// React Hook or TypeScript safety checks. This invokes the actual configured linter.
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';

const eslint = new ESLint();
const filePath = 'src/lint-contract-fixture.tsx';
const config = await eslint.calculateConfigForFile(filePath);
assert.ok(config, 'The TSX source must be included by the flat config');
const severity = (rule) => config.rules[rule]?.[0];
const expectedSeverity = (value) => {
  const level = Array.isArray(value) ? value[0] : value;
  return { off: 0, warn: 1, error: 2 }[level] ?? level;
};
const recommended = jsxA11y.configs.recommended.rules;
assert.equal(Object.keys(recommended).length, 34, 'Review changes to the JSX accessibility preset');
for (const [name, level] of Object.entries(recommended)) {
  assert.equal(
    severity(name),
    name === 'jsx-a11y-x/anchor-is-valid' ? 0 : expectedSeverity(level),
    `${name} lost the original recommended severity (except the documented anchor rule)`,
  );
}
assert.equal(severity('react-hooks/rules-of-hooks'), 2);
assert.equal(severity('react-hooks/exhaustive-deps'), 1);
assert.equal(severity('@typescript-eslint/no-explicit-any'), 2);
assert.equal(severity('@typescript-eslint/no-unused-vars'), 2);

async function requiresRule(code, name) {
  const [result] = await eslint.lintText(code, { filePath });
  assert.ok(
    result?.messages.some((message) => message.ruleId === name),
    `${name} must reject the intentionally invalid isolated fixture`,
  );
}
await requiresRule('export function Fixture(){ return <img src="/brand.png" />; }',
  'jsx-a11y-x/alt-text');
await requiresRule('export function Fixture(){ return <div onClick={() => 1}>Open</div>; }',
  'jsx-a11y-x/click-events-have-key-events');
await requiresRule('export function Fixture(){ return <label htmlFor="missing" />; }',
  'jsx-a11y-x/label-has-associated-control');
await requiresRule(
  'import { useState } from "react"; export function Fixture({ ready }: {ready:boolean}) { if (ready) useState(0); return <div />; }',
  'react-hooks/rules-of-hooks',
);
await requiresRule('export const fixture: any = 1;', '@typescript-eslint/no-explicit-any');
console.log('Lint boundary verified: 34 recommended JSX accessibility rules, React Hooks and TypeScript checks execute.');
