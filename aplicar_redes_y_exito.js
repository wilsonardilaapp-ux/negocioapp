const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function backup(file) {
  fs.copyFileSync(file, file + '.bak');
}

console.log('--- 1. ACTUALIZANDO public-form.tsx (Pantalla de éxito + WhatsApp en pestaña nueva) ---');
const formPath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/public-form.tsx');
backup(formPath);
let formContent = fs.readFileSync(formPath, 'utf8');

const oldSuccessBlock = `      if (resJson.whatsappUrl) {
        window.location.href = resJson.whatsappUrl;
      }`;

const newSuccessBlock = `      setSuccessData({
        id: resJson.solicitudId,
        message: resJson.message,
        plan: currentPlan,
        isPaid: isPaidPlan,
        paymentMethod: selectedPaymentMethod,
        whatsappUrl: resJson.whatsappUrl
      });

      if (resJson.whatsappUrl) {
        window.open(resJson.whatsappUrl, '_blank');
      }`;

if (formContent.includes(oldSuccessBlock)) {
  formContent = formContent.replace(oldSuccessBlock, newSuccessBlock);
  fs.writeFileSync(formPath, formContent, 'utf8');
  console.log('✓ Pantalla de éxito y apertura en nueva pestaña configurada.');
} else {
  console.log('• Bloque ya actualizado o formato diferente en public-form.tsx');
}

console.log('--- 2. ACTUALIZANDO solicitudes-service.ts (Descripción y Redes en WhatsApp) ---');
const servPath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/services/solicitudes-service.ts');
backup(servPath);
let servContent = fs.readFileSync(servPath, 'utf8');

const waCategoriaAnchor = `String.fromCodePoint(0x1F3F7) + ' *Categoría:* ' + data.category,`;
const waCategoriaYRedes = `String.fromCodePoint(0x1F3F7) + ' *Categoría:* ' + data.category + (data.subcategory ? ' (' + data.subcategory + ')' : ''),
    data.description ? '📝 *Descripción corta:* ' + data.description : null,
    (() => {
      const sm = data.socialMedia;
      if (!sm) return null;
      const list = [];
      if (sm.instagram) list.push('Instagram: ' + sm.instagram);
      if (sm.facebook) list.push('Facebook: ' + sm.facebook);
      if (sm.tiktok) list.push('TikTok: ' + sm.tiktok);
      if (sm.youtube) list.push('YouTube: ' + sm.youtube);
      return list.length > 0 ? '🌐 *Redes Sociales:* ' + list.join(' | ') : null;
    })(),`;

if (servContent.includes(waCategoriaAnchor) && !servContent.includes('*Descripción corta:*')) {
  servContent = servContent.replace(waCategoriaAnchor, waCategoriaYRedes);
  fs.writeFileSync(servPath, servContent, 'utf8');
  console.log('✓ Descripción corta y Redes Sociales añadidas al mensaje de WhatsApp.');
}

console.log('--- 3. ACTUALIZANDO admin-inbox.tsx (Redes Sociales en tarjeta de detalle) ---');
const inboxPath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');
backup(inboxPath);
let inboxContent = fs.readFileSync(inboxPath, 'utf8');

const descAnchor = `<p><strong>Descripción:</strong> {selectedItem.description}</p>`;
const descConRedes = `<p><strong>Descripción:</strong> {selectedItem.description}</p>
              {(() => {
                const sm = selectedItem.socialMedia;
                if (!sm) return null;
                const redes = [];
                if (sm.instagram) redes.push({ name: 'Instagram', val: sm.instagram, url: sm.instagram.startsWith('http') ? sm.instagram : \`https://instagram.com/\${sm.instagram.replace(/^@/, '')}\` });
                if (sm.facebook) redes.push({ name: 'Facebook', val: sm.facebook, url: sm.facebook.startsWith('http') ? sm.facebook : \`https://facebook.com/\${sm.facebook}\` });
                if (sm.tiktok) redes.push({ name: 'TikTok', val: sm.tiktok, url: sm.tiktok.startsWith('http') ? sm.tiktok : \`https://tiktok.com/@\${sm.tiktok.replace(/^@/, '')}\` });
                if (sm.youtube) redes.push({ name: 'YouTube', val: sm.youtube, url: sm.youtube.startsWith('http') ? sm.youtube : \`https://youtube.com/\${sm.youtube}\` });
                if (redes.length === 0) return null;
                return (
                  <div className="pt-1.5 border-t border-border/50 space-y-0.5">
                    <p className="font-bold text-muted-foreground text-[11px]">🌐 Redes Sociales:</p>
                    {redes.map(r => (
                      <p key={r.name} className="pl-1 text-[11px]">
                        <strong>{r.name}:</strong>{' '}
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">
                          {r.val}
                        </a>
                      </p>
                    ))}
                  </div>
                );
              })()}`;

if (inboxContent.includes(descAnchor) && !inboxContent.includes('🌐 Redes Sociales:')) {
  inboxContent = inboxContent.replace(descAnchor, descConRedes);
  fs.writeFileSync(inboxPath, inboxContent, 'utf8');
  console.log('✓ Bloque de Redes Sociales agregado a la tarjeta de admin-inbox.tsx.');
}

console.log('--- 4. VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error detectado en TypeScript.');
}
