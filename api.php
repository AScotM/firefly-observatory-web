<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $code, array $body): never { http_response_code($code); echo json_encode($body, JSON_THROW_ON_ERROR); exit; }
$defaults = ['mode'=>'fireflies','palette'=>'ember','count'=>1100,'speed'=>100,'turbulence'=>65,'trail'=>79,'glow'=>100,'pointer'=>true];
$allowedModes = ['fireflies','nebula','aurora','vortex','ocean'];
$allowedPalettes = ['ember','arctic','violet','forest','prism'];
$file = __DIR__ . '/data/preset.json';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $stored = is_file($file) ? json_decode((string)file_get_contents($file), true) : null;
    respond(200, ['ok'=>true,'preset'=>is_array($stored) ? $stored : $defaults,'saved'=>is_array($stored)]);
}
if ($method !== 'POST') { header('Allow: GET, POST'); respond(405, ['ok'=>false,'error'=>'Method not allowed']); }
if (($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) respond(413, ['ok'=>false,'error'=>'Payload too large']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '') {
    $parts = parse_url($origin);
    if (!is_array($parts) || ($parts['host'] ?? '') !== explode(':', $host)[0]) respond(403, ['ok'=>false,'error'=>'Origin denied']);
}
$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input)) respond(400, ['ok'=>false,'error'=>'Invalid JSON']);
if (!in_array($input['mode'] ?? null, $allowedModes, true) || !in_array($input['palette'] ?? null, $allowedPalettes, true)) respond(422, ['ok'=>false,'error'=>'Invalid environment']);
$limits = ['count'=>[100,3500],'speed'=>[10,250],'turbulence'=>[0,200],'trail'=>[0,98],'glow'=>[10,200]];
$result = ['mode'=>$input['mode'],'palette'=>$input['palette']];
foreach ($limits as $key=>$range) {
    if (!isset($input[$key]) || !is_int($input[$key]) || $input[$key] < $range[0] || $input[$key] > $range[1]) respond(422, ['ok'=>false,'error'=>'Invalid '.$key]);
    $result[$key] = $input[$key];
}
if (!isset($input['pointer']) || !is_bool($input['pointer'])) respond(422, ['ok'=>false,'error'=>'Invalid pointer']);
$result['pointer'] = $input['pointer'];
if (!is_dir(dirname($file)) || !is_writable(dirname($file))) respond(503, ['ok'=>false,'error'=>'Preset storage is not writable']);
try {
    $tmp = tempnam(dirname($file), 'preset_');
    if ($tmp === false) throw new RuntimeException('Cannot create temporary file');
    if (file_put_contents($tmp, json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), LOCK_EX) === false || !rename($tmp, $file)) throw new RuntimeException('Cannot save preset');
    chmod($file, 0640);
    respond(200, ['ok'=>true,'preset'=>$result]);
} catch (Throwable $e) { respond(500, ['ok'=>false,'error'=>'Preset write failed']); }
