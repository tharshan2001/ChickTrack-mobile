#!/usr/bin/env bash
# Point the app at the backend on this Mac's Wi-Fi address and start Expo.
# Start the backend first with ../ChickTrack/scripts/run-lan.sh (same address).
#
#   npm run lan
#   LAN_IP=192.168.1.20 npm run lan
set -euo pipefail
cd "$(dirname "$0")/.."

IP="${LAN_IP:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)}"
if [ -z "$IP" ]; then
  echo "Couldn't find your LAN IP. Run it as: LAN_IP=192.168.x.x npm run lan" >&2
  exit 1
fi

echo "EXPO_PUBLIC_API_URL=http://$IP:8090" > .env
echo "API: http://$IP:8090  (written to .env)"

if ! curl -s -o /dev/null --max-time 3 "http://$IP:8090/actuator/health"; then
  echo "Warning: the backend isn't answering at http://$IP:8090 yet. Start it with ../ChickTrack/scripts/run-lan.sh" >&2
fi

exec npx expo start --lan --clear
