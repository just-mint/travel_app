import sys
import traceback
from app.db.session import SessionLocal
from app.domains.spatial.service import get_nearby_places

db = SessionLocal()
try:
    places = get_nearby_places(db, 21.0285, 105.8542, 2000)
    print("Success:", places)
except Exception as e:
    print("ERROR OCCURRED:")
    traceback.print_exc()
