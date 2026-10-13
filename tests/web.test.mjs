import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {snapshot,validate,csvValue} from '../web/src/core.mjs';
import {displayValue,coverageLabel} from '../web/src/presentation.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const d=read('../data/demo/dataset.json');
for(const [name,opts] of [['default',{}],['all',{scope:'all'}],['historical',{as_of:'2026-09-01'}],['known',{knowledge_as_of:'2026-09-01'}],['industry_transition',{scope:'industry_transition'}]])test('Python/JS parity: '+name,()=>assert.deepEqual(snapshot(d,opts),read('../verification/fixture-'+name+'.json')));
test('missing is null',()=>assert.equal(snapshot(read('../data/templates/empty.dataset.json')).kpis.registered,null));
test('duplicate rejected',()=>{const x=structuredClone(d);x.methodologies.push(x.methodologies[0]);assert.throws(()=>validate(x));});
test('formula injection escaped',()=>assert.equal(csvValue(' =cmd'),'"\' =cmd"'));
test('invalid date rejected',()=>{const x=structuredClone(d);x.metadata.as_of='2026-02-30';assert.throws(()=>validate(x));});

test('zero is retained while missing is labelled',()=>{
 assert.equal(displayValue(0,'자료 미확보'),0);
 assert.equal(displayValue(null,'자료 미확보'),'자료 미확보');
 assert.equal(coverageLabel('partial'),'확인된 일부 자료');
});

test('confirmed empty and unavailable data differ',()=>{
 for(const coverage of ['partial','complete']){
  const x=read('../data/templates/empty.dataset.json');
  x.metadata.coverage.registrations=coverage;x.metadata.coverage.reviews=coverage;
  const s=snapshot(x);assert.equal(s.kpis.registered,0);assert.equal(s.kpis.reviewing,0);
 }
 const x=read('../data/templates/empty.dataset.json');
 assert.equal(snapshot(x).kpis.reviewing,null);assert.deepEqual(snapshot(x).annual,[]);
});
