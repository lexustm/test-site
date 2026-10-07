"""Isolated integration tests. Requires --runtime with locally unpacked PHP/MariaDB.
Never uses the owner's database. All fixtures are temporary and synthetic.
"""
import argparse, base64, hashlib, hmac, http.cookiejar, json, os, pathlib, shutil, struct, subprocess, tempfile, time, urllib.request, urllib.error, zipfile, io
p=argparse.ArgumentParser();p.add_argument('--runtime',required=True);p.add_argument('--browser');args=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];runtime=pathlib.Path(args.runtime).resolve();tmp=pathlib.Path(tempfile.mkdtemp(prefix='vibelink-test-'));site=tmp/'site';shutil.copytree(root,site,ignore=shutil.ignore_patterns('config.php','key.bin','installed','sessions','backups','uploads','trash'))
env=os.environ.copy();env['LD_LIBRARY_PATH']=str(runtime/'usr/lib/x86_64-linux-gnu');env['VL_TEST']='1';ext=runtime/'usr/lib/php/20230831'
php=[str(runtime/'usr/bin/php8.3'),'-n'];
for name in ['pdo','mysqlnd','pdo_mysql','fileinfo','zip','ctype','tokenizer']:
 php+=['-d','extension='+str(ext/(name+'.so'))]
php+=['-d','memory_limit=256M'];mysql=[str(runtime/'usr/bin/mariadb'),'--no-defaults','--protocol=TCP','-h127.0.0.1','-P3308','-uroot']
procs=[];handles=[];results=[]
def sql(s):return subprocess.run(mysql+['-N','-e',s],env=env,text=True,capture_output=True,check=True).stdout
def logproc(cmd,name,cwd=None):
 f=open(tmp/name,'wb');handles.append(f);pr=subprocess.Popen(cmd,env=env,stdout=f,stderr=f,cwd=cwd);procs.append(pr);return pr
def check(name,truth):
 if not truth:raise AssertionError(name)
 results.append(name);print('PASS',name,flush=True)
def totp(secret,step=None):
 step=int(time.time()/30) if step is None else step;m=hmac.new(base64.b32decode(secret+'='*((-len(secret))%8)),struct.pack('>Q',step),hashlib.sha1).digest();o=m[-1]&15;return str((struct.unpack('>I',m[o:o+4])[0]&0x7fffffff)%1000000).zfill(6)
class Client:
 def __init__(self,host):self.host=host;self.cookies=http.cookiejar.CookieJar();self.opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(self.cookies));self.csrf=''
 def call(self,path,data=None,raw=False,headers=None):
  h={};body=None
  if data is not None:
   h={'Origin':self.host,'X-CSRF-Token':self.csrf,'Content-Type':'application/octet-stream' if raw else 'application/json'};body=data if raw else json.dumps(data).encode()
  h.update(headers or {});r=urllib.request.Request(self.host+path,data=body,headers=h)
  try:v=self.opener.open(r,timeout=30)
  except urllib.error.HTTPError as x:v=x
  b=v.read();self.last_headers=dict(v.headers);status=v.code
  if 'application/json' in v.headers.get('Content-Type',''):b=json.loads(b);self.csrf=b.get('csrf',self.csrf)
  return status,b
 def post(self,path,data):return self.call('/api/'+path,data)
