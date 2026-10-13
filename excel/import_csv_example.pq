// Excel Power Query의 빈 쿼리에 붙여넣는 예시. 자동 연결은 내장하지 않음.
// 경로는 사용자가 로컬 검증 CSV 경로로 수정. 새로운 staging 쿼리로 로드.
let
    Source = Csv.Document(File.Contents("C:\KETS\local\csv\methodologies.csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Dates = Table.TransformColumns(Headers, {
        {"first_registered_on", each if _ = "" then null else Date.FromText(_), type date},
        {"registration_confirmed_on", each if _ = "" then null else Date.FromText(_), type date},
        {"recorded_on", each Date.FromText(_), type date}
    })
in
    Dates
