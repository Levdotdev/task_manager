"""Rebuild browser/iOS icons from the geometry in resources/icon.svg (Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
NAVY = '#384b63'

def icon(size, rounded=False):
    scale = size * 4 / 100
    image = Image.new('RGB', (size * 4, size * 4), NAVY)
    draw = ImageDraw.Draw(image)
    def box(coords): return tuple(round(c * scale) for c in coords)
    draw.rounded_rectangle(box((24, 22, 76, 79)), radius=round(9 * scale), outline='white', width=round(5 * scale))
    def line(points, color, width):
        draw.line([box(p) for p in points], fill=color, width=round(width * scale), joint='curve')
        for x,y in (points[0],points[-1]):
            r=width/2
            draw.ellipse(box((x-r,y-r,x+r,y+r)),fill=color)
    for points in [((38,16),(38,28)),((62,16),(62,28)),((24,38),(76,38)),((34,50),(47,50)),((34,61),(47,61))]: line(points,'white',5)
    draw.ellipse(box((53,53,85,85)),fill='white')
    line(((61,69),(67,75),(79,63)),NAVY,5)
    image=image.resize((size,size),Image.Resampling.LANCZOS)
    if rounded:
        mask=Image.new('L',(size,size),0)
        ImageDraw.Draw(mask).rounded_rectangle((0,0,size-1,size-1),radius=round(size*.22),fill=255)
        image=image.convert('RGBA'); image.putalpha(mask)
    return image

for name,size in [('favicon.png',32),('apple-touch-icon.png',180),('icon-192.png',192),('icon-512.png',512)]:
    icon(size,rounded=True).save(ROOT/'public'/name)
icon(1024).save(ROOT/'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
# Transparent artwork lets the iOS launch screen follow the system appearance.
splash=Image.new('RGBA',(2732,2732),(0,0,0,0))
mark=icon(420,rounded=True); splash.paste(mark,((2732-420)//2,)*2,mark)
for name in ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']:
    splash.save(ROOT/'ios/App/App/Assets.xcassets/Splash.imageset'/name)
