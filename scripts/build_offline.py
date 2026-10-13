from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
schema=(ROOT/'schemas/dataset.schema.json').read_text(encoding='utf-8')
core=(ROOT/'web/src/core.mjs').read_text(encoding='utf-8').replace("import schema from './schema.mjs';",'const schema='+schema+';').replace('export const ','const ').replace('export function ','function ')
data=(ROOT/'data/demo/dataset.json').read_text(encoding='utf-8').replace('</','<\\/')
css=(ROOT/'web/src/styles.css').read_text(encoding='utf-8')
ui=(ROOT/'web/src/offline.js').read_text(encoding='utf-8')
# Embed only synthetic fixtures, never a private working dataset.
assert json.loads(data)['metadata']['mode']=='demo'
page='<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K-ETS 방법론 대시보드 | 합성 예시</title><style>'+css+'</style></head><body><main id="root" class="shell"></main><script>const DEMO='+data+';\n'+core+'\n'+ui+'</script></body></html>'
(ROOT/'preview/dashboard.html').write_text(page,encoding='utf-8')
print('Built preview/dashboard.html (synthetic data only)')
