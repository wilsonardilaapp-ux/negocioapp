const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'components', 'editor', 'RichTextEditor.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Reemplazar la interfaz ReactQuillProps para incluir ref y formats
const oldInterface = `interface ReactQuillProps {
  theme?: string;
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  placeholder?: string;
}`;

const newInterface = `interface ReactQuillProps {
  theme?: string;
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  formats?: string[];
  placeholder?: string;
  ref?: any;
}`;

if (content.includes(oldInterface)) {
  content = content.replace(oldInterface, newInterface);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Interfaz ReactQuillProps corregida con éxito.');
} else {
  // Reemplazo flexible si variaban espacios
  content = content.replace(
    /interface ReactQuillProps\s*\{[\s\S]*?\}/,
    newInterface
  );
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Interfaz actualizada con reemplazo flexible.');
}
