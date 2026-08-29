from app.core.database import SessionLocal
from app.api.v1.endpoints.dashboard import get_executive_overview_stats
import traceback

db = SessionLocal()
try:
    stats = get_executive_overview_stats(db)
    print("Stats calculated successfully:", stats)
except Exception as e:
    print("Error in get_executive_overview_stats:")
    traceback.print_exc()
finally:
    db.close()
