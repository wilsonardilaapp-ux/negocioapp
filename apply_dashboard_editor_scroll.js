const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'create', 'page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
const backupFile = `${targetFile}.bak_editor`;
fs.copyFileSync(targetFile, backupFile);
console.log(`💾 Respaldo creado: ${backupFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Reemplazo quirúrgico del renderizado del RichTextEditor
const oldEditorSnippet = `<RichTextEditor value={content} onChange={setContent} />`;

const scopedEditorSnippet = `<div className="editor-dashboard-blog">
                                <style>{\`
                                  .editor-dashboard-blog {
                                    display: flex;
                                    flex-direction: column;
                                    height: 500px;
                                  }
                                  .editor-dashboard-blog .ql-toolbar {
                                    flex-shrink: 0;
                                    position: sticky;
                                    top: 0;
                                    z-index: 10;
                                    background: var(--card, var(--background, #ffffff));
                                    border-top-left-radius: 0.375rem;
                                    border-top-right-radius: 0.375rem;
                                  }
                                  .editor-dashboard-blog .ql-container {
                                    flex: 1;
                                    min-height: 0;
                                    overflow: hidden;
                                    border-bottom-left-radius: 0.375rem;
                                    border-bottom-right-radius: 0.375rem;
                                  }
                                  .editor-dashboard-blog .ql-editor {
                                    height: 100%;
                                    overflow-y: auto;
                                  }
                                \`}</style>
                                <RichTextEditor value={content} onChange={setContent} />
                            </div>`;

if (content.includes(oldEditorSnippet)) {
  content = content.replace(oldEditorSnippet, scopedEditorSnippet);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Archivo src/app/(dashboard)/dashboard/blog/create/page.tsx actualizado con éxito.');
} else {
  console.error('❌ No se encontró la etiqueta exacta de RichTextEditor en el archivo.');
}
