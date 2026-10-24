const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO PARTE 2B: Editor y Bandeja Super Admin');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. admin-editor.tsx
const adminEditorContent = `'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SolicitudFormConfig, PlanActivacion } from '../types';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { 
  Save, RotateCcw, Eye, Settings, Palette, Layers, 
  ListTree, MessageSquare, Check, AlertCircle, Loader2, Plus, Trash2, ArrowLeft, ExternalLink, CreditCard, Package
} from 'lucide-react';
import PublicForm from './public-form';
import AdminPaymentsTab from './admin-payments-tab';

export default function AdminEditor() {
  const [config, setConfig] = useState<SolicitudFormConfig>(DEFAULT_SOLICITUD_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'plans' | 'branding' | 'blocks' | 'categories' | 'payments' | 'preview'>('general');

  const [newCatName, setNewCatName] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [selectedCatIndex, setSelectedCatIndex] = useState(0);

  useEffect(() => {
    fetch('/api/solicitudes-negocio/admin/config')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setConfig(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (dataToSave = config) => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      setConfig(json.config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handlePlanChange = (index: number, field: keyof PlanActivacion, value: any) => {
    const updated = [...(config.plans || [])];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'isFree' && value === true) {
      updated[index].price = 0;
    }
    setConfig({ ...config, plans: updated });
  };

  const addPlan = () => {
    const newPlan: PlanActivacion = {
      id: 'plan-' + Date.now(),
      name: 'Nuevo Plan',
      description: 'Descripción del plan',
      price: 29000,
      currency: 'COP',
      isFree: false,
      hotmartUrl: '',
      active: true
    };
    setConfig({ ...config, plans: [...(config.plans || []), newPlan] });
  };

  const removePlan = (index: number) => {
    const updated = (config.plans || []).filter((_, i) => i !== index);
    setConfig({ ...config, plans: updated });
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/solicitudes-negocio" className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editor del Formulario</h1>
            <p className="text-xs text-muted-foreground">Planes de activación, pasarelas de pago, textos y WhatsApp (v{config.version || 1})</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a href="/registro-negocio" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted">
            <ExternalLink className="w-3.5 h-3.5" /> Ver en vivo
          </a>
          <button onClick={() => handleSave()} disabled={saving} className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? '¡Guardado!' : 'Guardar y Publicar'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('general')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <Settings className="w-3.5 h-3.5" /> Ajustes & WhatsApp
        </button>
        <button onClick={() => setActiveTab('plans')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'plans' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <Package className="w-3.5 h-3.5" /> Planes de Activación ({config.plans?.length || 0})
        </button>
        <button onClick={() => setActiveTab('payments')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <CreditCard className="w-3.5 h-3.5" /> Métodos de Pago
        </button>
        <button onClick={() => setActiveTab('branding')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'branding' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <Palette className="w-3.5 h-3.5" /> Diseño y Textos
        </button>
        <button onClick={() => setActiveTab('blocks')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'blocks' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <Layers className="w-3.5 h-3.5" /> Bloques
        </button>
        <button onClick={() => setActiveTab('categories')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'categories' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <ListTree className="w-3.5 h-3.5" /> Categorías ({config.categories?.length || 0})
        </button>
        <button onClick={() => setActiveTab('preview')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'preview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <Eye className="w-3.5 h-3.5" /> Vista Previa
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-2xl border border-border">
          <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <p className="text-sm font-bold">Interruptor del Módulo</p>
              <p className="text-xs text-muted-foreground">Si está desactivado, el formulario muestra mantenimiento.</p>
            </div>
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="w-5 h-5 rounded text-primary cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">WhatsApp receptor</label>
            <input type="text" value={config.adminWhatsAppNumber || ''} onChange={e => setConfig({ ...config, adminWhatsAppNumber: e.target.value })} className="w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Correo de respaldo</label>
            <input type="email" value={config.backupEmail || ''} onChange={e => setConfig({ ...config, backupEmail: e.target.value })} className="w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold mb-1 block">Plantilla WhatsApp (Variables: {'{nombre}'}, {'{telefono}'}, {'{plan}'}, {'{valor}'}, {'{metodo_pago}'}, {'{comprobante}'}, {'{enlace}'})</label>
            <textarea rows={6} value={config.whatsappMessageTemplate || ''} onChange={e => setConfig({ ...config, whatsappMessageTemplate: e.target.value })} className="w-full p-3 font-mono text-xs rounded-lg border border-input bg-background resize-none" />
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-4 bg-card p-6 rounded-2xl border border-border">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold">Configuración de Planes de Activación</h2>
              <p className="text-xs text-muted-foreground">Define los planes, precios en COP y enlaces de pago en Hotmart para el formulario.</p>
            </div>
            <button type="button" onClick={addPlan} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Agregar Plan
            </button>
          </div>

          <div className="space-y-4">
            {config.plans?.map((plan, idx) => (
              <div key={plan.id || idx} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={'plan-active-' + idx} checked={plan.active !== false} onChange={e => handlePlanChange(idx, 'active', e.target.checked)} className="w-4 h-4 rounded text-primary" />
                    <label htmlFor={'plan-active-' + idx} className="text-xs font-semibold cursor-pointer">Activo</label>
                  </div>
                  <button type="button" onClick={() => removePlan(idx)} className="text-muted-foreground hover:text-destructive p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Nombre del Plan</label>
                    <input type="text" value={plan.name} onChange={e => handlePlanChange(idx, 'name', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Precio (COP)</label>
                    <input type="number" disabled={plan.isFree} value={plan.price} onChange={e => handlePlanChange(idx, 'price', Number(e.target.value))} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background disabled:opacity-50" />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="checkbox" checked={plan.isFree} onChange={e => handlePlanChange(idx, 'isFree', e.target.checked)} className="w-4 h-4 rounded text-primary" />
                      ¿Es Plan Gratuito ($0)?
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">Descripción corta</label>
                  <input type="text" value={plan.description} onChange={e => handlePlanChange(idx, 'description', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">Enlace de Pago Hotmart (Opcional)</label>
                  <input type="text" placeholder="https://pay.hotmart.com/..." value={plan.hotmartUrl || ''} onChange={e => handlePlanChange(idx, 'hotmartUrl', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payments' && <AdminPaymentsTab />}

      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-2xl border border-border">
          <div>
            <label className="block text-xs font-semibold mb-1">Título</label>
            <input type="text" value={config.branding?.title || ''} onChange={e => setConfig({ ...config, branding: { ...config.branding, title: e.target.value } })} className="w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Subtítulo</label>
            <input type="text" value={config.branding?.subtitle || ''} onChange={e => setConfig({ ...config, branding: { ...config.branding, subtitle: e.target.value } })} className="w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
          </div>
        </div>
      )}

      {activeTab === 'blocks' && (
        <div className="space-y-4">
          {Object.entries(config.blocks || {}).map(([key, block]) => (
            <div key={key} className="bg-card p-4 rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{block.title}</p>
                <p className="text-xs text-muted-foreground">{block.description}</p>
              </div>
              <input type="checkbox" checked={block.enabled} onChange={e => { const updated = { ...config.blocks, [key]: { ...block, enabled: e.target.checked } }; setConfig({ ...config, blocks: updated }); }} className="w-4 h-4 rounded text-primary cursor-pointer" />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <PublicForm />
        </div>
      )}
    </div>
  );
}
`;
backupAndWrite('src/modules/solicitudes-negocio/components/admin-editor.tsx', adminEditorContent);

