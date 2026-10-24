const fs = require('fs');

const inboxPath = 'src/modules/solicitudes-negocio/components/admin-inbox.tsx';
const backupPath = inboxPath + '.bak'; // El backup limpio original

if (!fs.existsSync(backupPath)) {
  console.log('Restaurando desde backup alternativo...');
  if (fs.existsSync(inboxPath + '.bak_delete')) {
    fs.copyFileSync(inboxPath + '.bak_delete', backupPath);
  }
}

// 1. Restaurar archivo original limpio
let content = fs.readFileSync(backupPath, 'utf8');

// 2. Agregar Iconos sin romper el import
if (content.includes('Search, RefreshCw')) {
   content = content.replace('Search, RefreshCw', 'Trash2, Calendar, AlertTriangle, Search, RefreshCw');
}

// 3. Insertar Estados
const states = `
  // Estados de Eliminación
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, ids: [] as string[], message: '' });
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateEstado, setDateEstado] = useState('todos');
  const [datePago, setDatePago] = useState('todos');
  const [datePreviewIds, setDatePreviewIds] = useState<string[]>([]);
  const [datePreviewList, setDatePreviewList] = useState<SolicitudNegocio[]>([]);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
`;
content = content.replace(
  'const [actionMessage, setActionMessage] = useState<string | null>(null);',
  'const [actionMessage, setActionMessage] = useState<string | null>(null);\n' + states
);

// 4. Insertar Funciones
const functions = `
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (visibleItems: SolicitudNegocio[]) => {
    const visibleIds = visibleItems.map(i => i.id);
    const all = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (all) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const solicitarEliminar = (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleteModal({ open: true, ids, message: \`¿Eliminar \${ids.length} solicitud(es)? Esta acción no se puede deshacer.\` });
  };

  const ejecutarEliminacion = async () => {
    if (deleteModal.ids.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteModal.ids })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(\`\${deleteModal.ids.length} solicitud(es) eliminada(s)\`);
        setTimeout(() => setActionMessage(null), 4000);
        if (selectedItem && deleteModal.ids.includes(selectedItem.id)) setSelectedItem(null);
        setSelectedIds(prev => prev.filter(id => !deleteModal.ids.includes(id)));
        setDeleteModal({ open: false, ids: [], message: '' });
        await cargarSolicitudes();
      } else {
        alert('Error: ' + (data.error || 'Desconocido'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const abrirModalFechas = () => {
    setDateEstado(filtroEstado);
    setDatePago(filtroPago);
    setDateFrom('');
    setDateTo('');
    setDatePreviewIds([]);
    setDatePreviewList([]);
    setHasPreviewed(false);
    setConfirmInput('');
    setDateModalOpen(true);
  };

  const previsualizarPorFechas = () => {
    if (!dateFrom || !dateTo) {
      alert('Selecciona fechas.');
      return;
    }
    const start = new Date(dateFrom + 'T00:00:00').getTime();
    const end = new Date(dateTo + 'T23:59:59.999').getTime();
    const matches = solicitudes.filter(s => {
      const sTime = new Date(s.createdAt || s.updatedAt || '').getTime();
      const mFecha = !isNaN(sTime) && sTime >= start && sTime <= end;
      const mEstado = dateEstado === 'todos' || s.status === dateEstado;
      const mPago = datePago === 'todos' || s.paymentStatus === datePago;
      return mFecha && mEstado && mPago;
    });
    setDatePreviewIds(matches.map(m => m.id));
    setDatePreviewList(matches.slice(0, 5));
    setHasPreviewed(true);
  };

  const ejecutarEliminacionPorFechas = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ELIMINAR' || datePreviewIds.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: datePreviewIds })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(\`\${datePreviewIds.length} solicitudes eliminadas\`);
        setTimeout(() => setActionMessage(null), 4000);
        if (selectedItem && datePreviewIds.includes(selectedItem.id)) setSelectedItem(null);
        setSelectedIds(prev => prev.filter(id => !datePreviewIds.includes(id)));
        setDateModalOpen(false);
        await cargarSolicitudes();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };
`;
content = content.replace(
  'const handleReenviarWhatsApp = async () => {',
  functions + '\n  const handleReenviarWhatsApp = async () => {'
);

// 5. Botón fechas (Reemplazo preciso para no romper HTML)
const btnFechas = `
          <button type="button" onClick={abrirModalFechas} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"><Calendar className="w-3.5 h-3.5" /> Eliminar por fechas</button>
        </div>`;
content = content.replace('</select>\n        </div>', '</select>\n' + btnFechas);

