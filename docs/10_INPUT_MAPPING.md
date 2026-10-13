# 10. 실제 원장 매핑과 확정 전 검토

2026-10-13. 공유 채팅의 원장 구분과 파일 가져오기 우선 원칙을 적용했다.

## 처리 범위

`config/workbook_mapping.json`은 제공된 관리 도구의 세 시트를 대상으로 한다.
운영파일의 경로·사업자명·연락처·검토메모·매핑 결과는 Git에 저장하지 않는다.
실제 파일과 분석 결과는 저장소 밖 `inputs/` 및 Git 제외 `local/`에서 관리한다.

| 입력 | 사용 | 제외·보류 |
|---|---|---|
| 참고. 방법론 기준 구분 | 코드·버전 분리, 명칭, 공식분류 원문, 내부 산업/발전 분류, 유효시작일 | 최초등록일·등록사실 확인일·적용 가능 상태는 추정하지 않음 |
| ORS 방법론 | 신청별 원문, 최초신청일, 신규/개정, 공식 처리상태, 이력 원문과 시각 | 전화·이메일·대표자·소재지·첨부내용 제외 |
| 방법론 | 내부 신청유형·진행상태와 원문 대조 | 내부 검토완료를 공식 승인으로 바꾸지 않음 |
| 사업 평가·인증·정보비공개 신청 시트와 ORS ZIP | 파일 종류 확인 | 방법론 신청·등록 통계에 포함하지 않음. ZIP 내부 XLS 내용 검증은 미실행 |

## 매핑 규칙

- `03A-999-Ver02`는 합성 예시다. 방법론 키 `03A-999`와 버전 `02`를 분리한다. 버전 추가는 고유 방법론을 증가시키지 않는다.
- 참고표의 `방법론유효시작일`은 `versions.effective_from`에만 넣는다. `first_registered_on`, `registration_confirmed_on`, `versions.registered_on`은 근거 확보 전 null이다.
- `산업→industry`, `발전→transition`은 내부 표의 명시적 분류에 대한 **검토 후보**다. 관장기관 이름으로 범위를 추정하지 않는다. 분류 연결이 없으면 `unclassified`다.
- `최초신청일`을 신청일 후보로 사용한다. 재제출 후 바뀔 수 있는 `신청일자`와 구별한다. 실제 사건 기록일이 없어 가져온 날짜를 `recorded_on` 후보로 사용하며 과거 지식 재현의 한계를 남긴다.
- 두 시트의 `번호`는 순서가 다르다. 방법론명 **및 최초신청일이 동시에 정확히 일치하고 유일한 경우**만 대조한다. 이름만으로 병합하지 않는다. 이는 공식 신청 ID가 아니라 로컬 비교키다.
- 공식 방법론 번호가 없는 개정 신청은 명칭 유사성으로 연결하지 않는다. `revision_methodology_link_missing`으로 보류한다.
- 신규/개정이 다르면 양쪽 원문을 유지하고 `application_type_conflict`를 기록한다. 내부 대장 또는 ORS 중 하나를 자동 우선하지 않는다.
- 이력의 원문·날짜·시각·행 순서를 보존한다. 표준 `stage`와 `action`은 승인 전 null이다. 관장기관 지정, 보완, 검토승인, 심의승인, 등록의 의미를 임의로 합치지 않는다.
- 원본 파일 SHA-256, 시트, 행, 셀, 수식 원문·저장된 계산값을 함께 보존한다. 수식을 실행하거나 원본을 저장하지 않는다. 저장된 계산값의 최신성은 별도 Excel 재계산 확인 대상이다.

## 실행

Python 3.11 이상, Node 22.12 이상. 실제 경로를 변수에 넣어 실행한다.

```powershell
python -m pip install -r requirements-ingest.txt
$inputWorkbook = '실제 관리 원장 전체 경로.xlsx'
python scripts/stage_workbook.py $inputWorkbook --observed-on 2026-10-13 --out local/actual_mapping_review_v3.json
```

출력 파일이 이미 있으면 중단한다. 다른 파일명으로 새 버전을 생성한다.
출력은 `local/`, `data/staging/`, `data/private/` 아래로 제한한다.

**출력은 검토용 staging 계약이다. 대시보드용 dataset 계약과 다르다.**
웹 JSON 불러오기는 이 파일을 거부한다. 미확정 후보가 공식 현황으로 표시되지 않도록 의도한 동작이다.
`schema_version=1.0.0` 운영 계약에는 임의 필드를 추가하지 않았다.

## 확정 전 필요한 결정

1. 참고표의 등록사실을 확인할 증빙과 확인일, 가능하면 최초등록일 확보.
2. 신청유형 불일치의 권위 있는 원본 확인.
3. 개정 신청과 방법론 코드의 연결 확인, 로컬 신청 ID의 지속성 검토.
4. 미분류 신청의 산업/전환 근거와 공식·내부 상태의 표준 단계 매핑 승인.
5. 출처별 확보 범위 확인. 일부만 확보하면 `partial`, 미확보는 `missing`과 null.

이 결정 전에는 확정 운영 JSON과 공식 등록·검토 현황을 만들지 않는다.
실제 검토 목록과 셀 위치는 `local/ACTUAL_MAPPING_REVIEW.md`에서 확인한다.

## 표준 템플릿과 집계 검증

`scripts/manage.py from-xlsx`는 표준 엑셀 템플릿 전용이다. 위 관리 원장에 바로 적용하지 않는다.
열 제목/순서 변경, ID 없는 데이터행, 입력 수식, 소수 사건순번을 거부한다. 1900/1904 날짜 체계를 구분한다.

```powershell
python scripts/manage.py from-xlsx excel/KETS_Methodology_Dashboard.xlsx --out local/template_dataset_review.json
python scripts/check_parity.py local/template_dataset_review.json
python -m unittest discover -s tests -v
node --test tests/web.test.mjs
```

동등성 검사는 같은 입력을 Python과 JavaScript에서 매번 새로 계산하여 모든 snapshot 필드를 비교한다.
현재 실자료는 staging 검토 단계이므로 실자료의 확정 집계 동등성을 통과했다고 보고하지 않는다.
