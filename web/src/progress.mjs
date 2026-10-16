import {managementRows} from './management.mjs';
export const bookLabels={management:'외부사업 신청',disclosure:'정보 비공개 신청'};
export function progressRows(data,config){return managementRows(data,config);}
export function progressSummary(rows,filters={}){
 const selected=rows.filter(r=>Object.entries(filters).every(([k,v])=>!v||v==='all'||(k==='query'?['title','source_key','owner','source_sheet'].some(f=>String(r[f]??'').toLowerCase().includes(v.trim().toLowerCase())):(r[k]||'미확보')===v)));
 const groups=new Map(),states=new Map();
 for(const r of selected){const key=JSON.stringify([r.book,r.unit]);groups.set(key,(groups.get(key)||0)+1);const s=JSON.stringify([r.book,r.unit,r.raw_status||'미확보',r.stage||'미확보']);states.set(s,(states.get(s)||0)+1);}
 return {rows:selected,groups:[...groups].map(([k,count])=>{const [book,unit]=JSON.parse(k);return {book,unit,count};}),states:[...states].map(([k,count])=>{const [book,unit,status,stage]=JSON.parse(k);return {book,unit,status,stage,count};}).sort((a,b)=>b.count-a.count||JSON.stringify(a).localeCompare(JSON.stringify(b),'ko')),missing_status:selected.filter(r=>!r.raw_status).length,missing_stage:selected.filter(r=>!r.stage).length,missing_owner:selected.filter(r=>!r.owner).length};
}
