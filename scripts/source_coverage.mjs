import {sourceCoverage} from '../web/src/materials.mjs';
let input='';
for await(const chunk of process.stdin) input+=chunk;
process.stdout.write(JSON.stringify(sourceCoverage(JSON.parse(input))));
