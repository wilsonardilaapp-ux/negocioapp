const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'create', 'page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

// 1. Crear respaldo
const backupFile = `${targetFile}.bak_scroll`;
fs.copyFileSync(targetFile, backupFile);
console.log(`💾 Respaldo creado: ${backupFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Ajustar toolbar para que quede fija (sticky)
content = content.replace(
  /\/\* Barra de herramientas \*\/\s*\.blog-editor \.ql-toolbar\.ql-snow \{[\s\S]*?gap:\s*2px;\s*\}/,
  `/* Barra de herramientas fija */
                                  .blog-editor .ql-toolbar.ql-snow {
                                    position: sticky;
                                    top: 0;
                                    z-index: 10;
                                    border: none !important;
                                    border-bottom: 1px solid hsl(var(--border, 214.3 31.8% 91.4%)) !important;
                                    background-color: hsl(var(--card, var(--background, 0 0% 100%)));
                                    padding: 8px 12px;
                                    display: flex;
                                    flex-wrap: wrap;
                                    align-items: center;
                                    gap: 2px;
                                  }`
);

// 3. Ajustar ql-container y ql-editor para altura delimitada con scroll interno
content = content.replace(
  /\/\* Área de contenido y altura mínima \*\/[\s\S]*?color:\s*hsl\(var\(--foreground,\s*222\.2\s*84%\s*4\.9%\)\);\s*\}/,
  `/* Área de contenido con scroll interno propio */
                                  .blog-editor .ql-container.ql-snow {
                                    border: none !important;
                                    font-family: inherit !important;
                                    font-size: 16px;
                                    height: 450px !important;
                                    overflow: hidden !important;
                                  }
                                  .blog-editor .ql-editor {
                                    height: 100% !important;
                                    overflow-y: auto !important;
                                    padding: 20px 24px;
                                    font-family: inherit;
                                    font-size: 16px;
                                    line-height: 1.7;
                                    color: hsl(var(--foreground, 222.2 84% 4.9%));
                                  }`
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✅ Scroll interno y barra fija activados con éxito en src/app/(dashboard)/dashboard/blog/create/page.tsx');
