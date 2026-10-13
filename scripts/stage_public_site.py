"""Stage a validated Vite build for a repository-root GitHub Pages source.

Copy only the generated HTML, JS/CSS assets and synthetic workbook. No raw data.
Existing unrelated files are never removed.
"""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
build = ROOT / 'web' / 'dist'
assert json.loads((ROOT / 'data/demo/dataset.json').read_text(encoding='utf-8'))['metadata']['mode'] == 'demo'
paths = [build / 'index.html', *sorted((build / 'assets').glob('*')), build / 'downloads/KETS_Methodology_Dashboard.xlsx']
assert paths[0].is_file() and len(paths) >= 4, 'Run npm run build in web first'
for source in paths:
    relative = source.relative_to(build)
    assert relative.as_posix() in ('index.html', 'downloads/KETS_Methodology_Dashboard.xlsx') or (relative.parts[0] == 'assets' and source.suffix in ('.js', '.css'))
    if source.suffix == '.xlsx':
        assert source.read_bytes() == (ROOT / 'excel/KETS_Methodology_Dashboard.xlsx').read_bytes()
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
(ROOT / '.nojekyll').write_text('', encoding='utf-8')
print(json.dumps({'staged': [p.relative_to(build).as_posix() for p in paths], 'synthetic_workbook_only': True}))
