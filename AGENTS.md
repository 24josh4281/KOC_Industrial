# 개발 에이전트 운영 지침

## 읽기 순서

START_HERE_KO.md → docs/08_IMPLEMENTATION_STATUS.md → config/metrics.json → schemas/dataset.schema.json → docs/02_DATA_MODEL.md → docs/07_TEST_PLAN.md.

## 변경 원칙

- 실제 등록·검토 수치를 추정해 채우지 않음. 공식 자료·권한 있는 원장만 입력. 불명확한 건은 미확인/미확보.
- 방법론(methodologies), 버전(versions), 신청(applications), 사건(review_events), 적용 상태(status_events), 출처(sources)를 합치지 않음.
- 최초등록일 대신 유효시작일을 사용하지 않음. 코드의 날짜 정렬은 Asia/Seoul 일 단위.
- Python/JS 양쪽 집계 변경 시 같은 fixture의 전체 snapshot 일치 테스트 실행. 엑셀 수식도 같은 정의로 수정.
- 검토 보완·재검토는 이력 추가. 공식 승인 상태를 UI 내부 확인으로 바꾸지 않음.
- `coverage=missing`은 0이 아니라 null. partial은 확인분의 수치임을 표시.
- JSON에 정의되지 않은 필드를 임의 추가하지 않음. 계약 변경 시 schema_version, 필드 매핑, XLSX 입력열, SQL, 테스트를 함께 변경.
- 행정적 판단·법정기한·기관 관할은 근거 확인 없이 하드코딩 금지. 제도원문과 내부 표준상태 분리.
- 운영자료·검토 메모·첨부·API 비밀키는 Git·Pages·dist에 포함 금지. SQL RLS와 권한을 같이 검증.
- npm/DB/클라우드 연결을 실행하지 않았다면 작동 완료로 보고하지 않음. 실행한 명령·통과/실패·미실행을 verification에 기록.

## 작업 단위

작은 feature branch → tests → diff 검토 → 구현 상태 갱신. 기존 데이터와 수식 파괴 금지. 최초 커밋의 예시를 실제 값으로 오해할 문구 금지.

## 우선 개발 순서

1. 실제 입력 파일 컬럼 프로파일링 및 매핑 승인.
2. 엑셀↔JSON 교환과 양방향 집계 검증.
3. React 설치·빌드 검증 및 lockfile 생성.
4. shadcn/ui 실제 구성요소로 UI 전환(기존 CSS를 자동 덮어쓰지 않음).
5. Supabase 테스트 프로젝트에 SQL 적용, 최소권한 인증·조회 구현.
6. 상태 변경 RPC·증빙·동시성·감사로그를 검증한 뒤 공동편집 제공.
7. 원본 이용조건 확인 후 수집기 구현. 로그인 우회·동의 생략 금지.
8. 공개승인된 집계만 별도 배포. 요청하지 않은 실제 원격 push/배포 금지.
