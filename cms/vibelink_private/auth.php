<?php
declare(strict_types=1);
function b32(string $bytes): string { $bits='';foreach(str_split($bytes) as $c)$bits.=str_pad(decbin(ord($c)),8,'0',STR_PAD_LEFT);$out='';foreach(str_split($bits,5) as $b)$out.='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[bindec(str_pad($b,5,'0'))];return $out; }
function b32decode(string $s): string { $bits='';foreach(str_split(strtoupper($s)) as $c){$p=strpos('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',$c);if($p===false)throw new RuntimeException('Base32');$bits.=str_pad(decbin($p),5,'0',STR_PAD_LEFT);} $v='';foreach(str_split($bits,8) as $b)if(strlen($b)===8)$v.=chr(bindec($b));return $v; }
function totp(string $secret, int $step, int $digits=6, string $algo='sha1'): string { $mac=hash_hmac($algo,pack('N2',intdiv($step,4294967296),$step%4294967296),b32decode($secret),true);$o=ord(substr($mac,-1))&15;$v=unpack('N',substr($mac,$o,4))[1]&0x7fffffff;return str_pad((string)($v%(10**$digits)),$digits,'0',STR_PAD_LEFT); }
function valid_step(string $secret, string $code, int $last=-1): int { if(!preg_match('/^\d{6}$/D',$code))return -1;$t=intdiv(time(),30);foreach([$t,$t-1,$t+1] as $s)if($s>$last&&hash_equals(totp($secret,$s),$code))return $s;return -1; }
function verify_factor(array $u, string $code): bool {
    // Caller holds user row lock in transaction. TOTP and recovery codes cannot be reused.
    $step=valid_step(unseal($u['totp']),$code,(int)$u['last_step']);
    if($step>=0){query('UPDATE vl_users SET last_step=? WHERE id=1',[$step]);return true;}
    foreach(query('SELECT * FROM vl_recovery FOR UPDATE')->fetchAll() as $r)if(password_verify(strtoupper(trim($code)),$r['hash'])){query('DELETE FROM vl_recovery WHERE id=?',[$r['id']]);return true;}return false;
}
function recovery_new(): array { query('DELETE FROM vl_recovery');$codes=[];for($i=0;$i<10;$i++){$code=strtoupper(bin2hex(random_bytes(8)));$codes[]=$code;query('INSERT INTO vl_recovery(hash) VALUES(?)',[password_hash($code,PASSWORD_ARGON2ID,['memory_cost'=>19456,'time_cost'=>2,'threads'=>1])]);}return $codes; }
function login_session(array $u): void { session_regenerate_id(true);$_SESSION=['owner'=>1,'version'=>(int)$u['session_version'],'born'=>time(),'last'=>time(),'csrf'=>bin2hex(random_bytes(32))]; }
function reauth(array $a): array { $u=query('SELECT * FROM vl_users WHERE id=1 FOR UPDATE')->fetch();if(!password_verify($a['password']??'',$u['password'])||!verify_factor($u,$a['code']??''))fail(401,'Пароль или одноразовый код неверен.');return $u; }
function install_schema(): void { foreach(explode(';',file_get_contents(VL_PRIVATE.'/schema.sql')) as $sql)if(trim($sql)!=='')db()->exec($sql); }
function seed(): void {
    $path=VL_PRIVATE.'/seed.json';$raw=is_file($path)?file_get_contents($path):gzdecode(file_get_contents($path.'.gz'));$s=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    $ids=[];foreach($s['pages'] as $p){$data=enc($p['data']);query('INSERT INTO vl_pages(name,route,draft,published) VALUES(?,?,?,?)',[$p['name'],$p['route'],$data,$data]);$ids[$p['route']]=(int)db()->lastInsertId();}
    query("INSERT INTO vl_menu(label,url,position) VALUES('Услуги','/#services',0)");$parent=(int)db()->lastInsertId();$i=0;
    foreach($s['pages'] as $p)if(!in_array($p['route'],['/','/404.html','/krupny-text-privacy/','/produkty/'],true))query('INSERT INTO vl_menu(parent_id,page_id,label,position) VALUES(?,?,?,?)',[$parent,$ids[$p['route']],$p['name'],$i++]);
    foreach([['Продукты','/produkty/'],['Результаты','/#results'],['Как работаю','/#process'],['Контакты','/#contact']] as $i=>$m)query('INSERT INTO vl_menu(label,url,position,page_id) VALUES(?,?,?,?)',[$m[0],isset($ids[$m[1]])?'':$m[1],$i+1,$ids[$m[1]]??null]);
    query("INSERT INTO vl_menu(label,page_id,position,placement) VALUES('Конфиденциальность Крупного текста',?,0,'footer')",[$ids['/krupny-text-privacy/']]);
    foreach($s['media'] as $f){$path=VL_PUBLIC.'/'.$f['path'];if(is_file($path)&&!is_link($path))query('INSERT INTO vl_files(path,name,size,sha256,comment) VALUES(?,?,?,?,?)',[$f['path'],basename($f['path']),filesize($path),hash_file('sha256',$path),'Перенесено из старого сайта']);}
}
function auth_api(string $action, array $a): never {
    if($action==='setup-start'){
        if(is_file(VL_PRIVATE.'/installed')||query('SELECT id FROM vl_users LIMIT 1')->fetch())fail(404,'Установка закрыта.');
        throttle('install');if(!hash_equals(config()['install_token'],$a['token']??''))fail(403,'Неверный ключ установки.');
        $_SESSION['setup_secret']=b32(random_bytes(20));$_SESSION['setup_until']=time()+600;
        json_out(['secret'=>$_SESSION['setup_secret'],'uri'=>'otpauth://totp/'.rawurlencode('VIBELINK:owner').'?secret='.$_SESSION['setup_secret'].'&issuer=VIBELINK&algorithm=SHA1&digits=6&period=30']);
    }
    if($action==='setup-finish'){
        if(!hash_equals(config()['install_token'],$a['token']??'')||($_SESSION['setup_until']??0)<time())fail(403,'Повторите начало установки.');
        throttle('install');$secret=$_SESSION['setup_secret']??'';$step=valid_step($secret,$a['code']??'');if($step<0)fail(400,'Неверный TOTP. Проверьте время на телефоне.');
        $name=text_value($a['username']??'',80);if(strlen($name)<3)fail(400,'Логин не короче 3 символов.');$password=password_new($a['password']??'');
        $codes=transaction(function()use($name,$password,$secret,$step){if(query('SELECT id FROM vl_users FOR UPDATE')->fetch())fail(409,'Уже установлено.');query('INSERT INTO vl_users(id,username,password,totp,last_step) VALUES(1,?,?,?,?)',[$name,$password,seal($secret),$step]);seed();$c=recovery_new();audit('installed');return $c;});
        file_put_contents(VL_PRIVATE.'/installed',date(DATE_ATOM),LOCK_EX);chmod(VL_PRIVATE.'/installed',0600);login_session(query('SELECT * FROM vl_users WHERE id=1')->fetch());json_out(['codes'=>$codes,'csrf'=>$_SESSION['csrf']]);
    }
    if($action==='login'){
        $ip=throttle('login');$ok=transaction(function()use($a){$u=query('SELECT * FROM vl_users WHERE id=1 FOR UPDATE')->fetch();if(!$u||!hash_equals($u['username'],$a['username']??'')||!password_verify($a['password']??'',$u['password'])||!verify_factor($u,$a['code']??''))return false;audit('login');return $u;});
        if(!$ok)fail(401,'Логин, пароль или одноразовый код неверен.');query('DELETE FROM vl_attempts WHERE id=?',[$ip]);login_session($ok);json_out(['csrf'=>$_SESSION['csrf']]);
    }
    owner();
    if(in_array($action,['security-start','password','recovery','logout-all'],true))throttle('reauth');
    if($action==='logout'){audit('logout');$_SESSION=[];session_destroy();json_out(['ok'=>true]);}
    if($action==='security-start'){transaction(function()use($a){reauth($a);});$_SESSION['new_secret']=b32(random_bytes(20));$_SESSION['new_until']=time()+600;json_out(['secret'=>$_SESSION['new_secret'],'uri'=>'otpauth://totp/VIBELINK:owner?secret='.$_SESSION['new_secret'].'&issuer=VIBELINK']);}
    if($action==='security-finish'){
        if(($_SESSION['new_until']??0)<time())fail(403,'Время замены TOTP истекло.');$step=valid_step($_SESSION['new_secret'],$a['new_code']??'');if($step<0)fail(400,'Новый TOTP неверен.');
        $codes=transaction(function()use($step){query('UPDATE vl_users SET totp=?,last_step=?,session_version=session_version+1 WHERE id=1',[seal($_SESSION['new_secret']),$step]);$c=recovery_new();audit('totp_changed');return $c;});unset($_SESSION['new_secret'],$_SESSION['new_until']);login_session(query('SELECT * FROM vl_users WHERE id=1')->fetch());json_out(['codes'=>$codes,'csrf'=>$_SESSION['csrf']]);
    }
    if(in_array($action,['password','recovery','logout-all'],true)){
        $res=transaction(function()use($action,$a){reauth($a);$codes=[];if($action==='password')query('UPDATE vl_users SET password=? WHERE id=1',[password_new($a['new_password']??'')]);if($action==='recovery')$codes=recovery_new();query('UPDATE vl_users SET session_version=session_version+1 WHERE id=1');audit($action);return $codes;});login_session(query('SELECT * FROM vl_users WHERE id=1')->fetch());json_out(['codes'=>$res,'csrf'=>$_SESSION['csrf']]);
    }
    fail(404,'Неизвестное действие.');
}
