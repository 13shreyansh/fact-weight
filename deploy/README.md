# Isolated Hostinger deployment

The VPS also owns Spread. Never change its files, environment, service, dispatcher or policy. Never restart Docker/Traefik, reboot, replace templates or add another dispatcher.

Deploy only to `/opt/fact-weight/releases/<commit>`, link `/opt/fact-weight/current`, and install `fact-weight.service`. The app binds loopback port4320. Its environment belongs in `/etc/fact-weight.env`, mode0600, separate from Spread. Its service has a 384MB memory ceiling and half a core CPU limit. A reverse proxy route should target 127.0.0.1:4320 using existing web ingress, with a distinct hostname or exact path route. Inspect existing ingress first; do not replace its configuration wholesale.

Before and after deployment, record `systemctl show junction-spread.service -p ActiveState -p SubState -p MainPID` read-only. The PID should remain stable. Verify own health route, a real Context.dev extraction and Router comparison from the public URL. Never call a public landing page proof of live integration.

If no existing safe ingress route or console access is available, report it through the shared bridge. Do not create a new SSH credential or reset a password to work around it.
