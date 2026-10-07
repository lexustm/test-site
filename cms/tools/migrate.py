"""Rebuild seeds/assets from the owner's original ZIP, without extracting client media."""
import argparse, hashlib, json, posixpath, re, zipfile
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from lxml import html

parser = argparse.ArgumentParser()
parser.add_argument('archive')
parser.add_argument('--root', default=str(Path(__file__).resolve().parents[1]))
args = parser.parse_args()
root = Path(args.root)
public = root / 'public_html'
private = root / 'vibelink_private'
public.mkdir(parents=True, exist_ok=True)
private.mkdir(parents=True, exist_ok=True)
z = zipfile.ZipFile(args.archive)
prefix = next(i.filename[:-len('index.html')] for i in z.infolist() if i.filename.endswith('/public_html/index.html'))
names = {i.filename[len(prefix):]: i for i in z.infolist() if i.filename.startswith(prefix) and not i.is_dir()}

def url(value, route):
    if not value or value.startswith(('#', 'data:', 'mailto:', 'tel:', 'javascript:')):
        return value
    joined = urljoin('https://vibelink.ru' + route, value)
    p = urlsplit(joined)
    return (p.path + ('?' + p.query if p.query else '') + ('#' + p.fragment if p.fragment else '')) if p.netloc == 'vibelink.ru' else joined

def css_paths(text, route):
    return re.sub(r'url\([\"\']?([^\)\"\']+)[\"\']?\)', lambda m: 'url("' + url(m[1], route) + '")', text)

pages = []
media = []
for name, info in names.items():
    if name.startswith('link/'):
        digest = hashlib.sha256()
        with z.open(info) as src:
            while chunk := src.read(1024 * 1024):
                digest.update(chunk)
        try:
            display = name.encode('cp437').decode('utf8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            display = name
        media.append({'path': display, 'size': info.file_size, 'sha256': digest.hexdigest()})
        continue
    if not name.endswith('.html') and not name.startswith('.') and not re.search(r'\.(php|sql|log|bak)$', name):
        target = public / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(info))
    if not name.endswith('.html'):
        continue
    route = '/' if name == 'index.html' else '/404.html' if name == '404.html' else '/' + name.removesuffix('index.html')
    doc = html.fromstring(z.read(info))
    body = doc.find('body')
    styles, scripts, dependencies, jsonld = [], [], [], []
    for node in list(doc.xpath('//style | //link[@rel="stylesheet"]')):
        if node.tag == 'style':
            styles.append(css_paths(node.text or '', route))
        else:
            source = url(node.get('href'), route)
            local = urlsplit(source).path.lstrip('/')
            if local in names:
                styles.append(css_paths(z.read(names[local]).decode('utf8'), '/' + posixpath.dirname(local) + '/'))
            elif not source.startswith('https://fonts.'):
                dependencies.append({'type': 'css', 'url': source})
        node.getparent().remove(node)
    for node in list(doc.xpath('//script')):
        if node.get('type') == 'application/ld+json':
            jsonld.append(node.text or '{}')
        elif node.get('src'):
            source = url(node.get('src'), route)
            local = urlsplit(source).path.lstrip('/')
            if local.endswith('metrika.js'):
                pass
            elif local in names:
                scripts.append(z.read(names[local]).decode('utf8'))
            else:
                dependencies.append({'type': 'js', 'url': source})
        else:
            scripts.append(node.text or '')
        node.getparent().remove(node)
    for node in list(body.xpath('.//*[@id="navbar"] | .//header[contains(@class,"sp-header")] | .//footer')):
        node.getparent().remove(node)
    for node in body.iter():
        for attr in ['href', 'src', 'poster', 'action']:
            if node.get(attr):
                node.set(attr, url(node.get(attr), route))
    title = ''.join(doc.xpath('//title/text()'))
    desc = doc.xpath('//meta[@name="description"]/@content')
    markup = (body.text or '') + ''.join(html.tostring(n, encoding='unicode') for n in body)
    data = {'title': title.replace('—', '-'), 'description': desc[0] if desc else '', 'html': markup,
            'css': '\n'.join(styles), 'js': '\n'.join(scripts), 'dependencies': dependencies, 'jsonld': jsonld,
            'body_id': body.get('id', ''), 'noindex': route == '/404.html'}
    pages.append({'route': route, 'name': title.split(' - ')[0].split(' · ')[0], 'data': data})
product = {'title': 'Продукты VIBELINK', 'description': 'Приложения и сервисы VIBELINK', 'html': '<main class="products"><p class="eyebrow">VIBELINK PRODUCTS</p><h1>Полезные продукты.<br>Для обычных задач.</h1><article><div class="product-icon">Aa</div><div><h2>Крупный текст</h2><p>Покажите сообщение крупно на экране телефона.</p><a class="product-button" href="https://www.rustore.ru/catalog/app/com.vibelink.bigtext" target="_blank" rel="noopener">Открыть в RuStore</a><p><a href="/krupny-text-privacy/">Политика конфиденциальности</a></p></div></article></main>', 'css': '.products{max-width:1100px;margin:0 auto;padding:90px 24px;color:#202335}.products h1{font-size:clamp(36px,6vw,64px);line-height:1.1;letter-spacing:-2px}.eyebrow{color:#6d37e5;font-weight:800;letter-spacing:3px}.products article{display:flex;gap:32px;border:1px solid #e4e6ee;border-radius:28px;padding:36px;margin-top:48px;background:#fff}.product-icon{display:grid;place-items:center;flex:0 0 112px;height:112px;border-radius:28px;background:#6d37e5;color:white;font-size:48px;font-weight:800}.product-button{display:inline-block;background:#6d37e5;color:white!important;padding:14px 22px;border-radius:14px;text-decoration:none}.products a{color:#6d37e5}@media(max-width:600px){.products article{flex-direction:column}}', 'js': '', 'dependencies': [], 'jsonld': [], 'body_id': '', 'noindex': False}
pages.append({'route': '/produkty/', 'name': 'Продукты', 'data': product})
(private / 'seed.json').write_text(json.dumps({'pages': pages, 'media': media}, ensure_ascii=False, indent=2), encoding='utf8')
# Transparent public-only source seeds. Client file inventory remains local, never in Git.
(private/'seed-pages').mkdir(exist_ok=True)
for n,page in enumerate(pages):
    (private/'seed-pages'/f'{n:02d}.json').write_text(json.dumps(page,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'pages': len(pages), 'media': len(media), 'assets': sum(1 for p in public.rglob('*') if p.is_file())}))
