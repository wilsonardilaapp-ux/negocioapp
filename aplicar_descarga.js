const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Crear src/lib/downloadFile.ts
const helperPath = path.join(process.cwd(), 'src/lib/downloadFile.ts');
const helperCode = `export function getDownloadUrl(url: string, filename?: string): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('fl_attachment')) {
    const safeName = filename
      ? filename.replace(/\\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      : '';
    const param = safeName ? \`fl_attachment:\${safeName}\` : 'fl_attachment';
    return url.replace('/upload/', \`/upload/\${param}/\`);
  }
  return url;
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  if (!url) {
    alert('URL de archivo no disponible.');
    return;
  }
  const cleanName = filename.trim() || 'archivo_descarga';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  } catch (err1) {
    try {
      const directUrl = getDownloadUrl(url, cleanName);
      const link = document.createElement('a');
      link.href = directUrl;
      link.setAttribute('download', cleanName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err2) {
      alert('No se pudo descargar el archivo. Intenta de nuevo.');
    }
  }
}
`;
fs.writeFileSync(helperPath, helperCode, 'utf8');
console.log('✓ Creado src/lib/downloadFile.ts');

// 2. Respaldo y lectura de admin-inbox.tsx
const inboxPath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');
if (!fs.existsSync(inboxPath + '.bak')) {
  fs.copyFileSync(inboxPath, inboxPath + '.bak');
  console.log('✓ Respaldo creado en admin-inbox.tsx.bak');
}
let content = fs.readFileSync(inboxPath, 'utf8');

// 3. Inyectar import
if (!content.includes("from '@/lib/downloadFile'")) {
  content = `import { downloadFile } from '@/lib/downloadFile';\n` + content;
}

// 4. Inyectar estado
const stateAnchor = 'const [deleting, setDeleting] = useState(false);';
const stateAddition = `const [deleting, setDeleting] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const handleDescargaDirecta = async (url: string, fallbackName: string) => {
    try {
      setDownloadingFile(url);
      await downloadFile(url, fallbackName);
    } finally {
      setDownloadingFile(null);
    }
  };`;
if (content.includes(stateAnchor) && !content.includes('downloadingFile')) {
  content = content.replace(stateAnchor, stateAddition);
}

// 5. Reemplazar botones <a> por <button>
function replaceDownloadLink(src, variableName, defaultName) {
  const regex = new RegExp('<a[\\s\\S]*?href={' + variableName + '}[\\s\\S]*?<Download className="w-3 h-3" \\/> Descargar<\\/a>');
  const replacement = `<button
                                  type="button"
                                  onClick={() => handleDescargaDirecta(${variableName}, cleanFileName(${variableName}, '${defaultName}'))}
                                  disabled={downloadingFile === ${variableName}}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0 disabled:opacity-60"
                                >
                                  <Download className="w-3 h-3" /> {downloadingFile === ${variableName} ? 'Descargando...' : 'Descargar'}
                                </button>`;
  return src.replace(regex, replacement);
}

content = replaceDownloadLink(content, 'logo', 'logo.jpg');
content = replaceDownloadLink(content, 'banner', 'banner.jpg');
content = replaceDownloadLink(content, 'template', 'catalogo.xlsx');

// Para fotos
const photoRegex = /<a[\s\S]*?href={photoUrl}[\s\S]*?<Download className="w-3 h-3" \/> Descargar<\/a>/;
const photoReplacement = `<button
                                    type="button"
                                    onClick={() => handleDescargaDirecta(photoUrl, cleanFileName(photoUrl, \`foto_\${idx + 1}.jpg\`))}
                                    disabled={downloadingFile === photoUrl}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0 disabled:opacity-60"
                                  >
                                    <Download className="w-3 h-3" /> {downloadingFile === photoUrl ? 'Descargando...' : 'Descargar'}
                                  </button>`;
content = content.replace(photoRegex, photoReplacement);

fs.writeFileSync(inboxPath, content, 'utf8');
console.log('✓ admin-inbox.tsx actualizado.');

// 6. Validación TypeScript
console.log('--- VALIDACIÓN TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error en validación TypeScript.');
}
