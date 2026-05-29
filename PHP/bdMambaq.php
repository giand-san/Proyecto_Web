<?php
$host = "localhost";
$usuario_db = "root";
$contrasena_db = "";
$nombre_db = "mambaq_bd";

    $conn = new mysqli($host, $usuario_db, $contrasena_db, $nombre_db);

    if ($conn->connect_error) {

    die(
        "Error de conexión: " .
        $conn->connect_error
    );
}

$conn->set_charset("utf8mb4");
?>