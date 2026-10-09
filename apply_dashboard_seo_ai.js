const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'create', 'page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
const backupFile = `${targetFile}.bak_seo_client`;
fs.copyFileSync(targetFile, backupFile);
console.log(`💾 Respaldo creado: ${backupFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Importar generateBlogSeoAction
if (!content.includes('generateBlogSeoAction')) {
  content = content.replace(
    /(import \{ createPost \} from '@\/actions\/blog';)/,
    `import { createPost, generateBlogSeoAction } from '@/actions/blog';`
  );
  if (!content.includes('generateBlogSeoAction')) {
    content = `import { generateBlogSeoAction } from '@/actions/blog';\n` + content;
  }
}

// 3. Agregar estados y función handleGenerateSeo
const statesAndHandler = `    const [seoTitle, setSeoTitle] = useState('');
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

if (!content.includes('handleGenerateSeo')) {
  content = content.replace(
    /(const \[content, setContent\] = useState\(''\);)/,
    `$1\n${statesAndHandler}`
  );
}

// 4. Conectar inputs y botón
const oldInputsRegex = /<div>\s*<Label htmlFor="seoTitle">Meta Título<\/Label>\s*<Input id="seoTitle" name="seoTitle" \/>\s*<\/div>\s*<div>\s*<Label htmlFor="seoDescription">Meta Descripción<\/Label>\s*<Input id="seoDescription" name="seoDescription" \/>\s*<\/div>\s*<div>\s*<Label htmlFor="seoKeywords">Keywords \(separadas por coma\)<\/Label>\s*<Input id="seoKeywords" name="seoKeywords" \/>\s*<\/div>\s*<Button variant="outline" className="w-full" type="button">\s*<Bot className="mr-2 h-4 w-4 text-emerald-600" \/>\s*Generar con IA\s*<\/Button>/;

const newInputsCode = `<div>
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

if (oldInputsRegex.test(content)) {
  content = content.replace(oldInputsRegex, newInputsCode);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Archivo src/app/(dashboard)/dashboard/blog/create/page.tsx conectado con éxito.');
} else {
  // Reemplazo flexible
  const fallbackRegex = /<CardTitle className="text-base">Configuración SEO<\/CardTitle>[\s\S]*?<\/CardContent>/;
  const newCardInner = `<CardTitle className="text-base">Configuración SEO</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <CardDescription>
                            Optimiza tu post para motores de búsqueda.
                        </CardDescription>
                        ${newInputsCode}
                    </CardContent>`;
  if (fallbackRegex.test(content)) {
    content = content.replace(fallbackRegex, newCardInner);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Archivo conectado con reemplazo flexible.');
  } else {
    console.error('❌ No se encontró la sección de Configuración SEO.');
  }
}

console.log('\n🎉 ¡"Generar con IA" configurado exitosamente en el blog de clientes!');
