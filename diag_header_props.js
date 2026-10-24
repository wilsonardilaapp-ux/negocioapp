const fs = require('fs');

if (fs.existsSync('src/components/layout/header.tsx')) {
  const content = fs.readFileSync('src/components/layout/header.tsx', 'utf8');
  console.log('--- PRIMERAS 40 LÍNEAS DE src/components/layout/header.tsx ---');
  console.log(content.split('\n').slice(0, 40).join('\n'));
} else {
  console.log('No existe header.tsx');
}
