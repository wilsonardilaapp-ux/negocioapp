const fs = require('fs');
const path = require('path');

function backupFile(filePath, suffix = '.bak_editor_v2') {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}${suffix}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Respaldo creado: ${backupPath}`);
  }
}

console.log('🚀 Aplicando mejoras al Editor Quill...\n');

// 1. ACTUALIZAR src/components/editor/RichTextEditor.tsx
const editorFile = path.join('src', 'components', 'editor', 'RichTextEditor.tsx');
backupFile(editorFile);
let editorContent = fs.readFileSync(editorFile, 'utf8');

// Añadir ref para acceder a la instancia de Quill
if (!editorContent.includes('const quillRef = useRef')) {
  editorContent = editorContent.replace(
    /(const RichTextEditor: React\.FC<RichTextEditorProps> = \(\{ value, onChange, placeholder \}\) => \{)/,
    `$1\n  const quillRef = React.useRef<any>(null);`
  );
}

// Configurar Toolbar limpia sin selector duplicado
const oldToolbarSnippet = `[{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ font: [] }],
        [{ size: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],`;

const newToolbarSnippet = `[{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],`;

if (editorContent.includes(oldToolbarSnippet)) {
  editorContent = editorContent.replace(oldToolbarSnippet, newToolbarSnippet);
}

// Configurar clipboard matchers y formats
const formatsDeclaration = `  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
    'color', 'background',
    'align',
    'list',
    'script',
    'indent',
    'link', 'image', 'video',
    'clean',
  ], []);

  // Limpieza al pegar (Clipboard Matcher de Quill)
  useEffect(() => {
    if (mounted && quillRef.current) {
      try {
        const editor = typeof quillRef.current.getEditor === 'function' ? quillRef.current.getEditor() : null;
        if (editor && editor.clipboard) {
          editor.clipboard.addMatcher(Node.ELEMENT_NODE, (node: HTMLElement, delta: any) => {
            if (delta && Array.isArray(delta.ops)) {
              delta.ops.forEach((op: any) => {
                if (op.attributes) {
                  // Quitar estilos ajenos en línea al pegar
                  delete op.attributes.color;
                  delete op.attributes.background;
                  delete op.attributes.font;
                  delete op.attributes.size;
                }
                if (typeof op.insert === 'string') {
                  // Quitar espacios y &nbsp; iniciales de línea
                  op.insert = op.insert.replace(/^[\u00a0 \\t]+/gm, '');
                }
              });
            }
            return delta;
          });
        }
      } catch (e) {
        console.warn('Error configurando matcher de pegado:', e);
      }
    }
  }, [mounted]);
