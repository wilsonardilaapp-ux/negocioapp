'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { 
  Share2, Link as LinkIcon, QrCode, Copy, Check, Download, Plus, 
  Trash2, AlertCircle, Loader2, Sparkles, TrendingUp, Users, FileText, DollarSign, Calendar
} from 'lucide-react';
import type { TrackingAnalyticsData, TrackingCard, ChannelPerformance } from '../types-tracking';
import { RESERVED_WORDS, validateAliasOrCode } from '../services/solicitud-tracking-service';

export default function AdminShareTrackingTab() {
  const [data, setData] = useState<TrackingAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);

  // Alias
  const [aliasInput, setAliasInput] = useState('');
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [savingAlias, setSavingAlias] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Tarjetas
  const [newCardName, setNewCardName] = useState('');
  const [newCardCode, setNewCardCode] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  // Métricas y orden
  const [sortColumn, setSortColumn] = useState<keyof ChannelPerformance>('visits');
  const [sortAsc, setSortAsc] = useState(false);
  const [metricView, setMetricView] = useState<'visitas' | 'solicitudes' | 'ambos'>('ambos');

  const cargarDatos = async (days = daysFilter) => {
    setLoading(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/tracking?days=' + days);
      const resData = await res.json();
      if (resData && !resData.error) {
        setData(resData);
        setAliasInput(resData.config?.customAlias || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(daysFilter);
  }, [daysFilter]);

  // Manejo de Alias
  const handleAliasChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setAliasInput(clean);
    if (!clean) {
      setAliasError(null);
      return;
    }
    const valRes = validateAliasOrCode(clean);
    setAliasError(valRes.valid ? null : valRes.error || null);
  };

  const handleSaveAlias = async () => {
    if (aliasError) return;
    if (data?.config?.customAlias && data.config.customAlias !== aliasInput) {
      if (!confirm('Al cambiar el alias, el enlace anterior dejará de funcionar. ¿Deseas continuar?')) return;
    }

    setSavingAlias(true);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveAlias', alias: aliasInput })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);
      await cargarDatos();
      alert('Alias guardado con éxito.');
    } catch (e: any) {
      alert(e.message || 'Error al guardar alias.');
    } finally {
      setSavingAlias(false);
    }
  };

  // Manejo de Tarjetas
  const handleNameChange = (val: string) => {
    setNewCardName(val);
    const suggested = val.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setNewCardCode(suggested);
  };

  const handleSaveCard = async () => {
    if (!newCardName.trim() || !newCardCode.trim()) return;
    const v = validateAliasOrCode(newCardCode);
    if (!v.valid) {
      setCardError(v.error || 'Código no válido');
      return;
    }

    setSavingCard(true);
    setCardError(null);
    try {
      const res = await fetch('/api/solicitudes-negocio/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveCard', card: { name: newCardName, code: newCardCode } })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);
      setNewCardName('');
      setNewCardCode('');
      await cargarDatos();
    } catch (e: any) {
      setCardError(e.message || 'Error guardando tarjeta.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleToggleCardActive = async (card: TrackingCard) => {
    try {
      await fetch('/api/solicitudes-negocio/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveCard', card: { ...card, active: !card.active } })
      });
      await cargarDatos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (card: TrackingCard, hasData: boolean) => {
    if (hasData) {
      alert('Esta tarjeta ya cuenta con historial de visitas o solicitudes. Desactívala en su lugar para conservar los datos.');
      return;
    }
    if (!confirm('¿Deseas eliminar esta tarjeta de seguimiento?')) return;
    try {
      await fetch('/api/solicitudes-negocio/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteCard', cardId: card.id })
      });
      await cargarDatos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDefaults = async () => {
    setCreatingDefaults(true);
    try {
      await fetch('/api/solicitudes-negocio/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createDefaults' })
      });
      await cargarDatos();
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingDefaults(false);
    }
  };

  // Copiar y Descargar QR
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const downloadQR = async (url: string, filename = 'qr-codigo') => {
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename + '.png';
      a.click();
    } catch (e) {
      console.error('Error generando QR:', e);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://markix.app';
  const aliasUrl = data?.config?.customAlias ? (origin + '/r/' + data.config.customAlias) : '';
  const directUrl = origin + '/registro-negocio';

  // Ordenar tabla
  const sortedPerformance = [...(data?.performance || [])].sort((a, b) => {
    const valA = a[sortColumn] as any;
    const valB = b[sortColumn] as any;
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
  });

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* BLOQUE 1: URL PERSONALIZADA (ALIAS) */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <LinkIcon className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">1. URL Personalizada del Negocio (Alias)</h2>
            <p className="text-xs text-muted-foreground">Crea un enlace corto memorable para compartir (ej: /r/mi-negocio).</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold">Tu identificador único:</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded-lg border truncate max-w-full sm:max-w-[45%]">
                {origin}/r/
              </span>
              <input
                type="text"
                placeholder="mi-negocio"
                value={aliasInput}
                onChange={e => handleAliasChange(e.target.value)}
                className="flex-1 text-xs h-9 px-3 rounded-lg border border-input bg-background font-mono"
              />
              <button
                type="button"
                disabled={savingAlias || Boolean(aliasError)}
                onClick={handleSaveAlias}
                className="px-4 h-9 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {savingAlias ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            {aliasError && <p className="text-xs text-destructive font-medium">{aliasError}</p>}
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Enlace Resultante:</span>
            <p className="text-xs font-mono font-bold text-primary break-all bg-background p-2 rounded border">
              {aliasUrl || directUrl}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyLink(aliasUrl || directUrl)}
                className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5"
              >
                {copiedLink === (aliasUrl || directUrl) ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink === (aliasUrl || directUrl) ? 'Copiado' : 'Copiar enlace'}
              </button>
              <button
                type="button"
                onClick={() => downloadQR(aliasUrl || directUrl, 'qr-registro-negocio')}
                className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Descargar QR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: TARJETAS DE SEGUIMIENTO (ENLACES RÁPIDOS) */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">2. Tarjetas de Seguimiento Personalizadas</h2>
              <p className="text-xs text-muted-foreground">Genera enlaces con ?ref= para saber exactamente qué canal te trae clientes.</p>
            </div>
          </div>

          <button
            type="button"
            disabled={creatingDefaults}
            onClick={handleCreateDefaults}
            className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 text-xs font-bold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Crear canales sugeridos
          </button>
        </div>

        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
          <p className="text-xs font-bold">Agregar nuevo canal de difusión:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1">Nombre del Canal</label>
              <input
                type="text"
                placeholder="Ej: Volante Centro"
                value={newCardName}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Código en URL (?ref=...)</label>
              <input
                type="text"
                placeholder="volante-centro"
                value={newCardCode}
                onChange={e => setNewCardCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={savingCard || !newCardName.trim() || !newCardCode.trim()}
                onClick={handleSaveCard}
                className="w-full h-9 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Tarjeta
              </button>
            </div>
          </div>
          {cardError && <p className="text-xs text-destructive">{cardError}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.cards?.map(card => {
            const perf = data.performance?.find(p => p.channelCode === card.code);
            const targetRefUrl = aliasUrl ? (aliasUrl + '?ref=' + card.code) : (directUrl + '?ref=' + card.code);

            return (
              <div key={card.id} className={'p-4 rounded-xl border transition-all space-y-3 ' + (card.active ? 'bg-card border-border shadow-sm' : 'bg-muted/40 border-border/60 opacity-60')}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{card.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCardActive(card)}
                      className={'text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ' + (card.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}
                    >
                      {card.active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card, (perf?.submissions || 0) > 0)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-mono text-primary truncate bg-muted/40 p-1.5 rounded">
                  ?ref={card.code}
                </p>

                <div className="grid grid-cols-2 gap-2 text-center py-1 bg-muted/20 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Visitas</span>
                    <p className="font-bold text-foreground">{perf?.visits || 0}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">Solicitudes</span>
                    <p className="font-bold text-foreground">{perf?.submissions || 0}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => copyLink(targetRefUrl)}
                    className="flex-1 py-1.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-semibold flex items-center justify-center gap-1"
                  >
                    {copiedLink === targetRefUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedLink === targetRefUrl ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadQR(targetRefUrl, 'qr-' + card.code)}
                    className="py-1.5 px-2.5 rounded-lg border bg-background hover:bg-muted text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> QR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOQUE 3: RENDIMIENTO POR CANAL (TABLA) */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">3. Rendimiento y Conversión por Canal</h2>
              <p className="text-xs text-muted-foreground">Métricas comparativas entre visitas, registros y pagos confirmados.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {[7, 30, 90].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysFilter(d)}
                className={'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ' + (daysFilter === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => { setSortColumn('channelName'); setSortAsc(!sortAsc); }}>Canal</th>
                <th className="py-2.5 px-3 cursor-pointer text-center" onClick={() => { setSortColumn('visits'); setSortAsc(!sortAsc); }}>Visitas</th>
                <th className="py-2.5 px-3 cursor-pointer text-center" onClick={() => { setSortColumn('submissions'); setSortAsc(!sortAsc); }}>Solicitudes</th>
                <th className="py-2.5 px-3 cursor-pointer text-center" onClick={() => { setSortColumn('conversionRate'); setSortAsc(!sortAsc); }}>Conversión</th>
                <th className="py-2.5 px-3 cursor-pointer text-center" onClick={() => { setSortColumn('confirmedPayments'); setSortAsc(!sortAsc); }}>Pagos Conf.</th>
                <th className="py-2.5 px-3 cursor-pointer text-right" onClick={() => { setSortColumn('confirmedValueCOP'); setSortAsc(!sortAsc); }}>Total COP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedPerformance.map(item => (
                <tr key={item.channelCode} className="hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-foreground">{item.channelName}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{item.visits}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">{item.submissions}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{item.conversionRate}%</td>
                  <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">{item.confirmedPayments}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                    {'$' + item.confirmedValueCOP.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/40 font-bold border-t-2 border-border">
                <td className="py-3 px-3">TOTALES</td>
                <td className="py-3 px-3 text-center font-mono">{data?.totals?.visits || 0}</td>
                <td className="py-3 px-3 text-center font-mono text-primary">{data?.totals?.submissions || 0}</td>
                <td className="py-3 px-3 text-center font-mono">{data?.totals?.conversionRate || 0}%</td>
                <td className="py-3 px-3 text-center font-mono text-emerald-600">{data?.totals?.confirmedPayments || 0}</td>
                <td className="py-3 px-3 text-right font-mono text-foreground">
                  {'$' + (data?.totals?.confirmedValueCOP || 0).toLocaleString('es-CO')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOQUE 4: GRÁFICO COMPARATIVO Y EVOLUTIVO (RECHARTS) */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">4. Gráfico Evolutivo de Rendimiento</h2>
            <p className="text-xs text-muted-foreground">Comparativa de volumen de visitas y solicitudes a lo largo del tiempo.</p>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMetricView('ambos')}
              className={'px-2.5 py-1 rounded-lg text-xs font-semibold ' + (metricView === 'ambos' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >
              Visitas vs Solicitudes
            </button>
            <button
              type="button"
              onClick={() => setMetricView('solicitudes')}
              className={'px-2.5 py-1 rounded-lg text-xs font-semibold ' + (metricView === 'solicitudes' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >
              Solo Solicitudes
            </button>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          {data?.timeline && data.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={str => str.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {(metricView === 'ambos' || metricView === 'visitas') && (
                  <Bar dataKey="visits" name="Visitas" fill="#0284c7" radius={[4, 4, 0, 0]} />
                )}
                {(metricView === 'ambos' || metricView === 'solicitudes') && (
                  <Bar dataKey="submissions" name="Solicitudes" fill="#16a34a" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Aún no hay visitas ni solicitudes registradas en este período.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
