"""Run only inside the existing authorized VPS console. Never paste secrets in shell commands."""
import getpass
import os
from pathlib import Path

path = Path('/etc/fact-weight.env')
if path.exists():
    raise SystemExit('Fact Weight env already exists; inspect ownership without printing contents.')
os.umask(0o077)
router = getpass.getpass('Existing Hostinger Router key, hidden: ').strip()
context = getpass.getpass('Existing Context.dev Default key, hidden: ').strip()
if not router or not context.startswith('ctxt_secret_') or '\n' in router or '\n' in context:
    raise SystemExit('Credential shape invalid. No environment file created.')
with path.open('x') as f:
    f.write('HOSTINGER_AI_ROUTER_API_KEY=' + router + '\n')
    f.write('CONTEXT_DEV_API_KEY=' + context + '\n')
    f.write('ROUTER_MODEL=gpt-4.1-mini\nHOST=0.0.0.0\nPORT=4320\n')
    f.write('DEPLOYMENT_LABEL=Hostinger KVM 2\nMAX_DAILY_ANALYSES=150\n')
path.chmod(0o600)
print('Fact Weight environment created with mode0600. Values were not printed.')
