import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVisual,visualDocumentSchema,visualHash} from '../src/engine/visual.js';

const valid={format:'desloop-visual-v1',steps:[{kind:'START'},
  {kind:'SAY',text:'A pretend train arrives'},{kind:'SAY',text:'The pretend train departs'}]};
test('declarative visual evaluator awards only a valid event and two ordered distinct safe steps',()=>{
  const document=visualDocumentSchema.parse(valid);
  assert.equal(evaluateVisual(document).passed,true);
  assert.equal(evaluateVisual(document).trace.length,3);
  assert.match(visualHash(document),/^[0-9a-f]{64}$/);
  assert.equal(evaluateVisual(visualDocumentSchema.parse({...valid,steps:valid.steps.slice(1)})).passed,false);
  assert.equal(evaluateVisual(visualDocumentSchema.parse({...valid,steps:[valid.steps[0],valid.steps[1],valid.steps[1]]})).passed,false);
  assert.equal(evaluateVisual(visualDocumentSchema.parse({...valid,steps:[valid.steps[0],
    {kind:'SAY',text:'contact@example.invalid'},valid.steps[2]]})).passed,false);
});
test('untrusted code-like objects, oversize loops and arbitrary fields cannot enter the interpreter',()=>{
  assert.equal(visualDocumentSchema.safeParse({format:'desloop-visual-v1',steps:[
    {kind:'JAVASCRIPT',code:'process.exit(0)'}]}).success,false);
  assert.equal(visualDocumentSchema.safeParse({format:'desloop-visual-v1',steps:[
    {kind:'REPEAT',count:100000,text:'hello'}]}).success,false);
  assert.equal(visualDocumentSchema.safeParse({...valid,secret:'browser score passed'}).success,false);
  assert.equal(visualDocumentSchema.safeParse({...valid,steps:Array(25).fill({kind:'START'})}).success,false);
});
test('revision hash is order-stable for PostgreSQL JSONB and changes on edits',()=>{
  const a=visualDocumentSchema.parse(valid);
  const b=visualDocumentSchema.parse({steps:[{kind:'START'},{text:'A pretend train arrives',kind:'SAY'},
    {text:'The pretend train departs',kind:'SAY'}],format:'desloop-visual-v1'});
  assert.equal(visualHash(a),visualHash(b));
  assert.notEqual(visualHash(a),visualHash(visualDocumentSchema.parse({...valid,steps:[...valid.steps,
    {kind:'SAY',text:'A new fictional step'}]})));
});
