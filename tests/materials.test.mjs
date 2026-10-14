import test from 'node:test';
import assert from 'node:assert/strict';
import {materialSummary,sourceCoverage,sourceRows,validateMaterials} from '../web/src/materials.mjs';
import {formulaQuality,brokenReference} from '../web/src/formulaHealth.mjs';
const data={catalog_version:'local-materials-1.0',files:[{id:'test'}],sheets:[{rows:[{row:1,cells:[{col:1,value:'제목'}]},{row:2,cells:[{col:1,value:0},{col:2,value:'#REF!',error:true}]},{row:3,cells:[{col:1,value:null}]}]}],applications:[{official_status_text:'보완요청',type_conflict:true},{official_status_text:null}],history:[{},{}]};
test('source counts preserve distinct units, blanks and zero',()=>{assert.equal(validateMaterials(data),data);assert.deepEqual(materialSummary(data),{files:1,sheets:1,nonempty_rows:3,cached_error_cells:1,methodology_applications:2,history_lines:2,type_conflicts:1,status_counts:{보완요청:1,미확인:1}});assert.equal(sourceRows(data.sheets[0],'0').length,1);assert.equal(sourceRows(data.sheets[0],'',true)[0].row,2);assert.equal(sourceRows(data.sheets[0],'no-match').length,0);});
test('invalid file rejected and empty valid data yields empty source counts',()=>{assert.throws(()=>validateMaterials({}));assert.equal(materialSummary({}).nonempty_rows,0);});
test('formula quality distinguishes cached zero, missing criteria and text labels',()=>{
  const fixture={sheets:[{rows:[{cells:[{value:0,formula:'=SUMIF(A:A,#REF!,B:B)'},{value:'기준 미확인'},
    {value:0},{value:null},{value:'#REF!',formula:'="#REF!"'},{value:'#REF!',error:true}]}]}]};
  assert.deepEqual(formulaQuality(fixture),{saved_errors:1,broken_references:1,unavailable_results:1});
  assert.equal(sourceRows({rows:[{row:1,cells:[{col:1,value:0}]},{row:2,cells:[{col:1,value:0,formula:'=SUM(#REF!)'}]},
    {row:3,cells:[{col:1,value:'기준 미확인'}]}]},'',true).map(r=>r.row).join(','),'2,3');
  assert.equal(brokenReference('="a""#REF!"'),false);
  assert.equal(brokenReference('=IF(A1="a""#REF!",0,#REF!)'),true);
  assert.deepEqual(formulaQuality({}),{saved_errors:0,broken_references:0,unavailable_results:0});
});
test('ORS refresh metadata is required for the new local format',()=>{assert.throws(()=>validateMaterials({...data,catalog_version:'local-materials-1.1'}));const next={...data,catalog_version:'local-materials-1.1',refresh:{schema_version:'ors-refresh-1.0',files:[],pending:[],summary:{}}};assert.equal(validateMaterials(next),next);assert.deepEqual(materialSummary(next),materialSummary(data));});
test('source coverage counts every recorded cell and keeps files separate',()=>{
 const fixture={files:[{id:'A',filename:'managed.xlsx',format:'xlsx'},{id:'B',filename:'ors.xls',format:'xls'}],sheets:[
  {source_id:'A',rows:[{cells:[{value:0},{value:'기준 미확인',formula:'=A1'}]}]},
  {source_id:'B',rows:[{cells:[{value:'raw'}]}]}]};
 assert.deepEqual(sourceCoverage(fixture),[
  {id:'A',filename:'managed.xlsx',format:'xlsx',sheets:1,rows:1,cells:2,formulas:1,saved_errors:0,unavailable:1},
  {id:'B',filename:'ors.xls',format:'xls',sheets:1,rows:1,cells:1,formulas:0,saved_errors:0,unavailable:0}]);
});
