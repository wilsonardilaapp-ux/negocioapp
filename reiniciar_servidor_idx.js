const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== REINICIO LIMPIO DE NEXT.JS EN PROJECT IDX ===\n');

// 1. Limpiar caché temporal de compilación
if (fs.existsSync('.next/cache')) {
  console.log('Limpiando .next/cache...');
  fs.rmSync('.next/cache', { recursive: true, force: true });
  console.log('✅ Caché de Next.js eliminada.');
}

// 2. Terminar procesos colgados de Next.js para que IDX los reinicie
try {
  console.log('Reiniciando proceso de Next.js...');
  execSync('pkill -f "next dev" || true');
  execSync('pkill -f "next-server" || true');
  console.log('✅ Señal de reinicio enviada al gestor de IDX.');
} catch (e) {
  console.log('Aviso al reiniciar procesos:', e.message);
}

console.log('\nEsperando 6 segundos a que IDX levante la nueva instancia fresca...');
setTimeout(() => {
  try {
    const ps = execSync('ps aux | grep -E "next-server" | grep -v grep').toString();
    console.log('\n✅ Nueva instancia de Next.js en ejecución:');
    console.log(ps.trim());
  } catch (e) {
    console.log('El servidor se está levantando...');
  }
  console.log('\n👉 Ya puedes recargar tu pestaña del navegador con Ctrl+Shift+R.');
}, 6000);
