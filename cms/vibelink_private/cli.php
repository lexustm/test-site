<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
umask(0077);
require __DIR__.'/core.php';
require __DIR__.'/files.php';
// Usage: php cli.php token | check | backup | restore BACKUP_ZIP --confirm-empty
try{
    $action=$argv[1]??'help';
    if($action==='token'){echo bin2hex(random_bytes(32)).PHP_EOL;exit;}
    if($action==='check'){config();echo 'PHP '.PHP_VERSION.'; PDO MySQL; Sodium; Argon2id; Fileinfo; Zip: OK'.PHP_EOL;echo 'MySQL '.db()->getAttribute(PDO::ATTR_SERVER_VERSION).PHP_EOL;echo 'Private directory: '.__DIR__.PHP_EOL;exit;}
    if($action==='backup'){
        config();$name='backup-'.date('Ymd-His').'-'.bin2hex(random_bytes(4)).'.zip';$path=VL_PRIVATE.'/backups/'.$name;$zip=new ZipArchive();if($zip->open($path,ZipArchive::CREATE|ZipArchive::EXCL)!==true)throw new RuntimeException('Cannot create backup.');
        try{db()->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');db()->beginTransaction();query('SELECT id FROM vl_users WHERE id=1 FOR UPDATE');$database=[];foreach(VL_TABLES as $table)$database[$table]=query('SELECT * FROM vl_'.$table)->fetchAll();$zip->addFromString('database.json',enc($database));$zip->addFromString('manifest.json',enc(['version'=>VL_VERSION,'created'=>date(DATE_ATOM),'tables'=>VL_TABLES]));
            foreach(['config.php','key.bin','installed'] as $f)if(is_file(VL_PRIVATE.'/'.$f))$zip->addFile(VL_PRIVATE.'/'.$f,'private/'.$f);
            foreach(['link','page-files'] as $folder){$dir=VL_PUBLIC.'/'.$folder;if(!is_dir($dir))continue;foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $file){if(!$file->isFile()||$file->isLink())continue;$rel=substr($file->getPathname(),strlen(VL_PUBLIC)+1);if(str_contains($rel,'/.'))continue;safe_path($rel);$zip->addFile($file->getPathname(),'public/'.$rel);}}
            foreach(new DirectoryIterator(VL_PRIVATE.'/trash') as $f)if($f->isFile()&&!$f->isLink())$zip->addFile($f->getPathname(),'trash/'.$f->getFilename());
            // ZipArchive reads the source files on close. Hold the owner row lock until complete.
            if(!$zip->close())throw new RuntimeException('Cannot complete ZIP.');chmod($path,0600);db()->commit();
        }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();@$zip->close();if(is_file($path))unlink($path);throw $e;}
        $files=glob(VL_PRIVATE.'/backups/backup-*.zip');rsort($files,SORT_STRING);foreach(array_slice($files,7) as $old)unlink($old);echo $path.PHP_EOL;exit;
    }
    if($action==='restore'){
        if(($argv[3]??'')!=='--confirm-empty')throw new RuntimeException('Restore only on an empty separate database: restore FILE --confirm-empty');
        config();$path=realpath($argv[2]??'');if(!$path||!is_file($path))throw new RuntimeException('Backup missing.');
        if(query("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'vl_%'")->fetch())throw new RuntimeException('Target database must have no vl_ tables. Restore to another empty database.');
        if(is_file(VL_PRIVATE.'/installed')||is_file(VL_PRIVATE.'/key.bin'))throw new RuntimeException('Target private directory must be new.');
        foreach(['link','page-files'] as $folder)if(is_dir(VL_PUBLIC.'/'.$folder)){foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator(VL_PUBLIC.'/'.$folder,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile()&&$f->getFilename()!=='.htaccess')throw new RuntimeException('Target media directories must be empty.');}
        $zip=new ZipArchive();if($zip->open($path)!==true)throw new RuntimeException('Invalid ZIP');$database=json_decode($zip->getFromName('database.json'),true,64,JSON_THROW_ON_ERROR);if(array_keys($database)!==VL_TABLES)throw new RuntimeException('Invalid table manifest.');
        $stage=VL_PRIVATE.'/uploads/restore-'.bin2hex(random_bytes(12));mkdir($stage,0700);$staged=[];
        for($i=0;$i<$zip->numFiles;$i++){$name=$zip->getNameIndex($i);if(in_array($name,['manifest.json','database.json','private/config.php'],true))continue;
            if(in_array($name,['private/key.bin','private/installed'],true))$dest=VL_PRIVATE.'/'.basename($name);
            elseif(str_starts_with($name,'public/'))$dest=safe_path(substr($name,7));
            elseif(preg_match('~^trash/[a-z0-9-]{10,80}$~D',$name))$dest=VL_PRIVATE.'/'.$name;
            else throw new RuntimeException('Unexpected ZIP entry: '.$name);
            $local=$stage.'/'.count($staged);$src=$zip->getStream($name);$out=fopen($local,'xb');if(!$src||!$out)throw new RuntimeException('Cannot extract backup.');stream_copy_to_stream($src,$out);fclose($src);fclose($out);chmod($local,0600);$staged[]=[$local,$dest];
        }$zip->close();$created=[];
        try{foreach(explode(';',file_get_contents(VL_PRIVATE.'/schema.sql')) as $s)if(trim($s)!=='')db()->exec($s);db()->beginTransaction();
            foreach($database as $table=>$rows){$columns=array_column(query('DESCRIBE vl_'.$table)->fetchAll(),'Field');foreach($rows as $row){foreach(array_keys($row) as $c)if(!in_array($c,$columns,true)||!preg_match('/^[a-z_][a-z0-9_]*$/D',$c))throw new RuntimeException('Invalid column.');query('INSERT INTO vl_'.$table.' (`'.implode('`,`',array_keys($row)).'`) VALUES ('.implode(',',array_fill(0,count($row),'?')).')',array_values($row));}}
            // Never restore pending previews, throttles or active sessions.
            query('DELETE FROM vl_previews');query('DELETE FROM vl_attempts');query('UPDATE vl_users SET session_version=session_version+1 WHERE id=1');
            foreach($staged as [$local,$dest]){if(is_file($dest))throw new RuntimeException('Refusing overwrite: '.$dest);if(!is_dir(dirname($dest)))mkdir(dirname($dest),str_starts_with($dest,VL_PUBLIC)?0755:0700,true);if(!rename($local,$dest))throw new RuntimeException('Cannot restore file.');chmod($dest,str_starts_with($dest,VL_PUBLIC)?0644:0600);$created[]=$dest;}db()->commit();
        }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();foreach($created as $f)if(is_file($f))unlink($f);throw $e;}foreach($staged as [$local,$dest])if(is_file($local))unlink($local);rmdir($stage);echo 'Restored to separate database. Current config.php was preserved. Test before switching traffic.'.PHP_EOL;exit;
    }
    echo "VIBELINK CMS ".VL_VERSION."\nCommands: token, check, backup, restore FILE --confirm-empty\n";
}catch(Throwable $e){fwrite(STDERR,$e->getMessage().PHP_EOL);exit(1);}
