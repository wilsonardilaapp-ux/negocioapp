const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'app', '(admin)', 'superadmin', 'blog', 'create', 'page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
const backupFile = `${targetFile}.bak`;
fs.copyFileSync(targetFile, backupFile);
console.log(`💾 Respaldo creado: ${backupFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Reemplazar el renderizado de <RichTextEditor /> con el wrapper scoped
const oldEditorSnippet = `<RichTextEditor value={content} onChange={setContent} />`;

const scopedEditorSnippet = `<div className="editor-superadmin">
                                <style>{ \`
                                  .editor-superadmin .ql-toolbar {
                                    position: sticky;
                                    top: 0;
                                    z-index: 10;
                                    background: var(--card, var(--background, #ffffff));
                                    border-top-left-radius: 0.375rem;
                                    border-top-right-radius: 0.375rem;
                                  }
                                  .editor-superadmin .ql-container {
                                    height: 400px;
                                    overflow: hidden;
                                    border-bottom-left-radius: 0.375rem;
                                    border-bottom-right-radius: 0.375rem;
                                  }
                                  .editor-superadmin .ql-editor {
                                    height: 100%;
                                    overflow-y: auto;
                                  }
                                \` }</style>
                                <RichTextEditor value={content} onChange={setContent} />
                            </div>`;

if (content.includes(oldEditorSnippet)) {
  content = content.replace(oldEditorSnippet, scopedEditorSnippet);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Archivo superadmin/blog/create/page.tsx actualizado con el scroll y toolbar fija scoped.');
} else {
  console.error('❌ No se encontró el fragmento exacto de RichTextEditor en el archivo.');
}
