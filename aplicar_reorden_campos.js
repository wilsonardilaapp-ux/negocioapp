const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');
const BACKUP_FILE = TARGET_FILE + '.bak';

console.log('--- 1. CREANDO RESPALDO DE SEGURIDAD ---');
fs.copyFileSync(TARGET_FILE, BACKUP_FILE);
console.log('✓ Respaldo creado en:', BACKUP_FILE);

let content = fs.readFileSync(TARGET_FILE, 'utf8');

// Localizar el bloque exacto extraído en el diagnóstico
const bloqueActual = `<div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
              <p><strong>Canal de Difusión:</strong> <span className="font-mono font-bold text-primary">{selectedItem.referralChannel || 'Directo'}</span></p>
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
              })()}
              {selectedItem.images?.stylePreference && (
                <p><strong>✨ Estilo preferido:</strong> {selectedItem.images.stylePreference}</p>
              )}
              <p><strong>Nombre completo:</strong> {selectedItem.fullName || 'No registrado'}</p>
              <p><strong>Teléfono:</strong> {selectedItem.phone}</p>
              <p><strong>Dirección:</strong> {selectedItem.address}</p>
              {selectedItem.email && <p><strong>Correo:</strong> {selectedItem.email}</p>}
              <p><strong>Descripción:</strong> {selectedItem.description}</p>
            </div>`;

const bloqueReordenado = `<div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
              <p><strong>Canal de Difusión:</strong> <span className="font-mono font-bold text-primary">{selectedItem.referralChannel || 'Directo'}</span></p>
              {selectedItem.businessName && (
                <p><strong>🏢 Negocio:</strong> {selectedItem.businessName}</p>
              )}
              <p><strong>Nombre completo:</strong> {selectedItem.fullName || 'No registrado'}</p>
              <p><strong>Teléfono:</strong> {selectedItem.phone}</p>
              <p><strong>Dirección:</strong> {selectedItem.address}</p>
              {selectedItem.email && <p><strong>Correo:</strong> {selectedItem.email}</p>}
              <p><strong>Descripción:</strong> {selectedItem.description}</p>
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
              })()}
              {selectedItem.images?.stylePreference && (
                <p><strong>✨ Estilo preferido:</strong> {selectedItem.images.stylePreference}</p>
              )}
            </div>`;

if (!content.includes(bloqueActual)) {
  console.error('ERROR: No se pudo hacer coincidir el bloque actual.');
  process.exit(1);
}

content = content.replace(bloqueActual, bloqueReordenado);
fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ Campos reordenados correctamente en admin-inbox.tsx');

console.log('--- 2. VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error detectado en TypeScript.');
}
