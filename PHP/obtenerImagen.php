<?php
// ============================================================
//  MAMBAQ — Servir imagen original de una obra
//  Ubicación : proyecto/PHP/obtener_imagen.php
//  Método    : GET ?id=<int>
// ============================================================

header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit('Método no permitido.');
}

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    exit('ID inválido.');
}

require_once __DIR__ . '/bdMambaq.php';

$stmt = $conn->prepare(
    "SELECT imagen_original, imagen_original_mime, imagen_original_nombre
     FROM obras WHERE id = ? LIMIT 1"
);
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    http_response_code(404);
    exit('Imagen no encontrada.');
}

$stmt->bind_result($binario, $mime, $nombre);
$stmt->fetch();
$stmt->close();
$conn->close();

if (empty($binario)) {
    http_response_code(404);
    exit('Esta obra no tiene imagen guardada.');
}

$mime   = $mime   ?: 'image/jpeg';
$nombre = $nombre ?: 'imagen.jpg';

header('Content-Type: '        . $mime);
header('Content-Disposition: inline; filename="' . addslashes($nombre) . '"');
header('Cache-Control: public, max-age=86400');
header('Content-Length: '      . strlen($binario));

echo $binario;
exit;