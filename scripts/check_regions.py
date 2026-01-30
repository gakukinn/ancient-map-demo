import re

# ================= Polygon Logic =================
def is_point_in_polygon(lat, lng, polygon):
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]['lng'], polygon[i]['lat']
        xj, yj = polygon[j]['lng'], polygon[j]['lat']

        intersect = ((yi > lat) != (yj > lat)) and \
                    (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside

# ================= Region Definitions (Copied from RegionSystem.ts) =================
# Note: Manually translated slightly to Python dict format

TIBET_REGION = [
    { 'lat': 36.5, 'lng': 78.0 }, { 'lat': 36.0, 'lng': 103.0 },
    { 'lat': 28.0, 'lng': 104.0 }, { 'lat': 27.0, 'lng': 99.0 },
    { 'lat': 27.0, 'lng': 88.0 }, { 'lat': 30.0, 'lng': 80.0 }
]

SICHUAN_REGION = [
    { 'lat': 33.0, 'lng': 105.0 }, { 'lat': 32.5, 'lng': 111.0 },
    { 'lat': 29.0, 'lng': 110.0 }, { 'lat': 28.0, 'lng': 106.0 },
    { 'lat': 29.5, 'lng': 101.5 }
]

LINGNAN_REGION = [
    { 'lat': 26.5, 'lng': 97.0 }, { 'lat': 27.0, 'lng': 120.0 },
    { 'lat': 23.0, 'lng': 120.0 }, { 'lat': 18.0, 'lng': 110.0 },
    { 'lat': 21.0, 'lng': 100.0 }
]

WESTERN_REGION = [
    { 'lat': 49.0, 'lng': 73.0 }, { 'lat': 46.0, 'lng': 96.0 },
    { 'lat': 40.0, 'lng': 98.0 }, { 'lat': 35.0, 'lng': 95.0 },
    { 'lat': 35.0, 'lng': 73.0 }
]

NOMADIC_REGION = [
    { 'lat': 52.0, 'lng': 85.0 }, { 'lat': 52.0, 'lng': 120.0 },
    { 'lat': 42.0, 'lng': 117.0 }, { 'lat': 40.0, 'lng': 106.0 },
    { 'lat': 41.5, 'lng': 96.0 }
]

NORTHEAST_REGION = [
    { 'lat': 53.0, 'lng': 115.0 }, { 'lat': 53.0, 'lng': 135.0 },
    { 'lat': 40.0, 'lng': 135.0 }, { 'lat': 39.0, 'lng': 120.0 },
    { 'lat': 42.0, 'lng': 117.0 }
]

NORTHWEST_REGION = [
    { 'lat': 42.0, 'lng': 96.0 }, { 'lat': 40.0, 'lng': 111.0 },
    { 'lat': 34.0, 'lng': 111.0 }, { 'lat': 34.0, 'lng': 103.0 },
    { 'lat': 36.0, 'lng': 96.0 }
]

NORTH_REGION = [
    { 'lat': 42.0, 'lng': 111.0 }, { 'lat': 41.0, 'lng': 120.0 },
    { 'lat': 35.0, 'lng': 120.0 }, { 'lat': 35.0, 'lng': 110.0 }
]

SOUTH_REGION = [
    { 'lat': 33.0, 'lng': 111.0 }, { 'lat': 33.0, 'lng': 122.0 },
    { 'lat': 27.0, 'lng': 122.0 }, { 'lat': 27.0, 'lng': 111.0 }
]

def get_region(lat, lng):
    if lng > 128: return 'JAPAN'
    if lat > 34 and lng > 124: return 'KOREA'

    if is_point_in_polygon(lat, lng, TIBET_REGION): return 'TIBET'
    if is_point_in_polygon(lat, lng, WESTERN_REGION): return 'WESTERN'
    if is_point_in_polygon(lat, lng, NOMADIC_REGION): return 'NOMADIC'
    if is_point_in_polygon(lat, lng, NORTHEAST_REGION): return 'NORTHEAST'
    
    if is_point_in_polygon(lat, lng, SICHUAN_REGION): return 'CHU_SHU'
    if is_point_in_polygon(lat, lng, LINGNAN_REGION): return 'LINGNAN'
    
    if is_point_in_polygon(lat, lng, NORTHWEST_REGION): return 'NORTHWEST'
    
    if is_point_in_polygon(lat, lng, NORTH_REGION): return 'NORTH'
    if is_point_in_polygon(lat, lng, SOUTH_REGION): return 'SOUTH'
    
    return 'CENTRAL'

# ================= Parse Logic =================
import sys
import traceback

try:
    CITY_FILE = 'src/data/cities.ts'
    cities = []

    print("Reading cities...", flush=True)
    import os
    if not os.path.exists(CITY_FILE):
        print(f"Error: File not found at {os.path.abspath(CITY_FILE)}")
        exit(1)

    with open(CITY_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find object blocks
    # Looking for id: '...' inside { ... }
    # Let's just find all matches of pattern: { id: '...', ... lat: ..., lng: ... }
    # This might miss some if keys are ordered differently, but standard for this file.
    
    # Improved regex: find logical blocks or just independent attributes nearby
    # The file structure is flat list of objects.
    
    # Let's iterate over lines to be safer? No, multiline.
    # Let's finding all "id: '...'" then looking forward for lat/lng?
    
    # Match patterns like: { id: 'foo', ... }
    # We will use findnot on the whole text.
    
    # Pattern to match a city block roughly:
    # { id: '(\w+)', name: '([^']+)', factionId: '[^']+', lat: ([\d\.-]+), lng: ([\d\.-]+)
    
    pattern = re.compile(r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',[^}]*lat:\s*([\d\.-]+),\s*lng:\s*([\d\.-]+)", re.DOTALL)
    
    count = 0
    for match in pattern.finditer(content):
        count += 1
        cities.append({
            'id': match.group(1),
            'name': match.group(2),
            'lat': float(match.group(3)),
            'lng': float(match.group(4))
        })

    print(f"Found {len(cities)} cities.", flush=True)

    # ================= Analysis =================
    counts = {}
    central_cities = []
    north_cities = []

    for city in cities:
        r = get_region(city['lat'], city['lng'])
        counts[r] = counts.get(r, 0) + 1
        
        if r == 'CENTRAL':
            central_cities.append(f"{city['name']} ({city['id']})")
        if r == 'NORTH':
            north_cities.append(f"{city['name']} ({city['id']})")

    print("\n=== Region Distribution ===", flush=True)
    for r, c in sorted(counts.items()):
        print(f"{r}: {c}")

    print(f"\n=== NORTH Region Cities ({len(north_cities)}) ===", flush=True)
    for c in north_cities:
        print(c)

    print(f"\n=== CENTRAL Region Cities (Fallback) ({len(central_cities)}) ===", flush=True)
    for c in central_cities:
        print(c)

except Exception:
    traceback.print_exc()
