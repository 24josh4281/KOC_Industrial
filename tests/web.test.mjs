import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {snapshot,validate,csvValue} from '../web/src/core.mjs';
import {displayValue,coverageLabel} from '../web/src/presentation.mjs';
import {viewRows,visibleHistory,visibleVersions} from '../web/src/views.mjs';
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

test('KPI drilldowns preserve methodology, version and application units',()=>{
 for(const opts of [{},{scope:'all'},{year:2025},{as_of:'2026-09-01'},{knowledge_as_of:'2026-09-01'}]){
  const s=snapshot(d,opts);
  for(const [tab,preset] of [['method','registered'],['method','active'],['method','new_year'],['version','revisions_year'],['app','reviewing'],['app','pending_registration'],['app','waiting'],['app','overdue'],['app','unknown_stage']]){
   assert.equal(viewRows(d,s,{tab,preset}).length,s.kpis[preset],`${JSON.stringify(opts)} ${preset}`);
  }
 }
});

test('history details exclude future events and late recorded evidence',()=>{
 const x=structuredClone(d),app=x.applications[0].id;
 const base=x.review_events.find(e=>e.application_id===app);
 x.review_events.push({...base,id:'future-event',sequence:99998,occurred_on:'2027-01-01',recorded_on:'2027-01-01'});
 x.review_events.push({...base,id:'late-event',sequence:99999,occurred_on:'2026-10-01',recorded_on:'2027-01-01'});
 const s=snapshot(d);
 assert.ok(!visibleHistory(x,s,app).some(e=>['future-event','late-event'].includes(e.id)));
 assert.ok(visibleHistory(x,s,app).every(e=>e.occurred_on<=s.metadata.as_of&&e.recorded_on<=s.metadata.knowledge_as_of));
});

test('version details preserve unknown registration and exclude future records',()=>{
 const x=structuredClone(d),m=x.versions[0].methodology_id,base=x.versions[0];
 x.versions.push({...base,id:'unknown-date',version:'unknown-test',registered_on:null});
 x.versions.push({...base,id:'future-date',version:'future-test',registered_on:'2027-01-01'});
 x.versions.push({...base,id:'late-version',version:'late-test',recorded_on:'2027-01-01'});
 const rows=visibleVersions(x,snapshot(d),m);
 assert.equal(rows.find(v=>v.id==='unknown-date').registered_on,null);
 assert.ok(!rows.some(v=>['future-date','late-version'].includes(v.id)));
});

test('technology drilldowns match chart counts exactly and search is reversible',()=>{
 const s=snapshot(d),before=JSON.stringify(d);
 for(const [technology,n] of Object.entries(s.technology_counts))assert.equal(viewRows(d,s,{technology}).length,n);
 const first=s.application_rows[0];
 assert.ok(viewRows(d,s,{tab:'app',query:'  '+first.id.toLowerCase()+'  '}).some(r=>r.id===first.id));
 assert.equal(viewRows(d,s,{tab:'app',status:'approved'}).length,s.kpis.pending_registration);
 assert.equal(viewRows(d,s,{tab:'app'}).length,s.application_rows.length);
 assert.equal(JSON.stringify(d),before);
});
