import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

const catalog=JSON.parse(await readFile(process.argv[2],'utf8'));
globalThis.document={getElementById:id=>id==='local-materials-data'?{textContent:JSON.stringify(catalog)}:null};
const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
 const {default:MaterialsDashboard}=await vite.ssrLoadModule('/src/MaterialsDashboard.jsx');
 const html=renderToStaticMarkup(React.createElement(MaterialsDashboard));
 for(const label of ['자료 반영 범위','관리 Tool 셀','우선 확인 01','유형 보류만 보기','분류 교차표','신청연도별 원장행 그래프','열 제목을 선택해 전체 조회 결과를 정렬합니다']){
  assert.ok(html.includes(label),`Missing dashboard section: ${label}`);
 }
 const ledger=html.split('조회된 원장행과 근거')[1]?.match(/<tbody>(.*?)<\/tbody>/s)?.[1];
 assert.ok(ledger,'Management ledger missing');
 assert.ok((ledger.match(/<tr\b/g)||[]).length<=50,'Management ledger exceeds one page');
 assert.ok(html.includes('aria-sort="none"'),'Sortable ledger headers missing');
 process.stdout.write(JSON.stringify({server_rendered:true,source_files:catalog.files.length,
  original_sheets:catalog.sheets.filter(sheet=>catalog.files.find(file=>file.id===sheet.source_id)?.format==='xlsx').length,
  html_characters:html.length})+'\n');
}finally{await vite.close();}
