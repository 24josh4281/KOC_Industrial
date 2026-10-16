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

## 병합·공개 배포 확인

- 기능 브랜치 `feature/innergen-blue-dashboard`의 커밋 `9b16b8a`를 [PR #8](https://github.com/24josh4281/KOC_Industrial/pull/8)로 `main`에 병합했다. 병합 커밋은 `0431e0ba8980f6dfbdd7f3bcd6141562cdb1cf3e`(2026-10-15 05:55 UTC)다.
- PR [Validate dashboard 실행](https://github.com/24josh4281/KOC_Industrial/actions/runs/38688941508) 성공. 병합 후 [main 검증 실행](https://github.com/24josh4281/KOC_Industrial/actions/runs/38689452541), [Pages 게시 실행](https://github.com/24josh4281/KOC_Industrial/actions/runs/38689452560)(build·deploy 작업), GitHub의 [pages build and deployment](https://github.com/24josh4281/KOC_Industrial/actions/runs/38689452072) 실행이 모두 성공했다.
- PR 변경 파일 14개는 공개 웹 소스·정적 번들·`design.json`·문서·공개 Excel 3사본·검증 기록이다. 로컬 `inputs/`, `outputs/`, `local/`, 내부 원장·JSON·검토 메모·비밀키는 없다.
- `https://24josh4281.github.io/KOC_Industrial/`은 새 번들 `index-DQKUBV5u.js`와 `index-Cr5Nx1SG.css`를 참조했고 제목 `공개 방법론의 흐름과 변화`, `.ig` 구성, 거버닝 문장 10개(첫 문장 `공개 방법론 33개 중 6개(18.2%)가 개정됐고, 최근 365일 변경은 4개 버전입니다.`)가 렌더링됐다.
- 배포된 JS·CSS·공개 Excel은 각각 HTTP 200이며 SHA-256이 `main` 커밋의 Git 객체와 같았다(JS `d03ac62a…`, CSS `7ee2bc8b…`, Excel `2a2d7d3d…`, 40,329바이트). Windows 작업본의 JS·CSS 크기 차이는 `core.autocrlf` 줄바꿈 변환 때문이다.
- 이 확인은 페이지 스크립트로 읽은 렌더링 결과와 파일 해시이며 공개 사이트의 실제 클릭·모바일 시각 QA는 아니다.

## 미실행·해석 한계

Microsoft Excel 데스크톱에서 열어 재계산·렌더링 확인은 하지 않았다(생성 도구 렌더 이미지로만 확인). 수치 정의·공개 데이터·내부 자료 범위는 바꾸지 않았다. 작성 당시의 `GitHub Pages 미갱신(push·PR 미실행)` 기록은 위 병합·공개 배포 확인으로 대체된다.
