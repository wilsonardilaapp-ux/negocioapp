'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SolicitudFormConfig, PlanActivacion } from '../types';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { 
  Save, RotateCcw, Eye, Settings, Palette, Layers, 
  ListTree, MessageSquare, Check, AlertCircle, Loader2, Plus, Trash2, ArrowLeft, ExternalLink, CreditCard, Package, ChevronUp, ChevronDown, Share2
} from 'lucide-react';
import PublicForm from './public-form';
import AdminPaymentsTab from './admin-payments-tab';
import AdminShareTrackingTab from './admin-share-tracking-tab';

export default function AdminEditor() {
  const [config, setConfig] = useState<SolicitudFormConfig>(DEFAULT_SOLICITUD_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'plans' | 'branding' | 'blocks' | 'categories' | 'payments' | 'share' | 'preview'>('general');

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
    let updated = [...(config.plans || [])];

    if (field === 'highlighted') {
      const isChecking = Boolean(value);
      updated = updated.map((p, i) => {
        if (i === index) {
          return {
            ...p,
            highlighted: isChecking,
            badge: isChecking ? (p.badge || 'Más popular') : (p.badge === 'Más popular' ? '' : p.badge)
          };
        }
        return { ...p, highlighted: false };
      });
      setConfig({ ...config, plans: updated });
      return;
    }

    updated[index] = { ...updated[index], [field]: value };
    if (field === 'isFree' && value === true) {
      updated[index].price = 0;
    }
    setConfig({ ...config, plans: updated });
  };

  const handleAddFeature = (planIndex: number) => {
    const updated = [...(config.plans || [])];
    const plan = updated[planIndex];
    const currentFeats = plan.features || [];
    if (currentFeats.length >= 8) return;
    updated[planIndex] = { ...plan, features: [...currentFeats, ''] };
    setConfig({ ...config, plans: updated });
  };

  const handleFeatureChange = (planIndex: number, featIndex: number, val: string) => {
    const updated = [...(config.plans || [])];
    const feats = [...(updated[planIndex].features || [])];
    feats[featIndex] = val.slice(0, 70);
    updated[planIndex] = { ...updated[planIndex], features: feats };
    setConfig({ ...config, plans: updated });
  };

  const handleRemoveFeature = (planIndex: number, featIndex: number) => {
    const updated = [...(config.plans || [])];
    const feats = (updated[planIndex].features || []).filter((_, i) => i !== featIndex);
    updated[planIndex] = { ...updated[planIndex], features: feats };
    setConfig({ ...config, plans: updated });
  };

  const handleMoveFeature = (planIndex: number, featIndex: number, direction: 'up' | 'down') => {
    const updated = [...(config.plans || [])];
    const feats = [...(updated[planIndex].features || [])];
    const targetIdx = direction === 'up' ? featIndex - 1 : featIndex + 1;
    if (targetIdx < 0 || targetIdx >= feats.length) return;
    const temp = feats[featIndex];
    feats[featIndex] = feats[targetIdx];
    feats[targetIdx] = temp;
    updated[planIndex] = { ...updated[planIndex], features: feats };
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
      active: true,
      highlighted: false,
      badge: '',
      priceSuffix: 'pago único',
      features: []
    };
    setConfig({ ...config, plans: [...(config.plans || []), newPlan] });
  };

  const removePlan = (planIndex: number) => {
    setConfig({ ...config, plans: (config.plans || []).filter((_, idx) => idx !== planIndex) });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const updated = [...(config.categories || []), { name: newCatName.trim(), subcategories: [] }];
    setConfig({ ...config, categories: updated });
    setNewCatName('');
  };

  const handleRemoveCategory = (catIndex: number) => {
    const updated = (config.categories || []).filter((_, idx) => idx !== catIndex);
    setConfig({ ...config, categories: updated });
  };

  const handleCategoryNameChange = (catIndex: number, newName: string) => {
    const updated = [...(config.categories || [])];
    if (updated[catIndex]) {
      updated[catIndex] = { ...updated[catIndex], name: newName };
      setConfig({ ...config, categories: updated });
    }
  };

  const handleAddSubcategory = (catIndex: number) => {
    if (!newSubcatName.trim()) return;
    const updated = [...(config.categories || [])];
    if (updated[catIndex]) {
      const currentSubs = updated[catIndex].subcategories || [];
      updated[catIndex] = {
        ...updated[catIndex],
        subcategories: [...currentSubs, newSubcatName.trim()]
      };
      setConfig({ ...config, categories: updated });
      setNewSubcatName('');
    }
  };

  const handleRemoveSubcategory = (catIndex: number, subIndex: number) => {
    const updated = [...(config.categories || [])];
    if (updated[catIndex]) {
      updated[catIndex] = {
        ...updated[catIndex],
        subcategories: updated[catIndex].subcategories.filter((_, idx) => idx !== subIndex)
      };
      setConfig({ ...config, categories: updated });
    }
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
        <button onClick={() => setActiveTab('share')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'share' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>
          <Share2 className="w-3.5 h-3.5" /> Compartir y Métricas
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
            <label className="text-xs font-semibold mb-1 block">Plantilla WhatsApp (Variables: {'{nombre}'}, {'{nombre_completo}'}, {'{telefono}'}, {'{plan}'}, {'{valor}'}, {'{metodo_pago}'}, {'{comprobante}'}, {'{enlace}'})</label>
            <textarea rows={6} value={config.whatsappMessageTemplate || ''} onChange={e => setConfig({ ...config, whatsappMessageTemplate: e.target.value })} className="w-full p-3 font-mono text-xs rounded-lg border border-input bg-background resize-none" />
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6 bg-card p-6 rounded-2xl border border-border">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold">Configuración de Planes de Activación</h2>
              <p className="text-xs text-muted-foreground">Personaliza precios, características, enlaces de Hotmart y el plan destacado.</p>
            </div>
            <button type="button" onClick={addPlan} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Agregar Plan
            </button>
          </div>

          <div className="space-y-6">
            {config.plans?.map((plan, idx) => (
              <div key={plan.id || idx} className={'p-5 rounded-2xl border transition-all space-y-4 ' + (plan.highlighted ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-muted/20')}>
                {/* 1. Activo & Eliminar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={'plan-active-' + idx} checked={plan.active !== false} onChange={e => handlePlanChange(idx, 'active', e.target.checked)} className="w-4 h-4 rounded text-primary cursor-pointer" />
                    <label htmlFor={'plan-active-' + idx} className="text-xs font-bold cursor-pointer">Activo en el formulario</label>
                  </div>
                  <button type="button" onClick={() => removePlan(idx)} className="text-muted-foreground hover:text-destructive p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 2, 3, 4: Nombre, Precio, Gratuito */}
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

                {/* 5. Descripción corta con contador (máx 120 chars) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold">Descripción corta</label>
                    <span className="text-[10px] text-muted-foreground font-mono">{(plan.description || '').length}/120</span>
                  </div>
                  <input type="text" maxLength={120} value={plan.description || ''} onChange={e => handlePlanChange(idx, 'description', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                </div>

                {/* 6. JUSTO DEBAJO DE DESCRIPCIÓN: CARACTERÍSTICAS */}
                <div className="p-3.5 rounded-xl border border-border bg-background space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-foreground">Características del Plan ({(plan.features || []).length}/8)</label>
                    {(plan.features || []).length < 8 && (
                      <button type="button" onClick={() => handleAddFeature(idx)} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Agregar característica
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {(plan.features || []).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={70}
                          placeholder="Beneficio o característica..."
                          value={feat}
                          onChange={e => handleFeatureChange(idx, fIdx, e.target.value)}
                          className="flex-1 text-xs h-8 px-2.5 rounded border border-input bg-background"
                        />
                        <button type="button" disabled={fIdx === 0} onClick={() => handleMoveFeature(idx, fIdx, 'up')} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" disabled={fIdx === (plan.features || []).length - 1} onClick={() => handleMoveFeature(idx, fIdx, 'down')} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleRemoveFeature(idx, fIdx)} className="p-1 rounded text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!plan.features || plan.features.length === 0) && (
                      <p className="text-[11px] text-muted-foreground italic py-1">Sin características añadidas.</p>
                    )}
                  </div>
                </div>

                {/* 7, 8, 9, 10: Hotmart, Etiqueta, Destacado, Texto junto al precio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Enlace de Pago Hotmart (Opcional)</label>
                    <input type="text" placeholder="https://pay.hotmart.com/..." value={plan.hotmartUrl || ''} onChange={e => handlePlanChange(idx, 'hotmartUrl', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Etiqueta (Badge libre)</label>
                    <input type="text" placeholder="Ej: Más popular, Gratis, Recomendado..." value={plan.badge || ''} onChange={e => handlePlanChange(idx, 'badge', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id={'plan-highlight-' + idx} checked={Boolean(plan.highlighted)} onChange={e => handlePlanChange(idx, 'highlighted', e.target.checked)} className="w-4 h-4 rounded text-emerald-600 cursor-pointer" />
                    <label htmlFor={'plan-highlight-' + idx} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                      Plan destacado (Solo 1 a la vez, borde verde)
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Texto junto al precio</label>
                    <input type="text" placeholder="pago único" value={plan.priceSuffix || 'pago único'} onChange={e => handlePlanChange(idx, 'priceSuffix', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Línea editable de porcentaje bajo las tarjetas */}
          <div className="pt-5 border-t border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">Mostrar nota al pie de los planes en el formulario</p>
                <p className="text-[11px] text-muted-foreground">Si está activo, los visitantes verán la frase destacada debajo de los planes.</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none" aria-label="Mostrar u ocultar texto del footer">
                  <input
                    type="checkbox"
                    checked={config.showCommissionNote !== false}
                    onChange={e => setConfig({ ...config, showCommissionNote: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      width: '50px',
                      height: '26px',
                      backgroundColor: (config.showCommissionNote !== false) ? '#16a34a' : '#cbd5e1',
                      transition: 'background-color 0.3s ease'
                    }}
                    className="rounded-full relative p-0.5"
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        transform: (config.showCommissionNote !== false) ? 'translateX(24px)' : 'translateX(0px)',
                        transition: 'transform 0.3s ease'
                      }}
                      className="bg-white rounded-full shadow-md"
                    />
                  </div>
                </label>
                <span className="text-xs font-semibold text-foreground">
                  {(config.showCommissionNote !== false) ? 'Visible' : 'Oculto'}
                </span>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-lg bg-background border border-border/80">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Texto actual en el formulario:</strong> ✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'share' && <AdminShareTrackingTab />}

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

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-card p-5 rounded-2xl border border-border">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold">Gestión de Categorías ({config.categories?.length || 0})</h3>
                <p className="text-xs text-muted-foreground">Configura las categorías y subcategorías disponibles en el formulario de registro.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background min-w-[200px]"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {(config.categories || []).map((cat, catIdx) => (
                <div key={catIdx} className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={e => handleCategoryNameChange(catIdx, e.target.value)}
                      className="font-bold text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:bg-background px-1.5 py-0.5 rounded transition-all flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(catIdx)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                      Subcategorías ({cat.subcategories?.length || 0}):
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {(cat.subcategories || []).map((sub, subIdx) => (
                        <span
                          key={subIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-background border border-border rounded-lg"
                        >
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubcategory(catIdx, subIdx)}
                            className="text-muted-foreground hover:text-rose-600 transition-colors ml-0.5"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                      {(cat.subcategories || []).length === 0 && (
                        <span className="text-[11px] text-muted-foreground italic">Sin subcategorías</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Añadir subcategoría..."
                        value={selectedCatIndex === catIdx ? newSubcatName : ''}
                        onFocus={() => setSelectedCatIndex(catIdx)}
                        onChange={e => { setSelectedCatIndex(catIdx); setNewSubcatName(e.target.value); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubcategory(catIdx); } }}
                        className="px-2.5 py-1 text-xs rounded-lg border border-input bg-background flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubcategory(catIdx)}
                        disabled={selectedCatIndex !== catIdx || !newSubcatName.trim()}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
