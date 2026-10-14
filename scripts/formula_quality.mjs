import {formulaQuality} from '../web/src/formulaHealth.mjs';
let input='';for await (const chunk of process.stdin) input+=chunk;
process.stdout.write(JSON.stringify(formulaQuality(JSON.parse(input))));
