const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');

let content = fs.readFileSync(TARGET_FILE, 'utf8');

// 1. Asegurar estado y función handleDescargaDirecta
if (!content.includes('downloadingFile')) {
  const stateAnchor = 'const [deleting, setDeleting] = useState(false);';
  const stateBlock = `const [deleting, setDeleting] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDescargaDirecta = async (url: string, fallbackName: string) => {
    try {
      setDownloadingFile(url);
      await downloadFile(url, fallbackName);
    } finally {
      setDownloadingFile(null);
    }
  };`;
  content = content.replace(stateAnchor, stateBlock);
}

// 2. Reemplazar los 4 tags <a> por <button>
// Reemplazo Logo
content = content.replace(
  `<a\n                                  href={logo}\n                                  target="_blank"\n                                  rel="noreferrer"\n                                  download\n                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"\n                                >\n                                  <Download className="w-3 h-3" /> Descargar\n                                </a>`,
  `<button
                                  type="button"
                                  onClick={() => handleDescargaDirecta(logo, cleanFileName(logo, 'logo.jpg'))}
                                  disabled={downloadingFile === logo}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0 disabled:opacity-60"
                                >
                                  <Download className="w-3 h-3" /> {downloadingFile === logo ? 'Descargando...' : 'Descargar'}
                                </button>`
);

// Reemplazo Banner
content = content.replace(
  `<a\n                                  href={banner}\n                                  target="_blank"\n                                  rel="noreferrer"\n                                  download\n                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"\n                                >\n                                  <Download className="w-3 h-3" /> Descargar\n                                </a>`,
  `<button
                                  type="button"
                                  onClick={() => handleDescargaDirecta(banner, cleanFileName(banner, 'banner.jpg'))}
                                  disabled={downloadingFile === banner}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0 disabled:opacity-60"
                                >
                                  <Download className="w-3 h-3" /> {downloadingFile === banner ? 'Descargando...' : 'Descargar'}
                                </button>`
);

// Reemplazo Template / Catálogo
content = content.replace(
  `<a\n                                  href={template}\n                                  target="_blank"\n                                  rel="noreferrer"\n                                  download\n                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"\n                                >\n                                  <Download className="w-3 h-3" /> Descargar\n                                </a>`,
  `<button
                                  type="button"
                                  onClick={() => handleDescargaDirecta(template, cleanFileName(template, 'catalogo.xlsx'))}
                                  disabled={downloadingFile === template}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0 disabled:opacity-60"
                                >
                                  <Download className="w-3 h-3" /> {downloadingFile === template ? 'Descargando...' : 'Descargar'}
                                </button>`
);

// Reemplazo Fotos
content = content.replace(
  `<a\n                                    href={photoUrl}\n                                    target="_blank"\n                                    rel="noreferrer"\n                                    download\n                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"\n                                  >\n                                    <Download className="w-3 h-3" /> Descargar\n                                  </a>`,
  `<button
                                    type="button"
                                    onClick={() => handleDescargaDirecta(photoUrl, cleanFileName(photoUrl, \`foto_\${idx + 1}.jpg\`))}
                                    disabled={downloadingFile === photoUrl}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0 disabled:opacity-60"
                                  >
                                    <Download className="w-3 h-3" /> {downloadingFile === photoUrl ? 'Descargando...' : 'Descargar'}
                                  </button>`
);

fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ Botones reemplazados por <button type="button"> con descarga directa');

console.log('--- VALIDACIÓN TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error en TypeScript.');
}
