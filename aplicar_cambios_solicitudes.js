const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');
const BACKUP_FILE = TARGET_FILE + '.bak';

console.log('--- 1. CREANDO RESPALDO DE SEGURIDAD ---');
if (!fs.existsSync(TARGET_FILE)) {
  console.error('ERROR: No se encontró', TARGET_FILE);
  process.exit(1);
}
fs.copyFileSync(TARGET_FILE, BACKUP_FILE);
console.log('✓ Respaldo creado en:', BACKUP_FILE);

let content = fs.readFileSync(TARGET_FILE, 'utf8');

console.log('--- 2. APLICANDO TAREA 1: CAMPOS FALTANTES EN TARJETA DE DATOS ---');
const canalDifusionAnchor = `<p><strong>Canal de Difusión:</strong> <span className="font-mono font-bold text-primary">{selectedItem.referralChannel || 'Directo'}</span></p>`;

if (!content.includes(canalDifusionAnchor)) {
  console.error('ERROR: No se encontró el ancla de "Canal de Difusión" en admin-inbox.tsx');
  process.exit(1);
}

const camposNuevos = `${canalDifusionAnchor}
              {selectedItem.businessName && (
                <p><strong>🏢 Negocio:</strong> {selectedItem.businessName}</p>
              )}
              {selectedItem.category && (
                <p>
                  <strong>🏷️ Categoría:</strong> {selectedItem.category}
                  {selectedItem.subcategory ? \` (\${selectedItem.subcategory})\` : ''}
                </p>
              )}
              {(() => {
                const recursos = [];
                if (selectedItem.images?.noLogoCreateForMe) recursos.push('Logo');
                if (selectedItem.images?.noBannerCreateForMe) recursos.push('Banner');
                if (selectedItem.products?.noProductsPhotosCreateForMe) recursos.push('Fotos de productos');
                if (recursos.length === 0) return null;
                return (
                  <p><strong>🎨 Creación de Recursos solicitada:</strong> {recursos.join(', ')}</p>
                );
              })()}`;

content = content.replace(canalDifusionAnchor, camposNuevos);

console.log('--- 3. APLICANDO TAREA 2: SECCIÓN DESCARGAR ARCHIVOS ---');
const whatsappAnchor = `<div className="border-t border-border pt-4 flex items-center justify-between">
              <span className="text-xs font-bold">Notificación WhatsApp:</span>`;

if (!content.includes(whatsappAnchor)) {
  console.error('ERROR: No se encontró el ancla de "Notificación WhatsApp" en admin-inbox.tsx');
  process.exit(1);
}

const seccionArchivos = `{/* SECCIÓN DESCARGAR ARCHIVOS */}
            {(() => {
              const logo = selectedItem.images?.logoUrl;
              const banner = selectedItem.images?.bannerUrl;
              const template = selectedItem.products?.templateFileUrl;
              const photos = Array.isArray(selectedItem.products?.productPhotosUrls) ? selectedItem.products.productPhotosUrls : [];
              const hasVisual = Boolean(logo || banner);
              const hasCatalog = Boolean(template || photos.length > 0);
              const hasAny = hasVisual || hasCatalog;

              const cleanFileName = (url, fallback) => {
                if (!url) return fallback;
                try {
                  const segs = url.split('/');
                  const last = segs[segs.length - 1].split('?')[0];
                  return decodeURIComponent(last) || fallback;
                } catch {
                  return fallback;
                }
              };

              return (
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Descargar archivos:</span>
                  </div>

                  {!hasAny ? (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-lg border border-dashed border-border text-center">
                      Sin archivos adjuntos
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Identidad Visual */}
                      {hasVisual && (
                        <div className="p-2.5 rounded-lg border border-border bg-card/60 space-y-2">
                          <p className="text-[11px] font-bold text-muted-foreground">🎨 Identidad Visual</p>
                          <div className="space-y-1.5">
                            {logo ? (
                              <div className="flex items-center justify-between gap-2 text-xs p-1.5 rounded bg-muted/40">
                                <span className="truncate max-w-[180px] font-mono text-[11px]" title={cleanFileName(logo, 'Logo')}>
                                  {cleanFileName(logo, 'Logo')}
                                </span>
                                <a
                                  href={logo}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"
                                >
                                  <Download className="w-3 h-3" /> Descargar
                                </a>
                              </div>
                            ) : null}

                            {banner ? (
                              <div className="flex items-center justify-between gap-2 text-xs p-1.5 rounded bg-muted/40">
                                <span className="truncate max-w-[180px] font-mono text-[11px]" title={cleanFileName(banner, 'Banner')}>
                                  {cleanFileName(banner, 'Banner')}
                                </span>
                                <a
                                  href={banner}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"
                                >
                                  <Download className="w-3 h-3" /> Descargar
                                </a>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Catálogo de Productos */}
                      {hasCatalog && (
                        <div className="p-2.5 rounded-lg border border-border bg-card/60 space-y-2">
                          <p className="text-[11px] font-bold text-muted-foreground">📦 Catálogo de Productos</p>
                          <div className="space-y-1.5">
                            {template ? (
                              <div className="flex items-center justify-between gap-2 text-xs p-1.5 rounded bg-muted/40">
                                <span className="truncate max-w-[180px] font-mono text-[11px]" title={cleanFileName(template, 'Catálogo')}>
                                  {cleanFileName(template, 'Catálogo')}
                                </span>
                                <a
                                  href={template}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"
                                >
                                  <Download className="w-3 h-3" /> Descargar
                                </a>
                              </div>
                            ) : null}

                            {photos.map((photoUrl, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 text-xs p-1.5 rounded bg-muted/40">
                                <span className="truncate max-w-[180px] font-mono text-[11px]" title={cleanFileName(photoUrl, \`Foto \${idx + 1}\`)}>
                                  {cleanFileName(photoUrl, \`Foto \${idx + 1}\`)}
                                </span>
                                {photoUrl ? (
                                  <a
                                    href={photoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs hover:opacity-90 shrink-0"
                                  >
                                    <Download className="w-3 h-3" /> Descargar
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">No disponible para descarga</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            ${whatsappAnchor}`;

content = content.replace(whatsappAnchor, seccionArchivos);

fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ Modificación aplicada con éxito en:', TARGET_FILE);

console.log('--- 4. VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: SIN ERRORES');
} catch (e) {
  console.error('ALERTA: Se detectó un error al compilar TypeScript.');
}
