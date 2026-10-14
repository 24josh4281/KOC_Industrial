# 로컬 대시보드 도구 적용 검증 · 2026-10-14

## 대상과 변경

- 화면: `web/src/ManagementYearChart.jsx`, `web/src/ManagementLedger.jsx`, `web/src/ManagementExplorer.jsx`.
- 결과: 저장소 밖의 로컬 `outputs/2026-10-14_management_v5`에 `dashboard.html`, `dashboard-data.json`, 기존 검증 Excel 링크를 가진 시작 페이지 생성.
- 도구 사용·미사용 근거: `docs/14_DASHBOARD_TOOLING_REVIEW.md`.

## 실제 실행 결과

| 검사 | 결과 |
|---|---|
| `npm test` | Node 웹 테스트 25개 통과 |
| 설정된 프로젝트 가상환경 Python의 `-m unittest discover -s tests` | Python 테스트 73개 통과 |
| `npm run build` | Vite 프로덕션 빌드 성공. 기존 `use client` 및 대형 청크 경고는 남음 |
| 실제 로컬 JSON 서버 렌더링 | 10개 파일·관리 Tool 원본 36시트, 새 그래프 설명·정렬 머리글·표 50행 이하 검사 통과 |
| 실제 로컬 관리 Tool Python/JavaScript 집계 | 두 업무 구분 × 6조건 = 12조건 전체 구조 일치, 원장행 3,419개 |
| 새 로컬 HTML↔JSON | 내장 JSON 전체 일치. 이전 v4와 새 v5의 JSON SHA-256 동일 |
| 공개 `web/dist` | 내부 55 MB JSON 미포함. 공개 빌드에는 코드·허용된 공개 자료만 유지 |

첫 `python` 호출은 Windows 앱 별칭 실행 오류, 번들 Python 직접 실행은 `jsonschema` 부재와 기본 임시폴더 권한 오류였다. 기존 프로젝트 가상환경과 작업공간 임시폴더를 사용해 전체 테스트를 다시 실행했다. 첫 서버 렌더링 명령도 작업 폴더가 잘못되어 실패했으며 `web` 폴더에서 재실행해 통과했다.

## 미실행·해석 한계

실제 브라우저 클릭·모바일 조작은 이번 환경에서 실행하지 않았다. ECharts 막대 클릭·TanStack 열 제목 조작의 동작은 코드·빌드·서버 렌더링으로만 확인했다. Excel 재계산·공식 현황 확정·Supabase 연결/RLS·외부 서비스 연동·Git push·배포는 미실행이다. 그래프와 표의 수치는 관리 Tool 원장행이며 고유 신청·등록 건수가 아니다. 보류·미확보를 임의 확정하거나 0으로 치환하지 않았다.
