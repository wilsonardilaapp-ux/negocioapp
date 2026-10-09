const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'create', 'page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Reemplazar el bloque de estilo con las reglas directas en .ql-container y .ql-editor
const oldStyleBlock = /<style>\{`[\s\S]*?`\}<\/style>/;

const newStyleBlock = `<style>{\`
                                  .editor-dashboard-blog .ql-toolbar {
                                    position: sticky;
                                    top: 0;
                                    z-index: 10;
                                    background: var(--card, var(--background, #ffffff));
                                    border-top-left-radius: 0.375rem;
                                    border-top-right-radius: 0.375rem;
                                  }
                                  .editor-dashboard-blog .ql-container {
                                    height: 450px !important;
                                    overflow: hidden !important;
                                    border-bottom-left-radius: 0.375rem;
                                    border-bottom-right-radius: 0.375rem;
                                  }
                                  .editor-dashboard-blog .ql-editor {
                                    height: 100% !important;
                                    overflow-y: auto !important;
                                  }
                                \`}</style>`;

if (oldStyleBlock.test(content)) {
  content = content.replace(oldStyleBlock, newStyleBlock);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Estilos corregidos en src/app/(dashboard)/dashboard/blog/create/page.tsx');
} else {
  console.error('❌ No se encontró el bloque <style> dentro del archivo.');
}
