const fs = require('fs');
const path = require('path');

function searchModules(dir, found = new Set()) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (['node_modules', '.git', '.next'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) searchModules(full, found);
      else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
        const txt = fs.readFileSync(full, 'utf8');
        const matches = txt.matchAll(/isModuleAuthorized\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        for (const m of matches) {
          found.add(`${m[1]}  (en ${e.name})`);
        }
      }
    }
  } catch(e) {}
  return found;
}

const modules = searchModules('src');
console.log('--- Identificadores de módulos actualmente usados con isModuleAuthorized ---');
modules.forEach(m => console.log('•', m));
