"""Stage only public static files and resolve social metadata to the Pages URL."""
import argparse
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
    markup = (ROOT/'index.html').read_text()
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
