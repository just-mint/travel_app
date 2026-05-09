import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.domains.spatial.service import get_nearby_places

db = SessionLocal()
try:
    res = get_nearby_places(db, 21.0285, 105.8542, 2000)
    print("Success:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
