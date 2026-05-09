from sqlalchemy.orm import Session
from sqlalchemy import func, text
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance
from app.domains.culture.model import Place
from app.domains.inventory.model import Store
import httpx
import math
import numpy as np
from sklearn.cluster import KMeans

from sqlalchemy import cast
from geoalchemy2.types import Geography

def get_nearby_places(db: Session, lat: float, lon: float, radius_meters: int = 2000):
    user_location = cast(WKTElement(f'POINT({lon} {lat})', srid=4326), Geography(srid=4326))
    query = db.query(Place, ST_Distance(Place.geom.cast(Geography(srid=4326)), user_location).label('distance')) \
            .filter(ST_DWithin(Place.geom.cast(Geography(srid=4326)), user_location, radius_meters)) \
            .order_by(ST_Distance(Place.geom.cast(Geography(srid=4326)), user_location)).limit(50)
    results = query.all()
    return [{"id": p.id, "place_id": str(p.place_id) if p.place_id else None, "name": p.name, "category": p.category, "address": p.address, "lat": float(p.lat) if p.lat else None, "lon": float(p.lon) if p.lon else None, "distance_meters": round(float(d), 2) if d else None} for p, d in results]

def cluster_stores_around_places(db: Session, place_ids: list[int]):
    places = db.query(Place).filter(Place.id.in_(place_ids)).all()
    if not places:
        return {"clusters": []}

    # 1. Tính Bounding Box của các Place được chọn
    lats = [float(p.lat) for p in places if p.lat is not None]
    lons = [float(p.lon) for p in places if p.lon is not None]
    if not lats:
        return {"clusters": []}

    # Mở rộng bounding box thêm ~1km (xấp xỉ 0.01 độ)
    lat_min, lat_max = min(lats) - 0.01, max(lats) + 0.01
    lon_min, lon_max = min(lons) - 0.01, max(lons) + 0.01

    # 2. Query stores trong bounding box (cực nhanh nhờ GIST index)
    # Dùng raw SQL để chắc chắn đúng cú pháp PostGIS
    store_rows = db.execute(text("""
        SELECT store_id, name, lat::float, lon::float, category, address
        FROM stores
        WHERE geom IS NOT NULL
          AND lat BETWEEN :lat_min AND :lat_max
          AND lon BETWEEN :lon_min AND :lon_max
        LIMIT 100
    """), {"lat_min": lat_min, "lat_max": lat_max,
           "lon_min": lon_min, "lon_max": lon_max}).fetchall()

    # 3. Gom dữ liệu cho KMeans
    points = []
    metadata = []
    for p in places:
        if p.lat and p.lon:
            points.append([float(p.lat), float(p.lon)])
            metadata.append(("place", {
                "id": p.id,
                "place_id": str(p.place_id) if p.place_id else None,
                "name": p.name,
                "category": p.category,
                "address": p.address,
                "lat": float(p.lat),
                "lon": float(p.lon)
            }))

    for s in store_rows:
        if s[2] and s[3]:
            points.append([s[2], s[3]])
            metadata.append(("store", {
                "store_id": s[0],
                "place_id": None,
                "name": s[1],
                "category": s[4],
                "address": s[5],
                "lat": s[2],
                "lon": s[3]
            }))

    if len(points) < 2:
        return {"clusters": [{"cluster_id": 1, "center": {"lat": lats[0], "lon": lons[0]}, "places": [m[1] for m in metadata if m[0]=="place"], "stores": [m[1] for m in metadata if m[0]=="store"]}]}

    # 4. KMeans — giới hạn 2-5 cụm tự động
    n_clusters = min(max(2, len(places)), 5, len(points))
    X = np.array(points)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    labels = kmeans.fit_predict(X)
    centers = kmeans.cluster_centers_

    clusters = []
    for i in range(n_clusters):
        c_places, c_stores = [], []
        for idx, label in enumerate(labels):
            if label == i:
                typ, obj = metadata[idx]
                if typ == "place":
                    c_places.append(obj)
                else:
                    c_stores.append(obj)
        clusters.append({
            "cluster_id": i + 1,
            "center": {"lat": round(centers[i][0], 6), "lon": round(centers[i][1], 6)},
            "places": c_places,
            "stores": c_stores
        })

    return {"clusters": clusters}

