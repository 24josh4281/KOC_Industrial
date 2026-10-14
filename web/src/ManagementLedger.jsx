import React,{useEffect,useMemo,useState} from 'react';
import {useReactTable,getCoreRowModel,getSortedRowModel,getPaginationRowModel,flexRender} from '@tanstack/react-table';

const display=v=>v||'미확보';
export default function ManagementLedger({rows,onSource}){
 const [sorting,setSorting]=useState([]);
 const columns=useMemo(()=>[
  {id:'unit',header:'업무구분',accessorFn:r=>r.unit||'',cell:info=><>{info.row.original.unit}<br/>{info.row.original.region}</>},
  {accessorKey:'title',header:'명칭'},
  {id:'apply_date',header:'신청일 원문',accessorFn:r=>r.apply_date||'',cell:info=><>{display(info.row.original.apply_date)}<br/>{info.row.original.date_quality}</>},
  {accessorKey:'raw_status',header:'원문상태',cell:info=>display(info.getValue())},
  {accessorKey:'stage',header:'진행상태',cell:info=>display(info.getValue())},
  {accessorKey:'owner',header:'담당자',cell:info=>display(info.getValue())},
  {accessorKey:'sector',header:'분야',cell:info=>display(info.getValue())},
  {accessorKey:'hold',header:'유형확인'},
  {id:'source',header:'원본 위치',accessorFn:r=>`${r.source_sheet} ${String(r.source_row).padStart(8,'0')}`,cell:info=><button onClick={()=>onSource(info.row.original.source_sheet,info.row.original.source_row)}>{info.row.original.source_sheet} {info.row.original.source_row}행</button>}
 ],[onSource]);
 const table=useReactTable({data:rows,columns,state:{sorting},onSortingChange:setSorting,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),getPaginationRowModel:getPaginationRowModel(),initialState:{pagination:{pageSize:50}}});
 useEffect(()=>{table.setPageIndex(0);},[rows]);
 const page=table.getState().pagination.pageIndex,size=table.getState().pagination.pageSize;
 return <><p className="source-meta">열 제목을 선택해 전체 조회 결과를 정렬합니다. 페이지당 50행을 표시하며 정렬은 원본 값을 바꾸지 않습니다.</p><div className="material-table" tabIndex={0} aria-label="조회된 관리 원장 표"><table><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} aria-sort={header.column.getIsSorted()==='asc'?'ascending':header.column.getIsSorted()==='desc'?'descending':'none'}><button className="management-sort" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header,header.getContext())}<span aria-hidden="true"> {header.column.getIsSorted()==='asc'?'↑':header.column.getIsSorted()==='desc'?'↓':'↕'}</span></button></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row=><tr key={row.original.id}>{row.getVisibleCells().map(cell=><td key={cell.id}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}</tbody></table></div><div className="document-nav"><button disabled={!table.getCanPreviousPage()} onClick={()=>table.previousPage()}>이전 50행</button><span>{rows.length?`${page*size+1}~${Math.min((page+1)*size,rows.length)}`:'0'} / {rows.length}행</span><button disabled={!table.getCanNextPage()} onClick={()=>table.nextPage()}>다음 50행</button></div></>;
}
