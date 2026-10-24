const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO NUEVO CAMPO: NOMBRE COMPLETO');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. types.ts
const typesPath = 'src/modules/solicitudes-negocio/types.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');
if (!typesContent.includes('fullName?: string;')) {
  typesContent = typesContent.replace(
    'businessName: string;',
    'businessName: string;\n  fullName?: string;'
  );
  backupAndWrite(typesPath, typesContent);
}

// 2. constants.ts
const constantsPath = 'src/modules/solicitudes-negocio/constants.ts';
let constantsContent = fs.readFileSync(constantsPath, 'utf8');
if (!constantsContent.includes('{e_persona}')) {
  constantsContent = constantsContent.replace(
    /'{e_negocio} \*Negocio:\* {nombre}\\n' \+/,
    `'{e_negocio} *Negocio:* {nombre}\\n' +\n    '{e_persona} *Nombre completo:* {nombre_completo}\\n' +`
  );
  backupAndWrite(constantsPath, constantsContent);
}

// 3. route.ts
const routePath = 'src/app/api/solicitudes-negocio/route.ts';
let routeContent = fs.readFileSync(routePath, 'utf8');
if (!routeContent.includes('fullName')) {
  routeContent = routeContent.replace(
    "const businessName = String(formData.get('businessName') || '').trim();",
    "const businessName = String(formData.get('businessName') || '').trim();\n    const fullName = String(formData.get('fullName') || '').trim();"
  );
  routeContent = routeContent.replace(
    "if (!businessName || !phone || !address || !category || !description) {",
    "if (!businessName || !fullName || !phone || !address || !category || !description) {"
  );
  routeContent = routeContent.replace(
    "{ status: 400 }\n      );\n    }",
    "{ status: 400 }\n      );\n    }\n\n    if (fullName.length < 2 || fullName.length > 80) {\n      return NextResponse.json({ error: 'El nombre completo debe tener entre 2 y 80 caracteres' }, { status: 400 });\n    }"
  );
  routeContent = routeContent.replace(
    "businessName,",
    "businessName,\n      fullName,"
  );
  backupAndWrite(routePath, routeContent);
}

// 4. solicitudes-service.ts
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');
if (!serviceContent.includes('fullName?: string;')) {
  serviceContent = serviceContent.replace(
    "businessName: string;\n  phone: string;",
    "businessName: string;\n  fullName?: string;\n  phone: string;"
  );
  serviceContent = serviceContent.replace(
    "businessName: data.businessName,\n    phone: data.phone,",
    "businessName: data.businessName,\n    fullName: data.fullName || '',\n    phone: data.phone,"
  );
  serviceContent = serviceContent.replace(
    "'🏢 Negocio: ' + data.businessName,",
    "'🏢 Negocio: ' + data.businessName,\n    '👤 Nombre completo: ' + (data.fullName || 'No registrado'),"
  );
  serviceContent = serviceContent.replace(
    "nombre: string;\n  telefono: string;",
    "nombre: string;\n  nombre_completo: string;\n  telefono: string;"
  );
  serviceContent = serviceContent.replace(
    "limpia = limpia.replace(/{e_negocio}/g, String.fromCodePoint(0x1F3EA));",
    "limpia = limpia.replace(/{e_negocio}/g, String.fromCodePoint(0x1F3EA));\n  limpia = limpia.replace(/{e_persona}/g, String.fromCodePoint(0x1F464));"
  );
  serviceContent = serviceContent.replace(
    "limpia = limpia.replace(/{nombre}/g, vars.nombre || 'N/A');",
    "limpia = limpia.replace(/{nombre}/g, vars.nombre || 'N/A');\n  limpia = limpia.replace(/{nombre_completo}/g, vars.nombre_completo || 'No registrado');"
  );
  serviceContent = serviceContent.replace(
    "nombre: data.businessName,\n    telefono: data.phone,",
    "nombre: data.businessName,\n    nombre_completo: data.fullName || 'No registrado',\n    telefono: data.phone,"
  );
  serviceContent = serviceContent.replace(
    "nombre: solicitud.businessName,\n      telefono: solicitud.phone,",
    "nombre: solicitud.businessName,\n      nombre_completo: solicitud.fullName || 'No registrado',\n      telefono: solicitud.phone,"
  );
  backupAndWrite(servicePath, serviceContent);
}

// 5. public-form.tsx
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
let formContent = fs.readFileSync(formPath, 'utf8');
if (!formContent.includes('fullName')) {
  formContent = formContent.replace(
    "const [businessName, setBusinessName] = useState('');",
    "const [businessName, setBusinessName] = useState('');\n  const [fullName, setFullName] = useState('');"
  );
  formContent = formContent.replace(
    "fd.append('businessName', businessName);",
    "fd.append('businessName', businessName);\n      fd.append('fullName', fullName);"
  );
  
  const oldBusinessNameInput = `<div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">Nombre comercial <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="Ej: Cafetería El Molino" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>`;
  const newBusinessNameAndFullName = `<div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">Nombre comercial <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="Ej: Cafetería El Molino" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">Nombre completo <span className="text-red-500">*</span></label>
                <input type="text" required minLength={2} maxLength={80} autoComplete="name" placeholder="Ej: María Pérez Gómez" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>`;
  formContent = formContent.replace(oldBusinessNameInput, newBusinessNameAndFullName);
  backupAndWrite(formPath, formContent);
}

// 6. admin-editor.tsx
const editorPath = 'src/modules/solicitudes-negocio/components/admin-editor.tsx';
let editorContent = fs.readFileSync(editorPath, 'utf8');
if (!editorContent.includes('{nombre_completo}')) {
  editorContent = editorContent.replace(
    "Plantilla WhatsApp (Variables: {'{nombre}'}, {'{telefono}'},",
    "Plantilla WhatsApp (Variables: {'{nombre}'}, {'{nombre_completo}'}, {'{telefono}'},"
  );
  backupAndWrite(editorPath, editorContent);
}

// 7. admin-inbox.tsx
const inboxPath = 'src/modules/solicitudes-negocio/components/admin-inbox.tsx';
let inboxContent = fs.readFileSync(inboxPath, 'utf8');
if (!inboxContent.includes('Nombre completo:')) {
  inboxContent = inboxContent.replace(
    "<p><strong>Teléfono:</strong> {selectedItem.phone}</p>",
    "<p><strong>Nombre completo:</strong> {selectedItem.fullName || 'No registrado'}</p>\n              <p><strong>Teléfono:</strong> {selectedItem.phone}</p>"
  );
  backupAndWrite(inboxPath, inboxContent);
}

console.log('==============================================');
console.log('CAMPO APLICADO CON ÉXITO');
console.log('==============================================');
