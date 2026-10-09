const fs = require('fs');
const path = require('path');

function backupFile(filePath, suffix = '.bak_seo') {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}${suffix}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Respaldo creado: ${backupPath}`);
  }
}

console.log('🚀 Aplicando corrección quirúrgica para "Generar con IA"...\n');

// 1. ACTUALIZAR src/actions/blog.ts (AGREGAR SERVER ACTION generateBlogSeoAction)
const actionsFile = path.join('src', 'actions', 'blog.ts');
backupFile(actionsFile);
let actionsContent = fs.readFileSync(actionsFile, 'utf8');

// Insertar import de generateSimpleText si no existe
if (!actionsContent.includes('generateSimpleText')) {
  actionsContent = actionsContent.replace(
    /('use server';\s*)/,
    `$1import { generateSimpleText } from '@/ai/flows/simple-text-flow';\n`
  );
}

// Agregar la función al final del archivo si no existe
const serverActionCode = `
export async function generateBlogSeoAction(params: { title?: string; content?: string }) {
    const title = (params.title || '').trim();
    // Limpiar etiquetas HTML de Quill para enviar texto plano
    const rawContent = (params.content || '')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\\s+/g, ' ')
        .trim();

    if (!title && !rawContent) {
        return {
            success: false,
            error: 'Debes ingresar al menos el título o contenido del post para generar el SEO.'
        };
    }

    const prompt = \`Actúa como un especialista en SEO y redacción de contenido digital.
Analiza la siguiente información de un post de blog y genera los metadatos SEO óptimos:
- Título del post: "\${title || 'Sin título definido'}"
- Contenido del post: "\${rawContent.slice(0, 1800)}"

Genera metadatos altamente persuasivos y optimizados para Google:
1. "seoTitle": Título optimizado para motores de búsqueda (máximo 60 caracteres).
2. "seoDescription": Meta descripción concisa con gancho y llamada a la acción (entre 120 y 155 caracteres).
3. "seoKeywords": Entre 5 y 8 palabras clave o frases relevantes separadas por comas.

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido estricto, sin explicaciones ni markdown:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}\`;

    try {
        const aiResponse = await generateSimpleText(prompt);
        // Limpiar posibles bloques markdown (\`\`\`json ...)
        const cleanJson = aiResponse
            .replace(/\`\`\`(?:json)?/gi, '')
            .replace(/\`\`\`/g, '')
            .trim();

        const parsed = JSON.parse(cleanJson);
        return {
            success: true,
            seoTitle: String(parsed.seoTitle || '').trim(),
            seoDescription: String(parsed.seoDescription || '').trim(),
            seoKeywords: String(parsed.seoKeywords || '').trim(),
        };
    } catch (error: any) {
        console.error('[generateBlogSeoAction] Error:', error);
        return {
            success: false,
            error: 'No se pudo generar el SEO con IA: ' + (error.message || 'Error desconocido.')
        };
    }
}
`;

if (!actionsContent.includes('generateBlogSeoAction')) {
  actionsContent += serverActionCode;
  fs.writeFileSync(actionsFile, actionsContent, 'utf8');
  console.log('✅ Server Action generateBlogSeoAction agregada a src/actions/blog.ts');
}

// 2. ACTUALIZAR src/app/(admin)/superadmin/blog/create/page.tsx
const createPageFile = path.join('src', 'app', '(admin)', 'superadmin', 'blog', 'create', 'page.tsx');
backupFile(createPageFile);
let createContent = fs.readFileSync(createPageFile, 'utf8');

// Insertar import de generateBlogSeoAction
if (!createContent.includes('generateBlogSeoAction')) {
  createContent = createContent.replace(
    /(import \{ createPost \} from '@\/actions\/blog';)/,
    `import { createPost, generateBlogSeoAction } from '@/actions/blog';`
  );
  if (!createContent.includes('generateBlogSeoAction')) {
    createContent = `import { generateBlogSeoAction } from '@/actions/blog';\n` + createContent;
  }
}

