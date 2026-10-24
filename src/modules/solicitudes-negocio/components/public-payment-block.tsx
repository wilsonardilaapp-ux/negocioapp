'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, QrCode, ExternalLink, ShieldCheck, Copy, Check, Upload, AlertCircle } from 'lucide-react';
import type { PublicPaymentMethodData } from '../types-payments';
import type { PlanActivacion } from '../types';

interface PublicPaymentBlockProps {
  selectedPlan: PlanActivacion | null;
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  paymentReference: string;
  onReferenceChange: (ref: string) => void;
  receiptFile: File | null;
  onReceiptChange: (file: File | null) => void;
  instructionsMap?: Record<string, string>;
}

export default function PublicPaymentBlock({
  selectedPlan,
  selectedMethod,
  onSelectMethod,
  paymentReference,
  onReferenceChange,
  receiptFile,
  onReceiptChange,
  instructionsMap
}: PublicPaymentBlockProps) {
  const [data, setData] = useState<PublicPaymentMethodData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/solicitudes-negocio/payment-methods')
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.enabledInForm) {
          setData(resData);
          const methods = Object.keys(resData.methods || {});
          if (!selectedMethod && methods.length > 0) {
            onSelectMethod(methods[0]);
          } else if (!selectedMethod && resData.hotmartLinks?.length > 0) {
            onSelectMethod('hotmart');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!selectedPlan || selectedPlan.isFree || selectedPlan.price === 0) {
    return null;
  }

  if (!loading && (!data || !data.enabledInForm)) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-amber-700 dark:text-amber-400 text-sm flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p>Los métodos de pago automáticos están en mantenimiento. <strong>Te contactaremos para coordinar el pago</strong> de tu plan {selectedPlan.name}. Puedes enviar el formulario normalmente.</p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methods = data?.methods || {};
  const hotmartPlanLink = selectedPlan.hotmartUrl || data?.hotmartLinks?.find(h => h.planId === selectedPlan.id)?.hotmartUrl;
  const showHotmart = !!hotmartPlanLink;

  return (
    <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Paso de Pago Requerido</span>
          <h2 className="text-xl font-black text-foreground">Elige cómo pagar</h2>
          <p className="text-xs text-muted-foreground">Plan seleccionado: <strong className="text-foreground">{selectedPlan.name}</strong></p>
        </div>
        <div className="text-left sm:text-right bg-primary/5 p-3 sm:p-0 rounded-xl sm:bg-transparent">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Valor a Pagar</p>
          <p className="text-2xl sm:text-3xl font-black text-primary font-mono">
            {'$' + selectedPlan.price.toLocaleString('es-CO')} <span className="text-sm font-semibold">COP</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase">Selecciona el método de pago:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Métodos de pago disponibles">
          {methods.nequi && (
            <label className={'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ' + (selectedMethod === 'nequi' ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-border bg-background hover:bg-muted/50')}>
              <input type="radio" name="payment_method" value="nequi" checked={selectedMethod === 'nequi'} onChange={() => onSelectMethod('nequi')} className="sr-only" />
              <span className="text-xs">Nequi (QR)</span>
            </label>
          )}

          {methods.bancolombia && (
            <label className={'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ' + (selectedMethod === 'bancolombia' ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-border bg-background hover:bg-muted/50')}>
              <input type="radio" name="payment_method" value="bancolombia" checked={selectedMethod === 'bancolombia'} onChange={() => onSelectMethod('bancolombia')} className="sr-only" />
              <span className="text-xs">Bancolombia</span>
            </label>
          )}

          {methods.daviplata && (
            <label className={'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ' + (selectedMethod === 'daviplata' ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-border bg-background hover:bg-muted/50')}>
              <input type="radio" name="payment_method" value="daviplata" checked={selectedMethod === 'daviplata'} onChange={() => onSelectMethod('daviplata')} className="sr-only" />
              <span className="text-xs">Daviplata</span>
            </label>
          )}

          {methods.wompi && (
            <label className={'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ' + (selectedMethod === 'wompi' ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-border bg-background hover:bg-muted/50')}>
              <input type="radio" name="payment_method" value="wompi" checked={selectedMethod === 'wompi'} onChange={() => onSelectMethod('wompi')} className="sr-only" />
              <span className="text-xs">Wompi (PSE / Tarjeta)</span>
            </label>
          )}

          {methods.breB && (
            <label className={'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ' + (selectedMethod === 'breB' ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-border bg-background hover:bg-muted/50')}>
              <input type="radio" name="payment_method" value="breB" checked={selectedMethod === 'breB'} onChange={() => onSelectMethod('breB')} className="sr-only" />
              <span className="text-xs">BRE-B</span>
            </label>
          )}

          {showHotmart && (
            <label className={'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ' + (selectedMethod === 'hotmart' ? 'border-primary bg-primary/5 shadow-sm font-bold' : 'border-border bg-background hover:bg-muted/50')}>
              <input type="radio" name="payment_method" value="hotmart" checked={selectedMethod === 'hotmart'} onChange={() => onSelectMethod('hotmart')} className="sr-only" />
              <span className="text-xs">Hotmart Checkout</span>
            </label>
          )}
        </div>
      </div>

      <div className="p-5 rounded-xl bg-muted/40 border border-border">
        {selectedMethod === 'nequi' && methods.nequi && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {methods.nequi.qrImageUrl ? (
                <img src={methods.nequi.qrImageUrl} alt="QR Nequi" className="w-36 h-36 object-contain rounded-lg border bg-white p-2 shadow-sm" />
              ) : (
                <div className="w-36 h-36 flex flex-col items-center justify-center bg-muted rounded-lg border text-muted-foreground text-xs p-2 text-center">
                  <QrCode className="w-8 h-8 mb-1" />
                  <span>Escanea en App Nequi</span>
                </div>
              )}
              <div className="space-y-2 text-xs text-center sm:text-left flex-1">
                <p className="font-bold text-sm text-foreground">Transferencia Nequi</p>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-sm font-mono font-bold bg-background px-3 py-1.5 rounded-lg border">{methods.nequi.accountNumber}</span>
                  <button type="button" onClick={() => copyToClipboard(methods.nequi?.accountNumber || '')} className="p-1.5 rounded-lg border bg-background hover:bg-muted text-xs flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                {methods.nequi.holderName && <p><strong>Titular:</strong> {methods.nequi.holderName}</p>}
                <p className="text-muted-foreground">{instructionsMap?.nequi || methods.nequi.instructions || 'Transfiere el monto exacto y carga tu comprobante abajo.'}</p>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'bancolombia' && methods.bancolombia && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {methods.bancolombia.qrImageUrl && (
                <img src={methods.bancolombia.qrImageUrl} alt="QR Bancolombia" className="w-36 h-36 object-contain rounded-lg border bg-white p-2 shadow-sm" />
              )}
              <div className="space-y-2 text-xs text-center sm:text-left flex-1">
                <p className="font-bold text-sm text-foreground">Cuenta Bancolombia</p>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-sm font-mono font-bold bg-background px-3 py-1.5 rounded-lg border">{methods.bancolombia.accountNumber}</span>
                  <button type="button" onClick={() => copyToClipboard(methods.bancolombia?.accountNumber || '')} className="p-1.5 rounded-lg border bg-background hover:bg-muted text-xs flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                {methods.bancolombia.holderName && <p><strong>Titular:</strong> {methods.bancolombia.holderName}</p>}
                <p className="text-muted-foreground">{instructionsMap?.bancolombia || methods.bancolombia.instructions}</p>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'daviplata' && methods.daviplata && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {methods.daviplata.qrImageUrl && (
                <img src={methods.daviplata.qrImageUrl} alt="QR Daviplata" className="w-36 h-36 object-contain rounded-lg border bg-white p-2 shadow-sm" />
              )}
              <div className="space-y-2 text-xs text-center sm:text-left flex-1">
                <p className="font-bold text-sm text-foreground">Daviplata</p>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-sm font-mono font-bold bg-background px-3 py-1.5 rounded-lg border">{methods.daviplata.accountNumber}</span>
                  <button type="button" onClick={() => copyToClipboard(methods.daviplata?.accountNumber || '')} className="p-1.5 rounded-lg border bg-background hover:bg-muted text-xs flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                {methods.daviplata.holderName && <p><strong>Titular:</strong> {methods.daviplata.holderName}</p>}
                <p className="text-muted-foreground">{instructionsMap?.daviplata || methods.daviplata.instructions}</p>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'wompi' && methods.wompi && (
          <div className="space-y-3 text-xs text-center sm:text-left">
            <p className="font-bold text-sm text-foreground">Pago en línea con Wompi</p>
            <p className="text-muted-foreground">{instructionsMap?.wompi || methods.wompi.instructions || 'Paga con tarjeta débito, crédito o PSE.'}</p>
            {methods.wompi.checkoutUrl && (
              <a href={methods.wompi.checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow hover:opacity-90">
                {'Pagar $' + selectedPlan.price.toLocaleString('es-CO') + ' COP con Wompi'} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {selectedMethod === 'breB' && methods.breB && (
          <div className="space-y-2 text-xs">
            <p className="font-bold text-sm text-foreground">Llave BRE-B</p>
            <p><strong>Titular:</strong> {methods.breB.holderName}</p>
            <p><strong>Llave ({methods.breB.keyType}):</strong> <span className="font-mono font-bold">{methods.breB.keyValue}</span></p>
            <p className="text-muted-foreground">{instructionsMap?.breB || methods.breB.instructions}</p>
          </div>
        )}

        {selectedMethod === 'hotmart' && hotmartPlanLink && (
          <div className="space-y-3 text-xs text-center sm:text-left">
            <p className="font-bold text-sm text-foreground">Checkout Oficial en Hotmart</p>
            <p className="text-muted-foreground">Serás redirigido al portal oficial de Hotmart para formalizar el pago de este plan.</p>
            <a href={hotmartPlanLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow hover:opacity-90">
              Ir a pagar a Hotmart <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {(selectedMethod === 'nequi' || selectedMethod === 'bancolombia' || selectedMethod === 'daviplata' || selectedMethod === 'breB') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Adjuntar comprobante de pago (Opcional - JPG, PNG o PDF máx 5 MB)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={e => onReceiptChange(e.target.files?.[0] || null)}
              className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            {receiptFile && <p className="text-[11px] text-emerald-600 mt-1 font-mono">Archivo: {receiptFile.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Referencia o últimos dígitos del comprobante (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Ref #123456 o últimos 4 dígitos"
              value={paymentReference}
              onChange={e => onReferenceChange(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-lg border border-input bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
