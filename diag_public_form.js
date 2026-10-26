const fs = require('fs');

console.log("=== BUSCANDO REDIRECCIÓN A WHATSAPP EN public-form.tsx ===");
try {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    if (line.includes('whatsappUrl') || line.includes('window.open') || line.includes('window.location') || line.includes('Enviar información de mi negocio')) {
      console.log(`Línea ${idx + 1}: ${line}`);
    }
  });

  const submitIdx = lines.findIndex(l => l.includes('handleSubmit') || l.includes('onSubmit') || l.includes('handleEnviar'));
  if (submitIdx !== -1) {
    console.log("\n=== FRAGMENTO DE ENVÍO (alrededor de línea " + submitIdx + ") ===");
    console.log(lines.slice(submitIdx, submitIdx + 50).join('\n'));
  }
} catch (e) {
  console.log("Error leyendo public-form.tsx:", e.message);
}
