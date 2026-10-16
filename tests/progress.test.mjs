import test from 'node:test';
import assert from 'node:assert/strict';
import {progressSummary} from '../web/src/progress.mjs';
import {readFileSync} from 'node:fs';
import {managementRows} from '../web/src/management.mjs';
test('foreign disclosure reads its own ORS state, not the associated project state or history',()=>{
 const config=JSON.parse(readFileSync(new URL('../config/management_views.json',import.meta.url),'utf8'));
 const sheets=[{name:'(비공개)국외평가',header_row:1,rows:[{row:2,cells:[{col:3,value:'합성 비공개 사업'},{col:5,value:'보완요청'},{col:11,value:'다른 업무의 착수신고 이력'},{col:17,value:'보완요청'}]}]},
 {name:'(비공개)국외인증',header_row:1,rows:[{row:2,cells:[{col:4,value:'합성 비공개 인증'},{col:10,value:'반려'},{col:16,value:'심의승인'},{col:21,value:'반려완료'}]}]}];
 assert.deepEqual(managementRows({sheets},config).map(r=>r.raw_status),['보완요청','반려']);
});
const rows=[{id:'a',book:'management',unit:'사업 평가',region:'국내',raw_status:'보완요청',stage:'검토',owner:'담당 A',title:'합성 사업'},
 {id:'b',book:'disclosure',unit:'사업 비공개 신청',region:'국내',raw_status:'보완요청',stage:'검토',owner:null,title:'합성 비공개 신청'},
 {id:'c',book:'disclosure',unit:'인증 비공개 신청',region:'국외',raw_status:null,stage:null,owner:null,title:'합성 인증'}];
test('progress separates disclosure and management workflow units and missing source states',()=>{
 const s=progressSummary(rows);assert.equal(s.groups.length,3);assert.equal(s.states.length,3);
 assert.equal(s.missing_status,1);assert.equal(s.missing_stage,1);assert.equal(s.missing_owner,2);
 assert.equal(s.states.find(r=>r.status==='미확보').count,1);
});
test('progress combines source, region, state and literal search filters without inferring current stage',()=>{
 assert.deepEqual(progressSummary(rows,{book:'disclosure',region:'국내',raw_status:'보완요청',query:' 비공개 '}).rows.map(r=>r.id),['b']);
 assert.deepEqual(progressSummary(rows,{owner:'미확보',stage:'미확보'}).rows.map(r=>r.id),['c']);
 assert.equal(progressSummary(rows,{book:'management',unit:'인증 비공개 신청'}).rows.length,0);
 assert.equal(progressSummary(rows,{query:'*'}).rows.length,0);
 assert.deepEqual(progressSummary(rows,{book:'all',query:''}).rows,rows);
});
test('application year selects 2026, all periods and unknown dates separately',()=>{
 const dated=rows.map((r,i)=>({...r,year:['2026','2025',null][i]}));
 assert.deepEqual(progressSummary(dated,{year:'2026'}).rows.map(r=>r.id),['a']);
 assert.deepEqual(progressSummary(dated,{year:'2025'}).rows.map(r=>r.id),['b']);
 assert.deepEqual(progressSummary(dated,{year:'미확보'}).rows.map(r=>r.id),['c']);
 assert.equal(progressSummary(dated,{year:'all'}).rows.length,3);
 assert.equal(progressSummary(dated,{year:'2026',book:'disclosure'}).rows.length,0);
});
