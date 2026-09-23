const fs = require('fs');
const filePath = 'src/app/(admin)/superadmin/hybrid-billing/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar useUser y setDocumentNonBlocking al import de @/firebase
content = content.replace(
  "import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';",
  "import { useCollection, useFirestore, useMemoFirebase, useDoc, addDocumentNonBlocking, useUser, setDocumentNonBlocking } from '@/firebase';"
);

// 2. Agregar getDoc a firebase/firestore
content = content.replace(
  "import { collection, getDocs, doc } from 'firebase/firestore';",
  "import { collection, getDocs, doc, getDoc } from 'firebase/firestore';"
);

// 3. Declarar user dentro de HybridBillingPage
content = content.replace(
  "const firestore = useFirestore();",
  "const firestore = useFirestore();\n  const { user } = useUser();"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Imports y usuario inyectados en hybrid-billing.');
