"""Fetch openly licensed upstream assets and generate local runtime files."""
from pathlib import Path
import urllib.request, hashlib
from concurrent.futures import ThreadPoolExecutor
from fontTools.ttLib import TTFont
import io, xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]/'public_html'/'_cms'
(root/'fonts').mkdir(parents=True,exist_ok=True)
(root/'vendor').mkdir(exist_ok=True)
def get(url):
    cache=root.parents[2]/'recovery'/'asset-cache';cache.mkdir(parents=True,exist_ok=True);p=cache/hashlib.sha256(url.encode()).hexdigest()
    if p.exists():return p.read_bytes()
    with urllib.request.urlopen(url,timeout=30) as r:data=r.read()
    p.write_bytes(data);return data
font=get('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf')
f=TTFont(io.BytesIO(font));f.flavor='woff';f.save(root/'fonts'/'montserrat.woff')
(root/'fonts'/'OFL.txt').write_bytes(get('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/OFL.txt'))
for name in ['qrcode.min.js','LICENSE']:
    (root/'vendor'/('qrcode-'+name if name=='LICENSE' else name)).write_bytes(get('https://raw.githubusercontent.com/davidshimjs/qrcodejs/master/'+name))
icons=['layout-dashboard','files','folder','file-code','menu','shield-check','log-out','plus','save','eye','download','upload','trash-2','rotate-ccw','search','chevron-right','chevron-down','external-link','check','x','copy','settings-2','arrow-up-right','clock-3']
parts=['<svg xmlns="http://www.w3.org/2000/svg">']
def fetch_icon(name):
    print('Fetching',name,flush=True)
    doc=ET.fromstring(get('https://raw.githubusercontent.com/lucide-icons/lucide/0.468.0/icons/'+name+'.svg'))
    return '<symbol id="'+name+'" viewBox="0 0 24 24">'+''.join(ET.tostring(c,encoding='unicode') for c in doc)+'</symbol>'
with ThreadPoolExecutor(max_workers=4) as pool:parts.extend(pool.map(fetch_icon,icons))
parts.append('</svg>');(root/'icons.svg').write_text(''.join(parts))
(root/'vendor'/'lucide-LICENSE').write_bytes(get('https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE'))
print('Local Montserrat, QRCode.js and Lucide ready')
