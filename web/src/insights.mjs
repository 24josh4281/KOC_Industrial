// Public catalog analytics. Dates are effective-from dates, never registration dates.
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const DAY=86400000;
const day=s=>Date.parse(s+'T00:00:00Z');
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(day(s))&&new Date(day(s)).toISOString().slice(0,10)===s;
const pct=(n,d)=>d?Math.round(n/d*1000)/10:null;
export function validateCatalog(d){
  if(d.catalog_version!=='1.0.0'||d.coverage!=='partial'||!validDate(d.captured_on))throw Error('공개자료 계약 오류');
  const allowed={root:['catalog_version','captured_on','coverage','scope_note','date_basis','source_url','methods','versions'],method:['code','name','sector','subsector','registration_type','source_url','source_sha256'],version:['id','code','version','change_type','effective_from','name','source_url']};
  const keys=(r,a)=>{if(Object.keys(r).sort().join('|')!==a.slice().sort().join('|'))throw Error('허용되지 않은 공개 필드');};
  const url=s=>{if(!/^https:\/\/ors\.gir\.go\.kr\/home\/orme010\/(activeList|historyRead)\.do\?/.test(s))throw Error('공개 출처 확인 필요');};
  keys(d,allowed.root);url(d.source_url);
  const codes=new Set(),ids=new Set();
  for(const m of d.methods){keys(m,allowed.method);url(m.source_url);if(codes.has(m.code)||!/^\d{2}[A-Z]-\d{3}$/.test(m.code))throw Error('중복·오류 방법론 코드');codes.add(m.code);}
  for(const v of d.versions){keys(v,allowed.version);url(v.source_url);if(ids.has(v.id)||!codes.has(v.code)||!validDate(v.effective_from)||!['new','revision'].includes(v.change_type)||v.id!==v.code+'-Ver'+v.version)throw Error('버전·날짜·연결 오류');ids.add(v.id);}
  for(const code of codes)if(!d.versions.some(v=>v.code===code))throw Error('버전 없는 방법론');
  return true;
}
export function publicInsights(d,options={}){
  validateCatalog(d);
  const o={as_of:d.captured_on,year:Number(d.captured_on.slice(0,4)),sector:'all',registration:'all',revision:'all',query:'',recent_days:365,watch_days:1095,...options};
  if(!validDate(o.as_of)||o.as_of>d.captured_on||!Number.isInteger(o.year)||o.year<1900||o.year>Number(o.as_of.slice(0,4))||!['all','revised','unrevised'].includes(o.revision)||![o.recent_days,o.watch_days].every(n=>Number.isInteger(n)&&n>=1&&n<=36500))throw Error('집계 조건을 확인하세요.');
  const q=o.query.trim().toLowerCase();
  const rows=[];
  for(const m of d.methods){
    const vs=d.versions.filter(v=>v.code===m.code&&v.effective_from<=o.as_of).sort((a,b)=>cmp(a.effective_from,b.effective_from)||cmp(a.id,b.id));
    if(!vs.length)continue;
    const latest=vs.at(-1),first=vs.find(v=>v.change_type==='new'),revisions=vs.filter(v=>v.change_type==='revision').length;
    if(o.sector!=='all'&&m.sector!==o.sector||o.registration!=='all'&&m.registration_type!==o.registration||o.revision==='revised'&&!revisions||o.revision==='unrevised'&&revisions||q&&!`${m.code} ${m.name} ${m.sector}`.toLowerCase().includes(q))continue;
    rows.push({...m,latest_version:latest.version,latest_effective:latest.effective_from,first_effective:first?.effective_from??null,version_count:vs.length,revision_count:revisions,age_days:Math.round((day(o.as_of)-day(latest.effective_from))/DAY)});
  }
  rows.sort((a,b)=>cmp(a.code,b.code));
  const codes=new Set(rows.map(r=>r.code));
  const versions=d.versions.filter(v=>codes.has(v.code)&&v.effective_from<=o.as_of).sort((a,b)=>cmp(a.id,b.id));
  const earliest=versions.length?Math.min(...versions.map(v=>Number(v.effective_from.slice(0,4)))):o.year;
  const annual=Array.from({length:Number(o.as_of.slice(0,4))-earliest+1},(_,i)=>{let y=earliest+i;return {year:y,new:versions.filter(v=>v.change_type==='new'&&Number(v.effective_from.slice(0,4))===y).length,revisions:versions.filter(v=>v.change_type==='revision'&&Number(v.effective_from.slice(0,4))===y).length,cumulative_methods:rows.filter(r=>r.first_effective&&Number(r.first_effective.slice(0,4))<=y).length};});
  const group=key=>{const result=new Map();for(const r of rows)result.set(r[key],(result.get(r[key])||0)+1);return [...result].map(([name,count])=>({name,count,share:pct(count,rows.length)})).sort((a,b)=>b.count-a.count||cmp(a.name,b.name));};
  const end=`${o.year}-12-31`<o.as_of?`${o.year}-12-31`:o.as_of;
  let previousEnd=`${o.year-1}${end.slice(4)}`;if(!validDate(previousEnd))previousEnd=`${o.year-1}-02-28`;
  const selected=versions.filter(v=>v.effective_from>=`${o.year}-01-01`&&v.effective_from<=end);
  const previous=versions.filter(v=>v.effective_from>=`${o.year-1}-01-01`&&v.effective_from<=previousEnd);
  const ages=rows.map(r=>r.age_days).sort((a,b)=>a-b),middle=Math.floor(ages.length/2);
  const sectors=group('sector'),revised=rows.filter(r=>r.revision_count>0).length;
  const recent=versions.filter(v=>(day(o.as_of)-day(v.effective_from))/DAY<o.recent_days).sort((a,b)=>cmp(b.effective_from,a.effective_from)||cmp(a.id,b.id));
  return {options:o,metrics:{methods:rows.length,versions:versions.length,revised_methods:revised,revision_share:pct(revised,rows.length),selected_new:selected.filter(v=>v.change_type==='new').length,selected_revisions:selected.filter(v=>v.change_type==='revision').length,recent_versions:recent.length,watch_methods:rows.filter(r=>r.age_days>o.watch_days).length,median_age:ages.length?(ages.length%2?ages[middle]:(ages[middle-1]+ages[middle])/2):null,top3_share:pct(sectors.slice(0,3).reduce((n,r)=>n+r.count,0),rows.length),applications:null,reviewing:null,overdue:null},comparison:{end,previous_end:previousEnd,current:selected.length,previous:previous.length,delta:selected.length-previous.length,percent:previous.length?Math.round((selected.length-previous.length)/previous.length*1000)/10:null},annual,sectors,registration:group('registration_type'),version_distribution:group('latest_version'),ages:[{name:'1년 이내',count:ages.filter(x=>x<=365).length},{name:'1~3년',count:ages.filter(x=>x>365&&x<=1095).length},{name:'3년 초과',count:ages.filter(x=>x>1095).length}],rows,versions,recent};
}
