# 이너젠 블루 디자인 적용 검증 · 2026-10-15

## 대상과 변경

- 웹: `web/src/PublicDashboard.jsx`(패널 구성·거버닝 문장), `web/src/innergen-public.css`(신규), `web/src/DesignControls.jsx`(토큰 추가), `design.json` v2.3.0(기본 프로필 `innergen_blue`).
- Excel: `excel/`, `downloads/`, `web/public/downloads/`의 `KETS_Public_Insights_20261014.xlsx`. 생성 스크립트는 저장소 밖 `outputs/2026-10-15_innergen_blue/work/build.mjs`(이전 `2026-10-14_public_insights/work/build.mjs` 기반).
- 근거: 이너젠·이너캐리 통합 디자인 기준 v17·v22, 거버닝 규칙 v11. 상세는 `design.md` v2.4.

## 실제 실행 결과

| 검사 | 결과 |
|---|---|
| 프로젝트 가상환경 Python `-m unittest discover -s tests` | 73개 통과(공개 Excel 시트·값·수식 위치 검사 포함) |
| `node --test` 웹·자료·관리 테스트 | 25개 통과 |
| `scripts/build_offline.py` | `preview/dashboard.html` 변경 없음 |
| `npm run build`, `scripts/stage_public_site.py` | 성공. 기존 대형 청크 경고 유지 |
| Excel 생성 스크립트 조건 대조 | 19개 조건에서 통계 지표·연도표·대시보드 거버닝 3문장이 웹 엔진 결과와 일치 |
| Excel 오류값 검색 | `#REF!` 등 0건 |
| 브라우저(Vite 개발 서버) | 1440×900 전 구역 확인, 누적 그래프 전환, 390×844 가로 넘침 없음, 인사이트·로컬 자료 화면 렌더링 확인 |

## 발견하여 수정한 결함

기존 공개 Excel `통계` E7:G18은 `IF(D7>YEAR(...),"",…)`로 문자 연도("2015")와 숫자를 비교했다. 데스크톱 Excel은 문자를 모든 숫자보다 크게 보므로 재계산하면 연도표와 그래프가 빈칸이 될 수 있다. 생성 도구의 계산 엔진은 이를 숫자로 비교해 이전 검증에서 드러나지 않았다. `VALUE(D7)`로 고쳤다.

## 미실행·해석 한계

Microsoft Excel 데스크톱에서 열어 재계산·렌더링 확인은 하지 않았다(생성 도구 렌더 이미지로만 확인). 배포된 GitHub Pages는 갱신하지 않았다(push·PR 미실행). 수치 정의·공개 데이터·내부 자료 범위는 바꾸지 않았다.
