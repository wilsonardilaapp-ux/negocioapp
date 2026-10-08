const fs = require('fs');

console.log('=== INSPECCIÓN DE posts-table.tsx Y MODELO blog-post.ts ===\n');

// 1. Ver modelo BlogPost
const modelPath = 'src/models/blog-post.ts';
if (fs.existsSync(modelPath)) {
  console.log('1. Modelo BlogPost:');
  console.log(fs.readFileSync(modelPath, 'utf8'));
}

// 2. Ver componente PostsTable
const tablePath = 'src/components/blog/posts-table.tsx';
if (fs.existsSync(tablePath)) {
  console.log('\n2. Código de PostsTable:');
  const lines = fs.readFileSync(tablePath, 'utf8').split('\n');
  lines.forEach((l, i) => console.log(`L${i+1}: ${l}`));
}
