"""Offline diagnosis of the M3 1940x280 detail-crop OCR JSON; never authorizes input."""
import argparse
import hashlib
import json
from pathlib import Path


def diagnose(result):
    words = [word for row in result.get('lines', []) for word in row.get('words', [])]

    def region(box):
        x0, y0, x1, y1 = box
        return sorted((w for w in words if w['x'] >= x0 and w['y'] >= y0
                       and w['x'] + w['w'] <= x1 and w['y'] + w['h'] <= y1),
                      key=lambda w: w['x'])

    title = ' '.join(w['t'] for w in region((900, 45, 1530, 105)))
    starts = region((1480, 135, 1720, 200))
    return {'schemaVersion': 1, 'evidence': 'offline-cached-ocr', 'title': title,
            'titleExactMatch': title.casefold() == 'prioritize economic growth',
            'uniqueStart': len(starts) == 1 and starts[0]['t'].casefold() == 'start',
            'inputAuthorized': False,
            'limitation': 'Spatial order only; no fuzzy correction, capture calibration or native readback qualification.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ocr_json', type=Path)
    args = parser.parse_args()
    raw = args.ocr_json.read_bytes()
    print(json.dumps({**diagnose(json.loads(raw)), 'sourceHash': hashlib.sha256(raw).hexdigest()}, indent=2))