try:
 data=tmp/'db';subprocess.run([str(runtime/'usr/bin/mariadb-install-db'),'--no-defaults','--user=root','--basedir='+str(runtime/'usr'),'--datadir='+str(data),'--auth-root-authentication-method=normal','--skip-test-db'],env=env,capture_output=True,check=True)
 logproc([str(runtime/'usr/sbin/mariadbd'),'--no-defaults','--user=root','--basedir='+str(runtime/'usr'),'--datadir='+str(data),'--bind-address=127.0.0.1','--port=3308','--socket=','--pid-file='+str(tmp/'db.pid'),'--skip-log-bin','--innodb-buffer-pool-size=64M'],'mysql.log')
 for i in range(100):
  try:sql('SELECT 1');break
  except subprocess.CalledProcessError as ex:
   last_error=ex.stderr;time.sleep(.1)
 else:raise RuntimeError(last_error+'\n'+(tmp/'mysql.log').read_text())
 sql('CREATE DATABASE vltest CHARACTER SET utf8mb4; CREATE DATABASE vlrestore CHARACTER SET utf8mb4;')
 token='0123456789abcdef'*4;password='Synthetic-test-password-2026'
 (site/'vibelink_private/config.php').write_text("<?php return "+"['public_host'=>'localhost:8800','admin_host'=>'127.0.0.1:8801','db_dsn'=>'mysql:host=127.0.0.1;port=3308;dbname=vltest;charset=utf8mb4','db_user'=>'root','db_password'=>'','install_token'=>'"+token+"'];")
 for port in [8800,8801]:logproc(php+['-S','0.0.0.0:'+str(port),'-t',str(site/'public_html'),str(site/'tools/router.php')],str(port)+'.log')
 adm=Client('http://127.0.0.1:8801');pub=Client('http://localhost:8800')
 for i in range(100):
  try:status,boot=adm.call('/api/boot');break
  except urllib.error.URLError:time.sleep(.1)
 check('boot before install',status==200 and not boot['installed']);adm.csrf=boot['csrf']
 check('CSRF rejects missing token',adm.call('/api/auth/setup-start',{'token':token},headers={'X-CSRF-Token':''})[0]==403)
 check('Origin rejects public domain',adm.call('/api/auth/setup-start',{'token':token},headers={'Origin':pub.host})[0]==403)
 check('install rejects wrong token',adm.post('auth/setup-start',{'token':'wrong'})[0]==403)
 status,start=adm.post('auth/setup-start',{'token':token});check('TOTP setup starts',status==200 and len(start['secret'])==32);secret=start['secret']
 used_code=totp(secret);status,r=adm.post('auth/setup-finish',{'token':token,'username':'owner','password':password,'code':used_code});check('install with mandatory TOTP',status==200);codes=r['codes'];check('ten recovery codes',len(codes)==10 and len(set(codes))==10)
 status,state=adm.call('/api/state');check('all 19 pages migrated',status==200 and len(state['pages'])==19)
 for pg in state['pages']:
  status,body=pub.call(pg['route']);check('public route '+pg['route'],status==(404 if pg['route']=='/404.html' else 200) and 'vl-header' in body.decode())
 check('admin login page has no analytics',b'metrika' not in adm.call('/')[1]);check('public cannot read admin API',pub.call('/api/state')[0]==404)
 check('install permanently locked',adm.post('auth/setup-start',{'token':token})[0]==404)
 sitemap=pub.call('/sitemap.xml')[1];check('sitemap omits client media',b'/link/' not in sitemap and b'/404.html' not in sitemap)
 status,new=adm.post('pages/create',{'name':'Тестовая страница','route':'/integration-test/','template':'empty'});check('draft creates page and menu',status==200);pid=new['id']
 check('draft hidden on public',pub.call('/integration-test/')[0]==404)
 status,pg=adm.call('/api/page/'+str(pid));d=pg['draft'];d['html']='<main><h1>Integration test</h1></main>';d['css']='main{color:purple}';d['js']='window.testPage=true';d['title']='Integration test'
 status,r=adm.post('pages/save',{'id':pid,'revision':pg['revision'],'data':d});check('draft saves',status==200);rev=r['revision']
 check('stale save rejected',adm.post('pages/save',{'id':pid,'revision':1,'data':d})[0]==409)
 check('save does not publish',pub.call('/integration-test/')[0]==404)
 status,preview=adm.post('pages/preview',{'id':pid,'data':d});check('preview created',status==200);status,b=pub.call(preview['url'].replace(pub.host,''));check('preview sandbox header',status==200 and 'sandbox allow-scripts' in pub.last_headers['Content-Security-Policy'] and 'connect-src \'none\'' in pub.last_headers['Content-Security-Policy'])
 status,r=adm.post('pages/publish',{'id':pid,'revision':rev});check('publish succeeds',status==200);rev=r['revision'];check('published content visible',b'Integration test' in pub.call('/integration-test/')[1])
 status,z=adm.call('/export/'+str(pid));check('export ZIP contains all tabs',status==200 and {'index.html','style.css','script.js','page.json','dependencies.json','files.json'}<=set(zipfile.ZipFile(io.BytesIO(z)).namelist()))
 status,pg=adm.call('/api/page/'+str(pid));check('history captured',len(pg['history'])>=2)
 status,r=adm.post('pages/restore',{'id':pid,'revision':rev,'history_id':pg['history'][-1]['id']});check('restore into draft',status==200 and b'Integration test' in pub.call('/integration-test/')[1]);rev=r['revision']
 status,r=adm.post('pages/unpublish',{'id':pid,'revision':rev});check('unpublish hides route',status==200 and pub.call('/integration-test/')[0]==404)
 check('reserved slug rejected',adm.post('pages/create',{'name':'bad','route':'/page-files/'} )[0]==400)
 status,state=adm.call('/api/state');m=next(m for m in state['menu'] if m['label']=='Услуги');check('menu cycles rejected',adm.post('pages/menu-save',{**m,'parent_id':m['id']})[0]==400)
 check('unsafe external URL rejected',adm.post('pages/menu-save',{'label':'X','url':'javascript:alert(1)','visible':True})[0]==400)
 check('external HTTPS menu accepted',adm.post('pages/menu-save',{'label':'API','url':'https://api.vibelink.ru/','visible':True})[0]==200)
 check('path traversal rejected',adm.post('files/upload-start',{'path':'link/../x.png','size':10})[0]==400)
 check('executable upload rejected',adm.post('files/upload-start',{'path':'link/x.php','size':10})[0]==400)
 png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1xoAAAAASUVORK5CYII=')
 def upload(path,content,replace=False,page_id=0):
  status,up=adm.post('files/upload-start',{'path':path,'size':len(content),'replace':replace,'page_id':page_id});check('upload starts '+path,status==200);status,r=adm.call('/api/upload-chunk/'+up['id'],content,True,{'X-Upload-Offset':'0'});check('upload chunk '+path,status==200);return adm.post('files/upload-finish',{'upload_id':up['id']})
 status,r=upload('link/test/logo.png',png);check('valid PNG uploaded',status==200 and (site/'public_html/link/test/logo.png').read_bytes()==png)
 status,state=adm.call('/api/state');fid=next(f['id'] for f in state['files'] if f['path']=='link/test/logo.png')
 check('duplicate without replace rejected',adm.post('files/upload-start',{'path':'link/test/logo.png','size':10})[0]==409)
 check('content disguised as PNG rejected',upload('link/test/evil.png',b'<?php echo 1; ?>')[0]==400)
 check('replacement keeps URL',upload('link/test/logo.png',png,True)[0]==200)
 check('trash moves off public path',adm.post('files/file-trash',{'id':fid})[0]==200 and not (site/'public_html/link/test/logo.png').exists())
 check('restore returns same bytes',adm.post('files/file-restore',{'id':fid})[0]==200 and (site/'public_html/link/test/logo.png').read_bytes()==png)
 check('attachment upload',upload('page-files/'+str(pid)+'/logo.png',png,page_id=pid)[0]==200)
 z=zipfile.ZipFile(io.BytesIO(adm.call('/export/'+str(pid)+'?files=1')[1]));check('export includes attachment',any(n.endswith('/logo.png') for n in z.namelist()))
 # Atomic rollback when MySQL fails after filesystem mutation.
 sql("USE vltest; CREATE TRIGGER test_fail BEFORE UPDATE ON vl_files FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure';")
 check('trash DB failure rolls file back',adm.post('files/file-trash',{'id':fid})[0]==500 and (site/'public_html/link/test/logo.png').exists());sql('USE vltest; DROP TRIGGER test_fail;')
 check('logout succeeds',adm.post('auth/logout',{})[0]==200)
 check('logged out cannot access pages',adm.call('/api/state')[0]==401)
 check('TOTP replay rejected',adm.post('auth/login',{'username':'owner','password':password,'code':used_code})[0]==401)
 status,r=adm.post('auth/login',{'username':'owner','password':password,'code':codes[0]});check('recovery login succeeds',status==200)
 adm.post('auth/logout',{});check('recovery code one use',adm.post('auth/login',{'username':'owner','password':password,'code':codes[0]})[0]==401)
 check('second recovery works',adm.post('auth/login',{'username':'owner','password':password,'code':codes[1]})[0]==200)
 # RFC 6238 SHA-1 published test vectors, eight digits.
 code='require "'+str(site/'vibelink_private/core.php')+'"; require "'+str(site/'vibelink_private/auth.php')+'"; $s=b32("12345678901234567890"); foreach([59,1111111109,1111111111,1234567890,2000000000,20000000000] as $t) echo totp($s,intdiv($t,30),8)."\\n";'
 vec=subprocess.run(php+['-r',code],env=env,capture_output=True,text=True,check=True).stdout.splitlines();check('RFC6238 six published vectors',vec==['94287082','07081804','14050471','89005924','69279037','65353130'])
 # CLI backups are private, rotating and restorable only into a fresh database.
 for i in range(8):
  out=subprocess.run(php+[str(site/'vibelink_private/cli.php'),'backup'],env=env,capture_output=True,text=True,check=True).stdout.strip();backup=pathlib.Path(out)
 check('backup rotation keeps seven',len(list((site/'vibelink_private/backups').glob('backup-*.zip')))==7)
 check('backup mode private',backup.stat().st_mode&0o777==0o600)
 z=zipfile.ZipFile(backup);check('backup includes DB key media and config',{'database.json','private/key.bin','private/config.php','public/link/test/logo.png'}<=set(z.namelist()))
 restore=tmp/'restore';shutil.copytree(root,restore,ignore=shutil.ignore_patterns('config.php','key.bin','installed','sessions','backups','uploads','trash'));(restore/'vibelink_private/config.php').write_text((site/'vibelink_private/config.php').read_text().replace('dbname=vltest','dbname=vlrestore'))
 subprocess.run(php+[str(restore/'vibelink_private/cli.php'),'restore',str(backup),'--confirm-empty'],env=env,capture_output=True,text=True,check=True)
 check('restore keeps target database config','dbname=vlrestore' in (restore/'vibelink_private/config.php').read_text())
 check('restore returns exact media bytes',(restore/'public_html/link/test/logo.png').read_bytes()==png)
 check('restore returns database pages',int(sql('SELECT COUNT(*) FROM vlrestore.vl_pages').strip())==20)
 check('restore refuses nonempty database',subprocess.run(php+[str(restore/'vibelink_private/cli.php'),'restore',str(backup),'--confirm-empty'],env=env,capture_output=True).returncode==1)
 if args.browser:
  browser_env={**env,'VL_TEST_ADMIN':adm.host,'VL_TEST_PUBLIC':pub.host,'VL_TEST_SITE':str(site),'VL_TEST_SECRET':secret,'VL_TEST_PASSWORD':password,'VL_TEST_CODE':codes[2],'VL_TEST_SCREENSHOTS':str(root.parent/'recovery/screenshots'),'VL_TEST_CHROMIUM':str(pathlib.Path(args.browser).resolve())}
  subprocess.run([os.environ.get('CODEX_PRIMARY_RUNTIME_NODE','node'),str(root/'tools/browser-test.js')],env=browser_env,check=True)
 report={'version':'1.0.0-beta.1','server_tests':len(results),'passed':results,'php':'8.3.6','database':'MariaDB 10.11','date':time.strftime('%Y-%m-%d')};(root/'QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('RESULT',json.dumps({'passed':len(results),'fixture_logs':str(tmp)}),flush=True)
except Exception:
 for log in tmp.glob('*.log'):
  print(log.name,log.read_text(errors='replace')[-4000:])
 raise
finally:
 for pr in reversed(procs):pr.terminate()
 for pr in reversed(procs):
  try:pr.wait(timeout=5)
  except subprocess.TimeoutExpired:pr.kill();pr.wait()
 for f in handles:f.close()
