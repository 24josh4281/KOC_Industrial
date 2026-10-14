import test from 'node:test';
import assert from 'node:assert/strict';
import {dateParts,managementSummary} from '../web/src/management.mjs';
test('date precision and invalid dates remain explicit',()=>{
 for(const [v,expected] of [[null,[null,null,'신청일 미확보']],['2023-02-29',[null,null,'날짜 형식 확인']],['2024-02-29',['2024','02','일자 확인']],['2025-07',['2025','07','월까지만 확인']],['0001-01-01',['0001','01','일자 확인']],['0000-01-01',[null,null,'날짜 형식 확인']]])assert.deepEqual(dateParts(v),expected);
});
test('multi select OR within a category, AND across categories, units separated',()=>{
 const rows=[{id:'a',book:'management',unit:'방법론 신청',year:'2024',region:'국내'},{id:'b',book:'management',unit:'사업 평가',year:'2025',region:'국외'},{id:'c',book:'disclosure',unit:'사업 비공개 신청',year:null,region:'국내'}];
 assert.deepEqual(managementSummary(rows,'management',{year:['2024','2025'],region:['국내']}).ids,['a']);
 assert.deepEqual(managementSummary(rows,'disclosure',{year:['미확보']}).ids,['c']);
 assert.equal(managementSummary(rows,'management',{year:['2000']}).row_count,0);
});
