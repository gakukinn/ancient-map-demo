"""
从标注图片中提取地形边界
"""
import cv2
import numpy as np
from PIL import Image

# 地图范围（从gameData.js）
MAP_BOUNDS = {
    'north': 53.56,
    'south': 18.11,
    'east': 134.77,
    'west': 73.33
}

def pixel_to_latlng(x, y, img_width, img_height):
    """将像素坐标转换为经纬度"""
    lng = MAP_BOUNDS['west'] + (x / img_width) * (MAP_BOUNDS['east'] - MAP_BOUNDS['west'])
    lat = MAP_BOUNDS['north'] - (y / img_height) * (MAP_BOUNDS['north'] - MAP_BOUNDS['south'])
    return lat, lng

def extract_sea_regions(image_path):
    """提取海域区域"""
    # 读取图片
    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    height, width = img.shape[:2]
    
    print(f"图片尺寸: {width} x {height}")
    
    # 创建红色掩码（识别红色标注）
    # 红色范围：R > 200, G < 100, B < 100
    lower_red = np.array([200, 0, 0])
    upper_red = np.array([255, 100, 100])
    mask = cv2.inRange(img_rgb, lower_red, upper_red)
    
    # 形态学操作，去除噪点
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # 查找轮廓
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"找到 {len(contours)} 个海域区域")
    
    # 转换为地形数据格式
    sea_regions = []
    
    for i, contour in enumerate(contours):
        # 过滤太小的区域（噪点）
        area = cv2.contourArea(contour)
        if area < 100:  # 小于100像素的忽略
            continue
        
        # 简化轮廓（减少点数）
        epsilon = 0.005 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        
        # 转换为经纬度坐标
        bounds = []
        for point in approx:
            x, y = point[0]
            lat, lng = pixel_to_latlng(x, y, width, height)
            bounds.append([lng, lat])
        
        # 计算区域中心（用于命名）
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            center_lat, center_lng = pixel_to_latlng(cx, cy, width, height)
        else:
            center_lat, center_lng = bounds[0][1], bounds[0][0]
        
        region = {
            'id': f'sea_region_{i+1}',
            'name': f'海域{i+1}',
            'type': 'sea',
            'bounds': bounds,
            'center': [center_lng, center_lat],
            'area': area,
            'points': len(bounds)
        }
        
        sea_regions.append(region)
        print(f"  区域{i+1}: {len(bounds)}个点, 面积{area:.0f}像素, 中心({center_lat:.2f}, {center_lng:.2f})")
    
    return sea_regions

def generate_terrain_data(sea_regions):
    """生成terrainData.js格式的代码"""
    code = []
    
    for region in sea_regions:
        code.append(f"    // {region['name']}")
        code.append(f"    {{")
        code.append(f"        id: '{region['id']}',")
        code.append(f"        name: '{region['name']}',")
        code.append(f"        type: 'sea',")
        code.append(f"        bounds: [")
        
        for point in region['bounds']:
            code.append(f"            [{point[0]:.6f}, {point[1]:.6f}],")
        
        code.append(f"        ]")
        code.append(f"    }},")
        code.append("")
    
    return '\n'.join(code)

if __name__ == '__main__':
    # 提取海域
    sea_regions = extract_sea_regions('my_new_task.png')
    
    # 按面积排序（大的在前）
    sea_regions.sort(key=lambda x: x['area'], reverse=True)
    
    # 生成代码
    code = generate_terrain_data(sea_regions)
    
    # 保存到文件
    with open('sea_regions_output.txt', 'w', encoding='utf-8') as f:
        f.write(code)
    
    print(f"\n✅ 成功提取 {len(sea_regions)} 个海域区域")
    print(f"✅ 代码已保存到 sea_regions_output.txt")
    print(f"\n总点数: {sum(r['points'] for r in sea_regions)}")
