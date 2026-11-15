#!/bin/sh
set -eu
: "${SIGNAL_SHA:?Set SIGNAL_SHA to the complete release commit}"
case "$SIGNAL_SHA" in *[!a-f0-9]*|'') exit 1;; esac
[ "${#SIGNAL_SHA}" = 40 ]
[ -f /etc/fact-weight.env ]
# Reuse the already authorised private provider environment without copying or printing it.
BEFORE_FACT=$(docker inspect fact-weight --format '{{.Id}}')
BEFORE_TRAEFIK=$(docker inspect traefik-traefik-1 --format '{{.Id}}')
BEFORE_SPREAD=$(systemctl show junction-spread.service -p ActiveState -p SubState -p MainPID)
RESOLVER=$(docker inspect traefik-traefik-1 --format '{{json .Config.Cmd}}' | python3 -c 'import sys,json,re; names={m.group(1) for s in json.load(sys.stdin) if (m:=re.match(r"--certificatesresolvers\.([A-Za-z0-9_-]+)\.acme\.",s,re.I))};assert len(names)==1;print(next(iter(names)))')
docker build --pull=false --tag "signal-fire:$SIGNAL_SHA" .
if docker inspect signal-fire >/dev/null 2>&1; then
  docker stop --time 30 signal-fire >/dev/null
  docker rename signal-fire "signal-fire-previous-$(date +%s)"
fi
docker run -d --name signal-fire --restart unless-stopped --network bridge \
 --cpus 1 --memory 2048m --memory-swap 2048m --pids-limit 128 --read-only \
 --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop ALL --security-opt no-new-privileges:true \
 --env-file /etc/fact-weight.env --env-file /etc/signal-fire-v2.env -e PORT=4321 -e HOST=0.0.0.0 -e NODE_ENV=production \
 -e SIGNAL_DATA=/data -e SIGNAL_SCHEDULER=1 -e CONTEXT_DAILY_CAP=6000 -e SIGNAL_PUBLIC_URL=https://signal-fire.72.61.22.106.sslip.io -e "SIGNAL_COMMIT=$SIGNAL_SHA" \
 --mount type=bind,src=/opt/signal-fire/data,dst=/data \
 --label traefik.enable=true \
 --label 'traefik.http.routers.signalfire.rule=Host(`signal-fire.72.61.22.106.sslip.io`)' \
 --label traefik.http.routers.signalfire.entrypoints=websecure \
 --label traefik.http.routers.signalfire.tls=true \
 --label "traefik.http.routers.signalfire.tls.certresolver=$RESOLVER" \
 --label traefik.http.routers.signalfire.service=signalfire \
 --label traefik.http.services.signalfire.loadbalancer.server.port=4321 \
 "signal-fire:$SIGNAL_SHA"
[ "$BEFORE_FACT" = "$(docker inspect fact-weight --format '{{.Id}}')" ]
[ "$BEFORE_TRAEFIK" = "$(docker inspect traefik-traefik-1 --format '{{.Id}}')" ]
[ "$BEFORE_SPREAD" = "$(systemctl show junction-spread.service -p ActiveState -p SubState -p MainPID)" ]
printf '%s\n' 'Signal Fire started. Existing Fact Weight, Traefik and Spread state unchanged.'
