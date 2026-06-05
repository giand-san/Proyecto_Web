/* ============================================================
   MAMBAQ — Servidor Node.js + Express
   Archivo: bd.js  (raíz del proyecto)

   Instalar dependencias antes de correr:
     npm install express mysql cors
   
   Correr:
     node bd.js
     nodemon bd.js
   ============================================================ */

const express = require('express');
const mysql   = require('mysql');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));   // imágenes en base64 pueden ser grandes
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Raíz del proyecto (un nivel arriba de JS/)
const ROOT = path.join(__dirname, '..');

// Sirve todos los archivos estáticos del proyecto (HTML, CSS, JS)
app.use(express.static(ROOT));

// ── Conexión a MySQL ──────────────────────────────────────
const conexion = mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'mambaq_bd',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || ''
});

conexion.connect(function (error) {
  if (error) {
    console.error('❌ Error de conexión a MySQL:', error.message);
    process.exit(1);
  }
  console.log('✅ CONEXIÓN EXITOSA a MySQL — base de datos: mambaq_bd');
  crearTabla();   // crea la tabla si no existe
});

// ── Crear tabla automáticamente ───────────────────────────
function crearTabla() {
  const sql = `
    CREATE TABLE IF NOT EXISTS obras (
      id                      INT AUTO_INCREMENT PRIMARY KEY,
      titulo                  VARCHAR(255)   NOT NULL,
      autor                   VARCHAR(255)   NOT NULL,
      edad                    VARCHAR(50)    DEFAULT NULL,
      imagen_original         LONGBLOB       NOT NULL,
      imagen_original_mime    VARCHAR(50)    DEFAULT 'image/jpeg',
      imagen_original_nombre  VARCHAR(255)   DEFAULT 'dibujo.jpg',
      created_at              DATETIME       DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  conexion.query(sql, (err) => {
    if (err) {
      console.error('❌ Error creando tabla:', err.message);
    } else {
      console.log('✅ Tabla "obras" lista');
    }
  });
}

/* ============================================================
   POST /PHP/guardarObra.php
   Guarda una obra en la base de datos.
   Body JSON esperado:
   {
     titulo, autor, edad,
     imagen_original_base64,
     imagen_original_mime,
     imagen_original_nombre
   }
   ============================================================ */
app.post('/PHP/guardarObra.php', (req, res) => {
  const {
    titulo,
    autor,
    edad                   = null,
    imagen_original_base64,
    imagen_original_mime   = 'image/jpeg',
    imagen_original_nombre = 'dibujo.jpg',
  } = req.body;

  // Validaciones
  if (!titulo || !autor) {
    return res.json({ success: false, error: 'Título y autor son obligatorios.' });
  }
  if (!imagen_original_base64) {
    return res.json({ success: false, error: 'No se recibió imagen.' });
  }

  // Convertir base64 → Buffer para guardar como BLOB
  let imageBuffer;
  try {
    imageBuffer = Buffer.from(imagen_original_base64, 'base64');
  } catch (e) {
    return res.json({ success: false, error: 'Imagen en base64 inválida.' });
  }

  const sql = `
    INSERT INTO obras
      (titulo, autor, edad, imagen_original, imagen_original_mime, imagen_original_nombre)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const valores = [titulo, autor, edad, imageBuffer, imagen_original_mime, imagen_original_nombre];

  conexion.query(sql, valores, (err, result) => {
    if (err) {
      console.error('❌ Error al guardar obra:', err.message);
      return res.json({ success: false, error: err.message });
    }
    console.log(`✅ Obra guardada — id: ${result.insertId}, título: "${titulo}"`);
    res.json({ success: true, id: result.insertId });
  });
});

/* ============================================================
   GET /PHP/listasObras.php?limit=50&offset=0
   Devuelve las obras para la galería.
   La imagen BLOB se convierte a base64 para enviarla al cliente.
   ============================================================ */
app.get('/PHP/listasObras.php', (req, res) => {
  const limit  = parseInt(req.query.limit)  || 50;
  const offset = parseInt(req.query.offset) || 0;

  const sql = `
    SELECT id, titulo, autor, edad,
           imagen_original, imagen_original_mime,
           created_at
    FROM obras
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  conexion.query(sql, [limit, offset], (err, rows) => {
    if (err) {
      console.error('❌ Error al listar obras:', err.message);
      return res.json({ success: false, error: err.message, obras: [] });
    }

    const obras = rows.map(row => {
      // Convertir BLOB → data URL para que el <img> lo muestre directamente
      const mime     = row.imagen_original_mime || 'image/jpeg';
      const base64   = row.imagen_original
        ? row.imagen_original.toString('base64')
        : null;
      const dataUrl  = base64 ? `data:${mime};base64,${base64}` : null;

      return {
        id:                   row.id,
        titulo:               row.titulo,
        autor:                row.autor,
        edad:                 row.edad,
        imagen_original_url:  dataUrl,   // ← app.js usa este campo
        created_at:           row.created_at,
      };
    });

    res.json({ success: true, total: obras.length, obras });
  });
});

/* ============================================================
   Ruta raíz → sirve index.html
   ============================================================ */
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// ── Iniciar servidor ──────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor MAMBAQ corriendo en http://localhost:${PORT}`);
  console.log('   Abre esa URL en el navegador para usar la app.\n');
});