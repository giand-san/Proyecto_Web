<?php
// ============================================================
//  MAMBAQ — Listar obras de la galería
//  Ubicación : proyecto/PHP/listar_obras.php
//  Método    : GET ?limit=50&offset=0
// ============================================================

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

require_once __DIR__ . '/bdMambaq.php';

$limit  = max(1, min(100, (int)($_GET['limit']  ?? 20)));
$offset = max(0,          (int)($_GET['offset'] ?? 0));

// Total
$total    = 0;
$resCount = $conn->query("SELECT COUNT(*) AS total FROM obras");
if ($resCount) {
    $total = (int)$resCount->fetch_assoc()['total'];
}

// Obras paginadas — sin traer el BLOB
$sql = "SELECT
            id,
            titulo,
            autor,
            edad,
            imagen_original_mime,
            imagen_original_nombre,
            created_at
        FROM obras
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();

$obras = [];
while ($row = $result->fetch_assoc()) {
    // URL para obtener la imagen original desde el servidor
    $row['imagen_original_url'] = $row['imagen_original_mime']
        ? 'PHP/obtener_imagen.php?id=' . $row['id']
        : null;
    $obras[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'obras'  => $obras,
    'total'  => $total,
    'limit'  => $limit,
    'offset' => $offset,
], JSON_UNESCAPED_UNICODE);