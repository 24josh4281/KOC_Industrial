# KOC Industrial · 방법론 업무 현황

산업부문 외부사업 **방법론·버전·신청**을 구분해 누적 현황, 진행 상황, 보완서류 제출기한을 확인합니다.

## 바로 확인

- [웹 대시보드](https://24josh4281.github.io/KOC_Industrial/)
- [공개 실자료 엑셀 다운로드](https://24josh4281.github.io/KOC_Industrial/downloads/KETS_Public_Insights_20261014.xlsx)
- [합성 예시·표준 원장](https://24josh4281.github.io/KOC_Industrial/?view=template)
- [전체 코드 및 파일 다운로드](https://github.com/24josh4281/KOC_Industrial/archive/refs/heads/main.zip)
- [빌드·배포 실행 상태](https://github.com/24josh4281/KOC_Industrial/actions)

**웹 첫 화면과 신규 엑셀은 ORS 공개 이력에서 확인한 33개 방법론·40개 버전입니다.** 2026-10-14 확인분이며 산업부문 전체 통계가 아닙니다. 유효시작일로 분석하고, 이를 등록일·승인일로 대체하지 않습니다.
진행 중 신청·보완기한·심사기간·승인율은 공개자료 미확보입니다. 기존 표준 원장과 독립 HTML은 합성 예시로 별도 유지합니다.
업무 원장, 담당자 연락처, 비공개 검토 메모와 디자인 참조 PPT는 공개하지 않습니다.

## 기능과 구현 상태

| 기능 | 상태 |
|---|---|
| ORS 공개 이력·출처 연결 / 실자료 33개 코드·40개 버전 | 구현·공개 확인분 |
| 유효시작 연도·분야·등록형태·개정 경험·검색 교차 분석 | 공개 웹·엑셀 구현 |
| 최초·개정·누적 / 전년 동기간 / 분야 집중 / 버전 분포 | 공개 웹·엑셀 구현 |
| 최근 변경 / 최신 버전 경과일·중앙값 / 1·3·5년 관찰 | 공개 웹·엑셀 구현 |
| 고유 방법론 / 개정 버전 / 신청 분리 | 구현 |
| 누적 등록·연도별 추이 / 검색·정렬·기준일 필터 | 구현 |
| 신규·누적 / 개정 그래프 전환, 그래프 수치표 | 구현 |
| KPI·검토 단계·기술 분포 → 해당 원장 확인 | 구현 |
| 방법론·버전·신청 탭 / 상세 이력·출처 / 조회 CSV | 구현 |
| 검토·보완 대기 / 다음 조치 | 구현 |
| 제출기한 D-n / 당일 / 초과 / 기한 미확인 | 웹 및 Python 계산 구현 |
| 알림 목록 Excel용 CSV | 구현 |
| 수식·차트·입력 원장을 포함한 엑셀 | 기존 검증 템플릿 제공 |
| 이너캐리 디자인 | 공개 웹·신규 엑셀에 남색 KPI·파랑 강조 적용 |
| 엑셀 → JSON → 웹 | 파일 단위 교환 |
| 실시간 양방향 동기화 / DB / 로그인 / 공동편집 | 미구현 |
| 이메일·문자 자동 발송 | 미구현 |
| 진행 중 신청 실자료 / 공식 전수 통계 | 공개자료 미확보 |

`due_on`과 발생 기준일의 달력일 차이로 알림을 계산합니다. 보완 대기 중인 검토 신청만 포함하며, 기한이 없으면 추정하지 않습니다. 단계 체류 45일 관리기준과 제출기한 초과는 별개입니다. 법정기한 자동 판정은 제공하지 않습니다.

## 엑셀과 웹 사용

1. 공개 실자료 엑셀을 열고 `분석조건`의 노란 셀을 바꿉니다. 기본 조건은 웹 첫 화면과 같습니다.
2. 방법론·버전 표의 `포함=1` 필터로 집계 대상을 확인합니다. 원본 공개 URL도 함께 제공합니다.
3. 웹에서 같은 조건을 선택하고 KPI·그래프·상세 이력·CSV를 확인합니다. 다운로드 엑셀에 웹 선택 조건을 자동 저장하지는 않습니다.
4. 신청·검토 업무 기능은 별도 합성 예시 화면에서 확인합니다. 아래 변환 명령은 기존 13개 시트 표준 원장 전용이며 신규 공개 분석 엑셀에는 적용하지 않습니다.

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

[공개 분석 시나리오](docs/12_PUBLIC_INSIGHTS.md) · [구현 상태](docs/08_IMPLEMENTATION_STATUS.md) · [디자인 적용](docs/11_INNERCARRY.md) · [지표 정의](docs/03_METRICS.md) · [보안](docs/06_SECURITY.md) · [코드 MIT 라이선스](LICENSE). 공개 원자료의 권리는 원 출처에 있습니다.
