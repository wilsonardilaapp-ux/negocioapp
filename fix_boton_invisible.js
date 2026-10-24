const fs = require('fs');

const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
fs.copyFileSync(formPath, formPath + '.bak');

let content = fs.readFileSync(formPath, 'utf8');

// Reemplazar la etiqueta del botón duplicada por una limpia y con estilo verde garantizado
const doubleClassRegex = /<button[\s\S]*?className="w-full min-h-\[50px\][\s\S]*?className="w-full min-h-\[48px\][\s\S]*?>/;

const cleanButtonTag = `<button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: '#25D366', color: '#FFFFFF' }}
          className="w-full min-h-[52px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer hover:brightness-95 active:scale-[0.99]"
        >`;

if (doubleClassRegex.test(content)) {
  content = content.replace(doubleClassRegex, cleanButtonTag);
  fs.writeFileSync(formPath, content, 'utf8');
  console.log('[OK] Botón reparado exitosamente con fondo verde WhatsApp garantizado.');
} else {
  // Fallback si no matchea regex exacta
  const brokenPart = 'className="w-full min-h-[50px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.99]"\n          className="w-full min-h-[48px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"';
  if (content.includes(brokenPart)) {
    content = content.replace(brokenPart, 'style={{ backgroundColor: \'#25D366\', color: \'#FFFFFF\' }}\n          className="w-full min-h-[52px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer hover:brightness-95 active:scale-[0.99]"');
    fs.writeFileSync(formPath, content, 'utf8');
    console.log('[OK - Fallback] Botón reparado exitosamente.');
  } else {
    console.error('[ERROR] No se encontró el bloque duplicado.');
  }
}
