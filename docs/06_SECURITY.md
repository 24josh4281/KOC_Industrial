# 06. 보안·권한·운영

운영자료를 data/private/, data/raw/, data/staging/, local/에 저장. Git ignore는 실수를 줄일 뿐 유출방지 자체를 보장하지 않음. commit 전 git diff --cached와 추적 파일 목록 확인. 실자료로 바꾼 XLSX를 기존 demo 경로에 덮어쓴 뒤 커밋하지 말 것.

Sources에는 원문 URL 또는 파일 SHA-256, 조회시점, 공개/내부 구분. 개인정보를 공식 공개자료라고 추정하여 재배포 금지. 원문 파일의 이용조건·동의·비밀유지 요건 확인 후 보관·삭제.

Supabase에서 공개 스키마 테이블은 RLS와 grants 모두 적용. 모든 원장은 workspace_id로 격리. memberships는 사용자 본인 조회만, 변경은 신뢰된 관리자 백엔드 경로만. service_role/secret 키는 브라우저·VITE_*·Git·HTML에 금지. 익명에게 원장 조회권한을 주지 않음.

현재 SQL은 기초 마이그레이션. 실제 Postgres/Supabase 프로젝트에서 적용·부하·RLS·감사로그 테스트를 실행하지 않았음. 실제 다중사용자 운영 승인 전 자동 보안 테스트와 증빙 업로드 Storage 정책을 구현. 검토이력은 append-only; 과거 행을 직접 수정·삭제하지 않음.

공개 내보내기 manage.py publish는 production에서 public_allowed=true이고 공식 공개 출처가 확인된 방법론만 허용. 신청·검토이력은 항상 제거. 내부 scope_note도 교체. 필터링된 등록범위는 partial/missing으로 낮춤. 통계만으로 개인·기업이 재식별되는 위험은 별도 검토.

CSV 문자열이 =,+,-,@로 시작하면 수식 주입 방지용 작은따옴표를 붙임(앞 공백 포함 점검). JSON 업로드는 구조·enum·날짜·FK 검사. 오프라인 웹은 JSON 최대10MB. XLSX 변환은 압축해제 합계100MB 초과를 거부하고 입력열의 수식을 거부.

잠금·감사로그·자동백업·첨부 악성파일검사·복원훈련은 실운영 단계 수용 기준. 기본 파이프라인은 네트워크 접속·원격 쓰기를 하지 않음.
