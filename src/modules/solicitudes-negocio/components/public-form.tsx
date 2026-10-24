'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SolicitudFormConfig, PlanActivacion } from '../types';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { 
  Building2, Phone, MapPin, Mail, Tag, FileText, 
  Instagram, Facebook, Youtube, Image as ImageIcon, 
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2, Download, Package, X, FileArchive
} from 'lucide-react';
import PublicPaymentBlock from './public-payment-block';

interface PhotoItem {
  id: string;
  file: File;
  url: string;
  isZip: boolean;
  hasError?: boolean;
}

export default function PublicForm() {
  const [config, setConfig] = useState<SolicitudFormConfig>(DEFAULT_SOLICITUD_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  // Payment
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');

  // Social
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');

  // Images
  const [noLogoCreateForMe, setNoLogoCreateForMe] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [noBannerCreateForMe, setNoBannerCreateForMe] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [stylePreference, setStylePreference] = useState('');

  // Products
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [noProductsPhotosCreateForMe, setNoProductsPhotosCreateForMe] = useState(false);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const photosInputRef = useRef<HTMLInputElement | null>(null);

  // Honeypot
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
  // Captura silenciosa de ?ref y registro anónimo de visita
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');

      let channel = refParam;
      if (channel) {
        sessionStorage.setItem('markix_solicitud_ref', channel);
        document.cookie = 'markix_solicitud_ref=' + encodeURIComponent(channel) + '; path=/; max-age=2592000';
      } else {
        channel = sessionStorage.getItem('markix_solicitud_ref') || null;
      }

      let sessionId = sessionStorage.getItem('markix_visitor_session');
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('markix_visitor_session', sessionId);
      }

      fetch('/api/solicitudes-negocio/tracking/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelCode: channel || 'directo', sessionId })
      }).catch(() => {});
    } catch (e) {}
  }, []);


  useEffect(() => {
    return () => {
      photoItems.forEach(item => {
        if (item.url && !item.isZip) URL.revokeObjectURL(item.url);
      });
    };
  }, [photoItems]);

  const activePlans = (config.plans || []).filter(p => p.active !== false);
  const currentPlan = activePlans.find(p => p.id === selectedPlanId) || activePlans[0] || null;
  const isPaidPlan = currentPlan && !currentPlan.isFree && currentPlan.price > 0;
  const selectedCategoryObj = config.categories?.find(c => c.name === category);

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotoWarning(null);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.jfif', '.zip'];
    const maxFileSize = 5 * 1024 * 1024;

    const newItems: PhotoItem[] = [];
    const currentFiles = [...photoItems];

    for (const file of files) {
      if (currentFiles.length + newItems.length >= 18) {
        setPhotoWarning('Se alcanzó el límite máximo de 18 fotos. Se ignoraron los archivos sobrantes.');
        break;
      }

      const lowerName = file.name.toLowerCase();
      const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));
      if (!hasValidExt) {
        setPhotoWarning('Archivo "' + file.name + '" no permitido. Formatos válidos: JPG, PNG, WEBP, JFIF o ZIP.');
        continue;
      }

      if (file.size > maxFileSize) {
        setPhotoWarning('Archivo "' + file.name + '" excede el peso máximo de 5 MB.');
        continue;
      }

      const isDuplicate = currentFiles.some(item => item.file.name === file.name && item.file.size === file.size) ||
                          newItems.some(item => item.file.name === file.name && item.file.size === file.size);
      if (isDuplicate) continue;

      const isZip = lowerName.endsWith('.zip');
      const url = isZip ? '' : URL.createObjectURL(file);

      newItems.push({
        id: file.name + '-' + file.size + '-' + Date.now() + Math.random(),
        file,
        url,
        isZip
      });
    }

    const updated = [...currentFiles, ...newItems];
    setPhotoItems(updated);
    setProductPhotos(updated.map(item => item.file));

    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const itemToRemove = photoItems[index];
    if (itemToRemove && itemToRemove.url && !itemToRemove.isZip) {
      URL.revokeObjectURL(itemToRemove.url);
    }
    const updated = photoItems.filter((_, i) => i !== index);
    setPhotoItems(updated);
    setProductPhotos(updated.map(item => item.file));
    if (photoWarning) setPhotoWarning(null);
  };

  const handleClearAllPhotos = () => {
    photoItems.forEach(item => {
      if (item.url && !item.isZip) URL.revokeObjectURL(item.url);
    });
    setPhotoItems([]);
    setProductPhotos([]);
    setPhotoWarning(null);
    if (photosInputRef.current) photosInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (description.length > 150) {
      setErrorMessage('La descripción no puede superar los 150 caracteres.');
      return;
    }

    let popupWin: Window | null = null;
    try {
      popupWin = window.open('', '_blank');
    } catch (e) {
      console.warn('Popup bloqueado inicialmente:', e);
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('businessName', businessName);
      fd.append('fullName', fullName);
      fd.append('phone', phone);
      fd.append('address', address);
      fd.append('email', email);
      fd.append('category', category);
      fd.append('subcategory', subcategory);
      fd.append('description', description);

      if (currentPlan) {
        fd.append('planId', currentPlan.id);
      }
      
      // Canal de procedencia
      const storedRef = (typeof window !== 'undefined' ? (sessionStorage.getItem('markix_solicitud_ref') || 'Directo') : 'Directo');
      fd.append('referralChannel', storedRef);
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
        if (popupWin && !popupWin.closed) popupWin.close();
        throw new Error(resJson.error || 'Ocurrió un error al enviar el formulario.');
      }

      if (resJson.whatsappUrl) {
        if (popupWin && !popupWin.closed) {
          popupWin.location.href = resJson.whatsappUrl;
        } else {
          window.location.href = resJson.whatsappUrl;
        }
      }

      setSuccessData({
        message: resJson.message || config.confirmationMessage,
        id: resJson.solicitudId,
        plan: currentPlan,
        isPaid: isPaidPlan,
        paymentMethod: selectedPaymentMethod,
        whatsappUrl: resJson.whatsappUrl
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (popupWin && !popupWin.closed) popupWin.close();
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

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {successData.whatsappUrl && (
            <a
              href={successData.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{ backgroundColor: '#25D366', color: '#FFFFFF' }}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:brightness-95 active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              Abrir WhatsApp
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border border-border bg-background hover:bg-muted"
          >
            Enviar otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Encabezado */}
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
        {/* Anti-spam */}
        <div className="hidden" aria-hidden="true">
          <input type="text" tabIndex={-1} autoComplete="off" value={hpWebsite} onChange={e => setHpWebsite(e.target.value)} />
        </div>

        {/* BLOQUE PLANES DE ACTIVACIÓN */}
        {config.blocks?.plans?.enabled !== false && activePlans.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {(config.blocks?.plans?.title && config.blocks?.plans?.title !== 'Planes de Activación') ? config.blocks.plans.title : 'Servicios de Configuración'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {(config.blocks?.plans?.description && !config.blocks?.plans?.description.includes('impulsa')) ? config.blocks.plans.description : 'Selecciona el servicio y te dejamos tu catálogo listo para vender'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
              {activePlans.map(plan => {
                const isSelected = selectedPlanId === plan.id;
                const isExpanded = Boolean(expandedPlans[plan.id]);
                const features = plan.features || [];
                const hasMore = features.length > 3 || (plan.description && plan.description.length > 80);
                const visibleFeatures = isExpanded ? features : features.slice(0, 3);

                // Normalización de Nombre y Badge para que coincida exactamente
                const displayName = (plan.id === 'plan-gratis' && (plan.name === 'Plan Activación Básica' || !plan.name))
                  ? 'Plan Básico'
                  : plan.name;

                const displayBadge = (plan.id === 'plan-vip' && (!plan.badge || plan.badge === ''))
                  ? '⚡ EXPRESS'
                  : plan.badge;

                const isExpress = (displayBadge && displayBadge.includes('EXPRESS')) || plan.id === 'plan-vip';

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
                    className={'relative p-5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all h-full ' + (plan.highlighted ? 'border-emerald-500 shadow-sm bg-emerald-500/5 ring-1 ring-emerald-500/30' : isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/30')}
                  >
                    <input type="radio" name="activation_plan" value={plan.id} checked={isSelected} readOnly className="sr-only" />
                    
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-base text-foreground leading-snug">{displayName}</span>
                        {displayBadge && (
                          <span className={'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm ' + (
                            isExpress
                              ? 'bg-[#7c3aed] text-white'
                              : plan.highlighted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-primary/10 text-primary'
                          )}>
                            {displayBadge}
                          </span>
                        )}
                      </div>

                      <p className={'text-xs text-muted-foreground leading-relaxed ' + (isExpanded ? '' : 'line-clamp-3')}>
                        {plan.description}
                      </p>

                      {visibleFeatures.length > 0 && (
                        <ul className="space-y-1.5 pt-1 text-xs">
                          {visibleFeatures.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2 text-muted-foreground">
                              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="leading-tight text-foreground/90">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {hasMore && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPlans(prev => ({ ...prev, [plan.id]: !prev[plan.id] }));
                          }}
                          className="text-[11px] font-bold text-primary hover:underline pt-1 block cursor-pointer"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60">
                      <p className="text-xl font-black text-foreground font-mono">
                        {plan.isFree || plan.price === 0 ? '$0 COP' : ('$' + plan.price.toLocaleString('es-CO') + ' COP')}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {plan.priceSuffix || 'pago único'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Texto limpio en la página pública sin toggle switch */}
            {config.showCommissionNote !== false && (
              <p className="text-xs text-center text-muted-foreground font-medium pt-3">
                ✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.
              </p>
            )}
          </div>
        )}

        {/* BLOQUE MÉTODOS DE PAGO CONECTADO */}
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

        {/* BLOQUE INFORMACIÓN GENERAL */}
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">Nombre completo <span className="text-red-500">*</span></label>
                <input type="text" required minLength={2} maxLength={80} autoComplete="name" placeholder="Ej: María Pérez Gómez" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background" />
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

        {/* BLOQUE REDES SOCIALES */}
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

        {/* BLOQUE IDENTIDAD VISUAL */}
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

        {/* BLOQUE CATÁLOGO DE PRODUCTOS (CON MINIATURAS ACUMULATIVAS Y PREVIEW) */}
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

            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-sm font-semibold">Fotos de productos (Hasta 18 imágenes o ZIP)</label>
                {photoItems.length > 0 && (
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {photoItems.length} / 18 fotos
                  </span>
                )}
              </div>

              {photoWarning && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  {photoWarning}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noPhotos"
                  checked={noProductsPhotosCreateForMe}
                  onChange={e => setNoProductsPhotosCreateForMe(e.target.checked)}
                  className="w-4 h-4 rounded text-primary cursor-pointer"
                />
                <label htmlFor="noPhotos" className="text-xs text-muted-foreground cursor-pointer select-none">
                  No tengo fotos, créenlas por mí
                </label>
              </div>

              {!noProductsPhotosCreateForMe && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      ref={photosInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/jfif,.jfif,.zip"
                      onChange={handlePhotosSelected}
                      className="text-xs file:mr-3 file:py-2 file:px-3.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />

                    {photoItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllPhotos}
                        className="text-xs text-destructive hover:underline font-semibold whitespace-nowrap min-h-[44px] px-2 flex items-center"
                      >
                        Quitar todas
                      </button>
                    )}
                  </div>

                  {/* Cuadrícula de miniaturas táctiles de ~80px */}
                  {photoItems.length > 0 && (
                    <div className="pt-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {photoItems.map((item, idx) => (
                          <div key={item.id} className="flex flex-col items-center group">
                            <div className="relative w-20 h-20 rounded-xl border border-border bg-background overflow-hidden flex items-center justify-center shadow-sm">
                              {item.isZip ? (
                                <div className="flex flex-col items-center justify-center p-1 text-center">
                                  <FileArchive className="w-8 h-8 text-primary" />
                                  <span className="text-[10px] font-bold mt-0.5 uppercase font-mono">ZIP</span>
                                </div>
                              ) : item.hasError ? (
                                <div className="flex flex-col items-center justify-center p-1 text-center text-muted-foreground">
                                  <ImageIcon className="w-7 h-7" />
                                  <span className="text-[9px] mt-0.5">Imagen</span>
                                </div>
                              ) : (
                                <img
                                  src={item.url}
                                  alt={item.file.name}
                                  onError={() => {
                                    const copy = [...photoItems];
                                    copy[idx] = { ...copy[idx], hasError: true };
                                    setPhotoItems(copy);
                                  }}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                aria-label="Quitar foto"
                                className="absolute top-0 right-0 min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center bg-black/70 hover:bg-destructive text-white rounded-bl-lg transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <span
                              className="text-[10px] text-muted-foreground truncate w-20 text-center mt-1"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTÓN VERDE WHATSAPP DESTACADO Y GARANTIZADO */}
        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: '#25D366', color: '#FFFFFF' }}
          className="w-full min-h-[52px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer hover:brightness-95 active:scale-[0.99]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando información...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Enviar información de mi negocio por WhatsApp</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
