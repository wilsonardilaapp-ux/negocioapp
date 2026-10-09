const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'app', '(admin)', 'superadmin', 'blog', 'create', 'page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
const backupFile = `${targetFile}.bak4`;
fs.copyFileSync(targetFile, backupFile);
console.log(`💾 Respaldo creado: ${backupFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Reemplazar el bloque de la tarjeta de límite de posts
const oldCardBlock = `<Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Límite de Posts</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground mb-2">Cargando límite...</p>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-2">
                               Has creado {postCount} de {postLimit === -1 ? '∞' : postLimit} posts permitidos.
                            </p>
                        )}
                        <Progress value={isLoading || postLimit === -1 ? 0 : (postCount / postLimit) * 100} />
                    </CardContent>
                </Card>`;

const newCardBlock = `<Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Límite de Posts</CardTitle></CardHeader>
                    <CardContent>
                        {arePostsLoading ? (
                            <p className="text-sm text-muted-foreground mb-2">Cargando información...</p>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-2">
                               Has creado {postCount} posts · Ilimitado (∞)
                            </p>
                        )}
                        <Progress value={100} />
                    </CardContent>
                </Card>`;

if (content.includes(oldCardBlock)) {
  content = content.replace(oldCardBlock, newCardBlock);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Archivo superadmin/blog/create/page.tsx actualizado con límite ilimitado.');
} else {
  // Regex de respaldo para tolerancia de espacios en blanco
  const cardRegex = /<Card className="shadow-sm">\s*<CardHeader><CardTitle className="text-base">Límite de Posts<\/CardTitle><\/CardHeader>[\s\S]*?<\/CardContent>\s*<\/Card>/;
  if (cardRegex.test(content)) {
    content = content.replace(cardRegex, newCardBlock);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Archivo actualizado con reemplazo flexible de la tarjeta.');
  } else {
    console.error('❌ No se encontró el bloque de la tarjeta Límite de Posts.');
  }
}
