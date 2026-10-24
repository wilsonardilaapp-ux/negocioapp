const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO CORRECCIÓN: Estado de Pago en Bandeja');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. Corregir route.ts (API PATCH) para recibir y reenviar paymentStatus
const routePath = 'src/app/api/solicitudes-negocio/admin/solicitudes/route.ts';
let routeContent = fs.readFileSync(routePath, 'utf8');

const oldPatchBlock = `export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, nota, author } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (id, status)' }, { status: 400 });
    }

    await actualizarEstadoSolicitud(id, status, nota, author);
    return NextResponse.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar solicitud' }, { status: 500 });
  }
}`;

const newPatchBlock = `export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, paymentStatus, nota, author } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (id, status)' }, { status: 400 });
    }

    await actualizarEstadoSolicitud(id, status, paymentStatus, nota, author);
    return NextResponse.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar solicitud' }, { status: 500 });
  }
}`;

if (routeContent.includes(oldPatchBlock)) {
  routeContent = routeContent.replace(oldPatchBlock, newPatchBlock);
  backupAndWrite(routePath, routeContent);
} else {
  // Reemplazo flexible si varía el formato
  routeContent = routeContent.replace(
    'const { id, status, nota, author } = body;',
    'const { id, status, paymentStatus, nota, author } = body;'
  ).replace(
    'await actualizarEstadoSolicitud(id, status, nota, author);',
    'await actualizarEstadoSolicitud(id, status, paymentStatus, nota, author);'
  );
  backupAndWrite(routePath, routeContent);
}

// 2. Mejorar admin-inbox.tsx para feedback visual al guardar Estado de Pago
const inboxPath = 'src/modules/solicitudes-negocio/components/admin-inbox.tsx';
let inboxContent = fs.readFileSync(inboxPath, 'utf8');

const oldHandleCambiarEstado = `  const handleCambiarEstado = async (nuevoEstado: SolicitudEstado, nuevoEstadoPago?: PaymentStatus) => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/solicitudes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedItem.id, 
          status: nuevoEstado,
          paymentStatus: nuevoEstadoPago || selectedItem.paymentStatus 
        })
      });
      if (res.ok) {
        setActionMessage('Estado actualizado');
        setTimeout(() => setActionMessage(null), 3000);
        await cargarSolicitudes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };`;

const newHandleCambiarEstado = `  const handleCambiarEstado = async (nuevoEstado: SolicitudEstado, nuevoEstadoPago?: PaymentStatus) => {
    if (!selectedItem) return;
    setUpdating(true);
    setActionMessage('Guardando...');
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/solicitudes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedItem.id, 
          status: nuevoEstado,
          paymentStatus: nuevoEstadoPago !== undefined ? nuevoEstadoPago : selectedItem.paymentStatus 
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar');
      
      setActionMessage('Estado actualizado con éxito');
      setTimeout(() => setActionMessage(null), 3000);
      await cargarSolicitudes();
    } catch (e: any) {
      setActionMessage('Error: ' + (e.message || 'No se pudo actualizar'));
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setUpdating(false);
    }
  };`;

if (inboxContent.includes(oldHandleCambiarEstado)) {
  inboxContent = inboxContent.replace(oldHandleCambiarEstado, newHandleCambiarEstado);
} else {
  // Reemplazo flexible si varía el formato
  const startIdx = inboxContent.indexOf('const handleCambiarEstado = async');
  const endIdx = inboxContent.indexOf('const handleAgregarNota = async');
  if (startIdx !== -1 && endIdx !== -1) {
    inboxContent = inboxContent.slice(0, startIdx) + newHandleCambiarEstado + '\n\n  ' + inboxContent.slice(endIdx);
  }
}

// Asegurar que el selector de pago esté deshabilitado mientras updating=true
const oldSelectPayment = `<select
                  value={selectedItem.paymentStatus || 'Pendiente de pago'}
                  onChange={e => handleCambiarEstado(selectedItem.status, e.target.value as PaymentStatus)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background font-bold"
                >`;

const newSelectPayment = `<select
                  disabled={updating}
                  value={selectedItem.paymentStatus || 'Pendiente de pago'}
                  onChange={e => handleCambiarEstado(selectedItem.status, e.target.value as PaymentStatus)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background font-bold disabled:opacity-50"
                >`;

if (inboxContent.includes(oldSelectPayment)) {
  inboxContent = inboxContent.replace(oldSelectPayment, newSelectPayment);
} else {
  inboxContent = inboxContent.replace(
    "onChange={e => handleCambiarEstado(selectedItem.status, e.target.value as PaymentStatus)}",
    "disabled={updating}\n                  onChange={e => handleCambiarEstado(selectedItem.status, e.target.value as PaymentStatus)"
  );
}

backupAndWrite(inboxPath, inboxContent);

console.log('==============================================');
console.log('CORRECCIÓN APLICADA CON ÉXITO');
console.log('==============================================');
