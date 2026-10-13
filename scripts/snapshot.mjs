// Read a local dataset from stdin; never bundles or transmits it.
import fs from 'node:fs';
import {snapshot} from '../web/src/core.mjs';
const {dataset, options} = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(options.map(option => snapshot(dataset, option))));
