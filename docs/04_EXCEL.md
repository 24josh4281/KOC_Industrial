# 04. 엑셀 운영과 데이터 교환

파일: excel/KETS_Methodology_Dashboard.xlsx. Microsoft Excel 365/2021 이상 권고. MAXIFS, SUMIFS, COUNTIFS, INDEX/MATCH, MEDIAN 사용. 매크로·VBA·자동 외부접속 없음.

13개 시트: 사용안내, 설정, 대시보드, 연도통계, 검토통계, 방법론, 버전, 신청, 검토이력, 적용상태, 출처, 품질점검, 코드북.

## 입력

입력 원장 10~15의 5행은 계약 필드명. 각 행 6부터 입력. 오른쪽 회색 열은 계산식. 날짜는 Excel 날짜로 입력(권고) 또는 YYYY-MM-DD를 날짜로 변환. 임의 합계행을 데이터 안에 넣지 않음. 이력은 마지막행 추가; 순서 확인 후 sequence 유일성 유지.

배포 템플릿 계산 용량: 방법론 100, 버전 200, 신청 100, 검토이력 300, 적용상태 200, 출처 100행. 용량은 config/dashboard.config.json 기준. 이는 공식 대상 건수에 대한 가정이 아니라 파일의 초기 계산 용량. 초과 데이터를 입력하기 전 표·모든 관련 절대참조 수식 범위를 함께 확장해야 함. 새 행을 용량 밖에 붙이는 것만으로 요약이 늘어나지 않음.

대시보드 차트 범위는 2015~2026년을 기본 표시. 연도통계표 수식은 2035년까지 준비. 2027년 이후 데이터를 표시할 때 차트 원본 범위를 해당 연도까지 확장. 기준일을 과거로 바꾸면 미래 연도 값은 빈 값.

## 엑셀 → 웹

```bash
python scripts/manage.py from-xlsx excel/KETS_Methodology_Dashboard.xlsx --out local/dataset.json
python scripts/manage.py validate local/dataset.json
```

변환기는 입력 열만 읽고 계산 열을 무시. 입력 열의 수식은 실행하지 않고 거부. 구조·중복·연결·날짜 검증에 실패하면 출력하지 않음. 파일을 Excel에서 저장 후 변환. 01_설정의 필드 중 메타데이터가 JSON으로 반영되며 화면필터(scope/selected_year/threshold)는 데이터 원장의 일부가 아니므로 별도 기본값 사용.

## JSON → 엑셀

```bash
python scripts/manage.py csv local/dataset.json --out local/csv
```

생성된 6개 CSV를 Excel '데이터 → 텍스트/CSV에서'로 검토하거나, 헤더 아래 값을 해당 원장의 파란 입력 열에 붙여넣기. 기존 예시 및 잔여 행 삭제. 날짜형 변환·불리언 TRUE/FALSE 확인. 현재 자동 XLSX 재생성 CLI는 제공하지 않음. 동기화는 검증된 파일 단위이며 실시간 양방향 동기화가 아님.

단방향 가져오기용 Power Query M 예시는 excel/import_csv_example.pq. 파일 내에 연결을 내장하지 않았으므로 사용자가 경로·원본 개인정보 범위를 확인한 뒤 설정. 테이블·수식을 보존하려면 먼저 staging 쿼리로 가져온 뒤 입력 영역에 값만 반영.

## 검증

16_품질점검은 간단한 중복·분류·날짜 누락 표시. 전체 JSON 검증기의 대체물이 아님. 엑셀 화면의 공식 통계 사용은 담당자가 원본·분류·범위를 검토한 뒤 판단. 기본 예시의 주요 지표는 등록9/적용가능7/신규2/개정3/검토중5/승인대기1.
