#!/usr/bin/env bash
set -euo pipefail

viewer_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$viewer_dir/start_viewer.py" --bind 0.0.0.0 --port 8788 "$@"
