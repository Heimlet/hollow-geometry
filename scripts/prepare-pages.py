"""Stage only public static files and resolve social metadata to the Pages URL."""
import argparse
import hashlib
import html
from pathlib import Path
import shutil
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

def prepare(site_url, destination):
    parts = urlsplit(site_url)
    if parts.scheme != 'https' or not parts.netloc or parts.query or parts.fragment or parts.username:
        raise ValueError('Use the public HTTPS site URL, including the repository path')
    base = site_url.rstrip('/') + '/'
    destination = Path(destination).resolve()
    # Never remove an existing directory supplied by a caller.
    destination.mkdir(parents=True, exist_ok=False)
    for name in ('css', 'js', 'vendor', 'assets'):
        shutil.copytree(ROOT/name, destination/name, ignore=shutil.ignore_patterns('README.md', '.DS_Store'))
    # Relative imports stay within one release, including unchanged entry modules.
    # A query on main.js alone would still load cached, unversioned dependencies.
    digest = hashlib.sha256()
    for name in ('js', 'css'):
        for path in sorted((destination/name).rglob('*')):
            if path.is_file():
                digest.update(path.relative_to(destination).as_posix().encode() + b'\0')
                digest.update(path.read_bytes())
    runtime = 'runtime/' + digest.hexdigest()[:20]
    for name in ('js', 'css'):
        shutil.copytree(destination/name, destination/runtime/name)
    markup = (ROOT/'index.html').read_text()
    markup = markup.replace('src="js/main.js"', f'src="{runtime}/js/main.js"')
    markup = markup.replace('href="css/style.css"', f'href="{runtime}/css/style.css"')
    markup = markup.replace('content="assets/social-card.png"', f'content="{html.escape(base, quote=True)}assets/social-card.png"')
    markup = markup.replace('<!-- Public canonical and absolute image URLs are inserted by prepare-pages.py. -->',
        f'<link rel="canonical" href="{html.escape(base, quote=True)}">\n<meta property="og:url" content="{html.escape(base, quote=True)}">')
    (destination/'index.html').write_text(markup)
    (destination/'.nojekyll').touch()
    return destination

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--output', default='_site')
    args = parser.parse_args()
    print(f'Ready: {prepare(args.url, args.output)}')
