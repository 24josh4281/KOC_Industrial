import schema from './schema.mjs';
export const labels = {draft:'신청 준비',submitted:'접수',review:'관장기관 검토',consultation:'관계기관 협의',committee:'심의',approved:'승인·등록대기',registered:'등록 완료',rejected:'반려·불승인',withdrawn:'철회',unknown:'단계 미확인'};
export const scopes = {industry:'산업',transition:'전환',industry_transition:'산업+전환',all:'전체',other:'기타',unclassified:'분류 확인 필요'};
const reviewing = new Set(['submitted','review','consultation','committee']);
const terminal = new Set(['registered','rejected','withdrawn']);
const compare = (a,b) => a.occurred_on.localeCompare(b.occurred_on) || a.sequence-b.sequence;
const days = (a,b) => Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
const sum=(a,fn)=>a.reduce((n,x)=>n+(fn(x)?1:0),0);
const count=(rows,fn)=>rows.reduce((o,r)=>{const k=fn(r);o[k]=(o[k]||0)+1;return o;},{});
export function validate(data) {
 const check=(rule,v,path)=>{
  const kinds=Array.isArray(rule.type)?rule.type:[rule.type];
  const type=v===null?'null':Array.isArray(v)?'array':typeof v==='number'&&Number.isInteger(v)?'integer':typeof v;
  if(rule.type&&!kinds.includes(type)&&!(type==='integer'&&kinds.includes('number')))throw Error(`${path}:자료형 불일치`);
  if(rule.const!==undefined&&v!==rule.const)throw Error(`${path}: invalid constant`);
  if(rule.enum&&!rule.enum.includes(v))throw Error(`${path}: invalid enum`);
  if(rule.minimum!==undefined&&v<rule.minimum||rule.maximum!==undefined&&v>rule.maximum)throw Error(`${path}: out of range`);
  if(rule.format==='date'&&v!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v))throw Error(`${path}: invalid date`);
  if(type==='object') {
   for(const k of rule.required||[])if(!(k in v))throw Error(`${path}.${k}: required`);
   for(const [k,x] of Object.entries(v)){if(!rule.properties?.[k]&&rule.additionalProperties===false)throw Error(`${path}.${k}: unexpected field`);if(rule.properties?.[k])check(rule.properties[k],x,path+'.'+k);}
  }
  if(type==='array')v.forEach((x,i)=>check(rule.items,x,path+'['+i+']'));
 };
 check(schema,data,'dataset');
 const buckets=['methodologies','versions','applications','review_events','status_events','sources']; const ids={};
 for(const b of buckets){ids[b]=new Set(data[b].map(x=>x.id));if(ids[b].size!==data[b].length)throw Error(`${b}: duplicate id`);}
 if(new Set(data.methodologies.map(x=>x.code)).size!==data.methodologies.length)throw Error('duplicate methodology code');
 for(const b of buckets.slice(0,-1))for(const r of data[b]){if(!ids.sources.has(r.source_id))throw Error('unknown source');if(r.methodology_id&&!ids.methodologies.has(r.methodology_id))throw Error('unknown methodology');}
 for(const b of ['review_events','status_events']){if(new Set(data[b].map(x=>x.sequence)).size!==data[b].length)throw Error('duplicate event sequence');for(const e of data[b])if(e.recorded_on<e.occurred_on)throw Error('event recorded before occurrence');}
 if(new Set(data.versions.map(x=>x.methodology_id+'|'+x.version)).size!==data.versions.length)throw Error('duplicate method/version');
 for(const a of data.applications){if(a.type==='revision'&&!a.methodology_id)throw Error('revision needs methodology');if(a.recorded_on<a.submitted_on)throw Error('recorded before submitted');let prev=null;for(const e of data.review_events.filter(x=>x.application_id===a.id).sort(compare)){if(e.occurred_on<a.submitted_on)throw Error('event before submission');if((!prev||prev.stage!==e.stage)&&e.action!=='transition')throw Error('stage change needs transition');if(terminal.has(e.stage)&&e.waiting)throw Error('terminal waiting');prev=e;}}
 for(const e of data.review_events)if(!ids.applications.has(e.application_id))throw Error('unknown application');
 const c=data.metadata.coverage;
 if(data.metadata.mode==='production'&&(data.sources.some(s=>s.kind==='demo')||Object.values(c).includes('demo')||buckets.some(b=>data[b].some(r=>r.id.startsWith('DEMO-')))))throw Error('합성 예시를 운영자료로 전환할 수 없습니다.');
 if(c.registrations==='missing'&&data.methodologies.length||c.reviews==='missing'&&data.applications.length)throw Error('missing coverage conflicts with input rows');
 return true;
}
export function snapshot(data, opts={}) {
 validate(data);
 const asof=opts.as_of||data.metadata.as_of, known=opts.knowledge_as_of||data.metadata.knowledge_as_of;
 const scope=opts.scope||'industry',year=Number(opts.year||asof.slice(0,4)),threshold=opts.threshold??45,start=opts.start_year??2015;
 if(!scopes[scope])throw Error('unknown scope');
 const matches=s=>scope==='all'||(scope==='industry_transition'?['industry','transition'].includes(s):s===scope);
 const available=e=>e.occurred_on<=asof&&e.recorded_on<=known;
 const ms=data.methodologies.filter(m=>matches(m.scope)&&m.recorded_on<=known).map(m=>{
  const rd=m.first_registered_on||m.registration_confirmed_on;
  const ev=data.status_events.filter(e=>e.methodology_id===m.id&&available(e)).sort(compare);
  return {...m,registered:!!rd&&rd<=asof,applicability:ev.at(-1)?.status||'unknown',registration_year:m.first_registered_on?Number(m.first_registered_on.slice(0,4)):null};
 });
 const reg=ms.filter(m=>m.registered), mids=new Set(reg.map(m=>m.id));
 const vs=data.versions.filter(v=>mids.has(v.methodology_id)&&v.recorded_on<=known);
 const apps=data.applications.filter(a=>matches(a.scope)&&a.recorded_on<=known&&a.submitted_on<=asof).map(a=>{
  const ev=data.review_events.filter(e=>e.application_id===a.id&&available(e)).sort(compare),latest=ev.at(-1);
  const stage=latest?.stage||'unknown';let entered=null,prev=null;
  for(const e of ev){if(e.stage!==prev)entered=e.occurred_on;prev=e.stage;}
  const age=entered?days(asof,entered):null;
  return {...a,stage,stage_started_on:entered,stage_age_days:age,waiting:latest?.waiting||false,next_action:latest?.next_action||'',due_on:latest?.due_on||null,completed_days:terminal.has(stage)&&entered?days(entered,a.submitted_on):null,is_reviewing:reviewing.has(stage),is_overdue:reviewing.has(stage)&&age!==null&&age>threshold,latest_event_id:latest?.id||null};
 });
 const completed=apps.filter(a=>a.completed_days!==null).map(a=>a.completed_days).sort((a,b)=>a-b);
 const mid=Math.floor(completed.length/2),med=completed.length?(completed.length%2?completed[mid]:(completed[mid-1]+completed[mid])/2):null;
 const kpis={registered:reg.length,active:sum(reg,m=>m.applicability==='active'),unknown_status:sum(reg,m=>m.applicability==='unknown'),unknown_year:sum(reg,m=>m.registration_year===null),new_year:sum(reg,m=>m.registration_year===year),revisions_year:sum(vs,v=>v.change_type==='revision'&&v.registered_on&&v.registered_on<=asof&&Number(v.registered_on.slice(0,4))===year),reviewing:sum(apps,a=>a.is_reviewing),waiting:sum(apps,a=>a.is_reviewing&&a.waiting),pending_registration:sum(apps,a=>a.stage==='approved'),overdue:sum(apps,a=>a.is_overdue),completed:completed.length,median_completed_days:med,unknown_stage:sum(apps,a=>a.stage==='unknown')};
 const annual=[];
 for(let y=start;y<=Number(asof.slice(0,4));y++){const cut=[y+'-12-31',asof].sort()[0];annual.push({year:y,new:sum(reg,m=>m.first_registered_on&&m.first_registered_on<=cut&&m.registration_year===y),cumulative_known_year:sum(reg,m=>m.first_registered_on&&m.first_registered_on<=cut),revisions:sum(vs,v=>v.change_type==='revision'&&v.registered_on&&v.registered_on<=cut&&Number(v.registered_on.slice(0,4))===y)});}
 const c=data.metadata.coverage;
 if(c.registrations==='missing'){for(const k of ['registered','active','unknown_status','unknown_year','new_year','revisions_year'])kpis[k]=null;annual.length=0;}
 if(c.reviews==='missing')for(const k of ['reviewing','waiting','pending_registration','overdue','completed','median_completed_days','unknown_stage'])kpis[k]=null;
 const warnings=[];
 for(const m of data.methodologies){if(m.scope==='unclassified')warnings.push(`${m.id}: 산업부문 분류 확인 필요`);if(!m.first_registered_on)warnings.push(`${m.id}: 최초 등록연도 미확인`);if(!m.first_registered_on&&!m.registration_confirmed_on)warnings.push(`${m.id}: 등록 근거일 미확인; 등록 KPI 제외`);}
 for(const v of data.versions)if(!v.registered_on)warnings.push(`${v.id}: 버전 등록일 미확인; 연도별 신규/개정 제외`);
 for(const a of data.applications)if(!data.review_events.some(e=>e.application_id===a.id))warnings.push(`${a.id}: 검토 이력 미확보`);
 return {metadata:{...data.metadata,as_of:asof,knowledge_as_of:known,scope,selected_year:year,internal_threshold_days:threshold},kpis,annual,stage_counts:count(apps,a=>a.stage),technology_counts:count(reg,m=>m.technology),methodology_rows:ms,application_rows:apps,quality_warnings:warnings};
}
export function csvValue(x){const s=String(x??'');return '"'+(/^[\s]*[=+@-]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}
