import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.domains.spatial.service import get_nearby_places
from app.domains.culture.model import Place
from sqlalchemy.orm import Session
from sqlalchemy import func, text, cast
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance
from geoalchemy2.types import Geography

db = SessionLocal()
try:
    lon, lat = 105.8542, 21.0285
    radius_meters = 2000
    user_location = cast(WKTElement(f'POINT({lon} {lat})', srid=4326), Geography(srid=4326))
    
    query = db.query(Place, ST_Distance(Place.geom.cast(Geography(srid=4326)), user_location).label('distance')) \
            .filter(ST_DWithin(Place.geom.cast(Geography(srid=4326)), user_location, radius_meters)) \
            .order_by(ST_Distance(Place.geom.cast(Geography(srid=4326)), user_location)).limit(50)
    
    results = query.all()
    print("Success:", len(results))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
