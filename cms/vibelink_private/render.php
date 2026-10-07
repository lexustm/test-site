<?php
declare(strict_types=1);
function public_menu(string $placement): string {
    $rows=query('SELECT m.*,p.route,p.published FROM vl_menu m LEFT JOIN vl_pages p ON p.id=m.page_id ORDER BY position,id')->fetchAll();$children=[];
    foreach($rows as $r)if($r['visible']&&in_array($r['placement'],[$placement,'both'],true)&&(!$r['page_id']||$r['published']!==null))$children[(int)($r['parent_id']??0)][]=$r;
    $render=function(int $parent)use(&$render,$children){$out='<ul>';foreach($children[$parent]??[] as $r){$url=$r['page_id']?$r['route']:$r['url'];$label=h($r['label']);$link=$url!==''?'<a href="'.h($url).'"'.(str_starts_with($url,'https://')?' target="_blank" rel="noopener noreferrer"':'').'>'.$label.'</a>':'<span>'.$label.'</span>';$out.='<li>';
        if(isset($children[(int)$r['id']]))$out.='<details><summary>'.$label.'<span aria-hidden="true">⌄</span></summary><div class="vl-submenu">'.($url?'<a class="vl-all" href="'.h($url).'">'.$label.' - все</a>':'').$render((int)$r['id']).'</div></details>';else $out.=$link;$out.='</li>';}$out.='</ul>';return $out;};return $render(0);
}
function render_page(array $d, string $route='/',bool $preview=false,int $status=200): never {
    http_response_code($status);header('Content-Type: text/html; charset=utf-8');$nonce=base64_encode(random_bytes(18));
    if($preview){header("Content-Security-Policy: sandbox allow-scripts; default-src 'self'; script-src 'self' 'nonce-$nonce' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; media-src 'self' https:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ".origin(true));header('Cache-Control: no-store');header('X-Robots-Tag: noindex, nofollow');}
    else header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-$nonce' https://mc.yandex.ru https://yastatic.net; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://mc.yandex.ru https://mc.yandex.com https://mc.webvisor.org https://mc.webvisor.com wss://mc.yandex.ru wss://mc.yandex.com; frame-src blob: https://mc.yandex.ru https://mc.yandex.com; media-src 'self' https:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    $robots=$preview||!empty($d['noindex'])||$status===404?'noindex, nofollow':'index, follow';
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.h($d['title']).'</title><meta name="description" content="'.h($d['description']).'"><meta name="robots" content="'.$robots.'"><link rel="icon" href="/favicon.ico"><link rel="canonical" href="'.h(origin().$route).'"><meta property="og:title" content="'.h($d['title']).'"><meta property="og:description" content="'.h($d['description']).'"><meta property="og:url" content="'.h(origin().$route).'"><meta property="og:type" content="website">';
    foreach($d['dependencies']??[] as $dep)if($dep['type']==='css')echo '<link rel="stylesheet" href="'.h($dep['url']).'">';
    echo '<style>'.str_ireplace('</style','<\\/style',$d['css']).'</style><link rel="stylesheet" href="/_cms/public.css">';
    foreach($d['jsonld']??[] as $j)echo '<script type="application/ld+json" nonce="'.$nonce.'">'.str_replace('<','\\u003c',$j).'</script>';
    echo '</head><body'.(!empty($d['body_id'])?' id="'.h($d['body_id']).'"':'').'><header class="vl-header"><div class="vl-header-inner"><a class="vl-logo" href="/" aria-label="VIBELINK - главная">VIBE<span>LINK</span><i></i></a><button class="vl-menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false">☰</button><nav class="vl-nav" aria-label="Главное меню">'.public_menu('header').'</nav><a class="vl-contact" href="/#contact">Обсудить проект ↗</a></div></header>';
    echo $d['html'];
    echo '<footer class="vl-footer"><div class="vl-footer-inner"><div><a class="vl-logo" href="/">VIBE<span>LINK</span><i></i></a><p>Digital-услуги и полезные продукты.</p></div><nav aria-label="Ссылки в подвале">'.public_menu('footer').'</nav><p>© '.date('Y').' VIBELINK</p></div></footer><script nonce="'.$nonce.'" src="/_cms/public.js"></script>';
    foreach($d['dependencies']??[] as $dep)if($dep['type']==='js')echo '<script nonce="'.$nonce.'" src="'.h($dep['url']).'"></script>';
    echo '<script nonce="'.$nonce.'">'.str_ireplace('</script','<\\/script',$d['js']).'</script>';
    if(!$preview)echo '<script nonce="'.$nonce.'" src="/assets/js/metrika.js?v=2"></script>';echo '</body></html>';exit;
}
function public_route(string $path): never {
    if($path==='/robots.txt'){header('Content-Type: text/plain; charset=utf-8');echo "User-agent: *\nAllow: /\nDisallow: /link/\nDisallow: /page-files/\nDisallow: /preview/\nDisallow: /_cms/\nSitemap: ".origin()."/sitemap.xml\n";exit;}
    if($path==='/sitemap.xml'){header('Content-Type: application/xml; charset=utf-8');echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';foreach(query('SELECT route,published,updated_at FROM vl_pages WHERE published IS NOT NULL')->fetchAll() as $p){$d=json_decode($p['published'],true);if(!empty($d['noindex'])||$p['route']==='/404.html')continue;echo '<url><loc>'.h(origin().$p['route']).'</loc><lastmod>'.substr($p['updated_at'],0,10).'</lastmod></url>';}echo '</urlset>';exit;}
    if(preg_match('~^/preview/([a-f0-9]{64})$~D',$path,$m)){$p=query('SELECT data FROM vl_previews WHERE token=? AND expires>?',[$m[1],time()])->fetch();if(!$p)fail(404,'Предпросмотр истек.');render_page(json_decode($p['data'],true),'/',true);}
    if($path==='/index.html'){header('Location: /',true,301);exit;}
    if(str_ends_with($path,'/index.html')){header('Location: '.substr($path,0,-10),true,301);exit;}
    if($path!=='/'&&!str_ends_with($path,'/')&&!str_contains(basename($path),'.')){if(query('SELECT id FROM vl_pages WHERE route=? AND published IS NOT NULL',[$path.'/'])->fetch()){header('Location: '.$path.'/',true,301);exit;}}
    $p=query('SELECT route,published FROM vl_pages WHERE route=? AND published IS NOT NULL',[$path])->fetch();if($p)render_page(json_decode($p['published'],true),$path,false,$path==='/404.html'?404:200);
    $p=query("SELECT published FROM vl_pages WHERE route='/404.html'")->fetch();if($p&&$p['published'])render_page(json_decode($p['published'],true),$path,false,404);fail(404,'Страница не найдена.');
}
