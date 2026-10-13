"""Stage a validated Vite build for a repository-root GitHub Pages source.

Copy generated assets and explicitly listed demo/public workbooks. No private inputs.
Existing unrelated files are never removed.
"""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
build = ROOT / 'web' / 'dist'
assert json.loads((ROOT / 'data/demo/dataset.json').read_text(encoding='utf-8'))['metadata']['mode'] == 'demo'
workbooks = ['KETS_Methodology_Dashboard.xlsx','KETS_Public_Insights_20261014.xlsx']
paths = [build / 'index.html', *sorted((build / 'assets').glob('*')), *[build / 'downloads' / name for name in workbooks]]
assert paths[0].is_file() and len(paths) >= 4, 'Run npm run build in web first'
for source in paths:
    relative = source.relative_to(build)
    assert relative.as_posix() in ('index.html', *['downloads/'+name for name in workbooks]) or (relative.parts[0] == 'assets' and source.suffix in ('.js', '.css'))
    if source.suffix == '.xlsx':
        assert source.read_bytes() == (ROOT / 'excel' / source.name).read_bytes()
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
(ROOT / '.nojekyll').write_text('', encoding='utf-8')
print(json.dumps({'staged': [p.relative_to(build).as_posix() for p in paths], 'explicit_public_allowlist': True}))
