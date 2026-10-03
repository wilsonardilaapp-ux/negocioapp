const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.nuxt', '.cache', 'coverage'
]);

const results = {
  copilotFiles: [],
  pagesWithCopilot: [],
  planAndModuleFiles: [],
  aiCallsFound: []
};

function searchDir(currentDir) {
  let entries;
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);

    if (entry.isDirectory()) {
      searchDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!['.js', '.jsx', '.ts', '.tsx', '.vue', '.json'].includes(ext)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lower = content.toLowerCase();

        if (lower.includes('copiloto') || lower.includes('jev')) {
          results.copilotFiles.push(relPath);

          if (
            content.includes('openai') || 
            content.includes('chat/completions') || 
            content.includes('createChatCompletion') ||
            content.includes('anthropic') ||
            content.includes('generative-ai') ||
            content.includes('/api/')
          ) {
            results.aiCallsFound.push(relPath);
          }
        }

        if (
          (relPath.includes('pages') || relPath.includes('app') || relPath.includes('views')) &&
          (lower.includes('copiloto') || lower.includes('jev'))
        ) {
          results.pagesWithCopilot.push(relPath);
        }

        if (
          lower.includes('límites técnicos extra') || 
          lower.includes('limites tecnicos') || 
          lower.includes('fidelización ia') ||
          (lower.includes('gestionar negocio') && lower.includes('módulo'))
        ) {
          results.planAndModuleFiles.push(relPath);
        }
      } catch (e) {}
    }
  }
}

console.log('🔍 Escaneando proyecto...');
searchDir(process.cwd());

const report = {
  resumen: {
    archivos_copiloto_detectados: Array.from(new Set(results.copilotFiles)).slice(0, 15),
    paginas_con_copiloto: Array.from(new Set(results.pagesWithCopilot)),
    archivos_planes_y_modulos: Array.from(new Set(results.planAndModuleFiles)),
    posibles_llamadas_ia: Array.from(new Set(results.aiCallsFound))
  }
};

fs.writeFileSync('jev_diagnostico_resultado.json', JSON.stringify(report, null, 2), 'utf8');
console.log('✅ Escaneo finalizado. Resultado:\n');
console.log(JSON.stringify(report, null, 2));
