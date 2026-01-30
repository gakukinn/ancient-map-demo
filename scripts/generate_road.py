
import math

class Hex:
    def __init__(self, q, r):
        self.q = q
        self.r = r

    def __eq__(self, other):
        return self.q == other.q and self.r == other.r

    def __hash__(self):
        return hash((self.q, self.r))

    def __repr__(self):
        return f"{self.q},{self.r}"

# Constants from GridSystem.ts
HEX_RADIUS = 0.15
ORIGIN_LAT = 34.26
ORIGIN_LNG = 108.94
PROJECTION_FACTOR = 1 / math.cos(ORIGIN_LAT * math.pi / 180)

def lat_lng_to_axial(lat, lng):
    y = lat - ORIGIN_LAT
    x = (lng - ORIGIN_LNG) / PROJECTION_FACTOR
    
    dist = math.sqrt(3) * HEX_RADIUS
    
    r = y / (dist * math.sin(math.pi / 3))
    q = (x - r * dist * math.cos(math.pi / 3)) / dist
    
    return hex_round(q, r)

def hex_round(q, r):
    x = q
    z = r
    y = -x - z
    
    rx = round(x)
    ry = round(y)
    rz = round(z)
    
    x_diff = abs(rx - x)
    y_diff = abs(ry - y)
    z_diff = abs(rz - z)
    
    if x_diff > y_diff and x_diff > z_diff:
        rx = -ry - rz
    elif y_diff > z_diff:
        ry = -rx - rz
    else:
        rz = -rx - ry
        
    return Hex(int(rx), int(rz))

def hex_lerp(a, b, t):
    # Convert to cube
    ax, az = a.q, a.r
    ay = -ax - az
    bx, bz = b.q, b.r
    by = -bx - bz
    
    cx = ax + (bx - ax) * t
    cy = ay + (by - ay) * t
    cz = az + (bz - az) * t
    
    # Cube round (convert back to axial q, r is just x, z)
    rx = round(cx)
    ry = round(cy)
    rz = round(cz)
    
    x_diff = abs(rx - cx)
    y_diff = abs(ry - cy)
    z_diff = abs(rz - cz)
    
    if x_diff > y_diff and x_diff > z_diff:
        rx = -ry - rz
    elif y_diff > z_diff:
        ry = -rx - rz
    else:
        rz = -rx - ry
        
    return Hex(int(rx), int(rz))

def hex_line(start, end):
    n = hex_distance(start, end)
    results = []
    if n == 0:
        return [start]
    for i in range(n + 1):
        results.append(hex_lerp(start, end, 1.0/n * i))
    return results

def hex_distance(a, b):
    dq = a.q - b.q
    dr = a.r - b.r
    return int((abs(dq) + abs(dq + dr) + abs(dr)) / 2)

# Waypoints
waypoints = [
    (32.995114, 97.008325), # Yushu
    (32.20, 96.48),         # Nangqian
    (31.21, 96.60),         # Riwoche
    (31.42, 95.59),         # Tengchen
    (31.92, 94.15),         # Bachen
    (31.88, 93.78),         # Sog
    (31.40, 92.00)          # Naqu (User coords)
]

hex_path = []
for i in range(len(waypoints) - 1):
    start_hex = lat_lng_to_axial(*waypoints[i])
    end_hex = lat_lng_to_axial(*waypoints[i+1])
    segment = hex_line(start_hex, end_hex)
    hex_path.extend(segment)

# Convert to string set to remove duplicates
unique_path = sorted(list(set([str(h) for h in hex_path])))

# Output formatted for TS array
print("    // Yushu -> Naqu Road")
for h in unique_path:
    print(f'    "{h}",')
