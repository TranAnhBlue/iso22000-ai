"""Feature flag for optional demo data.

Demo data is disabled by default. Set ENABLE_DEMO_SEED=true only in an
isolated development or demonstration environment.
"""

import os


def demo_seed_enabled() -> bool:
    return os.getenv("ENABLE_DEMO_SEED", "false").strip().lower() in {"1", "true", "yes"}
