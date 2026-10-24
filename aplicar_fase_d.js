const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO FASE D: Editor del Formulario (Corregido)');
console.log('==============================================');

// 1. Directorios
const dirs = [
  'src/app/api/solicitudes-negocio/admin/config',
  'src/app/(admin)/superadmin/solicitudes-negocio/configurar'
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. Endpoint Admin Config
const adminConfigRoute = `import { NextRequest, NextResponse } from 'next/server';
import { getSolicitudConfig, saveSolicitudConfig } from '@/modules/solicitudes-negocio/services/solicitudes-service';
import { DEFAULT_SOLICITUD_CONFIG } from '@/modules/solicitudes-negocio/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getSolicitudConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.resetToDefault) {
      const restored = await saveSolicitudConfig(DEFAULT_SOLICITUD_CONFIG);
      return NextResponse.json({ success: true, config: restored, message: 'Configuración restaurada con éxito' });
    }

    const updated = await saveSolicitudConfig(body);
    return NextResponse.json({ success: true, config: updated, message: 'Configuración guardada y publicada' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al guardar configuración' }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/admin/config/route.ts', adminConfigRoute, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/admin/config/route.ts');

// 3. Componente AdminEditor
const adminEditorLines = [
  "'use client';",
  "",
  "import React, { useState, useEffect } from 'react';",
  "import Link from 'next/link';",
  "import { SolicitudFormConfig, CategoryDefinition } from '../types';",
  "import { DEFAULT_SOLICITUD_CONFIG } from '../constants';",
  "import {",
  "  Save, RotateCcw, Eye, Settings, Palette, Layers,",
  "  ListTree, MessageSquare, Check, AlertCircle, Loader2, Plus, Trash2, ArrowLeft, ExternalLink",
  "} from 'lucide-react';",
  "import PublicForm from './public-form';",
  "",
  "export default function AdminEditor() {",
  "  const [config, setConfig] = useState<SolicitudFormConfig>(DEFAULT_SOLICITUD_CONFIG);",
  "  const [loading, setLoading] = useState(true);",
  "  const [saving, setSaving] = useState(false);",
  "  const [saveSuccess, setSaveSuccess] = useState(false);",
  "  const [errorMessage, setErrorMessage] = useState<string | null>(null);",
  "  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'blocks' | 'categories' | 'preview'>('general');",
  "",
  "  const [newCatName, setNewCatName] = useState('');",
  "  const [newSubcatName, setNewSubcatName] = useState('');",
  "  const [selectedCatIndex, setSelectedCatIndex] = useState(0);",
  "",
  "  useEffect(() => {",
  "    fetch('/api/solicitudes-negocio/admin/config')",
  "      .then(res => res.json())",
  "      .then(data => {",
  "        if (data && !data.error) setConfig(data);",
  "      })",
  "      .catch(console.error)",
  "      .finally(() => setLoading(false));",
  "  }, []);",
  "",
  "  const handleSave = async (dataToSave = config) => {",
  "    setSaving(true);",
  "    setErrorMessage(null);",
  "    setSaveSuccess(false);",
  "    try {",
  "      const res = await fetch('/api/solicitudes-negocio/admin/config', {",
  "        method: 'POST',",
  "        headers: { 'Content-Type': 'application/json' },",
  "        body: JSON.stringify(dataToSave)",
  "      });",
  "      const json = await res.json();",
  "      if (!res.ok) throw new Error(json.error || 'Error al guardar');",
  "      setConfig(json.config);",
  "      setSaveSuccess(true);",
  "      setTimeout(() => setSaveSuccess(false), 3000);",
  "    } catch (err: any) {",
  "      setErrorMessage(err.message || 'Error de conexión');",
  "    } finally {",
  "      setSaving(false);",
  "    }",
  "  };",
  "",
  "  const handleReset = async () => {",
  "    if (!confirm('¿Seguro que deseas restaurar los valores por defecto?')) return;",
  "    setSaving(true);",
  "    try {",
  "      const res = await fetch('/api/solicitudes-negocio/admin/config', {",
  "        method: 'POST',",
  "        headers: { 'Content-Type': 'application/json' },",
  "        body: JSON.stringify({ resetToDefault: true })",
  "      });",
  "      const json = await res.json();",
  "      if (!res.ok) throw new Error(json.error);",
  "      setConfig(json.config);",
  "      setSaveSuccess(true);",
  "      setTimeout(() => setSaveSuccess(false), 3000);",
  "    } catch (err: any) {",
  "      setErrorMessage(err.message);",
  "    } finally {",
  "      setSaving(false);",
  "    }",
  "  };",
  "",
  "  const addCategory = () => {",
  "    if (!newCatName.trim()) return;",
  "    const exists = config.categories?.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());",
  "    if (exists) return alert('La categoría ya existe');",
  "    const updated = [...(config.categories || []), { name: newCatName.trim(), subcategories: [] }];",
  "    setConfig({ ...config, categories: updated });",
  "    setNewCatName('');",
  "    setSelectedCatIndex(updated.length - 1);",
  "  };",
  "",
  "  const removeCategory = (index: number) => {",
  "    const updated = (config.categories || []).filter((_, i) => i !== index);",
  "    setConfig({ ...config, categories: updated });",
  "    setSelectedCatIndex(Math.max(0, index - 1));",
  "  };",
  "",
  "  const addSubcategory = () => {",
  "    if (!newSubcatName.trim() || !config.categories?.[selectedCatIndex]) return;",
  "    const cat = config.categories[selectedCatIndex];",
  "    if (cat.subcategories?.includes(newSubcatName.trim())) return alert('La subcategoría ya existe');",
  "    const updatedCats = [...config.categories];",
  "    updatedCats[selectedCatIndex] = {",
  "      ...cat,",
  "      subcategories: [...(cat.subcategories || []), newSubcatName.trim()]",
  "    };",
  "    setConfig({ ...config, categories: updatedCats });",
  "    setNewSubcatName('');",
  "  };",
  "",
  "  const removeSubcategory = (subIndex: number) => {",
  "    if (!config.categories?.[selectedCatIndex]) return;",
  "    const cat = config.categories[selectedCatIndex];",
  "    const updatedSub = cat.subcategories.filter((_, i) => i !== subIndex);",
  "    const updatedCats = [...config.categories];",
  "    updatedCats[selectedCatIndex] = { ...cat, subcategories: updatedSub };",
  "    setConfig({ ...config, categories: updatedCats });",
  "  };",
  "",
  "  if (loading) {",
  "    return (",
  "      <div className=\"min-h-[400px] flex items-center justify-center\">",
  "        <Loader2 className=\"w-8 h-8 animate-spin text-primary\" />",
  "      </div>",
  "    );",
  "  }",
  "",
  "  return (",
  "    <div className=\"space-y-6\">",
  "      <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border\">",
  "        <div className=\"flex items-center gap-3\">",
  "          <Link href=\"/superadmin/solicitudes-negocio\" className=\"p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors\">",
  "            <ArrowLeft className=\"w-4 h-4\" />",
  "          </Link>",
  "          <div>",
  "            <h1 className=\"text-2xl font-bold tracking-tight\">Editor del Formulario</h1>",
  "            <p className=\"text-xs text-muted-foreground\">Configura campos, textos, colores y WhatsApp (v{config.version || 1})</p>",
  "          </div>",
  "        </div>",
  "        <div className=\"flex items-center gap-2\">",
  "          <a href=\"/registro-negocio\" target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted transition-colors\">",
  "            <ExternalLink className=\"w-3.5 h-3.5\" /> Ver en vivo",
  "          </a>",
  "          <button onClick={handleReset} disabled={saving} className=\"inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50\">",
  "            <RotateCcw className=\"w-3.5 h-3.5\" /> Restaurar Defaults",
  "          </button>",
  "          <button onClick={() => handleSave()} disabled={saving} className=\"inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm disabled:opacity-50\">",
  "            {saving ? <Loader2 className=\"w-4 h-4 animate-spin\" /> : saveSuccess ? <Check className=\"w-4 h-4\" /> : <Save className=\"w-4 h-4\" />}",
  "            {saveSuccess ? '¡Guardado!' : 'Guardar y Publicar'}",
  "          </button>",
  "        </div>",
  "      </div>",
  "",
  "      {errorMessage && (",
  "        <div className=\"p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2\">",
  "          <AlertCircle className=\"w-4 h-4\" /> {errorMessage}",
  "        </div>",
  "      )}",
  "",
  "      <div className=\"flex gap-2 border-b border-border overflow-x-auto pb-2\">",
  "        <button onClick={() => setActiveTab('general')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>",
  "          <Settings className=\"w-3.5 h-3.5\" /> Ajustes & WhatsApp",
  "        </button>",
  "        <button onClick={() => setActiveTab('branding')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'branding' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>",
  "          <Palette className=\"w-3.5 h-3.5\" /> Diseño y Textos",
  "        </button>",
  "        <button onClick={() => setActiveTab('blocks')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'blocks' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>",
  "          <Layers className=\"w-3.5 h-3.5\" /> Bloques",
  "        </button>",
  "        <button onClick={() => setActiveTab('categories')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'categories' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>",
  "          <ListTree className=\"w-3.5 h-3.5\" /> Categorías ({config.categories?.length || 0})",
  "        </button>",
  "        <button onClick={() => setActiveTab('preview')} className={'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ' + (activeTab === 'preview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}>",
  "          <Eye className=\"w-3.5 h-3.5\" /> Vista Previa",
  "        </button>",
  "      </div>",
  "",
  "      {activeTab === 'general' && (",
  "        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-2xl border border-border\">",
  "          <div className=\"md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border\">",
  "            <div>",
  "              <p className=\"text-sm font-bold\">Interruptor del Módulo</p>",
  "              <p className=\"text-xs text-muted-foreground\">Permite apagar el formulario temporalmente sin borrar configuraciones ni solicitudes previas.</p>",
  "            </div>",
  "            <input type=\"checkbox\" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className=\"w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer\" />",
  "          </div>",
  "          <div>",
  "            <label className=\"block text-xs font-semibold mb-1\">Número de WhatsApp receptor</label>",
  "            <input type=\"text\" placeholder=\"Ej: 51987654321\" value={config.adminWhatsAppNumber || ''} onChange={e => setConfig({ ...config, adminWhatsAppNumber: e.target.value })} className=\"w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background\" />",
  "            <p className=\"text-[11px] text-muted-foreground mt-1\">Número internacional donde WHAPI notificará nuevas solicitudes.</p>",
  "          </div>",
  "          <div>",
  "            <label className=\"block text-xs font-semibold mb-1\">Correo de respaldo (opcional)</label>",
  "            <input type=\"email\" placeholder=\"backup@markix.app\" value={config.backupEmail || ''} onChange={e => setConfig({ ...config, backupEmail: e.target.value })} className=\"w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background\" />",
  "          </div>",
  "          <div className=\"md:col-span-2\">",
  "            <div className=\"flex justify-between items-center mb-1\">",
  "              <label className=\"text-xs font-semibold flex items-center gap-1.5\">",
  "                <MessageSquare className=\"w-3.5 h-3.5 text-primary\" /> Plantilla del Mensaje de WhatsApp",
  "              </label>",
  "              <span className=\"text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground\">Variables: {`{nombre}, {telefono}, {categoria}, {imagenes}, {enlace}`}</span>",
  "            </div>",
  "            <textarea rows={6} value={config.whatsappMessageTemplate || ''} onChange={e => setConfig({ ...config, whatsappMessageTemplate: e.target.value })} className=\"w-full p-3 font-mono text-xs rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary\" />",
  "          </div>",
  "          <div className=\"md:col-span-2\">",
  "            <label className=\"block text-xs font-semibold mb-1\">Mensaje de Confirmación tras Enviar</label>",
  "            <textarea rows={2} value={config.confirmationMessage || ''} onChange={e => setConfig({ ...config, confirmationMessage: e.target.value })} className=\"w-full p-3 text-sm rounded-lg border border-input bg-background resize-none\" />",
  "          </div>",
  "        </div>",
  "      )}",
  "",
  "      {activeTab === 'branding' && (",
  "        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-2xl border border-border\">",
  "          <div>",
  "            <label className=\"block text-xs font-semibold mb-1\">Título del formulario</label>",
  "            <input type=\"text\" value={config.branding?.title || ''} onChange={e => setConfig({ ...config, branding: { ...config.branding, title: e.target.value } })} className=\"w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background\" />",
  "          </div>",
  "          <div>",
  "            <label className=\"block text-xs font-semibold mb-1\">Subtítulo</label>",
  "            <input type=\"text\" value={config.branding?.subtitle || ''} onChange={e => setConfig({ ...config, branding: { ...config.branding, subtitle: e.target.value } })} className=\"w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background\" />",
  "          </div>",
  "          <div>",
  "            <label className=\"block text-xs font-semibold mb-1\">Logo URL</label>",
  "            <input type=\"text\" placeholder=\"https://...\" value={config.branding?.logoUrl || ''} onChange={e => setConfig({ ...config, branding: { ...config.branding, logoUrl: e.target.value } })} className=\"w-full min-h-[42px] px-3 py-2 text-sm rounded-lg border border-input bg-background\" />",
  "          </div>",
  "          <div className=\"grid grid-cols-2 gap-4\">",
  "            <div>",
  "              <label className=\"block text-xs font-semibold mb-1\">Color Principal</label>",
  "              <div className=\"flex items-center gap-2\">",
  "                <input type=\"color\" value={config.branding?.primaryColor || '#0284c7'} onChange={e => setConfig({ ...config, branding: { ...config.branding, primaryColor: e.target.value } })} className=\"w-10 h-10 p-0 border-0 rounded cursor-pointer\" />",
  "                <input type=\"text\" value={config.branding?.primaryColor || '#0284c7'} onChange={e => setConfig({ ...config, branding: { ...config.branding, primaryColor: e.target.value } })} className=\"w-full text-xs font-mono px-2 py-1.5 rounded border border-input bg-background\" />",
  "              </div>",
  "            </div>",
  "            <div>",
  "              <label className=\"block text-xs font-semibold mb-1\">Color del Botón</label>",
  "              <div className=\"flex items-center gap-2\">",
  "                <input type=\"color\" value={config.branding?.buttonColor || '#0284c7'} onChange={e => setConfig({ ...config, branding: { ...config.branding, buttonColor: e.target.value } })} className=\"w-10 h-10 p-0 border-0 rounded cursor-pointer\" />",
  "                <input type=\"text\" value={config.branding?.buttonColor || '#0284c7'} onChange={e => setConfig({ ...config, branding: { ...config.branding, buttonColor: e.target.value } })} className=\"w-full text-xs font-mono px-2 py-1.5 rounded border border-input bg-background\" />",
  "              </div>",
  "            </div>",
  "          </div>",
  "        </div>",
  "      )}",
  "",
  "      {activeTab === 'blocks' && (",
  "        <div className=\"space-y-4\">",
  "          {Object.entries(config.blocks || {}).map(([key, block]) => (",
  "            <div key={key} className=\"bg-card p-5 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4\">",
  "              <div className=\"flex-1\">",
  "                <div className=\"flex items-center gap-3\">",
  "                  <input type=\"checkbox\" id={'blk-' + key} checked={block.enabled} onChange={e => { const updated = { ...config.blocks, [key]: { ...block, enabled: e.target.checked } }; setConfig({ ...config, blocks: updated }); }} className=\"w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer\" />",
  "                  <input type=\"text\" value={block.title} onChange={e => { const updated = { ...config.blocks, [key]: { ...block, title: e.target.value } }; setConfig({ ...config, blocks: updated }); }} className=\"font-bold text-sm bg-transparent border-b border-dashed border-input focus:outline-none focus:border-primary px-1 py-0.5\" />",
  "                </div>",
  "                <input type=\"text\" value={block.description} onChange={e => { const updated = { ...config.blocks, [key]: { ...block, description: e.target.value } }; setConfig({ ...config, blocks: updated }); }} className=\"text-xs text-muted-foreground w-full mt-2 bg-transparent border-b border-transparent focus:border-input focus:outline-none px-1\" />",
  "              </div>",
  "              <span className={'text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (block.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>{block.enabled ? 'Activo' : 'Oculto'}</span>",
  "            </div>",
  "          ))}",
  "        </div>",
  "      )}",
  "",
  "      {activeTab === 'categories' && (",
  "        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">",
  "          <div className=\"bg-card p-5 rounded-2xl border border-border space-y-4\">",
  "            <h3 className=\"font-bold text-sm\">Categorías Principales</h3>",
  "            <div className=\"flex gap-2\">",
  "              <input type=\"text\" placeholder=\"Nueva categoría...\" value={newCatName} onChange={e => setNewCatName(e.target.value)} className=\"flex-1 min-h-[38px] px-3 text-xs rounded-lg border border-input bg-background\" />",
  "              <button type=\"button\" onClick={addCategory} className=\"px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1\"><Plus className=\"w-3.5 h-3.5\" /> Agregar</button>",
  "            </div>",
  "            <div className=\"space-y-1.5 max-h-[380px] overflow-y-auto\">",
  "              {config.categories?.map((cat, idx) => (",
  "                <div key={cat.name} onClick={() => setSelectedCatIndex(idx)} className={'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ' + (selectedCatIndex === idx ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>",
  "                  <div>",
  "                    <p className=\"text-xs font-bold\">{cat.name}</p>",
  "                    <p className=\"text-[10px] text-muted-foreground\">{cat.subcategories?.length || 0} subcategorías</p>",
  "                  </div>",
  "                  <button type=\"button\" onClick={(e) => { e.stopPropagation(); removeCategory(idx); }} className=\"p-1.5 text-muted-foreground hover:text-destructive rounded\"><Trash2 className=\"w-3.5 h-3.5\" /></button>",
  "                </div>",
  "              ))}",
  "            </div>",
  "          </div>",
  "          <div className=\"bg-card p-5 rounded-2xl border border-border space-y-4\">",
  "            <h3 className=\"font-bold text-sm\">Subcategorías de: <span className=\"text-primary\">{config.categories?.[selectedCatIndex]?.name || 'Ninguna'}</span></h3>",
  "            {config.categories?.[selectedCatIndex] ? (",
  "              <>",
  "                <div className=\"flex gap-2\">",
  "                  <input type=\"text\" placeholder=\"Nueva subcategoría...\" value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)} className=\"flex-1 min-h-[38px] px-3 text-xs rounded-lg border border-input bg-background\" />",
  "                  <button type=\"button\" onClick={addSubcategory} className=\"px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1\"><Plus className=\"w-3.5 h-3.5\" /> Añadir</button>",
  "                </div>",
  "                <div className=\"space-y-1.5 max-h-[380px] overflow-y-auto\">",
  "                  {config.categories[selectedCatIndex].subcategories?.map((sub, sIdx) => (",
  "                    <div key={sub} className=\"p-2.5 rounded-lg border border-border flex items-center justify-between text-xs\">",
  "                      <span>{sub}</span>",
  "                      <button type=\"button\" onClick={() => removeSubcategory(sIdx)} className=\"p-1 text-muted-foreground hover:text-destructive rounded\"><Trash2 className=\"w-3 h-3\" /></button>",
  "                    </div>",
  "                  ))}",
  "                  {(!config.categories[selectedCatIndex].subcategories || config.categories[selectedCatIndex].subcategories.length === 0) && (",
  "                    <p className=\"text-xs text-muted-foreground py-4 text-center\">No hay subcategorías definidas.</p>",
  "                  )}",
  "                </div>",
  "              </>",
  "            ) : (",
  "              <p className=\"text-xs text-muted-foreground\">Selecciona una categoría para ver sus subcategorías.</p>",
  "            )}",
  "          </div>",
  "        </div>",
  "      )}",
  "",
  "      {activeTab === 'preview' && (",
  "        <div className=\"bg-card rounded-2xl border border-border p-4\">",
  "          <div className=\"mb-4 pb-2 border-b border-border flex justify-between items-center\">",
  "            <p className=\"text-xs font-mono text-muted-foreground\">Vista Previa Interactiva del Formulario</p>",
  "            <span className=\"text-[11px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded\">Modo Visualización</span>",
  "          </div>",
  "          <div className=\"border border-dashed border-border rounded-xl p-2 bg-slate-50 dark:bg-zinc-950\">",
  "            <PublicForm />",
  "          </div>",
  "        </div>",
  "      )}",
  "    </div>",
  "  );",
  "}"
].join('\n');

fs.writeFileSync('src/modules/solicitudes-negocio/components/admin-editor.tsx', adminEditorLines, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/components/admin-editor.tsx');

// 4. Crear página del Editor en SuperAdmin: src/app/(admin)/superadmin/solicitudes-negocio/configurar/page.tsx
const pageEditorContent = `import AdminEditor from '@/modules/solicitudes-negocio/components/admin-editor';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configurar Formulario de Registro | Super Admin',
  description: 'Editor visual y configuración del formulario público de solicitudes de negocio.'
};

export default function ConfigurarSolicitudPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AdminEditor />
    </div>
  );
}
`;
fs.writeFileSync('src/app/(admin)/superadmin/solicitudes-negocio/configurar/page.tsx', pageEditorContent, 'utf8');
console.log('[OK] Creado: src/app/(admin)/superadmin/solicitudes-negocio/configurar/page.tsx');

console.log('\n==============================================');
console.log('FASE D COMPLETADA CON ÉXITO');
console.log('==============================================');
