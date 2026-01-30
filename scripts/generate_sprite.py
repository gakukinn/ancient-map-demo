from PIL import Image, ImageDraw

def create_soldier_sprite():
    # 32x32 per frame, 3 frames (Idle, Walk 1, Walk 2)
    # Total size: 96x32
    width = 96
    height = 32
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors
    skin = (255, 200, 150, 255)
    armor = (200, 50, 50, 255) # Red armor
    pants = (50, 50, 50, 255)
    spear = (150, 150, 150, 255)

    def draw_soldier(offset_x, pose):
        cx = offset_x + 16
        cy = 16

        # Head
        draw.ellipse([cx-4, 4, cx+4, 12], fill=skin)
        # Helmet
        draw.arc([cx-4, 4, cx+4, 12], start=180, end=0, fill=armor)
        
        # Body (Armor)
        draw.rectangle([cx-5, 13, cx+5, 22], fill=armor)

        # Legs
        if pose == 'idle':
            draw.rectangle([cx-4, 23, cx-1, 30], fill=pants) # Left
            draw.rectangle([cx+1, 23, cx+4, 30], fill=pants) # Right
        elif pose == 'walk1':
            draw.rectangle([cx-4, 22, cx-1, 28], fill=pants) # Left back
            draw.rectangle([cx+1, 24, cx+4, 31], fill=pants) # Right fwd
        elif pose == 'walk2':
            draw.rectangle([cx-4, 24, cx-1, 31], fill=pants) # Left fwd
            draw.rectangle([cx+1, 22, cx+4, 28], fill=pants) # Right back

        # Spear
        draw.line([cx+6, 5, cx+6, 30], fill=spear, width=2)

    draw_soldier(0, 'idle')
    draw_soldier(32, 'walk1')
    draw_soldier(64, 'walk2')

    img.save('public/assets/soldier.png')
    print("Sprite saved to public/assets/soldier.png")

if __name__ == "__main__":
    create_soldier_sprite()
