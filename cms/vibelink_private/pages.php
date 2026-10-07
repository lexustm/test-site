<?php
declare(strict_types=1);
function page(int $id, bool $lock=false): array { $p=query('SELECT * FROM vl_pages WHERE id=?'.($lock?' FOR UPDATE':''),[$id])->fetch();if(!$p)fail(404,'Страница не найдена.');return $p; }
function route_value(string $s): string {
    if($s==='/'||$s==='/404.html')return $s;
    if(!preg_match('~^/(?:[a-z0-9][a-z0-9-]*/){1,3}$~D',$s)||strlen($s)>240)fail(400,'Адрес: /nazvanie/ или /razdel/podrazdel/.');
    if(preg_match('~^/(?:_cms|api|admin|link|page-files|assets|vibelink_private|preview|export)/~',$s))fail(400,'Этот адрес зарезервирован.');return $s;
}
function page_data(array $d): array {
    $out=[];foreach(['title'=>300,'description'=>1000,'html'=>1500000,'css'=>500000,'js'=>500000,'body_id'=>100] as $k=>$len)$out[$k]=text_value($d[$k]??'',$len);
    if(!preg_match('/^[a-zA-Z0-9_-]*$/D',$out['body_id']))fail(400,'Неверный body id.');
    $out['noindex']=!empty($d['noindex']);$out['dependencies']=[];$out['jsonld']=[];
    foreach($d['dependencies']??[] as $item){$t=$item['type']??'';$u=text_value($item['url']??'',2048);if(!in_array($t,['js','css'],true)||!(str_starts_with($u,'/')&&!str_starts_with($u,'//')||filter_var($u,FILTER_VALIDATE_URL)&&str_starts_with($u,'https://')))fail(400,'Зависимости: локальный путь /... или HTTPS.');$out['dependencies'][]=['type'=>$t,'url'=>$u];}
    if(count($out['dependencies'])>30)fail(400,'Слишком много зависимостей.');
    foreach($d['jsonld']??[] as $raw){$raw=text_value($raw,100000);try{json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(Throwable){fail(400,'JSON-LD должен быть корректным JSON.');}$out['jsonld'][]=$raw;}return $out;
}
function template_data(string $name): array {
    $d=['title'=>'Новая страница','description'=>'','html'=>'','css'=>'','js'=>'','dependencies'=>[],'jsonld'=>[],'body_id'=>'','noindex'=>false];
    if($name==='text'){$d['html']='<main class="text-page"><h1>Заголовок страницы</h1><p>Ваш текст.</p></main>';$d['css']='.text-page{max-width:850px;margin:70px auto;padding:0 24px;color:#202335;line-height:1.8}';}
    if(in_array($name,['product','service'],true)){$d['html']='<main class="promo"><p>VIBELINK</p><h1>Название '.($name==='product'?'продукта':'услуги').'</h1><p>Коротко о том, чем это полезно.</p><a href="/#contact">Связаться</a><section><h2>Возможности</h2><p>Расскажите о главном.</p></section></main>';$d['css']='.promo{max-width:1100px;margin:0 auto;padding:80px 24px;color:#202335}.promo h1{font-size:clamp(36px,6vw,64px);line-height:1.1}.promo section{margin-top:60px;padding:32px;border:1px solid #e2e4ed;border-radius:24px}.promo a{display:inline-block;padding:14px 22px;background:#6d37e5;color:#fff;border-radius:14px;text-decoration:none}';}return $d;
}
function menu_valid(array $rows): void {
    $map=[];foreach($rows as $r)$map[(int)$r['id']]=$r;
    foreach($rows as $r){$seen=[];$at=(int)$r['id'];$depth=0;while($at){if(isset($seen[$at]))fail(400,'Меню не может содержать циклы.');if(!isset($map[$at]))fail(400,'Родитель не найден.');$seen[$at]=true;if(++$depth>3)fail(400,'В меню максимум три уровня.');$at=(int)($map[$at]['parent_id']??0);}}
}
function menu_url(string $u): string { $u=text_value($u,2048);if($u===''||preg_match('~^/(?!/)[^\s\\\\]*$~D',$u))return $u;if(filter_var($u,FILTER_VALIDATE_URL)&&str_starts_with($u,'https://')&&!parse_url($u,PHP_URL_USER))return $u;fail(400,'Ссылка должна быть HTTPS или начинаться с /.'); }
function page_api(string $action,array $a): never {
    owner();
    if($action==='create'){
        $name=text_value($a['name']??'',200);if($name==='')fail(400,'Укажите название.');$route=route_value($a['route']??'');$d=enc(template_data($a['template']??'empty'));$parent=(int)($a['parent_id']??0);
        $id=transaction(function()use($name,$route,$d,$parent){query('SELECT id FROM vl_users WHERE id=1 FOR UPDATE');query('INSERT INTO vl_pages(name,route,draft) VALUES(?,?,?)',[$name,$route,$d]);$id=(int)db()->lastInsertId();query('INSERT INTO vl_menu(parent_id,page_id,label,position) VALUES(?,?,?,999)',[$parent?:null,$id,$name]);menu_valid(query('SELECT * FROM vl_menu')->fetchAll());audit('page_created',['page'=>$id]);return $id;});json_out(['id'=>$id]);
    }
    if(in_array($action,['save','publish','unpublish','restore'],true)){
        $id=(int)($a['id']??0);
        $rev=transaction(function()use($action,$a,$id){$p=page($id,true);if((int)($a['revision']??0)!==(int)$p['revision'])fail(409,'Эта страница уже изменена. Перезагрузите ее перед сохранением.');$d=$p['draft'];
            if($action==='save'){$name=text_value($a['name']??$p['name'],200);$route=route_value($a['route']??$p['route']);if(in_array($p['route'],['/','/404.html'],true)&&$route!==$p['route'])fail(400,'Адрес главной и 404 нельзя менять.');$d=enc(page_data($a['data']??[]));query('UPDATE vl_pages SET name=?,route=? WHERE id=?',[$name,$route,$id]);}
            if($action==='restore'){$r=query('SELECT data FROM vl_history WHERE id=? AND page_id=?',[(int)($a['history_id']??0),$id])->fetch();if(!$r)fail(404,'Версия не найдена.');$d=$r['data'];}
            query('INSERT INTO vl_history(page_id,data,action) VALUES(?,?,?)',[$id,$p['draft'],$action]);
            query('UPDATE vl_pages SET draft=?,published=?,revision=revision+1,updated_at=NOW() WHERE id=?',[$d,$action==='publish'?$d:($action==='unpublish'?null:$p['published']),$id]);
            // Keep a bounded, useful history for each page.
            $old=query('SELECT id FROM vl_history WHERE page_id=? ORDER BY id DESC LIMIT 100000 OFFSET 30',[$id])->fetchAll();foreach($old as $r)query('DELETE FROM vl_history WHERE id=?',[$r['id']]);audit('page_'.$action,['page'=>$id]);return (int)$p['revision']+1;
        });json_out(['revision'=>$rev]);
    }
    if($action==='menu-save'){
        $id=(int)($a['id']??0);$label=text_value($a['label']??'',200);if($label==='')fail(400,'Укажите название.');$url=menu_url($a['url']??'');$placement=$a['placement']??'header';if(!in_array($placement,['header','footer','both','none'],true))fail(400,'Неверное расположение.');$parent=(int)($a['parent_id']??0);$page=(int)($a['page_id']??0);if($page)page($page);
        transaction(function()use($id,$label,$url,$placement,$parent,$page,$a){query('SELECT id FROM vl_users WHERE id=1 FOR UPDATE');if($id){if(!query('SELECT id FROM vl_menu WHERE id=?',[$id])->fetch())fail(404,'Пункт не найден.');query('UPDATE vl_menu SET parent_id=?,page_id=?,label=?,url=?,position=?,placement=?,visible=? WHERE id=?',[$parent?:null,$page?:null,$label,$url,(int)($a['position']??0),$placement,!empty($a['visible'])?1:0,$id]);}else query('INSERT INTO vl_menu(parent_id,page_id,label,url,position,placement,visible) VALUES(?,?,?,?,?,?,?)',[$parent?:null,$page?:null,$label,$url,(int)($a['position']??0),$placement,!empty($a['visible'])?1:0]);menu_valid(query('SELECT * FROM vl_menu')->fetchAll());audit('menu_saved');});json_out(['ok'=>true]);
    }
    if($action==='menu-delete') {transaction(function()use($a){$id=(int)($a['id']??0);query('SELECT id FROM vl_users WHERE id=1 FOR UPDATE');if(query('SELECT id FROM vl_menu WHERE parent_id=? LIMIT 1',[$id])->fetch())fail(409,'Сначала перенесите или удалите подразделы.');query('DELETE FROM vl_menu WHERE id=?',[$id]);audit('menu_deleted',['id'=>$id]);});json_out(['ok'=>true]);}
    if($action==='preview') {page((int)($a['id']??0));$d=page_data($a['data']??[]);$token=bin2hex(random_bytes(32));query('DELETE FROM vl_previews WHERE expires<?',[time()]);query('INSERT INTO vl_previews(token,data,expires) VALUES(?,?,?)',[$token,enc($d),time()+600]);json_out(['url'=>origin().'/preview/'.$token]);}
    fail(404,'Неизвестное действие.');
}
function page_export(int $id,bool $files): never {
    owner();$p=page($id);$d=json_decode($p['draft'],true,64,JSON_THROW_ON_ERROR);$tmp=tempnam(VL_PRIVATE.'/uploads','export-');$zip=new ZipArchive();if($zip->open($tmp,ZipArchive::OVERWRITE)!==true)throw new RuntimeException('ZIP failed');
    $zip->addFromString('page.json',enc(['version'=>VL_VERSION,'name'=>$p['name'],'route'=>$p['route'],'revision'=>$p['revision'],'draft'=>$d,'published'=>$p['published']?json_decode($p['published'],true):null]));
    $zip->addFromString('index.html',$d['html']);$zip->addFromString('style.css',$d['css']);$zip->addFromString('script.js',$d['js']);$zip->addFromString('dependencies.json',enc($d['dependencies']));
    $list=query('SELECT id,path,name,size,sha256,comment FROM vl_files WHERE page_id=? AND trash IS NULL',[$id])->fetchAll();$zip->addFromString('files.json',enc($list));
    if($files)foreach($list as $f){$path=safe_path($f['path']);if(is_file($path))$zip->addFile($path,'files/'.$f['path']);}
    $zip->close();header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="page-'.$id.'.zip"');header('Content-Length: '.filesize($tmp));readfile($tmp);unlink($tmp);exit;
}
