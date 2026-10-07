<?php
declare(strict_types=1);
const VL_VERSION = '1.0.0-beta.1';
const VL_TABLES = ['users','recovery','pages','history','menu','files','attempts','audit','previews'];
const VL_PRIVATE = __DIR__;
const VL_PUBLIC = __DIR__ . '/../public_html';

function config(): array {
    static $c;
    if ($c !== null) return $c;
    if (!is_file(VL_PRIVATE.'/config.php')) throw new RuntimeException('Сначала настройте config.php вне public_html.');
    $c = require VL_PRIVATE.'/config.php';
    foreach (['public_host','admin_host'] as $k) {
        if (!preg_match('/^[a-z0-9.-]+(?::[0-9]+)?$/D', $c[$k] ?? '')) throw new RuntimeException('Неверный hostname.');
    }
    if ($c['public_host'] === $c['admin_host']) throw new RuntimeException('Админка должна иметь отдельный hostname.');
    if (!preg_match('/^[a-zA-Z0-9_-]{32,128}$/D', $c['install_token'] ?? '') || str_contains($c['install_token'],'REPLACE')) throw new RuntimeException('Создайте случайный install_token.');
    if (!defined('PASSWORD_ARGON2ID') || !extension_loaded('sodium') || !extension_loaded('pdo_mysql') || !extension_loaded('fileinfo') || !class_exists('ZipArchive')) throw new RuntimeException('Нужны Argon2id, Sodium, PDO MySQL, Fileinfo и Zip.');
    foreach (['sessions','uploads','trash','backups'] as $d) if (!is_dir(VL_PRIVATE.'/'.$d) && !mkdir(VL_PRIVATE.'/'.$d,0700,true)) throw new RuntimeException('Нет доступа к private directory.');
    return $c;
}
function test_mode(): bool { return getenv('VL_TEST') === '1' && in_array(explode(':', $_SERVER['HTTP_HOST'] ?? 'localhost')[0], ['localhost','127.0.0.1'],true); }
function origin(bool $admin = false): string { return (test_mode() ? 'http://' : 'https://').config()[$admin ? 'admin_host' : 'public_host']; }
function db(): PDO {
    static $pdo;
    return $pdo ??= new PDO(config()['db_dsn'], config()['db_user'], config()['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
}
function query(string $sql, array $args = []): PDOStatement { $s=db()->prepare($sql);$s->execute($args);return $s; }
function fail(int $status, string $message): never { throw new HttpError($message,$status); }
class HttpError extends RuntimeException {}
function json_out(mixed $data, int $status = 200): never { http_response_code($status); header('Content-Type: application/json; charset=utf-8');echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit; }
function input(): array {
    $raw = file_get_contents('php://input',false,null,0,4*1024*1024+1);
    if (strlen($raw)>4*1024*1024) fail(413,'Слишком большой запрос.');
    try { $a=json_decode($raw,true,64,JSON_THROW_ON_ERROR); } catch (JsonException $e) { fail(400,'Неверный JSON.'); }
    if (!is_array($a)) fail(400,'Неверный запрос.');return $a;
}
function enc(mixed $data): string { return json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); }
function h(mixed $s): string { return htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function text_value(mixed $s, int $max): string { if (!is_string($s) || !preg_match('//u',$s) || strlen($s)>$max) fail(400,'Некорректный текст.');return trim($s); }
function transaction(callable $f): mixed { db()->beginTransaction();try {$v=$f();db()->commit();return $v;}catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;} }
function secret_key(): string {
    $path=VL_PRIVATE.'/key.bin';
    if(!is_file($path)){ $fd=@fopen($path,'x+b');if($fd){chmod($path,0600);fwrite($fd,random_bytes(32));fflush($fd);fclose($fd);} }
    $v=file_get_contents($path);if(strlen($v)!==32)throw new RuntimeException('Ключ шифрования поврежден.');return $v;
}
function seal(string $s): string { $n=random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);return base64_encode($n.sodium_crypto_secretbox($s,$n,secret_key())); }
function unseal(string $s): string { $b=base64_decode($s,true);if(!$b)throw new RuntimeException('Ошибка секрета.');$v=sodium_crypto_secretbox_open(substr($b,24),substr($b,0,24),secret_key());if($v===false)throw new RuntimeException('Ошибка ключа.');return $v; }
function audit(string $action, array $detail = []): void { query('INSERT INTO vl_audit(action,detail,ip_hash) VALUES(?,?,?)',[$action,enc($detail),hash_hmac('sha256',$_SERVER['REMOTE_ADDR']??'cli',secret_key())]); }
function session_boot(): void {
    ini_set('session.save_handler','files');ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');ini_set('session.use_trans_sid','0');
    session_save_path(VL_PRIVATE.'/sessions');session_name(test_mode()?'vibelink_test':'__Host-vibelink');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>!test_mode(),'httponly'=>true,'samesite'=>'Strict']);session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}
function csrf(): void {
    if (!hash_equals(origin(true),$_SERVER['HTTP_ORIGIN']??''))fail(403,'Чужой Origin.');
    if(!hash_equals($_SESSION['csrf']??'',$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail(403,'Сессия формы устарела. Обновите страницу.');
    if(($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin')==='cross-site')fail(403,'Чужой источник запроса.');
}
function owner(): array {
    $u=query('SELECT * FROM vl_users WHERE id=1')->fetch();
    $now=time();
    if(!$u || ($_SESSION['owner']??0)!==1 || ($_SESSION['version']??0)!==(int)$u['session_version'] || $now-($_SESSION['last']??0)>(config()['session_idle_seconds']??1800) || $now-($_SESSION['born']??0)>(config()['session_max_seconds']??28800)) {unset($_SESSION['owner']);fail(401,'Войдите в админку.');}
    $_SESSION['last']=$now;return $u;
}
function throttle(string $kind): string {
    $ip=hash_hmac('sha256',$kind.'|'.($_SERVER['REMOTE_ADDR']??'cli'),secret_key());
    query('INSERT IGNORE INTO vl_attempts(id,window_at) VALUES(?,?)',[$ip,time()]);
    $a=query('SELECT * FROM vl_attempts WHERE id=?',[$ip])->fetch();if((int)$a['until_at']>time())fail(429,'Слишком много попыток. Попробуйте через 15 минут.');
    query('UPDATE vl_attempts SET count=IF(window_at<? ,1,count+1),window_at=IF(window_at<? ,?,window_at) WHERE id=?',[time()-900,time()-900,time(),$ip]);
    $a=query('SELECT count FROM vl_attempts WHERE id=?',[$ip])->fetch();if((int)$a['count']>=10){query('UPDATE vl_attempts SET until_at=? WHERE id=?',[time()+900,$ip]);fail(429,'Слишком много попыток. Попробуйте через 15 минут.');}return $ip;
}
function password_new(string $s): string { if(strlen($s)<14||strlen($s)>256)fail(400,'Пароль должен содержать от 14 до 256 байт. Используйте длинную уникальную фразу.');return password_hash($s,PASSWORD_ARGON2ID,['memory_cost'=>65536,'time_cost'=>3,'threads'=>1]); }
