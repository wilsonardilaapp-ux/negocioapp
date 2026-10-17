const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('--- 1. REDIRECCIÓN EN LOGIN/PAGE.TSX ---');
const loginPage = path.join(ROOT, 'src/app/(auth)/login/page.tsx');
if (fs.existsSync(loginPage)) {
  const content = fs.readFileSync(loginPage, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('router') || l.includes('redirect') || l.includes('useEffect') || l.includes('push(') || l.includes('replace(')) {
      console.log(`Línea ${i + 1}: ${l.trim()}`);
    }
  });
}

console.log('\n--- 2. LÓGICA DE USEUSER EN FIREBASE ---');
function findUseUser(dir) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        if (!['node_modules', '.git', '.next'].includes(item)) findUseUser(full);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('export function useUser') || text.includes('export const useUser')) {
          console.log(`Definición encontrada en: ${path.relative(ROOT, full)}`);
          const lines = text.split('\n');
          const idx = lines.findIndex(l => l.includes('useUser'));
          console.log(lines.slice(idx, idx + 45).join('\n'));
        }
      }
    }
  } catch (e) {}
}
findUseUser(path.join(ROOT, 'src'));

