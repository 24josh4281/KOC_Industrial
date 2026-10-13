import test from 'node:test';
import assert from 'node:assert/strict';
import {materialSummary,sourceRows,validateMaterials} from '../web/src/materials.mjs';
const data={catalog_version:'local-materials-1.0',files:[{id:'test'}],sheets:[{rows:[{row:1,cells:[{col:1,value:'제목'}]},{row:2,cells:[{col:1,value:0},{col:2,value:'#REF!',error:true}]},{row:3,cells:[{col:1,value:null}]}]}],applications:[{official_status_text:'보완요청',type_conflict:true},{official_status_text:null}],history:[{},{}]};
test('source counts preserve distinct units, blanks and zero',()=>{assert.equal(validateMaterials(data),data);assert.deepEqual(materialSummary(data),{files:1,sheets:1,nonempty_rows:3,cached_error_cells:1,methodology_applications:2,history_lines:2,type_conflicts:1,status_counts:{보완요청:1,미확인:1}});assert.equal(sourceRows(data.sheets[0],'0').length,1);assert.equal(sourceRows(data.sheets[0],'',true)[0].row,2);assert.equal(sourceRows(data.sheets[0],'no-match').length,0);});
test('invalid file rejected and empty valid data yields empty source counts',()=>{assert.throws(()=>validateMaterials({}));assert.equal(materialSummary({}).nonempty_rows,0);});
