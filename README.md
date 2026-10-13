# KOC Industrial · 방법론 업무 현황

산업부문 외부사업 **방법론·버전·신청**을 구분해 누적 현황, 진행 상황, 보완서류 제출기한을 확인합니다.

## 바로 확인

- [웹 대시보드](https://24josh4281.github.io/KOC_Industrial/)
- [엑셀 대시보드 다운로드](https://github.com/24josh4281/KOC_Industrial/raw/refs/heads/main/excel/KETS_Methodology_Dashboard.xlsx)
- [전체 코드 및 파일 다운로드](https://github.com/24josh4281/KOC_Industrial/archive/refs/heads/main.zip)
- [빌드·배포 실행 상태](https://github.com/24josh4281/KOC_Industrial/actions)

**공개 파일의 데이터는 전량 합성 예시입니다. 공식 현황 수치가 아닙니다.**
웹 첫 화면은 자료 미확보 상태입니다. `합성 예시 보기`를 누르면 엑셀과 동일한 예시를 볼 수 있습니다.
업무 원장, 담당자 연락처, 비공개 검토 메모와 디자인 참조 PPT는 공개하지 않습니다.

## 기능과 구현 상태

| 기능 | 상태 |
|---|---|
| 고유 방법론 / 개정 버전 / 신청 분리 | 구현 |
| 누적 등록·연도별 추이 / 검색·정렬·기준일 필터 | 구현 |
| 검토·보완 대기 / 다음 조치 | 구현 |
| 제출기한 D-n / 당일 / 초과 / 기한 미확인 | 웹 및 Python 계산 구현 |
| 알림 목록 Excel용 CSV | 구현 |
| 수식·차트·입력 원장을 포함한 엑셀 | 기존 검증 템플릿 제공 |
| 이너캐리 디자인 | React 웹에 적용. 엑셀 기존 서식 보존 |
| 엑셀 → JSON → 웹 | 파일 단위 교환 |
| 실시간 양방향 동기화 / DB / 로그인 / 공동편집 | 미구현 |
| 이메일·문자 자동 발송 | 미구현 |
| 확정 실자료 / 공식 전수 통계 | 미확보·확정 보류 |

`due_on`과 발생 기준일의 달력일 차이로 알림을 계산합니다. 보완 대기 중인 검토 신청만 포함하며, 기한이 없으면 추정하지 않습니다. 단계 체류 45일 관리기준과 제출기한 초과는 별개입니다. 법정기한 자동 판정은 제공하지 않습니다.

## 엑셀과 웹 사용

1. 엑셀 파일을 다운로드해 Excel에서 엽니다. 첫 파일은 합성 예시입니다.
2. 웹의 `합성 예시 보기`를 눌러 같은 원장의 현황을 비교합니다.
3. 실제 자료는 방법론·버전·신청·검토이력·적용상태·출처의 6개 원장으로 확정합니다.
4. 표준 엑셀을 JSON으로 변환·검증하고 웹에서 불러옵니다. 파일 내용은 해당 브라우저 탭에서만 처리됩니다.

```powershell
python -m pip install -r requirements.txt
python scripts/manage.py from-xlsx excel/KETS_Methodology_Dashboard.xlsx --out local/dataset.json
python scripts/manage.py validate local/dataset.json
python scripts/check_parity.py local/dataset.json
```

기존 업무 원장은 바로 운영 데이터로 변환하지 않습니다. [매핑 검토 절차](docs/10_INPUT_MAPPING.md)를 거쳐야 합니다.
엑셀 계산 용량과 갱신 방법은 [엑셀 안내](docs/04_EXCEL.md)에 있습니다.

## 로컬 실행

```powershell
cd web
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

검증: `python -m unittest discover -s tests -v`, `node --test tests/web.test.mjs`, `npm run build` (web 폴더).

공개 웹 갱신 시 `web` 폴더에서 `npm run build`를 실행한 다음, 저장소 루트에서 `python scripts/stage_public_site.py`를 실행합니다. 생성된 `index.html`, `assets`, `downloads`, `.nojekyll`을 함께 반영합니다. 기존 Pages 브랜치 배포와 Actions 배포 모두 같은 대시보드를 제공하며, CI가 소스와 공개 실행 파일의 일치를 확인합니다.

[구현 상태](docs/08_IMPLEMENTATION_STATUS.md) · [디자인 적용](docs/11_INNERCARRY.md) · [지표 정의](docs/03_METRICS.md) · [보안](docs/06_SECURITY.md) · [MIT 라이선스](LICENSE)