def calculate_tsp_greedy(start_lat, start_lon, locations):
    """Thuật toán định tuyến TSP Greedy để tối ưu OSRM API Request"""
    def dist(p1, p2): return math.hypot(p1[0] - p2[0], p1[1] - p2[1])
    unvisited = [(idx, loc['lat'], loc['lon'], loc) for idx, loc in enumerate(locations)]
    current = (start_lat, start_lon)
    route_obj = []
    while unvisited:
        nearest = min(unvisited, key=lambda x: dist(current, (x[1], x[2])))
        current = (nearest[1], nearest[2])
        route_obj.append(nearest[3])
        unvisited.remove(nearest)
    return route_obj

async def fetch_real_weather(lat: float, lon: float):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                cw = res.json().get("current_weather", {})
                temp = cw.get("temperature")
                code = cw.get("weathercode")
                # Chuẩn hóa WMO Weather Code
                condition = "Clear"
                if code in [61, 63, 65, 80, 81, 82]: condition = "Rainy"
                elif code in [95, 96, 99]: condition = "Storm"
                elif code in [1, 2, 3]: condition = "Cloudy"
                
                return {"temperature": temp, "condition": condition, "code": code}
    except Exception:
        pass
    return {"temperature": 30, "condition": "Unknown", "code": -1}

async def plan_route_osrm(db: Session, current_lat: float, current_lon: float, place_ids: list[int]):
    places = db.query(Place).filter(Place.id.in_(place_ids)).all()
    if not places: raise ValueError("Không tìm thấy địa điểm nào khớp với place_ids cung cấp")

    weather = await fetch_real_weather(current_lat, current_lon)
    place_dicts = [{"id": p.id, "lat": float(p.lat), "lon": float(p.lon), "name": p.name} for p in places if p.lat and p.lon]

    if not place_dicts:
        raise ValueError("Các địa điểm được chọn không có tọa độ hợp lệ")

    # 1. Tính toán lộ trình TSP bằng thuật toán Tham Lam (Khoảng cách Euclid cơ bản)
    optimized_places = calculate_tsp_greedy(current_lat, current_lon, place_dicts)
    optimized_order_ids = [p["id"] for p in optimized_places]

    coords = [f"{current_lon},{current_lat}"]
    for p in optimized_places: coords.append(f"{p['lon']},{p['lat']}")

    coords_str = ";".join(coords)
    url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=polyline"

    waypoints_fallback = [{"lat": p["lat"], "lon": p["lon"], "name": p["name"]} for p in optimized_places]

    # 2. Bắn Async HTTP Request sang OSRM kèm Timeout 3 giây
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise ValueError("OSRM Server Error")
            data = response.json()

        if data.get("code") != "Ok":
            raise ValueError("OSRM No Route")

        route = data['routes'][0]
        osrm_waypoints = [
            {"lat": w["location"][1], "lon": w["location"][0], "name": optimized_places[i]["name"] if i < len(optimized_places) else ""}
            for i, w in enumerate(data.get('waypoints', [])[1:])  # skip origin
        ]
        return {
            "total_distance_meters": route['distance'],
            "waypoints": osrm_waypoints,
            "polyline": route['geometry'],
            "optimized_order": optimized_order_ids,
            "weather_context": weather
        }
    except (httpx.TimeoutException, ValueError, Exception):
        # Fallback: trả về đường chim bay khi OSRM timeout
        return {
            "total_distance_meters": 0.0,
            "waypoints": waypoints_fallback,
            "polyline": None,
            "optimized_order": optimized_order_ids,
            "weather_context": weather
        }