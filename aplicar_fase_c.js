const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO FASE C: Formulario Público');
console.log('==============================================');

// 1. Directorios
const dirs = [
  'src/app/(public)/registro-negocio',
  'src/app/api/solicitudes-negocio/plantilla-excel',
  'src/modules/solicitudes-negocio/components'
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. Endpoint generador de Plantilla Excel
const excelRouteContent = `import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Generar libro Excel con columnas predefinidas
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Nombre del Producto *', 'Precio (S/ o USD) *', 'Categoría', 'Descripción', 'Stock Inicial'],
      ['Hamburguesa Clásica', '18.50', 'Platos Fuertes', 'Carne 150g, queso cheddar y papas', '50'],
      ['Gaseosa 500ml', '5.00', 'Bebidas', 'Botella personal helada', '100']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Plantilla_Productos_Markix.xlsx"'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error generando plantilla' }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/plantilla-excel/route.ts', excelRouteContent, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/plantilla-excel/route.ts');

// 3. Crear componente PublicForm
const publicFormContent = `'use client';

import React, { useState, useEffect, useId } from 'react';
import { SolicitudFormConfig } from '../types';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { 
  Building2, Phone, MapPin, Mail, Tag, FileText, 
  Instagram, Facebook, Youtube, Image as ImageIcon, 
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2, Download
} from 'lucide-react';

export default function PublicForm() {
  const [config, setConfig] = useState<SolicitudFormConfig>(DEFAULT_SOLICITUD_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; id: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
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

  // Honeypot anti-spam
  const [hpWebsite, setHpWebsite] = useState('');

  useEffect(() => {
    fetch('/api/solicitudes-negocio')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setConfig(data);
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));
  }, []);

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

      // Redes
      fd.append('social_instagram', socialInstagram);
      fd.append('social_facebook', socialFacebook);
      fd.append('social_tiktok', socialTiktok);
      fd.append('social_youtube', socialYoutube);

      // Branding
      fd.append('noLogoCreateForMe', String(noLogoCreateForMe));
      if (logoFile && !noLogoCreateForMe) fd.append('logoFile', logoFile);
      fd.append('noBannerCreateForMe', String(noBannerCreateForMe));
      if (bannerFile && !noBannerCreateForMe) fd.append('bannerFile', bannerFile);
      fd.append('stylePreference', stylePreference);

      // Products
      if (templateFile) fd.append('templateFile', templateFile);
      fd.append('noProductsPhotosCreateForMe', String(noProductsPhotosCreateForMe));
      productPhotos.forEach(p => fd.append('productPhotos', p));

      // Honeypot
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
        id: resJson.solicitudId
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
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-card rounded-2xl border border-border shadow-md animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-4">¡Registro Recibido!</h2>
        <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
          {successData.message}
        </p>
        <div className="inline-block bg-muted px-4 py-2 rounded-lg text-xs font-mono text-muted-foreground mb-8">
          Código de seguimiento: #{successData.id.slice(0, 8).toUpperCase()}
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
      {/* Header */}
      <div className="text-center mb-8">
        {config.branding?.logoUrl && (
          <img 
            src={config.branding.logoUrl} 
            alt="Logo" 
            className="h-14 mx-auto mb-4 object-contain" 
          />
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
        {/* Campo trampa Honeypot (Anti-Spam) */}
        <div className="hidden" aria-hidden="true">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hpWebsite}
            onChange={e => setHpWebsite(e.target.value)}
          />
        </div>

        {/* BLOQUE 1: DATOS DEL NEGOCIO */}
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
                <label className="block text-sm font-semibold mb-1.5">
                  Nombre comercial del negocio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cafetería El Molino"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Teléfono / WhatsApp de contacto <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: +51 987 654 321"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Correo electrónico (opcional)
                </label>
                <input
                  type="email"
                  placeholder="contacto@tunegocio.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">
                  Dirección física o sede principal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Las Flores 123, Miraflores"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Categoría principal <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    setSubcategory('');
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccione una categoría</option>
                  {config.categories?.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Subcategoría
                </label>
                <select
                  disabled={!category || !selectedCategoryObj?.subcategories?.length}
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccione subcategoría</option>
                  {selectedCategoryObj?.subcategories?.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold">
                    Descripción corta del negocio <span className="text-red-500">*</span>
                  </label>
                  <span className={\`text-xs font-mono \${description.length > 150 ? 'text-destructive font-bold' : 'text-muted-foreground'}\`}>
                    {description.length}/150
                  </span>
                </div>
                <textarea
                  required
                  maxLength={150}
                  rows={2}
                  placeholder="Breve reseña de lo que ofrece tu negocio a tus clientes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-3 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* BLOQUE 2: REDES SOCIALES */}
        {config.blocks?.socialMedia?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <Instagram className="w-5 h-5 text-primary" />
              {config.blocks?.socialMedia?.title || 'Redes Sociales (Opcional)'}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {config.blocks?.socialMedia?.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram (@usuario o link)</label>
                <input
                  type="text"
                  placeholder="https://instagram.com/tu_cuenta"
                  value={socialInstagram}
                  onChange={e => setSocialInstagram(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Facebook (enlace de página)</label>
                <input
                  type="text"
                  placeholder="https://facebook.com/tu_pagina"
                  value={socialFacebook}
                  onChange={e => setSocialFacebook(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">TikTok (@usuario o link)</label>
                <input
                  type="text"
                  placeholder="https://tiktok.com/@tu_cuenta"
                  value={socialTiktok}
                  onChange={e => setSocialTiktok(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">YouTube (canal)</label>
                <input
                  type="text"
                  placeholder="https://youtube.com/@tu_canal"
                  value={socialYoutube}
                  onChange={e => setSocialYoutube(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-input bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* BLOQUE 3: IMÁGENES & IDENTIDAD */}
        {config.blocks?.brandingImages?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <ImageIcon className="w-5 h-5 text-primary" />
              {config.blocks?.brandingImages?.title || 'Identidad Visual'}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {config.blocks?.brandingImages?.description}
            </p>

            <div className="space-y-6">
              {/* Logo */}
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
                <label className="block text-sm font-semibold mb-2">Logo de tu negocio (JPG/PNG, máx 2 MB)</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="noLogo"
                    checked={noLogoCreateForMe}
                    onChange={e => {
                      setNoLogoCreateForMe(e.target.checked);
                      if (e.target.checked) setLogoFile(null);
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="noLogo" className="text-sm cursor-pointer select-none font-medium text-muted-foreground">
                    No tengo logo, créenlo por mí
                  </label>
                </div>
                {!noLogoCreateForMe && (
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => setLogoFile(e.target.files?.[0] || null)}
                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                )}
              </div>

              {/* Banner */}
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
                <label className="block text-sm font-semibold mb-2">Banner o Portada (JPG/PNG, máx 2 MB)</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="noBanner"
                    checked={noBannerCreateForMe}
                    onChange={e => {
                      setNoBannerCreateForMe(e.target.checked);
                      if (e.target.checked) setBannerFile(null);
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="noBanner" className="text-sm cursor-pointer select-none font-medium text-muted-foreground">
                    No tengo banner, créenlo por mí
                  </label>
                </div>
                {!noBannerCreateForMe && (
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => setBannerFile(e.target.files?.[0] || null)}
                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                )}
              </div>

              {/* Estilo */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Estilo que te gusta o referencias de diseño
                </label>
                <input
                  type="text"
                  placeholder="Ej: Minimalista, colores pasteles, estilo rústico moderno..."
                  value={stylePreference}
                  onChange={e => setStylePreference(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-input bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* BLOQUE 4: PRODUCTOS Y CATÁLOGO */}
        {config.blocks?.products?.enabled !== false && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {config.blocks?.products?.title || 'Catálogo de Productos'}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {config.blocks?.products?.description}
            </p>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/40 rounded-xl gap-3">
                <div>
                  <p className="text-sm font-semibold">¿Necesitas una plantilla de referencia?</p>
                  <p className="text-xs text-muted-foreground">Descarga nuestro formato Excel listo para rellenar.</p>
                </div>
                <a
                  href="/api/solicitudes-negocio/plantilla-excel"
                  download="Plantilla_Productos_Markix.xlsx"
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-background border border-input hover:bg-muted text-foreground text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Download className="w-4 h-4 text-primary" />
                  Descargar Plantilla Excel
                </a>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
                <label className="block text-sm font-semibold mb-2">Subir catálogo (Excel .xlsx o Word .docx, máx 5 MB)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.doc,.docx"
                  onChange={e => setTemplateFile(e.target.files?.[0] || null)}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20">
                <label className="block text-sm font-semibold mb-2">Fotos de productos (Hasta 18 imágenes o archivo ZIP, máx 5 MB c/u)</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="noPhotos"
                    checked={noProductsPhotosCreateForMe}
                    onChange={e => {
                      setNoProductsPhotosCreateForMe(e.target.checked);
                      if (e.target.checked) setProductPhotos([]);
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="noPhotos" className="text-sm cursor-pointer select-none font-medium text-muted-foreground">
                    No tengo fotos, créenlas por mí
                  </label>
                </div>
                {!noProductsPhotosCreateForMe && (
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,.zip"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setProductPhotos(files.slice(0, 18));
                    }}
                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                )}
                {productPhotos.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    {productPhotos.length} archivo(s) seleccionado(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOTÓN DE ACCIÓN ACCESIBLE (>= 44px) */}
        <div>
          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: config.branding?.buttonColor || '#0284c7' }}
            className="w-full min-h-[48px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
        </div>
      </form>
    </div>
  );
}
`;
fs.writeFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', publicFormContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/components/public-form.tsx');

// 4. Crear página pública: src/app/(public)/registro-negocio/page.tsx
const publicPageContent = `import PublicForm from '@/modules/solicitudes-negocio/components/public-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro de Negocio | Markix',
  description: 'Envía los datos de tu negocio para registrarte y activar tu plataforma comercial.'
};

export default function RegistroNegocioPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-10">
      <PublicForm />
    </main>
  );
}
`;
fs.writeFileSync('src/app/(public)/registro-negocio/page.tsx', publicPageContent, 'utf8');
console.log('[OK] Creado: src/app/(public)/registro-negocio/page.tsx');

console.log('\n==============================================');
console.log('FASE C COMPLETADA CON ÉXITO');
console.log('==============================================');
