import fs from 'node:fs';
import {managementRows,managementSummary} from '../web/src/management.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../config/management_views.json',import.meta.url),'utf8'));
const {data,cases}=JSON.parse(fs.readFileSync(0,'utf8'));
const rows=managementRows(data,config);
console.log(JSON.stringify({rows,snapshots:cases.map(c=>managementSummary(rows,c.book,c.filters,c.query))}));
