"""Regenerate checked-in artwork. Requires Pillow; no dependency at site runtime."""
import itertools
import math
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)
S = 3
W, H = 1200, 630
im = Image.new('RGB', (W, H))
pixels = im.load()
for y in range(H):
    for x in range(W):
        glow = math.exp(-(((x-870)/390)**2 + ((y-310)/290)**2))
        pixels[x, y] = (round(5+6*glow), round(7+17*glow), round(17+23*glow))
im = im.resize((W*S, H*S))
d = ImageDraw.Draw(im, 'RGBA')
def line(points, color, width=1):
    d.line([(round(x*S), round(y*S)) for x,y in points], fill=color, width=round(width*S), joint='curve')
def dot(x,y,r,color):
    d.ellipse(((x-r)*S,(y-r)*S,(x+r)*S,(y+r)*S),fill=color)

rng = random.Random(13)
for _ in range(150):
    x,y=rng.uniform(30,1170),rng.uniform(24,606)
    if x<630 and 185<y<480:continue
    dot(x,y,rng.uniform(.4,1.1),(164,192,219,rng.randint(35,125)))
line([(48,52),(1152,52)],(148,184,220,40))
line([(48,578),(1152,578)],(148,184,220,40))

# Exact orthographic projection along a cube's body diagonal.
def project(v, scale=1):
    x,y,z=v
    return (880+(x-z)/math.sqrt(2)*165*scale,315-(-x+2*y-z)/math.sqrt(6)*165*scale)
cube=list(itertools.product([-1,1],repeat=3))
edges=[(a,b) for a,b in itertools.combinations(cube,2) if sum(x!=y for x,y in zip(a,b))==1]
for a,b in edges:line([project(a),project(b)],(142,207,232,145),1.25)
tetra=[v for v in cube if math.prod(v)==1]
dual=[v for v in cube if math.prod(v)==-1]
for points,color in [(tetra,(241,207,137,220)),(dual,(106,199,229,210))]:
    for a,b in itertools.combinations(points,2):line([project(a),project(b)],color,1.5)
for k in [.5,.25]:
    for a,b in edges:line([project(a,k),project(b,k)],(133,196,221,115),1)
octa=[tuple(sign if j==axis else 0 for j in range(3)) for axis in range(3) for sign in [-1,1]]
for a,b in itertools.combinations(octa,2):
    if sum(x*y for x,y in zip(a,b))==0:line([project(a),project(b)],(239,209,147,110),1)
for v in cube:dot(*project(v),3,(234,231,203,255))
for v in octa:dot(*project(v),1.8,(163,221,234,235))

fonts=[Path('/System/Library/Fonts/Supplemental/Arial.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
font_path=next((p for p in fonts if p.exists()),None)
if not font_path:raise SystemExit('Install Arial or DejaVu Sans to regenerate the banner')
def text(x,y,copy,size,color):
    d.text((x*S,y*S),copy,font=ImageFont.truetype(str(font_path),size*S),fill=color)
text(59,197,'Hollow',82,(236,244,252,255))
text(59,283,'Geometry',82,(239,207,150,255))
line([(64,403),(112,403)],(239,207,150,210),2)
text(64,429,'просто о пустом.',21,(177,199,220,255))
im.resize((W,H),Image.Resampling.LANCZOS).save(ASSETS/'social-card.png',optimize=True)

# A hollow isometric cube: the three axes terminate around an open hexagonal core.
outer=[(32+25*math.cos(math.radians(-90+i*60)),32+25*math.sin(math.radians(-90+i*60))) for i in range(6)]
inner=[(32+7*math.cos(math.radians(-90+i*60)),32+7*math.sin(math.radians(-90+i*60))) for i in range(6)]
path=lambda points:' '.join(f'{x:.3f},{y:.3f}' for x,y in points)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="16" fill="#080e1c"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<polygon points="{path(outer)}" stroke="#99d8ee" stroke-width="2.8"/>
<polygon points="{path(inner)}" stroke="#edca85" stroke-width="2.3"/>
'''
for i in [0,2,4]:svg+=f'<path d="M{path([outer[i]])} L{path([inner[i]])}" stroke="#edca85" stroke-width="2.8"/>\n'
svg+='</g></svg>\n'
(ASSETS/'favicon.svg').write_text(svg)
icon=Image.new('RGBA',(256,256));ink=ImageDraw.Draw(icon)
ink.rounded_rectangle((0,0,255,255),radius=64,fill='#080e1c')
def iline(points,color,width):ink.line([(round(x*4),round(y*4)) for x,y in points],fill=color,width=width,joint='curve')
iline(outer+[outer[0]],'#99d8ee',11);iline(inner+[inner[0]],'#edca85',9)
for i in [0,2,4]:iline([outer[i],inner[i]],'#edca85',11)
icon.save(ASSETS/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
icon.resize((180,180),Image.Resampling.LANCZOS).save(ASSETS/'apple-touch-icon.png')
print('Generated social-card.png (1200×630), favicon.svg / ico, apple-touch-icon.png')
