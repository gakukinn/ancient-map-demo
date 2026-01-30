from PIL import Image
import os

path = r"c:\Users\GAKU\Desktop\MAPWAR\public\assets\soldier.png"

try:
    with Image.open(path) as img:
        width, height = img.size
        print(f"Total Width: {width}")
        print(f"Total Height: {height}")
        print(f"Single Frame Width: {width / 3}")
        print(f"Single Frame Ratio: {(width / 3) / height:.2f}")
except Exception as e:
    print(f"Error: {e}")
