"""Prepare the disposable portable Chromium smoke-test page; does not publish."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
html = (root / '打开三维模型.html').read_text()
import sys
name = 'browser-r15-check.js' if '--r15' in sys.argv else 'browser-r14-check.js' if '--r14' in sys.argv else 'browser-r13-check.js' if '--r13' in sys.argv else 'browser-r12-check.js' if '--r12' in sys.argv else 'browser-training-check.js'
script = (root / 'tests' / name).read_text()
output = root / 'tests/browser-check.generated.html'
output.write_text(html.replace('</body>', '<script>' + script + '</script></body>'))
print(output)
