const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] No existe ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Remover las líneas que causaban el error antes de inicialización
const prematureDeclarations = `  const totalResponsesCount = rawResponses?.length ?? 0;
  const isChatbotLimitReached = chatbotLimit !== -1 && totalResponsesCount >= chatbotLimit;
`;

if (updated.includes(prematureDeclarations)) {
  updated = updated.replace(prematureDeclarations, '');
} else {
  // Regex por si hay variación de espacios
  updated = updated.replace(/\s*const totalResponsesCount = rawResponses\?\.length \?\? 0;\s*const isChatbotLimitReached = chatbotLimit !== -1 && totalResponsesCount >= chatbotLimit;\s*/, '\n  ');
}

// 3. Insertar las declaraciones justo DESPUÉS de que rawResponses es inicializado por useCollection
const rawResponsesAnchor = `  const { data: rawResponses, isLoading: loadingResponses } = useCollection<PublicMenuAutoResponse>(
    useMemoFirebase(() => (responsesRef ? query(responsesRef, orderBy('updatedAt', 'desc')) : null), [responsesRef])
  );`;

const correctPlacement = `  const { data: rawResponses, isLoading: loadingResponses } = useCollection<PublicMenuAutoResponse>(
    useMemoFirebase(() => (responsesRef ? query(responsesRef, orderBy('updatedAt', 'desc')) : null), [responsesRef])
  );

  const totalResponsesCount = rawResponses?.length ?? 0;
  const isChatbotLimitReached = chatbotLimit !== -1 && totalResponsesCount >= chatbotLimit;`;

if (updated.includes(rawResponsesAnchor) && !updated.includes(correctPlacement)) {
  updated = updated.replace(rawResponsesAnchor, correctPlacement);
}

// 4. Guardar archivo corregido
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 5. Auto-verificación de la nueva ubicación
const check = fs.readFileSync(file, 'utf8');
const lines = check.split('\n');
const foundIdx = lines.findIndex(l => l.includes('totalResponsesCount = rawResponses?.length'));
console.log('\n--- VERIFICACIÓN DE LA NUEVA POSICIÓN ---');
console.log(`Ubicado en la línea: ${foundIdx + 1}`);
console.log(lines.slice(Math.max(0, foundIdx - 3), foundIdx + 3).map((l, i) => `${foundIdx - 2 + i}: ${l}`).join('\n'));
console.log('\n¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