// Agregar estados para SEO
const statesCode = `    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [seoKeywords, setSeoKeywords] = useState('');
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

    const handleGenerateSeo = async () => {
        const titleInput = (document.getElementById('title') as HTMLInputElement)?.value || '';
        if (!titleInput.trim() && !content.trim()) {
            toast({
                variant: 'destructive',
                title: 'Información insuficiente',
                description: 'Ingresa al menos el título o contenido del post para generar el SEO con IA.',
            });
            return;
        }

        setIsGeneratingSeo(true);
        try {
            const result = await generateBlogSeoAction({ title: titleInput, content });
            if (result.success) {
                if (result.seoTitle) setSeoTitle(result.seoTitle);
                if (result.seoDescription) setSeoDescription(result.seoDescription);
                if (result.seoKeywords) setSeoKeywords(result.seoKeywords);
                toast({
                    title: 'SEO Generado con Éxito',
                    description: 'Se han completado el Meta Título, Meta Descripción y Keywords.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'No se pudo generar SEO',
                    description: result.error,
                });
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error de IA',
                description: err.message || 'Ocurrió un error al conectar con el servicio de IA.',
            });
        } finally {
            setIsGeneratingSeo(false);
        }
    };`;

if (!createContent.includes('handleGenerateSeo')) {
  createContent = createContent.replace(
    /(const \[content, setContent\] = useState\(''\);)/,
    `$1\n${statesCode}`
  );
}

// Reemplazar los inputs y el botón de Configuración SEO
const oldSeoInputsRegex = /<div>\s*<Label htmlFor="seoTitle">Meta Título<\/Label>\s*<Input id="seoTitle" name="seoTitle" \/>\s*<\/div>\s*<div>\s*<Label htmlFor="seoDescription">Meta Descripción<\/Label>\s*<Input id="seoDescription" name="seoDescription" \/>\s*<\/div>\s*<div>\s*<Label htmlFor="seoKeywords">Keywords \(separadas por coma\)<\/Label>\s*<Input id="seoKeywords" name="seoKeywords" \/>\s*<\/div>\s*<Button variant="outline" className="w-full" type="button">\s*<Bot className="mr-2 h-4 w-4 text-emerald-600" \/>\s*Generar con IA\s*<\/Button>/;

const newSeoInputs = `<div>
                            <Label htmlFor="seoTitle">Meta Título</Label>
                            <Input id="seoTitle" name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="seoDescription">Meta Descripción</Label>
                            <Input id="seoDescription" name="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="seoKeywords">Keywords (separadas por coma)</Label>
                            <Input id="seoKeywords" name="seoKeywords" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
                        </div>
                        <Button variant="outline" className="w-full" type="button" onClick={handleGenerateSeo} disabled={isGeneratingSeo}>
                            {isGeneratingSeo ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-600" />
                                    Generando con IA...
                                </>
                            ) : (
                                <>
                                    <Bot className="mr-2 h-4 w-4 text-emerald-600" />
                                    Generar con IA
                                </>
                            )}
                        </Button>`;

if (oldSeoInputsRegex.test(createContent)) {
  createContent = createContent.replace(oldSeoInputsRegex, newSeoInputs);
  fs.writeFileSync(createPageFile, createContent, 'utf8');
  console.log('✅ Vista superadmin/blog/create/page.tsx conectada exitosamente.');
} else {
  // Búsqueda flexible de reemplazo
  const fallbackSeoBlock = /<CardTitle className="text-base">Configuración SEO<\/CardTitle>[\s\S]*?<\/CardContent>/;
  const newCardInner = `<CardTitle className="text-base">Configuración SEO</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <CardDescription>
                            Optimiza tu post para motores de búsqueda.
                        </CardDescription>
                        ${newSeoInputs}
                    </CardContent>`;
  if (fallbackSeoBlock.test(createContent)) {
    createContent = createContent.replace(fallbackSeoBlock, newCardInner);
    fs.writeFileSync(createPageFile, createContent, 'utf8');
    console.log('✅ Vista conectada con reemplazo flexible.');
  } else {
    console.error('❌ No se encontró la sección de Configuración SEO.');
  }
}

console.log('\n🎉 ¡Corrección de "Generar con IA" completada con éxito!');
