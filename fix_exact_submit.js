const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/public-form.tsx');

let content = fs.readFileSync(TARGET_FILE, 'utf8');

// Busquemos dónde está el bloque problemático alrededor de resJson.whatsappUrl
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('resJson.whatsappUrl') || l.includes('setSubmitting(false)'));

console.log('--- LÍNEAS ACTUALES ALREDEDOR DE LA REDIRECCIÓN ---');
console.log(lines.slice(Math.max(0, idx - 15), Math.min(lines.length, idx + 25)).join('\n'));

// Reconstruyamos el fragmento final de handleSubmit de forma canónica y limpia
const fetchCall = `      const res = await fetch('/api/solicitudes-negocio', {
        method: 'POST',
        body: fd
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Ocurrió un error al enviar el formulario.');
      }

      if (resJson.whatsappUrl) {
        window.location.href = resJson.whatsappUrl;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };`;

// Buscar desde "const res = await fetch" hasta "setSubmitting(false);\n    }\n  };"
const startStr = "const res = await fetch('/api/solicitudes-negocio'";
const endStr = "setSubmitting(false);\n    }\n  };";

const startPos = content.indexOf(startStr);
const endPos = content.indexOf(endStr);

if (startPos !== -1 && endPos !== -1) {
  content = content.substring(0, startPos) + fetchCall + content.substring(endPos + endStr.length);
  fs.writeFileSync(TARGET_FILE, content, 'utf8');
  console.log('✓ Bloque handleSubmit reconstruido correctamente.');
} else {
  console.log('No se pudo encontrar el rango startPos/endPos:', { startPos, endPos });
}

console.log('--- VALIDACIÓN TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error persistente en TypeScript.');
}
