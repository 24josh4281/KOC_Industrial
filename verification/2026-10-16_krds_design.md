# 정부 KRDS 참고형 디자인 적용 검증 · 2026-10-16

## 대상과 변경

- 지시: 정부24 계열(KRDS 참고형) 시안 A를 기본으로 적용하고, 이너젠 블루 버전은 따로 백업한다.
- 웹: `web/src/krds-public.css`(신규, `.ig[data-design=government]` 범위 재정의), `web/src/PublicDashboard.jsx`(스타일시트 가져오기·바닥글 한 줄), `design.json` v2.5.0(기본 프로필 `government`, KRDS 토큰·`krds_web` 항목). `innergen-public.css`와 `innergen_blue` 프로필은 그대로 두어 디자인 선택에서 전환할 수 있다.
- Excel: `excel/`, `downloads/`, `web/public/downloads/`의 `KETS_Public_Insights_20261014.xlsx`(SHA-256 `7e6c6fff…`, 40,634바이트). 생성 스크립트는 저장소 밖 `outputs/2026-10-16_krds_design/work/build.mjs`(`2026-10-15_innergen_blue/work/build.mjs` 기반). 색 토큰, 1~4행 제목 띠, KPI 카드, 구역 머리, 거버닝 상자, 그래프 계열 색, 바닥글 문구만 바꿨고 셀 위치·수식·검증 조건은 같다.
- 백업: 이너젠 블루 웹 소스 5개·`design.json`·`design.md`·Excel(`2a2d7d3d…`)·시안 B를 `outputs/2026-10-16_innergen_backup/`에 복사했다. Git 이력(PR #8, 커밋 `9b16b8a`)에도 남아 있다.
- 근거: KRDS 색상·타이포그래피·토큰 지침 참고형. 정부·공단 로고, 공식 누리집 문구, 인증 표식은 쓰지 않았다. 상세는 `design.md` v2.5.

## 실제 실행 결과

| 검사 | 결과 |
|---|---|
| 프로젝트 가상환경 Python 3.12 `-m unittest discover -s tests` | 73개 통과(공개 Excel 시트·값·수식 위치 검사 포함). 시스템 Python 3.14는 `jsonschema`가 없어 6개 모듈이 가져오기 오류로 실패하므로 가상환경으로 실행 |
| `npm test`(`node --test`) | 29개 통과 |
| `npm run build` | 성공. `index-TOJahrta.css` 65.87 kB, `index-DcovPvGd.js` 1,009.68 kB, 기존 대형 청크 경고 유지 |
| Excel 생성 스크립트 조건 대조 | 19개 조건에서 통계 지표·연도표·대시보드 거버닝 3문장이 웹 엔진 `publicInsights` 결과와 일치 |
| Excel 오류값 검색(생성 도구) | `#REF!` 등 0건 |
| Microsoft Excel 데스크톱(COM) 열기·전체 재계산 | 5개 시트 모두 오류 셀 0개. 거버닝 6문장(B6·B21·N21·B40·N40·B50)과 KPI 6개(33·40·6·0·2·4), `통계` B7~B22(개정 비중 18.2%, 전년 대비 −1·−33.3%, 경과일 중앙값 2,057, 최다 버전 연도 2015)가 웹과 같음. 그래프 2개(계열 색 #246BEB·#003675), 제목 띠 #003675, 거버닝 #ECF2FE, KPI 카드 흰색 확인 |
| 브라우저(Vite 개발 서버 `kets-web`) | 콘솔 오류 0건. 1440×900 전체 화면 캡처에서 흰 KPI 카드·연파랑 안내 상자·회색 표 머리와 남색 상단선·밑줄 코드 링크·12px 카드 확인. 390 폭 전체 캡처 `scrollWidth` 390(가로 넘침 없음), KPI 2열·조건 2열 |
| 디자인 전환(브라우저) | 디자인 선택을 `이너젠 블루`로 바꾸면 `data-design=innergen_blue`, KPI 띠 남색 `rgb(11,23,57)`, 패널 반경 0px로 이전 디자인이 그대로 렌더링됨. 다시 `정부 KRDS 참고형`으로 바꾸면 KPI 카드 흰색, 패널 반경 12px, 표 머리 `#F4F5F6`·남색 2px 상단선. 전환 중 콘솔 오류 0건 |

캡처·COM 결과 파일: `outputs/2026-10-16_krds_design/work/`(`web_1440.png`, `web_390.png`, `excel_com_inventory.txt`, `excel_com_recalc.txt`, `checks.json`, 생성 도구 렌더 5장).

## 추가 확인: 공개 화면에 비공개 신청 자료 연결(2026-10-16)

공개 화면 07 `연도별 신청 현황`의 `신청 자료 불러오기`에 저장소 밖 로컬 자료 `outputs/2026-10-15_application_status_v8/dashboard-data.json`(10개 파일·44개 시트, 반영일 2026-10-14, 55 MB)을 Playwright로 넣어 확인했다. 기본 `2026년 신청 현황`은 53건(방법론 4·사업 평가 21·감축량 인증 26·사업 비공개 1·인증 비공개 1, 처리 단계 보완요청 32·평가중 13 등), `전체 기간`은 3,419건으로 바뀌었고 신청일 없는 내역 541건은 별도 링크로 분리됐다. 경고 없음, 외부 요청 없음(파일은 브라우저 안에서만 읽음). 캡처와 수치는 `outputs/2026-10-16_krds_design/work/progress/`에 두었다. 자료 자체는 공개 저장소·Pages·공개 Excel에 넣지 않는다.

## 미실행·해석 한계

- 커밋·푸시·PR·`scripts/stage_public_site.py`(정적 번들 복사)·Pages 배포는 하지 않았다. 작업 브랜치 `docs/record-pr8-deployment`에는 이 작업 이전의 미커밋 변경(관리 화면·비공개 진행 패널 등)이 함께 있다.
- `Pretendard GOV` 글꼴은 외부 요청 없이 설치된 경우에만 쓰이며, 확인 환경에서는 대체 글꼴(Pretendard/맑은 고딕)로 렌더링됐다.
- 수치 정의·공개 데이터·내부 자료 범위는 바꾸지 않았다. 디자인 참고형이며 정부·공단 공식 서비스가 아니다.
