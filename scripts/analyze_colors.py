from PIL import Image
from collections import Counter
import os

def analyze_tile_colors(image_path, n_colors=5):
    """
    Analyze dominant colors in a map tile using PIL.
    """
    if not os.path.exists(image_path):
        print(f"Error: File not found at {image_path}")
        return

    try:
        # Read image
        img = Image.open(image_path)
        img = img.convert('RGB')
        
        # Resize for speed
        img = img.resize((100, 100))
        
        # Get pixels
        pixels = list(img.getdata())
        
        # Quantize colors (round to nearest 10)
        quantization = 10
        pixels_quantized = [tuple((p // quantization) * quantization for p in pixel) for pixel in pixels]
        
        # Count frequencies
        counter = Counter(pixels_quantized)
        total_pixels = len(pixels)
        
        # Get most common colors
        most_common = counter.most_common(n_colors)
        
        print(f"Analyzed {image_path}")
        print("-" * 30)
        print(f"{'Color (RGB)':<20} | {'Frequency':<10} | {'Likely Terrain'}")
        print("-" * 30)
        
        for color_tuple, count in most_common:
            r, g, b = color_tuple
            freq = count / total_pixels
            
            # Simple heuristic for terrain type
            terrain = "Unknown"
            if b > r + 20 and b > g:
                terrain = "Water (Blue)"
            elif g > r + 10 and g > b:
                terrain = "Plain/Forest (Green)"
            elif r > g and r > b:
                 terrain = "Desert/Mountain (Red/Brown)"
            elif abs(r-g) < 10 and abs(g-b) < 10 and r > 200:
                 terrain = "Snow/Cloud (White)"
            elif abs(r-g) < 10 and abs(g-b) < 10:
                 terrain = "Grey/Rock"
                 
            print(f"[{r:3d}, {g:3d}, {b:3d}]      | {freq:.1%}      | {terrain}")
            
    except Exception as e:
        print(f"Error analyzing image: {e}")

if __name__ == "__main__":
    # Analyze a few different tiles to get a good sample
    base_path = "c:/Users/GAKU/Desktop/MAPWAR/public/9dixingtu/terrain_512/400"
    
    # Tile 200 (Large file, likely complex)
    analyze_tile_colors(os.path.join(base_path, "200.jpg"))
    
    print("\n")
    
    # Tile 185 (Small file, likely simple/water?)
    analyze_tile_colors(os.path.join(base_path, "185.jpg"))
