<?php
// Local tests only. Apache on Beget uses .htaccess instead.
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if(str_contains($path,'..')||preg_match('~(?:^|/)\.~',$path)||preg_match('~^/(?:vibelink_private|admin|\.git)(?:/|$)~',$path)){http_response_code(403);exit;}
$admin=str_starts_with($_SERVER['HTTP_HOST']??'','127.0.0.1:');
$file=__DIR__.'/../public_html'.$path;
if(is_file($file)&&(!$admin||str_starts_with($path,'/_cms/'))&&!preg_match('/\.(html?|php|json|sql|log|txt|xml)$/i',$path)){
    if(preg_match('~^/(?:link|page-files)/~',$path))header('X-Robots-Tag: noindex, nofollow');return false;
}
if(is_dir($file)&&preg_match('~^/(?:link|page-files)(?:/|$)~',$path)){http_response_code(403);exit;}
require __DIR__.'/../public_html/index.php';
