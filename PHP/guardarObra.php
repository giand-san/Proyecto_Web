<?php
// ============================================================
//  MAMBAQ — Guardar obra en la base de datos
// ============================================================

set_error_handler(function($errno, $errstr) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => "PHP Error: $errstr (código $errno)"]);
    exit;
});

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

require_once __DIR__ . '/bdMambaq.php';

// ── Leer body JSON ────────────────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Body JSON inválido.']);
    exit;
}

// ── Validar campos obligatorios ───────────────────────────
$titulo = trim($body['titulo'] ?? '');
$autor  = trim($body['autor']  ?? '');

if ($titulo === '') {
    http_response_code(400);
    echo json_encode(['error' => 'El campo titulo es obligatorio.']);
    exit;
}
if ($autor === '') {
    http_response_code(400);
    echo json_encode(['error' => 'El campo autor es obligatorio.']);
    exit;
}

// ── Campos opcionales ─────────────────────────────────────
$edad                   = trim($body['edad']                   ?? '') ?: null;
$imagen_original_mime   = trim($body['imagen_original_mime']   ?? 'image/jpeg');
$imagen_original_nombre = trim($body['imagen_original_nombre'] ?? 'dibujo.jpg');

// ── Decodificar imagen (base64 → binario) ─────────────────
$imagen_original_bin = null;

if (!empty($body['imagen_original_base64'])) {
    $b64 = preg_replace('/^data:[^;]+;base64,/', '', $body['imagen_original_base64']);
    $bin = base64_decode($b64, true);

    if ($bin === false) {
        http_response_code(400);
        echo json_encode(['error' => 'La imagen no es base64 válido.']);
        exit;
    }

    if (strlen($bin) > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'La imagen supera el límite de 5 MB.']);
        exit;
    }

    $imagen_original_bin = $bin;
}

// ── Insertar en tabla obras ───────────────────────────────
if ($imagen_original_bin !== null) {

    // CON imagen — usar send_long_data para el BLOB
    $sql  = "INSERT INTO obras
                (titulo, autor, edad, imagen_original, imagen_original_mime, imagen_original_nombre)
             VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error prepare: ' . $conn->error]);
        exit;
    }

    $null = null;
    $ok = $stmt->bind_param('sssbss',
        $titulo,
        $autor,
        $edad,
        $null,
        $imagen_original_mime,
        $imagen_original_nombre
    );

    if (!$ok) {
        http_response_code(500);
        echo json_encode(['error' => 'Error bind_param: ' . $stmt->error]);
        exit;
    }

    $stmt->send_long_data(3, $imagen_original_bin);

} else {

    // SIN imagen — INSERT con NULL directo
    $sql  = "INSERT INTO obras
                (titulo, autor, edad, imagen_original, imagen_original_mime, imagen_original_nombre)
             VALUES (?, ?, ?, NULL, ?, ?)";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Error prepare: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param('sssss',
        $titulo,
        $autor,
        $edad,
        $imagen_original_mime,
        $imagen_original_nombre
    );
}

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => 'Error execute: ' . $stmt->error]);
    exit;
}

$nuevo_id = $stmt->insert_id;
$stmt->close();
$conn->close();

http_response_code(201);
echo json_encode([
    'success'    => true,
    'id'         => $nuevo_id,
    'created_at' => date('Y-m-d H:i:s'),
    'mensaje'    => 'Obra guardada en MAMBAQ.',
], JSON_UNESCAPED_UNICODE);
