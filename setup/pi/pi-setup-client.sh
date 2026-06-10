#!/usr/bin/env bash
# ============================================================
# Smart Home Platform -- Pi client setup (thin wrapper) v1.0
# Convenience entry point that runs the single moded installer
# in CLIENT mode. No logic lives here -- pi-setup.sh is the one
# source of truth. Any extra arguments are passed through.
#
#   ./pi-setup-client.sh        ==  ./pi-setup.sh --mode client
#
# Changelog:
#   v1.0 - Initial release
# ============================================================
set -euo pipefail
exec "$(dirname "$0")/pi-setup.sh" --mode client "$@"
