#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re, sys
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parent
project = root.parents[1]
errors = []

def fail(message): errors.append(message)

sources = []
for line_no, line in enumerate((root / 'SOURCE_MANIFEST.jsonl').read_text(encoding='utf-8').splitlines(), 1):
    try: source = json.loads(line)
    except json.JSONDecodeError as exc:
        fail(f'source line {line_no}: {exc}')
        continue
    required = {'id','ecosystem','title','url','authority','source_version','retrieved_at','rights_status','copy_policy','upstream_content_sha256','claims','record_sha256'}
    if set(source) != required: fail(f'{source.get("id", line_no)} fields mismatch')
    clean = {k:v for k,v in source.items() if k != 'record_sha256'}
    digest = hashlib.sha256(json.dumps(clean, sort_keys=True, separators=(',',':')).encode()).hexdigest()
    if digest != source.get('record_sha256'): fail(f'{source.get("id")} record hash mismatch')
    if not source.get('url','').startswith('https://'): fail(f'{source.get("id")} non-https URL')
    if source.get('copy_policy') != 'link_only' or source.get('upstream_content_sha256') is not None: fail(f'{source.get("id")} copy boundary mismatch')
    sources.append(source)
ids = [source['id'] for source in sources]
if len(ids) != len(set(ids)): fail('duplicate source ids')
required_ecosystems = {'SVG','Inkscape','Spine','After Effects','Lottie','Toon Boom Harmony','Flash/SWF'}
if {source['ecosystem'] for source in sources} != required_ecosystems: fail('ecosystem coverage mismatch')

schema = json.loads((root / 'dve-vector-package-v0.schema.json').read_text(encoding='utf-8'))
Draft202012Validator.check_schema(schema)
checker = Draft202012Validator(schema)
valid = json.loads((root / 'fixtures/minimal-svg-spine-package.json').read_text(encoding='utf-8'))
invalid = json.loads((root / 'fixtures/reject-unknown-field.json').read_text(encoding='utf-8'))
valid_errors = list(checker.iter_errors(valid))
if valid_errors: fail('valid fixture rejected: ' + '; '.join(error.message for error in valid_errors))
if not list(checker.iter_errors(invalid)): fail('unknown-field negative fixture was accepted')

text_files = ['README.md','FORMAT_CAPABILITY_MATRIX.md','DVE_VECTOR_PACKAGE_V0.md','PATTERN_CARDS.md','RESEARCH_VERDICTS.md','CONFORMANCE_FIXTURE_PLAN.md']
combined = '\n'.join((root / name).read_text(encoding='utf-8') for name in text_files)
for source_id in ids:
    if source_id not in combined: fail(f'{source_id} absent from research docs')
atlas = (root / 'visual-atlas/index.html').read_text(encoding='utf-8')
if 'dve-rosetta-atlas-v0' not in atlas: fail('atlas build marker missing')
if atlas.count('<svg') < 6: fail('atlas visual gate count below six')
for group in re.findall(r'data-source-ids="([^"]+)"', atlas):
    for source_id in group.split():
        if source_id not in ids: fail(f'atlas references unknown {source_id}')

artifact_manifest = json.loads((root / 'ARTIFACT_MANIFEST.json').read_text(encoding='utf-8'))
for relative, record in artifact_manifest['artifacts'].items():
    artifact = root / relative
    if not artifact.is_file():
        fail(f'artifact missing: {relative}')
        continue
    payload = artifact.read_bytes()
    if len(payload) != record['bytes']: fail(f'artifact byte count mismatch: {relative}')
    if hashlib.sha256(payload).hexdigest() != record['sha256']: fail(f'artifact hash mismatch: {relative}')

quarantine = json.loads((root / 'RUNTIME_QUARANTINE.json').read_text(encoding='utf-8'))
if quarantine.get('state') == 'SUPERSEDED_BY_CONFIRMED_NOODLE_BOX':
    active_hashes = quarantine.get('replacement_sha256')
    runtime_lineage = 'active_replacement_verified'
else:
    active_hashes = quarantine.get('sha256')
    runtime_lineage = 'quarantine_verified'
if not isinstance(active_hashes, dict) or not active_hashes:
    fail('runtime lineage hash map missing')
else:
    for relative, expected in active_hashes.items():
        actual = hashlib.sha256((project / relative).read_bytes()).hexdigest()
        if actual != expected: fail(f'active runtime hash mismatch: {relative}')

if errors:
    for error in errors: print('FAIL', error)
    raise SystemExit(1)
print(json.dumps({'ok':True,'sources':len(sources),'ecosystems':len(required_ecosystems),'visual_gates':atlas.count('<svg'),'valid_fixture':'accepted','negative_fixture':'rejected','runtime_lineage':runtime_lineage}, sort_keys=True))
