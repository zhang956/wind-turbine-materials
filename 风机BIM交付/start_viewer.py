"""Local preview and read-only snapshot adapter. Not a production server."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import json
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent

def create_server(bind='127.0.0.1', port=8788, telemetry_file=None):
    snapshot = Path(telemetry_file).resolve() if telemetry_file else None
    if snapshot and (snapshot == ROOT or ROOT in snapshot.parents):
        raise ValueError('测点快照必须位于公开交付目录之外')
    started = time.monotonic()

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def respond(self, status, value, head=False):
            body = json.dumps(value, ensure_ascii=False, allow_nan=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if not head:
                self.wfile.write(body)

        def api(self, head=False):
            path = urlsplit(self.path).path
            if path == '/api/health':
                self.respond(200, {'version': 'R15', 'status': 'ready', 'uptimeSeconds': int(time.monotonic()-started), 'telemetryConfigured': snapshot is not None}, head)
            elif path == '/api/telemetry':
                if snapshot is None:
                    self.respond(503, {'error': '未配置测点数据源'}, head)
                    return True
                try:
                    # Resolve again so replacing the file with a public-directory symlink is rejected.
                    resolved = snapshot.resolve()
                    if ROOT == resolved or ROOT in resolved.parents:
                        raise ValueError('public path')
                    with resolved.open('rb') as stream:
                        raw = stream.read(1048577)
                    if len(raw) > 1048576:
                        raise ValueError('oversize')
                    def invalid(value):
                        raise ValueError('nonfinite')
                    packet = json.loads(raw, parse_constant=invalid)
                    if not isinstance(packet, dict) or packet.get('schemaVersion') != 1 or not isinstance(packet.get('points'), list) or not isinstance(packet.get('sourceId'), str) or not isinstance(packet.get('turbineId'), str):
                        raise ValueError('schema')
                    self.respond(200, packet, head)
                except (OSError, ValueError, UnicodeError):
                    self.respond(503, {'error': '快照不可读取或格式错误'}, head)
            elif path.startswith('/api/'):
                self.respond(404, {'error': '未知接口'}, head)
            else:
                return False
            return True

        def do_GET(self):
            if not self.api():
                super().do_GET()

        def do_HEAD(self):
            if not self.api(True):
                super().do_HEAD()

        def list_directory(self, path):
            self.send_error(403, 'Directory listing disabled')

    return ThreadingHTTPServer((bind, port), Handler)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8788)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--telemetry-file', help='公开目录之外的 JSON 快照，由采集器原子替换写入')
    args = parser.parse_args()
    try:
        server = create_server(args.bind, args.port, args.telemetry_file)
    except (OSError, ValueError) as exc:
        raise SystemExit(f'启动失败：{exc}')
    print(f'浏览地址：http://{args.bind}:{server.server_port}/viewer/；按 Ctrl+C 停止。', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