`;

if (!editorContent.includes('const formats = useMemo')) {
  editorContent = editorContent.replace(
    /(const modules = useMemo\(\(\) => \(\{[\s\S]*?\}\), \[toast\]\);)/,
    `$1\n\n${formatsDeclaration}`
  );
}

// Pasar ref y formats a EditorComponent
editorContent = editorContent.replace(
  /<EditorComponent\s*theme="snow"\s*value=\{value\}\s*onChange=\{onChange\}\s*modules=\{modules\}\s*placeholder=\{placeholder\}\s*\/>/,
  `<EditorComponent
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />`
);

fs.writeFileSync(editorFile, editorContent, 'utf8');
console.log('✅ Archivo src/components/editor/RichTextEditor.tsx actualizado con éxito.');

// 2. ACTUALIZAR src/app/(dashboard)/dashboard/blog/create/page.tsx
const createPageFile = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'create', 'page.tsx');
backupFile(createPageFile);
let createContent = fs.readFileSync(createPageFile, 'utf8');

// Reemplazar los dos divs anidados antiguos por el contenedor único .blog-editor con estilos Prose
const oldEditorBlockRegex = /<div className="editor-dashboard-blog">[\s\S]*?<RichTextEditor value=\{content\} onChange=\{setContent\} \/>\s*<\/div>\s*<\/div>/;

const newEditorBlock = `<div className="blog-editor">
                                <style>{\`
                                  /* Contenedor con borde único idéntico a los inputs */
                                  .blog-editor {
                                    border: 1px solid hsl(var(--input, 214.3 31.8% 91.4%));
                                    border-radius: calc(var(--radius, 0.5rem));
                                    background-color: hsl(var(--background, 0 0% 100%));
                                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                                    overflow: hidden;
                                  }
                                  .blog-editor:focus-within {
                                    border-color: hsl(var(--ring, 222.2 84% 4.9%));
                                    box-shadow: 0 0 0 1px hsl(var(--ring, 222.2 84% 4.9%));
                                  }

                                  /* Barra de herramientas */
                                  .blog-editor .ql-toolbar.ql-snow {
                                    border: none !important;
                                    border-bottom: 1px solid hsl(var(--border, 214.3 31.8% 91.4%)) !important;
                                    background-color: hsl(var(--muted, 210 40% 96.1%) / 0.5);
                                    padding: 8px 12px;
                                    display: flex;
                                    flex-wrap: wrap;
                                    align-items: center;
                                    gap: 2px;
                                  }

                                  /* Separadores y grupos de botones */
                                  .blog-editor .ql-formats {
                                    margin-right: 12px !important;
                                    display: inline-flex;
                                    align-items: center;
                                  }

                                  /* Traducción de encabezados al español */
                                  .blog-editor .ql-snow .ql-picker.ql-header {
                                    width: 120px;
                                  }
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-label::before,
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-item::before {
                                    content: 'Párrafo' !important;
                                  }
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
                                    content: 'Título 1' !important;
                                  }
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
                                    content: 'Título 2' !important;
                                  }
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
                                  .blog-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
                                    content: 'Título 3' !important;
                                  }

                                  /* Área de contenido y altura mínima */
                                  .blog-editor .ql-container.ql-snow {
                                    border: none !important;
                                    font-family: inherit !important;
                                    font-size: 16px;
                                    height: auto !important;
                                    min-height: 400px;
                                  }
                                  .blog-editor .ql-editor {
                                    min-height: 400px;
                                    height: auto !important;
                                    overflow: visible !important;
                                    padding: 20px 24px;
                                    font-family: inherit;
                                    font-size: 16px;
                                    line-height: 1.7;
                                    color: hsl(var(--foreground, 222.2 84% 4.9%));
                                  }

                                  /* Tipografía tipo Blog Público (Prose) */
                                  .blog-editor .ql-editor p {
                                    font-size: 16px;
                                    line-height: 1.7;
                                    margin-bottom: 1em;
                                  }
                                  .blog-editor .ql-editor h1 {
                                    font-size: 2rem;
                                    font-weight: 700;
                                    line-height: 1.3;
                                    margin-top: 1.5em;
                                    margin-bottom: 0.5em;
                                  }
                                  .blog-editor .ql-editor h2 {
                                    font-size: 1.5rem;
                                    font-weight: 700;
                                    line-height: 1.3;
                                    margin-top: 1.5em;
                                    margin-bottom: 0.5em;
                                  }
                                  .blog-editor .ql-editor h3 {
                                    font-size: 1.25rem;
                                    font-weight: 700;
                                    line-height: 1.3;
                                    margin-top: 1.25em;
                                    margin-bottom: 0.5em;
                                  }
                                  .blog-editor .ql-editor ul,
                                  .blog-editor .ql-editor ol {
                                    padding-left: 1.5em;
                                    margin-bottom: 1em;
                                  }
                                  .blog-editor .ql-editor blockquote {
                                    border-left: 4px solid hsl(var(--primary, 222.2 47.4% 11.2%));
                                    padding-left: 1em;
                                    margin: 1em 0;
                                    color: hsl(var(--muted-foreground));
                                    font-style: italic;
                                  }
                                \`}</style>
                                <RichTextEditor value={content} onChange={setContent} />
                            </div>`;

if (oldEditorBlockRegex.test(createContent)) {
  createContent = createContent.replace(oldEditorBlockRegex, newEditorBlock);
  fs.writeFileSync(createPageFile, createContent, 'utf8');
  console.log('✅ Archivo src/app/(dashboard)/dashboard/blog/create/page.tsx actualizado con éxito.');
} else {
  // Búsqueda alternativa si variaban los espacios
  const altRegex = /<div className="editor-dashboard-blog">[\s\S]*?<RichTextEditor value=\{content\} onChange=\{setContent\} \/>[\s\S]*?<\/div>\s*<\/div>/;
  if (altRegex.test(createContent)) {
    createContent = createContent.replace(altRegex, newEditorBlock);
    fs.writeFileSync(createPageFile, createContent, 'utf8');
    console.log('✅ Archivo actualizado con reemplazo flexible.');
  } else {
    console.error('❌ No se encontró el bloque anterior del editor.');
  }
}

console.log('\n🎉 ¡Todas las tareas del editor aplicadas exitosamente!');
