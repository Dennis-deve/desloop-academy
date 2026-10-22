#!/usr/bin/env python3
"""Create a reproducible source handoff without dependencies, build output or secrets."""
from __future__ import annotations

import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / 'desloop-academy-source.zip'
SKIP_DIRS = {
    '.git', '.arena', '.cache', '.local', '.mypy_cache', '.next', '.nox', '.npm',
    '.nuxt', '.output', '.parcel-cache', '.playwright-cli', '.pytest_cache',
    '.ruff_cache', '.svelte-kit', '.tox', '.turbo', '.vite', '.venv', '__pycache__',
    'build', 'coverage', 'dist',
    'node_modules', 'out', 'playwright-report', 'target', 'test-results', 'tmp',
}
SKIP_FILES = {'.DS_Store', 'Thumbs.db'}


def keep(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(part in SKIP_DIRS for part in rel.parts[:-1]):
        return False
    name = path.name
    if name in SKIP_FILES or name.endswith(('.log', '.local', '.sqlite', '.db', '.tsbuildinfo')):
        return False
    if name.startswith('.env') and name != '.env.example':
        return False
    if name in {'credentials', '.netrc', '.git-credentials'} or name.endswith(('.pem', '.key', '.p12')):
        return False
    return True


if ROOT in ARCHIVE.parents:
    raise SystemExit('Write the source archive outside the project tree.')
files = sorted(path for path in ROOT.rglob('*') if path.is_file() and keep(path))
ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(ARCHIVE, 'w', ZIP_DEFLATED, compresslevel=6) as bundle:
    for path in files:
        bundle.write(path, path.relative_to(ROOT).as_posix())
with ZipFile(ARCHIVE) as bundle:
    broken = bundle.testzip()
    if broken:
        raise SystemExit(f'Integrity check failed: {broken}')
print(f'Wrote {ARCHIVE} with {len(files)} source files ({ARCHIVE.stat().st_size // 1024:,} KiB).')
