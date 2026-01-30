import math

def tile_to_latlng(x, y, zoom):
    n = 2.0 ** zoom
    lon_deg = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg

zoom = 9
# COVERAGE_BOUNDS: { 9: { xMin: 359, xMax: 443, yMin: 173, yMax: 229 } }
# 注意：瓦片坐标通常是左上角。
# xMin (左) -> West
# xMax + 1 (右) -> East
# yMin (上) -> North
# yMax + 1 (下) -> South

x_min, x_max = 359, 443
y_min, y_max = 173, 229

north, west = tile_to_latlng(x_min, y_min, zoom)
south, east = tile_to_latlng(x_max + 1, y_max + 1, zoom)

print(f"Zoom Level: {zoom}")
print(f"X range: {x_min} - {x_max}")
print(f"Y range: {y_min} - {y_max}")
print("-" * 30)
print(f"West (Left): {west:.4f}")
print(f"East (Right): {east:.4f}")
print(f"North (Top): {north:.4f}")
print(f"South (Bottom): {south:.4f}")
