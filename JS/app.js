/* ============================================================
   MAMBAQ — Lógica principal
   Archivo: JS/app.js
   ============================================================ */

// ── Estado global ─────────────────────────────────────────
const screens    = ['home', 'scan', 'gallery', 'about'];
const navScreens = ['home', 'scan', 'gallery', 'about'];

let uploadedImageBase64 = null;
let uploadedImageMime   = 'image/jpeg';
let uploadedImageNombre = 'dibujo.jpg';

// ── Navegación ────────────────────────────────────────────
function goTo(screen) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.remove('active');
  });
  const target = document.getElementById(screen);
  if (target) target.classList.add('active');

  navScreens.forEach(s => {
    const nav = document.getElementById('nav-' + s);
    if (nav) nav.classList.remove('active');
  });
  const activeNav = document.getElementById('nav-' + screen);
  if (activeNav) activeNav.classList.add('active');

  window.scrollTo(0, 0);

  // Recargar galería cada vez que se entra
  if (screen === 'gallery') buildGallery();
}

// ── Carga de imagen ───────────────────────────────────────
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  uploadedImageMime   = file.type   || 'image/jpeg';
  uploadedImageNombre = file.name   || 'dibujo.jpg';

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl       = e.target.result;
    uploadedImageBase64 = dataUrl.split(',')[1];

    const preview = document.getElementById('scanPreview');
    if (preview) {
      preview.src          = dataUrl;
      preview.style.display = 'block';
    }

    const icon  = document.querySelector('.scan-area .scan-icon');
    const texto = document.querySelector('.scan-area p');
    const small = document.querySelector('.scan-area small');
    if (icon)  icon.style.display  = 'none';
    if (texto) texto.style.display = 'none';
    if (small) small.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   GUARDAR EN BASE DE DATOS
   Botón: "✦ Guardar en galería"
   Endpoint: PHP/guardar_obra.php
   ============================================================ */
