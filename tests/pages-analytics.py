"""Public config is injected only into the staged release, including its hash."""
import importlib.util
import tempfile
from pathlib import Path
import re
spec = importlib.util.spec_from_file_location('pages', Path(__file__).resolve().parents[1]/'scripts/prepare-pages.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source = (module.ROOT/'js/analytics-config.js').read_bytes()
with tempfile.TemporaryDirectory() as tmp:
    empty = module.prepare('https://example.org/geometry/', Path(tmp)/'empty')
    live = module.prepare('https://example.org/geometry/', Path(tmp)/'live', '987654321')
    one = (empty/'index.html').read_text()
    two = (live/'index.html').read_text()
    assert 'mc.yandex.ru/watch/' not in one
    assert 'mc.yandex.ru/watch/987654321' in two
    paths = re.findall(r'src="(runtime/[^\"]+\.js)"', two)
    assert len(paths) == 2 and len({p.split('/')[1] for p in paths}) == 1
    for path in paths:
        assert (live/path).is_file()
    runtime = paths[0].split('/')[1]
    config = (live/'runtime'/runtime/'js/analytics-config.js').read_text()
    assert '987654321' in config and 'https://example.org/geometry/' in config
    assert runtime not in one, 'Counter configuration changes the release hash'
    try:
        module.prepare('https://example.org/geometry/', Path(tmp)/'invalid', '</script>')
        raise AssertionError('Invalid counter accepted')
    except ValueError:
        assert not (Path(tmp)/'invalid').exists()
assert (module.ROOT/'js/analytics-config.js').read_bytes() == source
print('PASS: production-only staged analytics config, shared release hash, noscript fallback and input validation')
