# SQL 적용 후 필수 보안검증 — 미실행

전용 테스트 프로젝트에서 실행. 두 워크스페이스 A/B, A의 viewer/editor/admin, B editor 테스트 사용자를 생성.

익명은 모든 원장을 SELECT/INSERT 할 수 없어야 함. A viewer는 A 원장 조회만 가능하며 INSERT/UPDATE 거부. A editor는 A 원장만 기록 가능. A editor가 B workspace_id를 입력하면 거부. 자기 멤버십 UPDATE 또는 INSERT로 admin 승격 거부. 사건 이력 UPDATE/DELETE 거부. 일반 원장 변경 시 kets_audit_log 생성. viewer/editor 감사로그 조회 거부. SQL 트리거에서 원장 workspace_id 이동 거부.

이벤트 간 단계·보완 순서와 공식 상태 변경근거는 현재 SQL의 개별 필드 제약만으로 충분히 검증되지 않음. 운영전 서버측 domain validator/RPC를 구현·테스트. 중복 실행·동시 편집 충돌, 파일 Storage 권한, 업무별 승인권한은 별도 수용테스트.
