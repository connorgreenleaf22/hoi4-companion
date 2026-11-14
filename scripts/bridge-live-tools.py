"""Narrow adapter for reviewed Live Tools modules; no installer/server/memory transfer.

Input is one JSON object on stdin. Native identity uses query-only process rights.
The caller owns launch, authorization, budget, durable receipts and session binding.
"""
import dataclasses
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
PIN = json.loads((ROOT / 'integrations/hoi4-live-tools.json').read_text())
SOURCE = ROOT / PIN['sourceDirectory']
revision = subprocess.check_output(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD'], text=True,
                                   creationflags=0x08000000).strip()
if revision != PIN['revision']:
    raise RuntimeError('Unreviewed Live Tools revision')
subprocess.check_output(['git', '-C', str(SOURCE), 'diff', '--exit-code', 'HEAD', '--', 'hoi4_live'],
                        creationflags=0x08000000)
sys.path.insert(0, str(SOURCE))
from hoi4_live.platform.windows import WindowsPlatform

request = json.load(sys.stdin)
platform = WindowsPlatform()
identity = platform.capture_process_identity(request['pid'], request['executable'])
identity_json = dataclasses.asdict(identity)
identity_json['creation_time'] = str(identity.creation_time)  # FILETIME exceeds JS safe integers.
if request['operation'] == 'identity':
    print(json.dumps(identity_json))
    sys.exit(0)
if identity_json != request['identity']:
    raise RuntimeError('Owned process identity mismatch')

from hoi4_live.platform.windows_window import GameWindow
from hoi4_live.platform.windows_capture import Capturer
from hoi4_live.platform.ocr_windows import WindowsOcrBackend
from hoi4_live.platform.windows_input import Input
from PIL import Image

window = GameWindow(expected_identity=identity, process_backend=platform, pin=False)
if list(window.size()) != PIN['physicalClientSize']:
    raise RuntimeError('Unqualified game client dimensions; expected physical 1600x900 (1280x720 at 125% DPI)')
capture = Capturer(window, method='printwindow')
ocr = WindowsOcrBackend(timeout=12)
destination = Path(request['evidenceRoot']).resolve()
destination.mkdir(parents=True, exist_ok=True)
stamp = str(time.time_ns())
image = Image.fromarray(capture.grab())
full_path = destination / (stamp + '.png')
image.save(full_path)
# This qualified DPI path returns a logical 1280x720 render in a padded physical bitmap.
image = image.crop((0, 0, *PIN['clientSize']))
scale = PIN['physicalClientSize'][0] / PIN['clientSize'][0]

def recognize(box, name):
    crop = destination / (stamp + '-' + name + '.png')
    image.crop(box).resize(((box[2]-box[0])*2, (box[3]-box[1])*2)).save(crop)
    result = ocr.recognize_file(str(crop))
    crop.with_suffix('.ocr.json').write_text(json.dumps(result, indent=2))
    return result

def normalized(text):
    return ' '.join(text.lower().split())

try:
    if request['operation'] == 'observe':
        # Upstream focusview._button_region: ONLY meaningful with politics panel visible.
        result = recognize((270, 130, 535, 212), 'focus')
        text = ' '.join(row['text'] for row in result['lines']).strip()
        header = recognize((0, 70, 265, 130), 'panel')
        panel_text = ' '.join(row['text'] for row in header['lines']).strip()
        focus = None
        known = False
        # Both title and button are required; do not identify arbitrary matching text on another screen.
        if normalized(panel_text).replace(' ', '') == 'political':
            # Exact OCR variant independently compared with the retained native screenshot.
            if normalized(text) in ('select a national focus', 'select* national focus'):
                known = True
            elif normalized(text) == normalized(PIN['focusName']):
                known, focus = True, PIN['focusId']
        output = {'known': known, 'focusId': focus, 'text': text, 'panelText': panel_text,
                  'imagePath': str(full_path), 'imageHash': hashlib.sha256(full_path.read_bytes()).hexdigest(),
                  'observedAt': time.time(), 'method': 'PrintWindow/Windows.Media.Ocr', 'region': [270,130,265,82]}
    elif request['operation'] == 'select':
        # Only one approved focus; inspect its open detail before clicking the independently found Start button.
        if request.get('focusId') != PIN['focusId']:
            raise RuntimeError('Unsupported focus')
        result = recognize((150, 95, 1120, 235), 'detail')
        text = ' '.join(row['text'] for row in result['lines'])
        if normalized(PIN['focusName']) not in normalized(text):
            raise RuntimeError('Target focus detail title not observed')
        starts = [row for row in result['lines'] if normalized(row['text']) == 'start']
        if len(starts) != 1 or not starts[0]['words']:
            raise RuntimeError('Unique Start button not observed')
        words = starts[0]['words']
        x0, y0 = min(w['x'] for w in words), min(w['y'] for w in words)
        x1, y1 = max(w['x']+w['w'] for w in words), max(w['y']+w['h'] for w in words)
        if platform.capture_process_identity(identity.pid, identity.executable_path) != identity:
            raise RuntimeError('Process changed before input')
        Input(window).click((150+(x0+x1)/4)*scale, (95+(y0+y1)/4)*scale)
        output = {'dispatched': True, 'inputs': 1, 'detailText': text, 'beforeImage': str(full_path),
                  'meaning': 'Input only; requires independent subsequent observation'}
    else:
        raise RuntimeError('Unsupported operation')
    if platform.capture_process_identity(identity.pid, identity.executable_path) != identity:
        raise RuntimeError('Process changed during operation')
    print(json.dumps(output))
finally:
    ocr.close()