async function saveToGallery() {
  const titulo = document.getElementById('obraName')?.value?.trim()  || '';
  const autor  = document.getElementById('autorName')?.value?.trim() || '';
  const edad   = document.getElementById('edadNino')?.value?.trim()  || '';

  // Validaciones básicas
  if (!titulo) {
    alert('Por favor escribe el nombre de la obra.');
    return;
  }
  if (!autor) {
    alert('Por favor escribe el nombre del autor.');
    return;
  }

  const preview = document.getElementById('scanPreview');
  if (!uploadedImageBase64 || !preview || preview.style.display === 'none') {
    alert('Por favor carga una imagen primero.');
    return;
  }

  // Feedback visual — botón en estado cargando
  const btn = document.getElementById('processBtn');
  const textoOriginal = btn.textContent;
  btn.textContent  = '⏳ Guardando...';
  btn.disabled     = true;
  btn.style.opacity = '0.7';

  try {
    const body = {
      titulo,
      autor,
      edad:                    edad   || null,
      imagen_original_base64:  uploadedImageBase64,
      imagen_original_mime:    uploadedImageMime,
      imagen_original_nombre:  uploadedImageNombre,
    };

    const response = await fetch('PHP/guardarObra.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await response.json();

    if (data.success) {
      // Éxito — feedback verde
      btn.textContent       = '✓ ¡Guardada en el museo!';
      btn.style.background  = '#2D6B3C';
      btn.style.opacity     = '1';
      btn.style.color       = 'white';

      // Limpiar formulario después de guardar
      setTimeout(() => {
        document.getElementById('obraName').value  = '';
        document.getElementById('autorName').value = '';
        document.getElementById('edadNino').value  = '';

        // Resetear preview
        if (preview) preview.style.display = 'none';
        uploadedImageBase64 = null;
        const icon  = document.querySelector('.scan-area .scan-icon');
        const texto = document.querySelector('.scan-area p');
        const small = document.querySelector('.scan-area small');
        if (icon)  icon.style.display  = '';
        if (texto) texto.style.display = '';
        if (small) small.style.display = '';

        // Restaurar botón
        btn.textContent      = textoOriginal;
        btn.disabled         = false;
        btn.style.background = '';
        btn.style.opacity    = '1';
        btn.style.color      = '';

        // Ir a galería
        goTo('gallery');
      }, 1200);

    } else {
      throw new Error(data.error || 'Error desconocido');
    }

  } catch (err) {
    console.error('Error al guardar:', err);
    btn.textContent      = '✦ Guardar en galería';
    btn.disabled         = false;
    btn.style.opacity    = '1';
    btn.style.background = '';
    alert('No se pudo guardar la obra. Verifica que el servidor PHP esté activo.\n\nDetalle: ' + err.message);
  }
}

/* ============================================================
   GALERÍA — Carga obras reales desde la base de datos
   Endpoint: PHP/listar_obras.php
   ============================================================ */
async function buildGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column:1/-1;padding:30px 0;text-align:center;color:var(--muted);font-size:13px;">
      ⏳ Cargando obras...
    </div>`;

  try {
    const res  = await fetch('PHP/listasObras.php?limit=50&offset=0');
    const data = await res.json();

    if (!data.obras || data.obras.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;padding:40px 20px;text-align:center;color:var(--muted);font-size:13px;">
          🎨 Aún no hay obras en la galería.<br>
          <span style="font-size:11px;opacity:0.6;">¡Sé el primero en crear una!</span>
        </div>`;
      return;
    }

    grid.innerHTML = data.obras.map(obra => {
      const fecha = new Date(obra.created_at).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      // Imagen: usar la original guardada en BD
      const imgSrc = obra.imagen_original_url
        ? obra.imagen_original_url
        : null;

      const thumbHTML = imgSrc
        ? `<img src="${imgSrc}"
               style="width:100%;height:100%;object-fit:cover;"
               alt="${obra.titulo}"
               onerror="this.parentElement.innerHTML='<span style=font-size:36px>🎨</span>'">`
        : `<span style="font-size:36px;">🎨</span>`;

      return `
        <div class="gallery-card">
          <div class="gallery-thumb" style="background:#1A1209;">
            ${thumbHTML}
          </div>
          <div class="gallery-info">
            <h4>${obra.titulo}</h4>
            <p>Por ${obra.autor}${obra.edad ? ' · ' + obra.edad : ''}</p>
            <div class="date">${fecha}</div>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando galería:', err);
    grid.innerHTML = `
      <div style="grid-column:1/-1;padding:30px 20px;text-align:center;color:var(--muted);font-size:13px;">
        ⚠️ Error al cargar la galería.<br>
        <span style="font-size:11px;opacity:0.6;">Verifica que el servidor PHP esté activo.</span>
      </div>`;
  }
}

/* ============================================================
   TEACHABLE MACHINE — Clasificador de dibujos
   ============================================================ */
const TM_MODEL_URL     = 'https://teachablemachine.withgoogle.com/models/GOsD0dAnf/';
let   tmModel          = null;
let   tmImageForClassify = null;

async function tmLoadModel() {
  try {
    tmModel = await window.tmImage.load(
      TM_MODEL_URL + 'model.json',
      TM_MODEL_URL + 'metadata.json'
    );
    const st = document.getElementById('tmStatus');
    if (st) {
      st.textContent      = 'Modelo listo ✓';
      st.style.background = 'rgba(60,180,80,0.15)';
      st.style.color      = '#5CCC70';
    }
  } catch (e) {
    console.warn('Error cargando modelo TM:', e);
    const st = document.getElementById('tmStatus');
    if (st) {
      st.textContent = 'Error al cargar';
      st.style.color = '#E05A2B';
    }
  }
}

function tmHandleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('tmPreviewImg');
    if (!img) return;
    img.src          = e.target.result;
    img.style.display = 'block';
    const ph = document.getElementById('tmPlaceholder');
    const rs = document.getElementById('tmResults');
    if (ph) ph.style.display = 'none';
    if (rs) rs.style.display = 'none';
    img.onload = () => {
      tmImageForClassify = img;
      const btn = document.getElementById('tmBtn');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    };
  };
  reader.readAsDataURL(file);
}

async function tmClassify() {
  if (!tmModel || !tmImageForClassify) return;
  const btn = document.getElementById('tmBtn');
  if (btn) { btn.textContent = '⏳ Clasificando...'; btn.disabled = true; btn.style.opacity = '0.6'; }

  try {
    const predictions = await tmModel.predict(tmImageForClassify);
    predictions.sort((a, b) => b.probability - a.probability);

    const listEl = document.getElementById('tmResultList');
    if (listEl) {
      listEl.innerHTML = predictions.map((p, i) => {
        const pct      = Math.round(p.probability * 100);
        const isTop    = i === 0;
        const barColor = isTop ? 'var(--gold)' : 'rgba(201,168,76,0.3)';
        return `
          <div style="margin-bottom:${i < predictions.length - 1 ? '10px' : '0'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:${isTop ? '600' : '400'};color:${isTop ? 'white' : 'rgba(255,255,255,0.5)'};">
                ${isTop ? '✦ ' : ''}${p.className}
              </span>
              <span style="font-size:12px;font-weight:600;color:${isTop ? 'var(--gold)' : 'rgba(255,255,255,0.35)'};">${pct}%</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.6s ease;"></div>
            </div>
          </div>`;
      }).join('');
    }

    const rs = document.getElementById('tmResults');
    if (rs) rs.style.display = 'block';
  } catch (e) {
    console.error('Error en clasificación:', e);
  }

  if (btn) { btn.textContent = '✦ Clasificar de nuevo'; btn.disabled = false; btn.style.opacity = '1'; }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGallery();
  tmLoadModel();
});