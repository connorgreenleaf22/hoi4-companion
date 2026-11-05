import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('diagnostic', Path(__file__).parents[1] / 'scripts/bridge-ocr-diagnose.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def result(middle='EcoNomrc'):
    # Sanitized geometry/text from M3; no game image is committed.
    return {'lines': [{'words': [w]} for w in [
        {'x': 1360, 'y': 62, 'w': 130, 'h': 25, 't': 'GROWTH'},
        {'x': 1648, 'y': 0, 'w': 200, 'h': 25, 't': 'Type to Search'},
        {'x': 921, 'y': 62, 'w': 213, 'h': 25, 't': 'PRIORITIZE'},
        {'x': 1165, 'y': 62, 'w': 170, 'h': 25, 't': middle},
        {'x': 1560, 'y': 155, 'w': 70, 'h': 25, 't': 'Start'}]]}


class DiagnosticTests(unittest.TestCase):
    def test_recorded_substitution_remains_rejected_after_spatial_order_fix(self):
        r = module.diagnose(result())
        self.assertEqual(r['title'], 'PRIORITIZE EcoNomrc GROWTH')
        self.assertFalse(r['titleExactMatch'])
        self.assertTrue(r['uniqueStart'])
        self.assertFalse(r['inputAuthorized'])

    def test_exact_synthetic_title_does_not_authorize_input(self):
        r = module.diagnose(result('Economic'))
        self.assertTrue(r['titleExactMatch'])
        self.assertFalse(r['inputAuthorized'])

    def test_missing_and_duplicate_start_do_not_pass(self):
        self.assertFalse(module.diagnose({'lines': []})['uniqueStart'])
        r = result();r['lines'].append(r['lines'][-1])
        self.assertFalse(module.diagnose(r)['uniqueStart'])


if __name__ == '__main__':
    unittest.main()
