import os
from pathlib import Path

from dotenv import load_dotenv

# Load the same files agent.py uses, before any dummy defaults. First load wins,
# so an explicit process env or root/.env.local key is kept for behavior tests.
_agent_dir = Path(__file__).resolve().parents[1]
load_dotenv(_agent_dir / ".env.local")
load_dotenv(_agent_dir.parent / ".env")

os.environ.setdefault("AGENT_NAME", "test-agent")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
