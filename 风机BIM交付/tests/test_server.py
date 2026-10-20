import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import urlopen
from urllib.error import HTTPError
spec = importlib.util.spec_from_file_location('viewer_server', Path(__file__).resolve().parents[1] / 'start_viewer.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ServerTest(unittest.TestCase):
    def test_endpoints(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'snapshot.json'
            server = module.create_server(port=0, telemetry_file=source)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:' + str(server.server_port)
            try:
                with urlopen(base+'/api/health') as response:
                    self.assertEqual(json.load(response)['version'], 'R15')
                with self.assertRaises(HTTPError) as context:
                    urlopen(base+'/api/telemetry')
                self.assertEqual(context.exception.code, 503)
                packet = dict(schemaVersion=1, sourceId='test', turbineId='test', points=[])
                source.write_text(json.dumps(packet))
                with urlopen(base+'/api/telemetry') as response:
                    self.assertEqual(json.load(response), packet)
                source.write_text('{"value":NaN}')
                with self.assertRaises(HTTPError):
                    urlopen(base+'/api/telemetry')
                with urlopen(base+'/viewer/') as response:
                    self.assertIn('telemetryConnect', response.read().decode())
            finally:
                server.shutdown()
                server.server_close()
                thread.join()

    def test_public_source_rejected(self):
        with self.assertRaises(ValueError):
            module.create_server(port=0, telemetry_file=module.ROOT/'data/private.json')

if __name__ == '__main__':
    unittest.main()
