const fs = require('fs');

console.log('==============================================');
console.log('CORRIGIENDO SOLAPAMIENTO EN SECCIÓN 1 (ALIAS)');
console.log('==============================================');

const targetPath = 'src/modules/solicitudes-negocio/components/admin-share-tracking-tab.tsx';
if (!fs.existsSync(targetPath)) {
  console.error('[ERROR] No existe el archivo:', targetPath);
  process.exit(1);
}

// Respaldo .bak
fs.copyFileSync(targetPath, targetPath + '.bak');

let content = fs.readFileSync(targetPath, 'utf8');

// Reemplazar el bloque grid por un contenedor vertical limpio y robusto (space-y-4)
const oldSection1Grid = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <label className="block text-xs font-semibold">Tu identificador único:</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border">
                {origin}/r/
              </span>
              <input
                type="text"
                placeholder="mi-negocio"
                value={aliasInput}
                onChange={e => handleAliasChange(e.target.value)}
                className="flex-1 text-xs h-9 px-3 rounded-lg border border-input bg-background font-mono"
              />
              <button
                type="button"
                disabled={savingAlias || Boolean(aliasError)}
                onClick={handleSaveAlias}
                className="px-4 h-9 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingAlias ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            {aliasError && <p className="text-xs text-destructive font-medium">{aliasError}</p>}
          </div>

          <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Enlace Resultante:</span>
            <p className="text-xs font-mono font-bold text-primary truncate">
              {aliasUrl || directUrl}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyLink(aliasUrl || directUrl)}
                className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5"
              >
                {copiedLink === (aliasUrl || directUrl) ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink === (aliasUrl || directUrl) ? 'Copiado' : 'Copiar enlace'}
              </button>
              <button
                type="button"
                onClick={() => downloadQR(aliasUrl || directUrl, 'qr-registro-negocio')}
                className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Descargar QR
              </button>
            </div>
          </div>
        </div>`;

const newSection1Stacked = `<div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold">Tu identificador único:</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded-lg border truncate max-w-full sm:max-w-[45%]">
                {origin}/r/
              </span>
              <input
                type="text"
                placeholder="mi-negocio"
                value={aliasInput}
                onChange={e => handleAliasChange(e.target.value)}
                className="flex-1 text-xs h-9 px-3 rounded-lg border border-input bg-background font-mono"
              />
              <button
                type="button"
                disabled={savingAlias || Boolean(aliasError)}
                onClick={handleSaveAlias}
                className="px-4 h-9 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {savingAlias ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            {aliasError && <p className="text-xs text-destructive font-medium">{aliasError}</p>}
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Enlace Resultante:</span>
            <p className="text-xs font-mono font-bold text-primary break-all bg-background p-2 rounded border">
              {aliasUrl || directUrl}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyLink(aliasUrl || directUrl)}
                className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5"
              >
                {copiedLink === (aliasUrl || directUrl) ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink === (aliasUrl || directUrl) ? 'Copiado' : 'Copiar enlace'}
              </button>
              <button
                type="button"
                onClick={() => downloadQR(aliasUrl || directUrl, 'qr-registro-negocio')}
                className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Descargar QR
              </button>
            </div>
          </div>
        </div>`;

if (content.includes(oldSection1Grid)) {
  content = content.replace(oldSection1Grid, newSection1Stacked);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('[OK] Solapamiento corregido: diseño adaptado a contenedor fluido sin desbordamientos.');
} else {
  console.error('[AVISO] No se encontró el bloque exacto, aplicando reemplazo por búsqueda parcial...');
  // Fallback si cambió algún espacio
  const fallbackOld = 'grid grid-cols-1 md:grid-cols-2';
  if (content.includes(fallbackOld)) {
    content = content.replace('grid grid-cols-1 md:grid-cols-2 gap-4 items-start', 'space-y-4');
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('[OK - Fallback] Contenedor grid cambiado a space-y-4.');
  } else {
    console.error('[ERROR] No se pudo aplicar el cambio automáticamente.');
  }
}

console.log('==============================================');
