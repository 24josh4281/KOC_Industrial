import {deadlineAlerts} from '../web/src/deadlines.mjs';
let input='';for await (const chunk of process.stdin) input+=chunk;const cases=JSON.parse(input);console.log(JSON.stringify(cases.map(([s,n])=>deadlineAlerts(s,n))));
