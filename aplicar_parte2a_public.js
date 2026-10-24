const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO PARTE 2A: Componentes Públicos');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. public-payment-block.tsx
const publicPaymentBlockContent = `'use client';

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
`;
backupAndWrite('src/modules/solicitudes-negocio/components/public-payment-block.tsx', publicPaymentBlockContent);

// 2. public-form.tsx
const publicFormContent = `'use client';

import React, { useState, useEffect } from 'react';
import { SolicitudFormConfig, PlanActivacion } from '../types';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { 
  Building2, Phone, MapPin, Mail, Tag, FileText, 
  Instagram, Facebook, Youtube, Image as ImageIcon, 
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2, Download, Package
} from 'lucide-react';
import PublicPaymentBlock from './public-payment-block';

export default function PublicForm() {
  const [config, setConfig] = useState<SolicitudFormConfig>(DEFAULT_SOLICITUD_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');

  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');

  const [noLogoCreateForMe, setNoLogoCreateForMe] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [noBannerCreateForMe, setNoBannerCreateForMe] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [stylePreference, setStylePreference] = useState('');

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [noProductsPhotosCreateForMe, setNoProductsPhotosCreateForMe] = useState(false);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);

  const [hpWebsite, setHpWebsite] = useState('');

  useEffect(() => {
    fetch('/api/solicitudes-negocio')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setConfig(data);
          const activePlans = (data.plans || []).filter((p: any) => p.active !== false);
          if (activePlans.length > 0) {
            setSelectedPlanId(activePlans[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));
  }, []);

  const activePlans = (config.plans || []).filter(p => p.active !== false);
  const currentPlan = activePlans.find(p => p.id === selectedPlanId) || activePlans[0] || null;
  const isPaidPlan = currentPlan && !currentPlan.isFree && currentPlan.price > 0;

  const selectedCategoryObj = config.categories?.find(c => c.name === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (description.length > 150) {
      setErrorMessage('La descripción no puede superar los 150 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('businessName', businessName);
      fd.append('phone', phone);
      fd.append('address', address);
      fd.append('email', email);
      fd.append('category', category);
      fd.append('subcategory', subcategory);
      fd.append('description', description);

      if (currentPlan) {
        fd.append('planId', currentPlan.id);
      }
      if (isPaidPlan) {
        fd.append('paymentMethod', selectedPaymentMethod || 'Por coordinar');
        fd.append('paymentReference', paymentReference);
        if (paymentReceipt) fd.append('paymentReceipt', paymentReceipt);
      }

      fd.append('social_instagram', socialInstagram);
      fd.append('social_facebook', socialFacebook);
      fd.append('social_tiktok', socialTiktok);
      fd.append('social_youtube', socialYoutube);

      fd.append('noLogoCreateForMe', String(noLogoCreateForMe));
      if (logoFile && !noLogoCreateForMe) fd.append('logoFile', logoFile);
      fd.append('noBannerCreateForMe', String(noBannerCreateForMe));
      if (bannerFile && !noBannerCreateForMe) fd.append('bannerFile', bannerFile);
      fd.append('stylePreference', stylePreference);

      if (templateFile) fd.append('templateFile', templateFile);
      fd.append('noProductsPhotosCreateForMe', String(noProductsPhotosCreateForMe));
      productPhotos.forEach(p => fd.append('productPhotos', p));

      fd.append('_hp_website', hpWebsite);

      const res = await fetch('/api/solicitudes-negocio', {
        method: 'POST',
        body: fd
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Ocurrió un error al enviar el formulario.');
      }

      setSuccessData({
        message: resJson.message || config.confirmationMessage,
        id: resJson.solicitudId,
        plan: currentPlan,
        isPaid: isPaidPlan,
        paymentMethod: selectedPaymentMethod
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-card rounded-2xl border border-border shadow-sm">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">Módulo en Mantenimiento</h2>
        <p className="text-muted-foreground">
          El registro de negocios se encuentra pausado temporalmente. Vuelve a consultar pronto.
        </p>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-card rounded-2xl border border-border shadow-md animate-in fade-in zoom-in-95 duration-300 space-y-6">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight">¡Registro Recibido con Éxito!</h2>
        <p className="text-muted-foreground text-base leading-relaxed">
          {successData.message}
        </p>

        {successData.plan && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-left space-y-2 text-xs">
            <p><strong>Plan Elegido:</strong> {successData.plan.name}</p>
            <p><strong>Valor:</strong> {successData.isPaid ? ('$' + successData.plan.price?.toLocaleString('es-CO') + ' COP') : 'Gratis'}</p>
            {successData.isPaid && <p><strong>Método de pago:</strong> {successData.paymentMethod?.toUpperCase()}</p>}
            <p className="font-semibold text-primary pt-1">
              "Cuando confirmemos tu pago, comenzamos con tu menú."
            </p>
          </div>
        )}

        <div className="inline-block bg-muted px-4 py-2 rounded-lg text-xs font-mono text-muted-foreground">
          Código de solicitud: #{successData.id.slice(0, 8).toUpperCase()}
        </div>

        <div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-lg text-sm font-semibold transition-all bg-primary text-primary-foreground hover:opacity-90"
          >
            Enviar otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="text-center mb-8">
        {config.branding?.logoUrl && (
          <img src={config.branding.logoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {config.branding?.title || 'Registra tu Negocio'}
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-xl mx-auto">
          {config.branding?.subtitle || 'Completa la información para activar tu presencia digital.'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="hidden" aria-hidden="true">
          <input type="text" tabIndex={-1} autoComplete="off" value={hpWebsite} onChange={e => setHpWebsite(e.target.value)} />
        </div>

        {config.blocks?.plans?.enabled !== false && activePlans.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {config.blocks?.plans?.title || 'Planes de Activación'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {config.blocks?.plans?.description || 'Elige el plan que mejor se adapte a tu negocio.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activePlans.map(plan => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <label
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      if (plan.isFree || plan.price === 0) {
                        setSelectedPaymentMethod('');
                        setPaymentReference('');
                        setPaymentReceipt(null);
                      }
                    }}
                    className={'p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ' + (isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/40')}
                  >
                    <input type="radio" name="activation_plan" value={plan.id} checked={isSelected} readOnly className="sr-only" />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-foreground">{plan.name}</span>
                        {plan.isFree ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Gratis</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">Recomendado</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-border/60">
                      <p className="text-lg font-black text-foreground font-mono">
                        {plan.isFree || plan.price === 0 ? '$0 COP' : ('$' + plan.price.toLocaleString('es-CO') + ' COP')}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <PublicPaymentBlock
          selectedPlan={currentPlan}
          selectedMethod={selectedPaymentMethod}
          onSelectMethod={setSelectedPaymentMethod}
          paymentReference={paymentReference}
          onReferenceChange={setPaymentReference}
          receiptFile={paymentReceipt}
          onReceiptChange={setPaymentReceipt}
          instructionsMap={config.paymentInstructions}
        />

        {config.blocks?.generalInfo?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              {config.blocks?.generalInfo?.title || 'Información General'}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {config.blocks?.generalInfo?.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">Nombre comercial <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="Ej: Cafetería El Molino" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Teléfono / WhatsApp <span className="text-red-500">*</span></label>
                <input type="tel" required placeholder="Ej: +57 300 123 4567" value={phone} onChange={e => setPhone(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Correo (opcional)</label>
                <input type="email" placeholder="contacto@tunegocio.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">Dirección <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="Ej: Calle 45 # 12-34" value={address} onChange={e => setAddress(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Categoría <span className="text-red-500">*</span></label>
                <select required value={category} onChange={e => { setCategory(e.target.value); setSubcategory(''); }} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background">
                  <option value="">Seleccione categoría</option>
                  {config.categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Subcategoría</label>
                <select disabled={!category || !selectedCategoryObj?.subcategories?.length} value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background disabled:opacity-50">
                  <option value="">Seleccione subcategoría</option>
                  {selectedCategoryObj?.subcategories?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold">Descripción corta <span className="text-red-500">*</span></label>
                  <span className="text-xs text-muted-foreground font-mono">{description.length}/150</span>
                </div>
                <textarea required maxLength={150} rows={2} placeholder="Qué ofrece tu negocio a tus clientes..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 text-sm rounded-lg border border-input bg-background resize-none" />
              </div>
            </div>
          </div>
        )}

        {config.blocks?.socialMedia?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <Instagram className="w-5 h-5 text-primary" />
              {config.blocks?.socialMedia?.title || 'Redes Sociales (Opcional)'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram</label>
                <input type="text" placeholder="https://instagram.com/..." value={socialInstagram} onChange={e => setSocialInstagram(e.target.value)} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Facebook</label>
                <input type="text" placeholder="https://facebook.com/..." value={socialFacebook} onChange={e => setSocialFacebook(e.target.value)} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">TikTok</label>
                <input type="text" placeholder="https://tiktok.com/@..." value={socialTiktok} onChange={e => setSocialTiktok(e.target.value)} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">YouTube</label>
                <input type="text" placeholder="https://youtube.com/@..." value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background" />
              </div>
            </div>
          </div>
        )}

        {config.blocks?.brandingImages?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              {config.blocks?.brandingImages?.title || 'Identidad Visual'}
            </h2>
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
              <label className="block text-sm font-semibold mb-2">Logo (JPG/PNG máx 2 MB)</label>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="noLogo" checked={noLogoCreateForMe} onChange={e => { setNoLogoCreateForMe(e.target.checked); if (e.target.checked) setLogoFile(null); }} className="w-4 h-4 rounded text-primary" />
                <label htmlFor="noLogo" className="text-xs text-muted-foreground cursor-pointer">No tengo logo, créenlo por mí</label>
              </div>
              {!noLogoCreateForMe && <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary" />}
            </div>

            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
              <label className="block text-sm font-semibold mb-2">Banner (JPG/PNG máx 2 MB)</label>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="noBanner" checked={noBannerCreateForMe} onChange={e => { setNoBannerCreateForMe(e.target.checked); if (e.target.checked) setBannerFile(null); }} className="w-4 h-4 rounded text-primary" />
                <label htmlFor="noBanner" className="text-xs text-muted-foreground cursor-pointer">No tengo banner, créenlo por mí</label>
              </div>
              {!noBannerCreateForMe && <input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary" />}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Estilo o referencias de diseño</label>
              <input type="text" placeholder="Ej: Minimalista, colores pasteles..." value={stylePreference} onChange={e => setStylePreference(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
            </div>
          </div>
        )}

        {config.blocks?.products?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {config.blocks?.products?.title || 'Catálogo de Productos'}
            </h2>
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl gap-2">
              <div>
                <p className="text-xs font-semibold">¿Necesitas la plantilla oficial de Excel?</p>
                <p className="text-[11px] text-muted-foreground">Descarga el formato listo para rellenar tus productos.</p>
              </div>
              <a href="/api/solicitudes-negocio/plantilla-excel" download className="min-h-[38px] px-3 py-1.5 bg-background border rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Download className="w-3.5 h-3.5 text-primary" /> Descargar Excel
              </a>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
              <label className="block text-sm font-semibold mb-2">Subir catálogo (Excel o Word máx 5 MB)</label>
              <input type="file" accept=".xlsx,.xls,.doc,.docx" onChange={e => setTemplateFile(e.target.files?.[0] || null)} className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary" />
            </div>

            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
              <label className="block text-sm font-semibold mb-2">Fotos de productos (Hasta 18 imágenes o ZIP)</label>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="noPhotos" checked={noProductsPhotosCreateForMe} onChange={e => { setNoProductsPhotosCreateForMe(e.target.checked); if (e.target.checked) setProductPhotos([]); }} className="w-4 h-4 rounded text-primary" />
                <label htmlFor="noPhotos" className="text-xs text-muted-foreground cursor-pointer">No tengo fotos, créenlas por mí</label>
              </div>
              {!noProductsPhotosCreateForMe && (
                <input type="file" multiple accept="image/*,.zip" onChange={e => setProductPhotos(Array.from(e.target.files || []).slice(0, 18))} className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary" />
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: config.branding?.buttonColor || '#0284c7' }}
          className="w-full min-h-[48px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando información...
            </>
          ) : (
            'Enviar información de mi negocio'
          )}
        </button>
      </form>
    </div>
  );
}
`;
backupAndWrite('src/modules/solicitudes-negocio/components/public-form.tsx', publicFormContent);

console.log('==============================================');
console.log('PARTE 2A APLICADA CON ÉXITO');
console.log('==============================================');
