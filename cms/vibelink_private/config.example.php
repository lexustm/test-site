<?php
declare(strict_types=1);
// Copy to config.php, fill all values. This directory must be OUTSIDE public_html.
return [
    'public_host' => 'vibelink.ru',
    'admin_host' => 'admin.vibelink.ru',
    'db_dsn' => 'mysql:host=localhost;dbname=CHANGE_ME;charset=utf8mb4',
    'db_user' => 'CHANGE_ME',
    'db_password' => 'CHANGE_ME',
    'install_token' => 'REPLACE_WITH_RANDOM_64_HEX_CHARACTERS',
    'max_upload_bytes' => 1073741824,
    'session_idle_seconds' => 1800,
    'session_max_seconds' => 28800,
];
