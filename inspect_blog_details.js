const fs = require('fs');

function inspectSection(filePath, pattern, contextBefore = 5, contextAfter = 20) {
  if (!fs.existsSync(filePath)) return;
  console.log(`\n======================================================`);
  console.log(`📄 Archivo: ${filePath}`);
  console.log(`======================================================`);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (pattern.test(line)) {
      const start = Math.max(0, idx - contextBefore);
      const end = Math.min(lines.length - 1, idx + contextAfter);
      console.log(`--- [Líneas ${start + 1} a ${end + 1}] ---`);
      for (let i = start; i <= end; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  });
}

// 1. Ver useSubscription.ts
inspectSection('src/hooks/useSubscription.ts', /blogPosts|limits|hybrid|plan/i, 2, 25);

// 2. Ver límites en /dashboard/blog/page.tsx
inspectSection('src/app/(dashboard)/dashboard/blog/page.tsx', /useSubscription|limits|blogPosts/i, 2, 20);

// 3. Ver cómo maneja límites create/page.tsx
inspectSection('src/app/(dashboard)/dashboard/blog/create/page.tsx', /useSubscription|isFree|limits/i, 2, 20);

// 4. Ver backend en src/actions/blog.ts
inspectSection('src/actions/blog.ts', /createPost|savePost|insert|add/i, 2, 25);
