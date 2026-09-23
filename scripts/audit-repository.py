"""Check tracked content (optionally Git history) without printing sensitive values."""
import argparse
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    'personal home path': rb'(?:/Users/|/home/|[A-Z]:\\Users\\)[A-Za-z0-9_.-]+',
    'GitHub credential': rb'(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{30,})',
    'API credential': rb'(?:sk-[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16})',
    'private key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    'embedded URL password': rb'https?://[^\s/:]+:[^\s/@]{8,}@',
}

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def scan(label, content):
    findings = [name for name, pattern in PATTERNS.items() if re.search(pattern, content)]
    if findings:
        print(f'{label}: {", ".join(findings)} (values hidden)')
    return len(findings)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history', action='store_true')
    args = parser.parse_args()
    issues = 0
    for name in filter(None, git('ls-files', '-z').decode().split('\0')):
        path = ROOT/name
        if path.is_file():
            issues += scan(name, path.read_bytes())
        if re.search(r'(^|/)(\.env(?:\..+)?|.*\.(pem|key|p12|pfx)|id_rsa)$', name) and not name.endswith('.env.example'):
            print(f'{name}: credential file must not be tracked')
            issues += 1
    if args.history:
        seen = set()
        for commit in git('rev-list', '--all').decode().split():
            issues += scan(f'commit message {commit[:8]}', git('show', '-s', '--format=%B', commit))
            for entry in git('ls-tree', '-rz', commit).split(b'\0'):
                if not entry:
                    continue
                meta, name = entry.split(b'\t', 1)
                sha = meta.split()[2].decode()
                if sha in seen:
                    continue
                seen.add(sha)
                issues += scan(f'history: {name.decode()}', git('cat-file', 'blob', sha))
            identity = git('show', '-s', '--format=%ae%n%ce', commit).decode().splitlines()
            if any(not email.endswith('@users.noreply.github.com') for email in identity):
                print(f'commit {commit[:8]}: non-anonymous author/committer email (hidden)')
                issues += 1
    print(f'Repository audit: {issues} findings')
    return bool(issues)

if __name__ == '__main__':
    raise SystemExit(main())
