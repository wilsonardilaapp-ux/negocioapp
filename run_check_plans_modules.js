const fs = require('fs');

if (fs.existsSync('src/models/module.ts')) {
  console.log('--- Contenido de src/models/module.ts ---');
  console.log(fs.readFileSync('src/models/module.ts', 'utf8'));
}
