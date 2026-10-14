# PR #6 공개 배포 검증 · 2026-10-14

- 기능 브랜치 `feature/linked-management-slicers`의 커밋 `5747ddc`를 GitHub에 푸시하고 [PR #6](https://github.com/24josh4281/KOC_Industrial/pull/6)으로 `main`에 병합했다. 병합 커밋은 `85cf99cfe1c4686666011c3b5375d79b9e4d024c`다.
- PR [Validate dashboard 실행](https://github.com/24josh4281/KOC_Industrial/actions/runs/38541158487) 성공. 병합 후 [main 검증 실행](https://github.com/24josh4281/KOC_Industrial/actions/runs/38541347985), [Pages 게시 실행](https://github.com/24josh4281/KOC_Industrial/actions/runs/38541347986), GitHub의 pages build and deployment 실행이 모두 성공했다.
- 배포 전 로컬에서 Python 테스트 73개, 웹 테스트 25개, Vite 프로덕션 빌드, 합성 오프라인 preview 일치, `stage_public_site.py` 공개 파일 허용목록 검사를 실행했다. 새 공개 JavaScript와 배치된 JavaScript의 SHA-256이 같았다.
- PR 변경 파일 목록에 로컬 `inputs/`, `outputs/`, `local/`, 내부 원장·JSON·검토 메모·비밀키가 없는지 확인했다. 공개 `web/dist`에는 내부 55 MB JSON이 없다.
- `https://24josh4281.github.io/KOC_Industrial/`은 HTTP 200으로 새 번들 `index-G62NLyiB.js`를 참조했다. 해당 JS와 공개 Excel `KETS_Public_Insights_20261014.xlsx`의 HEAD 요청도 각각 HTTP 200이었다. 이 확인은 실제 브라우저 클릭·모바일 접근성 검사가 아니다.
- 내부 관리 Tool의 자동 갱신·수식 보류 및 로컬 v5 HTML은 **코드와 설명만** 공개 저장소에 있고 내부 자료·수정 Excel 사본은 로컬에 남는다. Supabase 연결·RLS·알림 발송은 배포하지 않았다.
