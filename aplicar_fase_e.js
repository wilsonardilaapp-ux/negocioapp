const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO FASE E: Bandeja y Menú Quirúrgico');
console.log('==============================================');

// 1. Directorios
const dirs = [
  'src/app/api/solicitudes-negocio/admin/solicitudes',
  'src/app/api/solicitudes-negocio/admin/reenviar-whatsapp',
  'src/app/(admin)/superadmin/solicitudes-negocio'
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. Endpoint Admin Solicitudes
const adminSolicitudesRoute = `import { NextRequest, NextResponse } from 'next/server';
import { getSolicitudes, actualizarEstadoSolicitud } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') || undefined;
    const items = await getSolicitudes(estado);
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al listar solicitudes' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/admin/solicitudes/route.ts', adminSolicitudesRoute, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/admin/solicitudes/route.ts');

// 3. Endpoint Reenviar WhatsApp
const reenviarWhatsAppRoute = `import { NextRequest, NextResponse } from 'next/server';
import { reenviarWhatsAppSolicitud } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { solicitudId } = await req.json();
    if (!solicitudId) {
      return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 });
    }

    const resultado = await reenviarWhatsAppSolicitud(solicitudId);
    if (!resultado.success) {
      return NextResponse.json({ success: false, error: resultado.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'WhatsApp reenviado exitosamente' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al reenviar WhatsApp' }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/admin/reenviar-whatsapp/route.ts', reenviarWhatsAppRoute, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/admin/reenviar-whatsapp/route.ts');

// 4. Componente AdminInbox
const adminInboxLines = [
  "'use client';",
  "",
  "import React, { useState, useEffect } from 'react';",
  "import Link from 'next/link';",
  "import { SolicitudNegocio, SolicitudEstado } from '../types';",
  "import { ESTADOS_SOLICITUD, ESTADO_COLORES } from '../constants';",
  "import {",
  "  Search, RefreshCw, Settings, ExternalLink, Send, CheckCircle2,",
  "  Clock, MessageSquare, AlertCircle, FileText, Image, Download, X, Plus, ChevronRight",
  "} from 'lucide-react';",
  "",
  "export default function AdminInbox() {",
  "  const [solicitudes, setSolicitudes] = useState<SolicitudNegocio[]>([]);",
  "  const [loading, setLoading] = useState(true);",
  "  const [filtroEstado, setFiltroEstado] = useState('todos');",
  "  const [search, setSearch] = useState('');",
  "  const [selectedItem, setSelectedItem] = useState<SolicitudNegocio | null>(null);",
  "  const [updating, setUpdating] = useState(false);",
  "  const [nuevaNota, setNuevaNota] = useState('');",
  "  const [reenviandoWhatsApp, setReenviandoWhatsApp] = useState(false);",
  "  const [actionMessage, setActionMessage] = useState<string | null>(null);",
  "",
  "  const cargarSolicitudes = async (estado = filtroEstado) => {",
  "    setLoading(true);",
  "    try {",
  "      const url = estado && estado !== 'todos'",
  "        ? '/api/solicitudes-negocio/admin/solicitudes?estado=' + encodeURIComponent(estado)",
  "        : '/api/solicitudes-negocio/admin/solicitudes';",
  "      const res = await fetch(url);",
  "      const data = await res.json();",
  "      if (Array.isArray(data)) {",
  "        setSolicitudes(data);",
  "        if (selectedItem) {",
  "          const updated = data.find(s => s.id === selectedItem.id);",
  "          if (updated) setSelectedItem(updated);",
  "        }",
  "      }",
  "    } catch (e) {",
  "      console.error(e);",
  "    } finally {",
  "      setLoading(false)",
  "    }",
  "  };",
  "",
  "  useEffect(() => {",
  "    cargarSolicitudes(filtroEstado);",
  "  }, [filtroEstado]);",
  "",
  "  const handleCambiarEstado = async (nuevoEstado: SolicitudEstado) => {",
  "    if (!selectedItem) return;",
  "    setUpdating(true);",
  "    try {",
  "      const res = await fetch('/api/solicitudes-negocio/admin/solicitudes', {",
  "        method: 'PATCH',",
  "        headers: { 'Content-Type': 'application/json' },",
  "        body: JSON.stringify({ id: selectedItem.id, status: nuevoEstado })",
  "      });",
  "      if (res.ok) {",
  "        setActionMessage('Estado actualizado a ' + nuevoEstado);",
  "        setTimeout(() => setActionMessage(null), 3000);",
  "        await cargarSolicitudes();",
  "      }",
  "    } catch (e) {",
  "      console.error(e);",
  "    } finally {",
  "      setUpdating(false);",
  "    }",
  "  };",
  "",
  "  const handleAgregarNota = async () => {",
  "    if (!selectedItem || !nuevaNota.trim()) return;",
  "    setUpdating(true);",
  "    try {",
  "      const res = await fetch('/api/solicitudes-negocio/admin/solicitudes', {",
  "        method: 'PATCH',",
  "        headers: { 'Content-Type': 'application/json' },",
  "        body: JSON.stringify({ id: selectedItem.id, status: selectedItem.status, nota: nuevaNota })",
  "      });",
  "      if (res.ok) {",
  "        setNuevaNota('');",
  "        await cargarSolicitudes();",
  "      }",
  "    } catch (e) {",
  "      console.error(e);",
  "    } finally {",
  "      setUpdating(false);",
  "    }",
  "  };",
  "",
  "  const handleReenviarWhatsApp = async () => {",
  "    if (!selectedItem) return;",
  "    setReenviandoWhatsApp(true);",
  "    try {",
  "      const res = await fetch('/api/solicitudes-negocio/admin/reenviar-whatsapp', {",
  "        method: 'POST',",
  "        headers: { 'Content-Type': 'application/json' },",
  "        body: JSON.stringify({ solicitudId: selectedItem.id })",
  "      });",
  "      const data = await res.json();",
  "      if (res.ok && data.success) {",
  "        setActionMessage('WhatsApp enviado correctamente vía WHAPI');",
  "      } else {",
  "        setActionMessage('Error: ' + (data.error || 'No se pudo enviar'));",
  "      }",
  "      setTimeout(() => setActionMessage(null), 4000);",
  "      await cargarSolicitudes();",
  "    } catch (e: any) {",
  "      setActionMessage('Error de red: ' + e.message);",
  "    } finally {",
  "      setReenviandoWhatsApp(false);",
  "    }",
  "  };",
  "",
  "  const filtered = solicitudes.filter(s => {",
  "    if (!search.trim()) return true;",
  "    const q = search.toLowerCase();",
  "    return (",
  "      s.businessName?.toLowerCase().includes(q) ||",
  "      s.phone?.includes(q) ||",
  "      s.category?.toLowerCase().includes(q) ||",
  "      s.email?.toLowerCase().includes(q)",
  "    );",
  "  });",
  "",
  "  return (",
  "    <div className=\"space-y-6\">",
  "      <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border\">",
  "        <div>",
  "          <h1 className=\"text-2xl font-bold tracking-tight\">Solicitudes de Negocio</h1>",
  "          <p className=\"text-xs text-muted-foreground\">Revisa, atiende y cambia el estado de las solicitudes enviadas por futuros negocios.</p>",
  "        </div>",
  "        <div className=\"flex items-center gap-2\">",
  "          <button onClick={() => cargarSolicitudes()} className=\"p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors\">",
  "            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />",
  "          </button>",
  "          <Link href=\"/registro-negocio\" target=\"_blank\" className=\"inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted\">",
  "            <ExternalLink className=\"w-3.5 h-3.5\" /> Ver Formulario",
  "          </Link>",
  "          <Link href=\"/superadmin/solicitudes-negocio/configurar\" className=\"inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90\">",
  "            <Settings className=\"w-3.5 h-3.5\" /> Configurar",
  "          </Link>",
  "        </div>",
  "      </div>",
  "",
  "      {actionMessage && (",
  "        <div className=\"p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2 animate-in fade-in\">",
  "          <CheckCircle2 className=\"w-4 h-4\" /> {actionMessage}",
  "        </div>",
  "      )}",
  "",
  "      <div className=\"flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between\">",
  "        <div className=\"relative flex-1 max-w-md\">",
  "          <Search className=\"w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground\" />",
  "          <input type=\"text\" placeholder=\"Buscar por nombre, teléfono, categoría...\" value={search} onChange={e => setSearch(e.target.value)} className=\"w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background\" />",
  "        </div>",
  "        <div className=\"flex gap-1.5 overflow-x-auto pb-1\">",
  "          <button onClick={() => setFiltroEstado('todos')} className={'px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap ' + (filtroEstado === 'todos' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>",
  "            Todos ({solicitudes.length})",
  "          </button>",
  "          {ESTADOS_SOLICITUD.map(st => (",
  "            <button key={st} onClick={() => setFiltroEstado(st)} className={'px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap ' + (filtroEstado === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>",
  "              {st}",
  "            </button>",
  "          ))}",
  "        </div>",
  "      </div>",
  "",
  "      <div className=\"grid grid-cols-1 lg:grid-cols-12 gap-6\">",
  "        <div className={selectedItem ? 'lg:col-span-7 space-y-2' : 'lg:col-span-12 space-y-2'}>",
  "          {loading && solicitudes.length === 0 ? (",
  "            <div className=\"p-12 text-center text-xs text-muted-foreground\">Cargando solicitudes...</div>",
  "          ) : filtered.length === 0 ? (",
  "            <div className=\"p-12 text-center bg-card rounded-xl border border-border text-xs text-muted-foreground\">",
  "              No se encontraron solicitudes con los filtros actuales.",
  "            </div>",
  "          ) : (",
  "            filtered.map(item => {",
  "              const badge = ESTADO_COLORES[item.status] || { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' };",
  "              const isSelected = selectedItem?.id === item.id;",
  "              return (",
  "                <div",
  "                  key={item.id}",
  "                  onClick={() => setSelectedItem(item)}",
  "                  className={'p-4 rounded-xl border cursor-pointer transition-all ' + (isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/40')}",
  "                >",
  "                  <div className=\"flex items-start justify-between gap-2 mb-2\">",
  "                    <div>",
  "                      <h3 className=\"font-bold text-sm text-foreground flex items-center gap-2\">",
  "                        {item.businessName}",
  "                        <span className={'text-[10px] px-2 py-0.5 rounded-full border font-semibold ' + badge.bg + ' ' + badge.text + ' ' + badge.border}>",
  "                          {item.status}",
  "                        </span>",
  "                      </h3>",
  "                      <p className=\"text-xs text-muted-foreground\">{item.category} {item.subcategory ? '• ' + item.subcategory : ''}</p>",
  "                    </div>",
  "                    <span className=\"text-[11px] text-muted-foreground font-mono\">",
  "                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}",
  "                    </span>",
  "                  </div>",
  "                  <div className=\"flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2\">",
  "                    <span>📞 {item.phone}</span>",
  "                    {item.email && <span>✉️ {item.email}</span>}",
  "                    <span className=\"ml-auto flex items-center gap-1 text-primary font-medium text-[11px]\">Ver detalles <ChevronRight className=\"w-3 h-3\" /></span>",
  "                  </div>",
  "                </div>",
  "              );",
  "            })",
  "          )}",
  "        </div>",
  "",
  "        {selectedItem && (",
  "          <div className=\"lg:col-span-5 bg-card border border-border rounded-2xl p-5 space-y-5 h-fit sticky top-6\">",
  "            <div className=\"flex items-start justify-between border-b border-border pb-3\">",
  "              <div>",
  "                <span className=\"text-[10px] text-muted-foreground font-mono\">ID: #{selectedItem.id.slice(0, 8)}</span>",
  "                <h2 className=\"text-lg font-bold\">{selectedItem.businessName}</h2>",
  "              </div>",
  "              <button onClick={() => setSelectedItem(null)} className=\"p-1 text-muted-foreground hover:text-foreground\">",
  "                <X className=\"w-4 h-4\" />",
  "              </button>",
  "            </div>",
  "",
  "            <div>",
  "              <label className=\"block text-xs font-semibold mb-1 text-muted-foreground\">Cambiar Estado:</label>",
  "              <div className=\"grid grid-cols-2 gap-1.5\">",
  "                {ESTADOS_SOLICITUD.map(st => (",
  "                  <button",
  "                    key={st}",
  "                    disabled={updating}",
  "                    onClick={() => handleCambiarEstado(st)}",
  "                    className={'px-2.5 py-1.5 text-xs rounded-lg font-medium border text-left transition-all ' + (selectedItem.status === st ? 'border-primary bg-primary text-primary-foreground font-bold' : 'border-border bg-background hover:bg-muted')}",
  "                  >",
  "                    {st}",
  "                  </button>",
  "                ))}",
  "              </div>",
  "            </div>",
  "",
  "            <div className=\"p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs\">",
  "              <p><strong>Teléfono:</strong> {selectedItem.phone}</p>",
  "              <p><strong>Dirección:</strong> {selectedItem.address}</p>",
  "              {selectedItem.email && <p><strong>Correo:</strong> {selectedItem.email}</p>}",
  "              <p><strong>Descripción:</strong> {selectedItem.description}</p>",
  "            </div>",
  "",
  "            <div className=\"p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-1.5\">",
  "              <p className=\"font-bold text-amber-600 dark:text-amber-400\">🎨 Creación de Recursos solicitada:</p>",
  "              <ul className=\"list-disc list-inside text-muted-foreground space-y-0.5\">",
  "                <li>Logo: {selectedItem.images?.noLogoCreateForMe ? '⚠️ Requiere que lo creen' : selectedItem.images?.logoUrl ? '✅ Subido' : 'No adjuntado'}</li>",
  "                <li>Banner: {selectedItem.images?.noBannerCreateForMe ? '⚠️ Requiere que lo creen' : selectedItem.images?.bannerUrl ? '✅ Subido' : 'No adjuntado'}</li>",
  "                <li>Productos: {selectedItem.products?.noProductsPhotosCreateForMe ? '⚠️ Requiere creación de fotos' : (selectedItem.products?.productPhotosUrls?.length || 0) + ' fotos'}</li>",
  "              </ul>",
  "              {selectedItem.images?.stylePreference && (",
  "                <p className=\"mt-1 text-xs\"><strong>Estilo preferido:</strong> {selectedItem.images.stylePreference}</p>",
  "              )}",
  "            </div>",
  "",
  "            <div className=\"space-y-2 text-xs\">",
  "              <p className=\"font-bold text-muted-foreground\">Archivos del cliente:</p>",
  "              <div className=\"flex flex-wrap gap-2\">",
  "                {selectedItem.images?.logoUrl && (",
  "                  <a href={selectedItem.images.logoUrl} target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium\">",
  "                    <Image className=\"w-3 h-3\" /> Logo",
  "                  </a>",
  "                )}",
  "                {selectedItem.images?.bannerUrl && (",
  "                  <a href={selectedItem.images.bannerUrl} target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium\">",
  "                    <Image className=\"w-3 h-3\" /> Banner",
  "                  </a>",
  "                )}",
  "                {selectedItem.products?.templateFileUrl && (",
  "                  <a href={selectedItem.products.templateFileUrl} target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium\">",
  "                    <FileText className=\"w-3 h-3\" /> Catálogo",
  "                  </a>",
  "                )}",
  "                {selectedItem.products?.productPhotosUrls?.map((url, i) => (",
  "                  <a key={i} href={url} target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium\">",
  "                    <Image className=\"w-3 h-3\" /> Foto #{i + 1}",
  "                  </a>",
  "                ))}",
  "              </div>",
  "            </div>",
  "",
  "            <div className=\"border-t border-border pt-4 space-y-3\">",
  "              <div className=\"flex items-center justify-between\">",
  "                <p className=\"text-xs font-bold\">Notificación WhatsApp:</p>",
  "                <button",
  "                  onClick={handleReenviarWhatsApp}",
  "                  disabled={reenviandoWhatsApp}",
  "                  className=\"inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 font-semibold disabled:opacity-50\"",
  "                >",
  "                  <Send className=\"w-3 h-3\" /> {reenviandoWhatsApp ? 'Enviando...' : 'Reenviar WhatsApp'}",
  "                </button>",
  "              </div>",
  "              {selectedItem.whatsappError && (",
  "                <p className=\"text-[11px] text-destructive\">Último error: {selectedItem.whatsappError}</p>",
  "              )}",
  "            </div>",
  "",
  "            <div className=\"border-t border-border pt-4 space-y-2\">",
  "              <p className=\"text-xs font-bold\">Notas Internas del Equipo:</p>",
  "              <div className=\"space-y-1.5 max-h-32 overflow-y-auto\">",
  "                {selectedItem.internalNotes?.map(n => (",
  "                  <div key={n.id} className=\"p-2 rounded bg-muted/60 text-[11px] space-y-0.5\">",
  "                    <p className=\"text-foreground\">{n.text}</p>",
  "                    <p className=\"text-muted-foreground text-[9px]\">{n.author || 'Admin'} • {new Date(n.createdAt).toLocaleDateString()}</p>",
  "                  </div>",
  "                ))}",
  "                {(!selectedItem.internalNotes || selectedItem.internalNotes.length === 0) && (",
  "                  <p className=\"text-[11px] text-muted-foreground italic\">Sin notas aún.</p>",
  "                )}",
  "              </div>",
  "              <div className=\"flex gap-1.5 pt-1\">",
  "                <input type=\"text\" placeholder=\"Agregar nota interna...\" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAgregarNota()} className=\"flex-1 px-2.5 py-1 text-xs rounded border border-input bg-background\" />",
  "                <button onClick={handleAgregarNota} disabled={updating || !nuevaNota.trim()} className=\"px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded hover:opacity-90 disabled:opacity-50\">Guardar</button>",
  "              </div>",
  "            </div>",
  "          </div>",
  "        )}",
  "      </div>",
  "    </div>",
  "  );",
  "}"
].join('\n');

fs.writeFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', adminInboxLines, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/components/admin-inbox.tsx');

// 5. Crear página en SuperAdmin: src/app/(admin)/superadmin/solicitudes-negocio/page.tsx
const adminInboxPage = `import AdminInbox from '@/modules/solicitudes-negocio/components/admin-inbox';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bandeja de Solicitudes de Negocio | Super Admin',
  description: 'Gestión y seguimiento de solicitudes de incorporación de negocios.'
};

export default function SolicitudesNegocioPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AdminInbox />
    </div>
  );
}
`;
fs.writeFileSync('src/app/(admin)/superadmin/solicitudes-negocio/page.tsx', adminInboxPage, 'utf8');
console.log('[OK] Creado: src/app/(admin)/superadmin/solicitudes-negocio/page.tsx');

// 6. MODIFICACIÓN QUIRÚRGICA CON RESPALDO .BAK: src/components/layout/super-admin-nav.tsx
const navPath = 'src/components/layout/super-admin-nav.tsx';
const bakPath = 'src/components/layout/super-admin-nav.tsx.bak';

if (fs.existsSync(navPath)) {
  fs.copyFileSync(navPath, bakPath);
  console.log(`[BACKUP OK] Creada copia de seguridad en: ${bakPath}`);

  let content = fs.readFileSync(navPath, 'utf8');

  // Asegurar icono ClipboardList en los imports de lucide-react si no está
  if (!content.includes('ClipboardList')) {
    content = content.replace(
      'LayoutDashboard,',
      'LayoutDashboard,\n  ClipboardList,'
    );
  }

  // Insertar quirúrgicamente el nuevo link después de /superadmin/negocios si no existe
  if (!content.includes('/superadmin/solicitudes-negocio')) {
    const target = '{ href: "/superadmin/negocios", icon: Building, label: "Negocios" },';
    const insertion = '\n  { href: "/superadmin/solicitudes-negocio", icon: ClipboardList, label: "Solicitudes" },';
    content = content.replace(target, target + insertion);
    fs.writeFileSync(navPath, content, 'utf8');
    console.log('[QUIRÚRGICO OK] Ítem "Solicitudes" agregado al menú de navegación con éxito.');
  } else {
    console.log('[INFO] El ítem ya se encontraba presente en el menú.');
  }
} else {
  console.warn('[ALERTA] No se encontró super-admin-nav.tsx');
}

console.log('\n==============================================');
console.log('FASE E COMPLETADA CON ÉXITO');
console.log('==============================================');
