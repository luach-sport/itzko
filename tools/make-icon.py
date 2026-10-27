# Makes the icon of the main Itzko site (site/icon.png): a dark square with a big "I" and a bar in the
# colours of the four apps. Run: python3 tools/make-icon.py
from PIL import Image, ImageDraw, ImageFont

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=232, fill='#16181D')
font = ImageFont.truetype('site/fonts/Rubik-var.ttf', 640)
try:
    font.set_variation_by_axes([900])
except Exception:
    pass
d.text((S / 2, S / 2 - 60), 'I', font=font, fill='#FFFFFF', anchor='mm')
colors = ['#D9381E', '#1652F0', '#1E5F74', '#F2C14E']
w, gap, y0, h = 120, 22, 770, 64
x = (S - (len(colors) * w + (len(colors) - 1) * gap)) / 2
for c in colors:
    d.rounded_rectangle([x, y0, x + w, y0 + h], radius=h / 2, fill=c)
    x += w + gap
img.resize((512, 512), Image.LANCZOS).save('site/icon.png')
print('site/icon.png')
