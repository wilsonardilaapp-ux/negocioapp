const fs = require('fs');

// 1. CORREGIR IMPORTS EN src/app/(dashboard)/dashboard/catalogo/page.tsx
const pagePath = 'src/app/(dashboard)/dashboard/catalogo/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');

// Agregar getDocs a firebase/firestore si no está
if (!pageContent.includes('getDocs')) {
  pageContent = pageContent.replace(
    "import { doc, getDoc,",
    "import { doc, getDoc, getDocs,"
  );
} else {
  pageContent = pageContent.replace(
    /import {([^}]*)} from 'firebase\/firestore';/,
    (match, p1) => p1.includes('getDocs') ? match : `import {${p1}, getDocs } from 'firebase/firestore';`
  );
}

// Tipar (d: any)
pageContent = pageContent.replace(
  "allCurrentSnap.docs.map(d =>",
  "allCurrentSnap.docs.map((d: any) =>"
);

fs.writeFileSync(pagePath, pageContent, 'utf8');
console.log('✅ getDocs y tipado corregidos en dashboard/catalogo/page.tsx');

// 2. CORREGIR scripts/sync_catalog.ts
const syncPath = 'scripts/sync_catalog.ts';
let syncContent = fs.readFileSync(syncPath, 'utf8');

syncContent = syncContent.replace(
  "import { getAdminFirestore } from './src/firebase/server-init';",
  "import { getAdminFirestore } from '../src/firebase/server-init';"
);

syncContent = syncContent.replace(
  "productsSnap.docs.map(d =>",
  "productsSnap.docs.map((d: any) =>"
);

fs.writeFileSync(syncPath, syncContent, 'utf8');
console.log('✅ Ruta corregida en scripts/sync_catalog.ts');
