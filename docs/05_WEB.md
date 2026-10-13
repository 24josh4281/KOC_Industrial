# 05. 웹 실행·확장

## 실행 가능한 로컬 MVP

preview/dashboard.html은 합성 원장을 내장한 단독 HTML. CSS·JS·SVG 차트 모두 내부 포함. 설치·CDN·외부 폰트·네트워크 호출 없음. 공식 출처 링크를 클릭할 때만 해당 페이지로 이동.

부문·발생일·기록일·선택연도·내부 경과일 기준, KPI, 신규/누적 차트, 단계별 막대, 목록검색·20행 페이지, 상세이력, CSV 다운로드, JSON 불러오기 제공. 입력 JSON은 탭 메모리에서만 사용. 서버 저장·자동 버전관리는 하지 않음. 공식 검토상태를 수정하는 입력 화면은 제공하지 않음.

현재 목록 CSV는 사용자가 선택한 데이터의 내부 정보도 포함할 수 있는 명시적 로컬 내보내기. 이 파일을 공개게시하는 기능과 혼동하지 말 것. 웹의 '원본 JSON 저장'도 로컬 백업이며 공개용 export가 아님.

## React 개발 베이스

React + Vite + Apache ECharts(필요 모듈 import) + TanStack Query/Table. 기존 core.mjs를 재사용한다. React에는 기본 필터·KPI·차트·검색·정렬·페이지·JSON 불러오기·경고 조회를 구현했다. 2026-10-13 Windows 로컬에서 의존성 설치, JSX 컴파일, production build 및 실제 빌드 화면을 확인했다. offline.js의 모든 상세기능이 React 화면에 이식된 것은 아님.

첫 화면은 빈 자료이며 KPI와 차트에 자료 미확보를 표시한다. 합성 예시는 버튼으로 선택한다. `partial`은 확인된 일부 자료라고 명시하고 실제 0은 보존한다. JSON은 로컬 탭 메모리에서만 사용하며 검토용 staging JSON은 dataset으로 불러올 수 없다.

shadcn/ui는 최종 UI 확장 목표이며 현재 패키지는 독립 CSS·기본 React 요소 사용. 정식 shadcn 구성요소 복제·CLI 실행 또는 Supabase 연결을 완료했다고 표시하지 않음. 구축 시 공식 shadcn Vite 안내를 확인하고 Tailwind·alias·컴포넌트를 추가. 기존 표시 문구·집계·접근성 테스트 유지.

정확한 요청 버전은 package.json에 고정했고 package-lock.json을 생성했다. 재설치는 `npm ci --ignore-scripts --no-audit --no-fund`, 빌드는 `npm run build`로 검증했다. CI도 npm ci로 변경했지만 원격 실행은 미실행이다. 설치 시 스크립트를 실행하지 않아도 로컬 빌드가 동작함을 확인했다. `use client` 지시문 무시 및 500KB 초과 청크 경고가 남아 있으며 성능 벤치마크는 별도다.

## Supabase 연결 목표

Supabase SQL은 업무 원장을 담는 목표 테이블·멤버십·RLS·감사이력. 웹 연결·인증·쓰기 RPC는 별도 구현. 연결 모드를 활성화하기 전 보안 테스트 프로젝트에서 익명0건/타조직0건/조회자쓰기불가/검토자사건추가/임의권한상승불가 검증 필요.

조회 실패 시 데모로 자동 대체하지 말고 오류·자료 미확보 표시. 분류·검토 메모·첨부의 공개 여부는 프런트엔드 숨김이 아니라 DB 및 내보내기에서 강제.

## 배포

기본 `.github/workflows/pages-demo.yml`은 수동 실행 및 ENABLE_DEMO_PAGES=true 조건. build_offline.py는 demo 모드만 내장하도록 검사. 개인 원장이나 local 폴더를 Pages에 복사하지 않음. 실제 공개 통계 페이지는 공개 export 검증과 기관 공개승인을 거친 별도 개발 작업.
