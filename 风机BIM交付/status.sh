#!/usr/bin/env bash
set -eu
base="${1:-http://127.0.0.1:8788}"
curl --fail --silent --show-error --max-time 5 "${base%/}/api/health"
