<?php
declare(strict_types=1);
const VL_TYPES = ['mp4'=>['video/mp4','application/mp4'],'webm'=>['video/webm'],'mp3'=>['audio/mpeg','audio/mp3'],'jpg'=>['image/jpeg'],'jpeg'=>['image/jpeg'],'png'=>['image/png'],'gif'=>['image/gif'],'webp'=>['image/webp'],'pdf'=>['application/pdf'],'zip'=>['application/zip','application/x-zip'],'apk'=>['application/vnd.android.package-archive','application/zip']];
function relative_path(string $p): string {
    if(strlen($p)>600||!preg_match('//u',$p)||preg_match('/[\x00-\x1f\x7f\\\\:]/u',$p)||!preg_match('~^(link|page-files)/~D',$p))fail(400,'Неверный путь.');
    foreach(explode('/',$p) as $v)if($v===''||$v==='.'||$v==='..'||str_starts_with($v,'.'))fail(400,'Неверный путь.');return $p;
}
function safe_path(string $p): string {
    $p=relative_path($p);$at=VL_PUBLIC;foreach(explode('/',$p) as $v){$at.='/'.$v;if(is_link($at))fail(400,'Символические ссылки запрещены.');}return $at;
}
function file_row(int $id,bool $lock=false): array {$f=query('SELECT * FROM vl_files WHERE id=?'.($lock?' FOR UPDATE':''),[$id])->fetch();if(!$f)fail(404,'Файл не найден.');return $f;}
function upload_meta(string $id): array { if(!preg_match('/^[a-f0-9]{40}$/D',$id))fail(400,'Неверный upload id.');$f=VL_PRIVATE.'/uploads/'.$id.'.json';if(!is_file($f))fail(404,'Загрузка истекла.');$m=json_decode(file_get_contents($f),true,64,JSON_THROW_ON_ERROR);if($m['session']!==hash('sha256',session_id())||$m['expires']<time())fail(403,'Загрузка истекла.');return $m; }
function upload_clean(): void {foreach(glob(VL_PRIVATE.'/uploads/*.json') as $f){if(filemtime($f)<time()-86400){$base=substr($f,0,-5);foreach([$base.'.part',$f] as $p)if(is_file($p))unlink($p);}}}
function files_api(string $action,array $a): never {
    owner();
    if($action==='folder'){$p=relative_path(($a['path']??'').'/sentinel');$folder=dirname(safe_path($p));if(!is_dir($folder)&&!mkdir($folder,0755,true))fail(500,'Не удалось создать папку.');audit('folder_created',['path'=>$a['path']]);json_out(['ok'=>true]);}
    if($action==='upload-start'){
        upload_clean();$path=relative_path($a['path']??'');$dest=safe_path($path);$ext=strtolower(pathinfo($path,PATHINFO_EXTENSION));if(!isset(VL_TYPES[$ext])||strlen(basename($path))>240)fail(400,'Разрешены MP4, WebM, MP3, JPEG, PNG, WebP, GIF, PDF, ZIP, APK.');
        $size=(int)($a['size']??0);if($size<1||$size>(config()['max_upload_bytes']??1073741824))fail(413,'Файл слишком большой или пустой.');$page=(int)($a['page_id']??0);if($page)page($page);
        if($page&&!str_starts_with($path,'page-files/'.$page.'/'))fail(400,'Вложения должны быть в папке страницы.');if(!$page&&!str_starts_with($path,'link/'))fail(400,'Клиентские файлы размещаются в link.');
        $replace=!empty($a['replace']);if(is_file($dest)&&!$replace)fail(409,'Файл существует. Включите замену.');
        if(count(glob(VL_PRIVATE.'/uploads/*.json'))>=20)fail(429,'Завершите предыдущие загрузки.');
        $id=bin2hex(random_bytes(20));$m=['path'=>$path,'size'=>$size,'page_id'=>$page?:null,'comment'=>text_value($a['comment']??'',4000),'replace'=>$replace,'session'=>hash('sha256',session_id()),'expires'=>time()+86400];
        file_put_contents(VL_PRIVATE.'/uploads/'.$id.'.json',enc($m),LOCK_EX);chmod(VL_PRIVATE.'/uploads/'.$id.'.json',0600);$fd=fopen(VL_PRIVATE.'/uploads/'.$id.'.part','xb');fclose($fd);chmod(VL_PRIVATE.'/uploads/'.$id.'.part',0600);json_out(['id'=>$id,'chunk_size'=>1048576]);
    }
    if($action==='upload-finish'){
        $id=$a['upload_id']??'';$m=upload_meta($id);$part=VL_PRIVATE.'/uploads/'.$id.'.part';$fd=fopen($part,'r+b');flock($fd,LOCK_EX);
        try{if(filesize($part)!==$m['size'])fail(409,'Загрузка неполная.');$ext=strtolower(pathinfo($m['path'],PATHINFO_EXTENSION));$mime=(new finfo(FILEINFO_MIME_TYPE))->file($part);if(!in_array($mime,VL_TYPES[$ext],true))fail(400,'Содержимое не соответствует расширению: '.$mime);
            if(in_array($ext,['jpg','jpeg','png','webp','gif'],true)&&!getimagesize($part))fail(400,'Изображение повреждено.');
            $dest=safe_path($m['path']);if(!is_dir(dirname($dest))&&!mkdir(dirname($dest),0755,true))fail(500,'Нет доступа к папке.');$old=null;$moved=false;$sha=hash_file('sha256',$part);
            db()->beginTransaction();try{query('SELECT id FROM vl_users WHERE id=1 FOR UPDATE');$existing=query('SELECT * FROM vl_files WHERE path=? FOR UPDATE',[$m['path']])->fetch();if($existing&&$existing['trash'])fail(409,'Этот путь находится в корзине. Сначала восстановите файл.');if(is_file($dest)){if(!$m['replace'])fail(409,'Файл уже существует.');$old=VL_PRIVATE.'/trash/replace-'.bin2hex(random_bytes(16));if(!copy($dest,$old))throw new RuntimeException('Не удалось сохранить старый файл.');chmod($old,0600);}
                if(!rename($part,$dest))throw new RuntimeException('Не удалось разместить файл.');$moved=true;chmod($dest,0644);
                query('INSERT INTO vl_files(page_id,path,name,size,sha256,comment) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE page_id=VALUES(page_id),size=VALUES(size),sha256=VALUES(sha256),comment=VALUES(comment)',[$m['page_id'],$m['path'],basename($m['path']),$m['size'],$sha,$m['comment']]);audit('file_uploaded',['path'=>$m['path'],'replaced'=>$old!==null]);db()->commit();
            }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();if($moved)rename($dest,$part);if($old&&is_file($old)){rename($old,$dest);chmod($dest,0644);}throw $e;}
            if($old&&is_file($old))unlink($old);unlink(VL_PRIVATE.'/uploads/'.$id.'.json');json_out(['ok'=>true,'url'=>origin().'/'.implode('/',array_map('rawurlencode',explode('/',$m['path'])))]);
        }finally{flock($fd,LOCK_UN);fclose($fd);}
    }
    if(in_array($action,['file-trash','file-restore'],true)){
        $moved=false;$from='';$to='';db()->beginTransaction();try{$f=file_row((int)($a['id']??0),true);$dest=safe_path($f['path']);
            if($action==='file-trash'){if($f['trash'])fail(409,'Уже в корзине.');$token=bin2hex(random_bytes(24));$from=$dest;$to=VL_PRIVATE.'/trash/'.$token;if(!is_file($from))fail(404,'Файл отсутствует на диске.');}
            else{if(!$f['trash'])fail(409,'Файл не в корзине.');$token=null;$from=VL_PRIVATE.'/trash/'.$f['trash'];$to=$dest;if(is_file($to))fail(409,'По этому адресу уже есть другой файл.');if(!is_dir(dirname($to)))mkdir(dirname($to),0755,true);}
            if(!rename($from,$to))throw new RuntimeException('Ошибка перемещения файла.');$moved=true;chmod($to,$token?0600:0644);query('UPDATE vl_files SET trash=? WHERE id=?',[$token,$f['id']]);audit($action,['path'=>$f['path']]);db()->commit();
        }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();if($moved)rename($to,$from);throw $e;}json_out(['ok'=>true]);
    }
    if($action==='file-comment'){query('UPDATE vl_files SET comment=? WHERE id=?',[text_value($a['comment']??'',4000),(int)($a['id']??0)]);audit('file_comment');json_out(['ok'=>true]);}
    if($action==='file-scan'){
        $count=0;$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator(VL_PUBLIC.'/link',FilesystemIterator::SKIP_DOTS));foreach($it as $f){if(!$f->isFile()||$f->isLink())continue;$p=substr($f->getPathname(),strlen(VL_PUBLIC)+1);if(!isset(VL_TYPES[strtolower($f->getExtension())]))continue;safe_path($p);if(!query('SELECT id FROM vl_files WHERE path=?',[$p])->fetch()){query('INSERT INTO vl_files(path,name,size,sha256,comment) VALUES(?,?,?,?,?)',[$p,$f->getFilename(),$f->getSize(),hash_file('sha256',$f->getPathname()),'Найдено на хостинге']);$count++;}}audit('files_scanned',['count'=>$count]);json_out(['count'=>$count]);
    }
    fail(404,'Неизвестное действие.');
}
function upload_chunk(string $id): never {
    owner();$m=upload_meta($id);$path=VL_PRIVATE.'/uploads/'.$id.'.part';$fd=fopen($path,'r+b');flock($fd,LOCK_EX);try{$offset=(int)($_SERVER['HTTP_X_UPLOAD_OFFSET']??-1);$actual=fstat($fd)['size'];if($offset!==$actual)fail(409,'Позиция загрузки не совпадает.');$data=file_get_contents('php://input',false,null,0,1048577);if(strlen($data)>1048576||$actual+strlen($data)>$m['size']||$data==='')fail(413,'Неверный размер части.');fseek($fd,0,SEEK_END);if(fwrite($fd,$data)!==strlen($data))throw new RuntimeException('Не хватает дискового пространства.');fflush($fd);json_out(['offset'=>$actual+strlen($data)]);}finally{flock($fd,LOCK_UN);fclose($fd);}
}
