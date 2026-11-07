<?php
/**
 * Прокси /api/* и /images/* для shared-хостинга reg.ru.
 *
 * Зачем: на тарифах reg.ru mod_proxy и RewriteRule [P] обычно отключены,
 * поэтому запросы к Render и Unsplash проксируются через PHP+cURL.
 * Браузер при этом общается только со своим origin, как и на Vercel.
 */

declare(strict_types=1);

const BACKEND_URL = 'https://swypemeal.onrender.com';
const IMAGES_URL = 'https://images.unsplash.com';
const CONNECT_TIMEOUT = 10;
const TOTAL_TIMEOUT = 40;

function respond_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function request_headers(): array
{
    if (function_exists('getallheaders')) {
        return getallheaders() ?: [];
    }
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = str_replace('_', '-', substr($key, 5));
            $headers[$name] = $value;
        }
    }
    return $headers;
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';
$query = parse_url($uri, PHP_URL_QUERY);
$suffix = $query !== null ? '?' . $query : '';

if (strpos($path, '/api/') === 0) {
    $target = BACKEND_URL . $path . $suffix;
    $is_image = false;
} elseif (strpos($path, '/images/') === 0) {
    $target = IMAGES_URL . substr($path, strlen('/images')) . $suffix;
    $is_image = true;
} else {
    respond_json(404, ['detail' => 'Not found']);
}

if (!in_array($method, ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true)) {
    respond_json(405, ['detail' => 'Method not allowed']);
}

$skip = ['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding'];
$headers = [];
$hasAuthorization = false;
foreach (request_headers() as $name => $value) {
    if (in_array(strtolower($name), $skip, true)) {
        continue;
    }
    if (strtolower($name) === 'authorization') {
        $hasAuthorization = true;
    }
    $headers[] = $name . ': ' . $value;
}

// Apache/PHP-FPM может скрывать Authorization от getallheaders().
// Значение прокидывается из .htaccess (E=HTTP_AUTHORIZATION) или CGIPassAuth.
if (!$hasAuthorization) {
    $authorization = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if ($authorization !== '') {
        $headers[] = 'Authorization: ' . $authorization;
    }
}

$ch = curl_init($target);
$options = [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
    CURLOPT_TIMEOUT => TOTAL_TIMEOUT,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
];

if (!in_array($method, ['GET', 'HEAD'], true)) {
    $options[CURLOPT_POSTFIELDS] = file_get_contents('php://input');
}

curl_setopt_array($ch, $options);
$body = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
curl_close($ch);

if ($body === false || $status === 0) {
    error_log('[proxy] upstream failed: ' . $error . ' ' . $target);
    respond_json(502, ['detail' => 'Upstream request failed']);
}

http_response_code($status);
if ($contentType) {
    header('Content-Type: ' . $contentType);
}
if ($is_image) {
    header('Cache-Control: public, max-age=86400');
}
echo $method === 'HEAD' ? '' : $body;
