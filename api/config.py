import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = PROJECT_ROOT / 'frontend'
DATABASE_PATH = Path(os.environ.get('SPENDWISE_DB', PROJECT_ROOT / 'spendwise.sqlite3'))
SESSION_SECONDS = 60 * 60 * 12
MAX_REQUEST_BYTES = 2_000_000
