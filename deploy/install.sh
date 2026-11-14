#!/bin/sh
set -eu
# Initial isolated deployment. Run from a reviewed extracted release on the existing VPS.
# No commands below change Spread, Traefik, firewall, SSH, passwords or server templates.
: "${FACT_WEIGHT_SHA:?Set FACT_WEIGHT_SHA to the full reviewed Git commit}"
case "$FACT_WEIGHT_SHA" in *[!a-f0-9]*|'') echo 'Invalid SHA'; exit 1;; esac
[ "${#FACT_WEIGHT_SHA}" = 40 ] || { echo 'Expected full Git SHA'; exit 1; }
[ -f /etc/fact-weight.env ] || { echo 'Create private Fact Weight environment first'; exit 1; }
[ "$(stat -c %a /etc/fact-weight.env)" = 600 ] || { echo 'Environment must be mode0600'; exit 1; }
[ -f Dockerfile ] && [ -f engine.mjs ] || { echo 'Run inside the reviewed Fact Weight release'; exit 1; }
if docker ps -a --format '{{.Names}}' | grep -qx fact-weight; then
    echo 'Own container already exists. Review an own-app update; initial installer will not replace it.'
    exit 1
fi
BEFORE_PID=$(systemctl show junction-spread.service -p MainPID --value)
BEFORE_STATE=$(systemctl show junction-spread.service -p ActiveState --value)
[ "$BEFORE_STATE" = active ] || { echo 'Spread is not active; stop and report'; exit 1; }
docker build --pull=false --tag "fact-weight:$FACT_WEIGHT_SHA" .
docker run -d --name fact-weight --restart unless-stopped --network bridge \
  --cpus 0.5 --memory 384m --pids-limit 64 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --env-file /etc/fact-weight.env \
  --label traefik.enable=true \
  --label 'traefik.http.routers.factweight.rule=Host(`fact-weight.72.61.22.106.sslip.io`)' \
  --label traefik.http.routers.factweight.entrypoints=websecure \
  --label traefik.http.routers.factweight.tls=true \
  --label traefik.http.routers.factweight.tls.certresolver=letsencrypt \
  --label traefik.http.routers.factweight.service=factweight \
  --label traefik.http.services.factweight.loadbalancer.server.port=4320 \
  "fact-weight:$FACT_WEIGHT_SHA"
sleep 2
AFTER_PID=$(systemctl show junction-spread.service -p MainPID --value)
AFTER_STATE=$(systemctl show junction-spread.service -p ActiveState --value)
printf 'Spread before PID %s, state %s; after PID %s, state %s\n' "$BEFORE_PID" "$BEFORE_STATE" "$AFTER_PID" "$AFTER_STATE"
[ "$BEFORE_PID" = "$AFTER_PID" ] && [ "$AFTER_STATE" = active ] || { echo 'Spread state changed; report immediately. No automatic Spread action.'; exit 1; }
docker exec fact-weight node -e "fetch('http://127.0.0.1:4320/api/health').then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
printf '%s\n' 'Own app started. Verify public HTTPS and a live analysis before marking C-09 done.'
