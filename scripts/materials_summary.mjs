import {materialSummary} from '../web/src/materials.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
console.log(JSON.stringify(materialSummary(JSON.parse(input))));
