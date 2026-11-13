"""Read-only pre-push audit. Reports locations/categories, never matched secret values.

This bounded pattern/path/size review is not a guarantee that every possible secret
can be recognized. Review flagged paths manually before authorizing a push.
"""
import json
import re
import subprocess

def git(*args):
    return subprocess.check_output(['git', *args])

def main():
    objects = {}
    for line in git('rev-list', '--objects', 'HEAD').decode().splitlines():
        oid, _, name = line.partition(' ')
        objects[oid] = name
    metadata = subprocess.check_output(['git', 'cat-file', '--batch-check'], input=('\n'.join(objects)+'\n').encode()).decode().splitlines()
    patterns = {
        'private-key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
        'github-token': rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b',
        'aws-access-id': rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
        'provider-token': rb'\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{32,}|xox[baprs]-[A-Za-z0-9-]{20,})\b',
        'credentialed-url': rb'https?://[^\s/\x22\x27<>:]+:[^\s/\x22\x27<>]+@',
        'literal-secret-assignment': rb'(?i)\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*[\x22\x27]([^\x22\x27\r\n]{12,})[\x22\x27]',
    }
    findings, binaries, large, suspicious = [], [], [], []
    count = 0
    for row in metadata:
        oid, kind, size = row.split()
        if kind != 'blob':
            continue
        count += 1
        name = objects[oid]
        data = git('cat-file', 'blob', oid)
        if int(size) > 1024*1024:
            large.append({'path': name, 'bytes': int(size), 'blob': oid})
        if b'\0' in data or data.startswith((b'MZ', b'PK\x03\x04', b'SQLite format 3')):
            binaries.append({'path': name, 'bytes': int(size), 'blob': oid})
        if re.search(r'(?i)(^|/)(\.env(?:\.|$)|credentials|id_rsa|node_modules|\.bridge-local|artifacts|release|save games)(/|$)|\.(hoi4|sqlite\w*|db|exe|dll|zip|pem|pfx|key)$', name):
            suspicious.append({'path': name, 'blob': oid})
        for category, pattern in patterns.items():
            for match in re.finditer(pattern, data):
                findings.append({'path': name, 'blob': oid, 'category': category, 'line': data[:match.start()].count(b'\n')+1})
    result = {'head': git('rev-parse', 'HEAD').decode().strip(), 'commits': int(git('rev-list', '--count', 'HEAD')), 'uniqueBlobs': count, 'patternFindings': findings, 'suspiciousPaths': suspicious, 'largeBlobs': large, 'binaryBlobs': binaries, 'scope': 'All reachable HEAD blobs, including earlier deleted/replaced files; no matching values printed. Human review required.'}
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
