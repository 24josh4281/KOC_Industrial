import fs from 'node:fs';
import {publicInsights} from '../web/src/insights.mjs';
const {dataset,options}=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(options.map(o=>publicInsights(dataset,o))));
