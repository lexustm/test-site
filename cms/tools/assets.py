"""Fetch openly licensed upstream assets and generate local runtime files."""
from pathlib import Path
import urllib.request
from fontTools.ttLib import TTFont
import io, xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]/'public_html'/'_cms'
(root/'fonts').mkdir(parents=True,exist_ok=True)
(root/'vendor').mkdir(exist_ok=True)
def get(url):
    with urllib.request.urlopen(url,timeout=30) as r:return r.read()
font=get('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf')
f=TTFont(io.BytesIO(font));f.flavor='woff';f.save(root/'fonts'/'montserrat.woff')
(root/'fonts'/'OFL.txt').write_bytes(get('https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/OFL.txt'))
for name in ['qrcode.min.js','LICENSE']:
    (root/'vendor'/('qrcode-'+name if name=='LICENSE' else name)).write_bytes(get('https://raw.githubusercontent.com/davidshimjs/qrcodejs/master/'+name))
icons=['layout-dashboard','files','folder','file-code','menu','shield-check','log-out','plus','save','eye','download','upload','trash-2','rotate-ccw','search','chevron-right','chevron-down','external-link','check','x','copy','settings-2','arrow-up-right','clock-3']
parts=['<svg xmlns="http://www.w3.org/2000/svg">']
for name in icons:
    doc=ET.fromstring(get('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/'+('clock' if name=='clock-3' else name)+'.svg'))
    parts.append('<symbol id="'+name+'" viewBox="0 0 24 24">'+''.join(ET.tostring(c,encoding='unicode') for c in doc)+'</symbol>')
parts.append('</svg>');(root/'icons.svg').write_text(''.join(parts))
(root/'vendor'/'lucide-LICENSE').write_bytes(get('https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE'))
print('Local Montserrat, QRCode.js and Lucide ready')