// 2. admin-inbox.tsx
const adminInboxContent = `'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SolicitudNegocio, SolicitudEstado, PaymentStatus } from '../types';
import { ESTADOS_SOLICITUD, ESTADO_COLORES } from '../constants';
import { 
  Search, RefreshCw, Settings, ExternalLink, Send, CheckCircle2, 
  CreditCard, FileText, Image, Download, X, Plus, ChevronRight, AlertCircle, DollarSign
} from 'lucide-react';

export default function AdminInbox() {
  const [solicitudes, setSolicitudes] = useState<SolicitudNegocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPago, setFiltroPago] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<SolicitudNegocio | null>(null);
  const [updating, setUpdating] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  const [reenviandoWhatsApp, setReenviandoWhatsApp] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== 'todos') params.set('estado', filtroEstado);
      if (filtroPago !== 'todos') params.set('pago', filtroPago);

      const res = await fetch('/api/solicitudes-negocio/admin/solicitudes?' + params.toString());
      const data = await res.json();
      if (Array.isArray(data)) {
        setSolicitudes(data);
        if (selectedItem) {
          const updated = data.find(s => s.id === selectedItem.id);
          if (updated) setSelectedItem(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [filtroEstado, filtroPago]);

  const handleCambiarEstado = async (nuevoEstado: SolicitudEstado, nuevoEstadoPago?: PaymentStatus) => {
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
  };

  const handleAgregarNota = async () => {
    if (!selectedItem || !nuevaNota.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/solicitudes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id, status: selectedItem.status, nota: nuevaNota })
      });
      if (res.ok) {
        setNuevaNota('');
        await cargarSolicitudes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleReenviarWhatsApp = async () => {
    if (!selectedItem) return;
    setReenviandoWhatsApp(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/reenviar-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId: selectedItem.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage('WhatsApp enviado correctamente vía WHAPI');
      } else {
        setActionMessage('Error: ' + (data.error || 'No se pudo enviar'));
      }
      setTimeout(() => setActionMessage(null), 4000);
      await cargarSolicitudes();
    } catch (e: any) {
      setActionMessage('Error: ' + e.message);
    } finally {
      setReenviandoWhatsApp(false);
    }
  };

  const filtered = solicitudes.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.businessName?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.planName?.toLowerCase().includes(q) ||
      s.paymentMethod?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Negocio</h1>
          <p className="text-xs text-muted-foreground">Gestión de solicitudes, planes de activación y comprobantes de pago recibidos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cargarSolicitudes()} className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground">
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
          </button>
          <Link href="/registro-negocio" target="_blank" className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted">
            <ExternalLink className="w-3.5 h-3.5" /> Ver Formulario
          </Link>
          <Link href="/superadmin/solicitudes-negocio/configurar" className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            <Settings className="w-3.5 h-3.5" /> Configurar
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {actionMessage}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar negocio, plan, teléfono, método..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-input bg-background">
            <option value="todos">Estado Solicitud: Todos</option>
            {ESTADOS_SOLICITUD.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-input bg-background">
            <option value="todos">Estado Pago: Todos</option>
            <option value="Pendiente de pago">Pendiente de pago</option>
            <option value="Pagado">Pagado</option>
            <option value="No aplica">No aplica (Gratis)</option>
            <option value="Rechazado">Rechazado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={selectedItem ? 'lg:col-span-7 space-y-2' : 'lg:col-span-12 space-y-2'}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border text-xs text-muted-foreground">
              No se encontraron solicitudes.
            </div>
          ) : (
            filtered.map(item => {
              const badge = ESTADO_COLORES[item.status] || { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' };
              const isSelected = selectedItem?.id === item.id;
              return (
                <div key={item.id} onClick={() => setSelectedItem(item)} className={'p-4 rounded-xl border cursor-pointer transition-all ' + (isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/40')}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                        {item.businessName}
                        <span className={'text-[10px] px-2 py-0.5 rounded-full border font-semibold ' + badge.bg + ' ' + badge.text + ' ' + badge.border}>{item.status}</span>
                        {item.paymentStatus && (
                          <span className={'text-[10px] px-2 py-0.5 rounded-full border font-semibold ' + (item.paymentStatus === 'Pagado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : item.paymentStatus === 'Pendiente de pago' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-muted text-muted-foreground')}>
                            {item.paymentStatus}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">📦 Plan: <strong>{item.planName || 'Básico'}</strong> {item.planPrice ? ('($' + item.planPrice.toLocaleString('es-CO') + ' COP)') : '(Gratis)'}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span>📞 {item.phone}</span>
                    <span>💳 {item.paymentMethod || 'No especificado'}</span>
                    {item.paymentReceiptUrl && <span className="text-emerald-600 font-bold">🧾 Con Comprobante</span>}
                    <span className="ml-auto text-primary font-medium text-[11px] flex items-center">Ver <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedItem && (
          <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 space-y-5 h-fit sticky top-6">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] text-muted-foreground font-mono">ID: #{selectedItem.id.slice(0, 8)}</span>
                <h2 className="text-lg font-bold">{selectedItem.businessName}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-primary">📦 {selectedItem.planName || 'Plan Estándar'}</span>
                <span className="font-mono font-bold text-sm">
                  {selectedItem.planPrice ? ('$' + selectedItem.planPrice.toLocaleString('es-CO') + ' COP') : 'Gratis'}
                </span>
              </div>
              <p><strong>Método de pago:</strong> {selectedItem.paymentMethod || 'No especificado'}</p>
              {selectedItem.paymentReference && <p><strong>Referencia:</strong> {selectedItem.paymentReference}</p>}
              
              <div className="pt-2 flex items-center justify-between border-t border-border/50">
                <span className="font-semibold">Estado de Pago:</span>
                <select
                  value={selectedItem.paymentStatus || 'Pendiente de pago'}
                  onChange={e => handleCambiarEstado(selectedItem.status, e.target.value as PaymentStatus)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background font-bold"
                >
                  <option value="Pendiente de pago">Pendiente de pago</option>
                  <option value="Pagado">Pagado</option>
                  <option value="No aplica">No aplica</option>
                  <option value="Rechazado">Rechazado</option>
                </select>
              </div>

              {selectedItem.paymentReceiptUrl && (
                <div className="pt-2">
                  <a href={selectedItem.paymentReceiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:opacity-90">
                    <Download className="w-3.5 h-3.5" /> Descargar Comprobante de Pago
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Estado Solicitud:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ESTADOS_SOLICITUD.map(st => (
                  <button key={st} disabled={updating} onClick={() => handleCambiarEstado(st)} className={'px-2.5 py-1.5 text-xs rounded-lg font-medium border text-left ' + (selectedItem.status === st ? 'border-primary bg-primary text-primary-foreground font-bold' : 'border-border bg-background hover:bg-muted')}>
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
              <p><strong>Teléfono:</strong> {selectedItem.phone}</p>
              <p><strong>Dirección:</strong> {selectedItem.address}</p>
              {selectedItem.email && <p><strong>Correo:</strong> {selectedItem.email}</p>}
              <p><strong>Descripción:</strong> {selectedItem.description}</p>
            </div>

            <div className="border-t border-border pt-4 flex items-center justify-between">
              <span className="text-xs font-bold">Notificación WhatsApp:</span>
              <button onClick={handleReenviarWhatsApp} disabled={reenviandoWhatsApp} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-emerald-600/10 text-emerald-600 font-semibold disabled:opacity-50">
                <Send className="w-3 h-3" /> {reenviandoWhatsApp ? 'Enviando...' : 'Reenviar WhatsApp'}
              </button>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-bold">Notas Internas:</p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {selectedItem.internalNotes?.map(n => (
                  <div key={n.id} className="p-2 rounded bg-muted/60 text-[11px]">
                    <p>{n.text}</p>
                    <p className="text-muted-foreground text-[9px]">{n.author || 'Admin'} • {new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" placeholder="Nueva nota..." value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAgregarNota()} className="flex-1 px-2.5 py-1 text-xs rounded border border-input bg-background" />
                <button onClick={handleAgregarNota} disabled={updating || !nuevaNota.trim()} className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;
backupAndWrite('src/modules/solicitudes-negocio/components/admin-inbox.tsx', adminInboxContent);

console.log('==============================================');
console.log('PARTE 2B APLICADA CON ÉXITO');
console.log('==============================================');
