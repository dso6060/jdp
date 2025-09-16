#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_j_icon(size, filename):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circle (dark blue)
    margin = 2
    draw.ellipse([margin, margin, size-margin, size-margin], 
                 fill=(26, 54, 93, 255), outline=(45, 55, 72, 255), width=1)
    
    # Try to use a system font, fallback to default
    try:
        # Try different font sizes based on icon size
        font_size = int(size * 0.6)
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            font = ImageFont.load_default()
    
    # Draw "J" in white
    text = "J"
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 2  # Slight adjustment for visual centering
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

# Create all required icon sizes
sizes = [16, 24, 32, 48, 128]
for size in sizes:
    create_j_icon(size, f"icon{size}.png")

print("All J icons created successfully!")