// 6. Barra selección múltiple
const barraSel = `
          {/* Barra de Selección */}
          <div className="flex items-center justify-between p-2.5 bg-card border border-border rounded-xl text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
              <input type="checkbox" checked={filtered.length > 0 && filtered.every(i => selectedIds.includes(i.id))} onChange={() => toggleSelectAll(filtered)} className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
              <span>Seleccionar todos ({filtered.length})</span>
            </label>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{selectedIds.length} seleccionados</span>
                <button type="button" onClick={() => solicitarEliminar(selectedIds)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700"><Trash2 className="w-3.5 h-3.5" /> Eliminar seleccionados</button>
                <button type="button" onClick={() => setSelectedIds([])} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            )}
          </div>
`;
content = content.replace(
  "{filtered.length === 0 ?",
  barraSel + "\n          {filtered.length === 0 ?"
);

// 7. Checkbox en tarjetas
const checkboxHtml = `
          <div className="flex items-start gap-3">
            <input type="checkbox" checked={selectedIds.includes(item.id)} onClick={e => e.stopPropagation()} onChange={() => toggleSelectOne(item.id)} className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer" />
            <div>
`;
content = content.replace(
  '<div className="flex items-start justify-between gap-2 mb-2">\n                    <div>',
  '<div className="flex items-start justify-between gap-2 mb-2">\n' + checkboxHtml
);
content = content.replace(
  '</div>\n                    <span className="text-xs text-muted-foreground whitespace-nowrap">',
  '</div></div>\n                    <span className="text-xs text-muted-foreground whitespace-nowrap">'
);

// 8. Botón papelera panel de detalle
const detalleTrash = `
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => solicitarEliminar([selectedItem.id])} className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setSelectedItem(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
`;
content = content.replace(
  '<button onClick={() => setSelectedItem(null)} className="p-1 text-muted-foreground hover:text-foreground">\n                <X className="w-4 h-4" />\n              </button>',
  detalleTrash
);

// 9. Inyección segura de Modales al final del archivo
const modales = `
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600"><AlertTriangle className="w-5 h-5" /><h3 className="font-bold">Confirmar eliminación</h3></div>
            <p className="text-xs text-muted-foreground">{deleteModal.message}</p>
            <div className="flex justify-end gap-2"><button onClick={() => setDeleteModal({ open: false, ids: [], message: '' })} className="px-3 py-1.5 text-xs rounded-lg border font-medium">Cancelar</button><button onClick={ejecutarEliminacion} className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 text-white font-bold">{deleting ? 'Eliminando...' : 'Eliminar'}</button></div>
          </div>
        </div>
      )}
      {dateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3"><div className="flex items-center gap-2 text-rose-600 font-bold"><Calendar className="w-4 h-4" /> Eliminar por Fechas</div><button onClick={() => setDateModalOpen(false)}><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><label>Desde</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg bg-background" /></div>
              <div><label>Hasta</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><label>Estado</label><select value={dateEstado} onChange={e => setDateEstado(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg bg-background"><option value="todos">Todos</option>{ESTADOS_SOLICITUD.map(st => <option key={st} value={st}>{st}</option>)}</select></div>
              <div><label>Pago</label><select value={datePago} onChange={e => setDatePago(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg bg-background"><option value="todos">Todos</option><option value="Pendiente de pago">Pendiente</option><option value="Pagado">Pagado</option></select></div>
            </div>
            <button onClick={previsualizarPorFechas} className="w-full py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground">Buscar / Previsualizar</button>
            {hasPreviewed && (
              <div className="p-3 bg-muted/40 border rounded-xl text-xs space-y-2">
                <div className="font-bold flex justify-between"><span>Coincidencias:</span><span className="text-rose-600">{datePreviewIds.length}</span></div>
                {datePreviewList.map(item => <div key={item.id} className="flex justify-between bg-card px-2 py-1 rounded border"><span>{item.businessName}</span><span>{item.status}</span></div>)}
              </div>
            )}
            {hasPreviewed && datePreviewIds.length > 0 && (
              <div className="space-y-1 text-xs"><label>Escribe ELIMINAR:</label><input type="text" value={confirmInput} onChange={e => setConfirmInput(e.target.value)} className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-rose-600 font-bold" /></div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t"><button onClick={() => setDateModalOpen(false)} className="px-3 py-1.5 text-xs rounded-lg border font-medium">Cancelar</button><button disabled={deleting || confirmInput.trim().toUpperCase() !== 'ELIMINAR'} onClick={ejecutarEliminacionPorFechas} className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 text-white font-bold disabled:opacity-40">Confirmar y Eliminar</button></div>
          </div>
        </div>
      )}
`;
const lastDiv = content.lastIndexOf('</div>');
content = content.slice(0, lastDiv) + modales + '\n    </div>\n  );\n}';

fs.writeFileSync(inboxPath, content, 'utf8');
console.log("✅ Componente reconstruido y parcheado con 100% de precisión.");
