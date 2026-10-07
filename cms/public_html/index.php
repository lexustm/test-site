<?php
declare(strict_types=1);
require dirname(__DIR__).'/vibelink_private/core.php';
require VL_PRIVATE.'/auth.php';
require VL_PRIVATE.'/pages.php';
require VL_PRIVATE.'/files.php';
require VL_PRIVATE.'/render.php';
try {
    $c=config();$host=strtolower($_SERVER['HTTP_HOST']??'');$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH) ?: '/';
    header('X-Content-Type-Options: nosniff');header('Referrer-Policy: strict-origin-when-cross-origin');header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    if(!test_mode()){
        if(($_SERVER['HTTPS']??'')!=='on'&&($_SERVER['SERVER_PORT']??'')!='443'){if(in_array($host,[$c['admin_host'],$c['public_host'],'www.'.$c['public_host']],true)){header('Location: https://'.$host.$_SERVER['REQUEST_URI'],true,308);exit;}fail(421,'Неизвестный hostname.');}
        header('Strict-Transport-Security: max-age=31536000');
    }
    if($host==='www.'.$c['public_host']){header('Location: '.origin().$_SERVER['REQUEST_URI'],true,301);exit;}
    if(!in_array($host,[$c['public_host'],$c['admin_host']],true))fail(421,'Неизвестный hostname.');
    $admin=$host===$c['admin_host'];
    if(!$admin){if(preg_match('~^/(?:api|export|admin|vibelink_private|link|page-files)(?:/|$)~',$path))fail(404,'Страница не найдена.');if(!is_file(VL_PRIVATE.'/installed'))fail(503,'Сайт пока не установлен.');public_route($path);}
    header('Cache-Control: no-store');header('X-Robots-Tag: noindex, nofollow');$nonce=base64_encode(random_bytes(18));
    header("Content-Security-Policy: default-src 'none'; script-src 'self' 'nonce-$nonce'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src ".origin()."; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");header('X-Frame-Options: DENY');
    session_boot();if(!is_file(VL_PRIVATE.'/installed'))install_schema();
    $method=$_SERVER['REQUEST_METHOD'];
    if($method==='POST'){
        csrf();if(preg_match('~^/api/upload-chunk/([a-f0-9]{40})$~D',$path,$m))upload_chunk($m[1]);$a=input();
        if(preg_match('~^/api/auth/([a-z-]+)$~D',$path,$m))auth_api($m[1],$a);
        if(preg_match('~^/api/pages/([a-z-]+)$~D',$path,$m))page_api($m[1],$a);
        if(preg_match('~^/api/files/([a-z-]+)$~D',$path,$m))files_api($m[1],$a);fail(404,'Неизвестное API.');
    }
    if($method!=='GET')fail(405,'Метод не поддерживается.');
    if($path==='/api/boot'){
        $installed=(bool)query('SELECT id FROM vl_users LIMIT 1')->fetch();$logged=false;try{owner();$logged=true;}catch(HttpError){}json_out(['installed'=>$installed,'logged'=>$logged,'csrf'=>$_SESSION['csrf'],'version'=>VL_VERSION,'public_origin'=>origin()]);
    }
    if($path==='/api/state'){owner();json_out(['pages'=>query('SELECT id,name,route,revision,(published IS NOT NULL) AS published,updated_at FROM vl_pages ORDER BY id')->fetchAll(),'menu'=>query('SELECT * FROM vl_menu ORDER BY position,id')->fetchAll(),'files'=>query('SELECT * FROM vl_files ORDER BY id DESC')->fetchAll()]);}
    if(preg_match('~^/api/page/(\d+)$~D',$path,$m)){owner();$p=page((int)$m[1]);$p['draft']=json_decode($p['draft'],true);$p['published']=$p['published']?json_decode($p['published'],true):null;$p['history']=query('SELECT id,action,created_at FROM vl_history WHERE page_id=? ORDER BY id DESC',[$m[1]])->fetchAll();json_out($p);}
    if($path==='/api/audit'){owner();json_out(['items'=>query('SELECT id,action,detail,created_at FROM vl_audit ORDER BY id DESC LIMIT 100')->fetchAll(),'recovery_count'=>(int)query('SELECT COUNT(*) n FROM vl_recovery')->fetch()['n']]);}
    if(preg_match('~^/export/(\d+)$~D',$path,$m))page_export((int)$m[1],!empty($_GET['files']));
    if($path!=='/'&&$path!=='/login')fail(404,'Страница не найдена.');
    header('Content-Type: text/html; charset=utf-8');require VL_PRIVATE.'/admin.php';
} catch(Throwable $e) {
    $status=$e instanceof HttpError?(int)$e->getCode():500;$message=$e instanceof HttpError?$e->getMessage():'Внутренняя ошибка. Проверьте конфигурацию и журнал PHP на хостинге.';
    if(!$e instanceof HttpError)error_log('VIBELINK '.get_class($e).': '.$e->getMessage());
    if(str_starts_with($path??'','/api/'))json_out(['error'=>$message],$status);http_response_code($status);header('Content-Type: text/plain; charset=utf-8');echo $message;
}
