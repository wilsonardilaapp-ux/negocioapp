import { NextRequest, NextResponse } from 'next/server';
import { getSolicitudConfig, crearSolicitud, uploadArchivoSeguro } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getSolicitudConfig();
    return NextResponse.json({
      ...config,
      backupEmail: undefined
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error cargando configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    if (formData.get('_hp_website')) {
      return NextResponse.json({ success: true, message: 'Enviado correctamente' });
    }

    const businessName = String(formData.get('businessName') || '').trim();
    const fullName = String(formData.get('fullName') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const subcategory = String(formData.get('subcategory') || '').trim();
    const description = String(formData.get('description') || '').trim();

    if (!businessName || !fullName || !phone || !address || !category || !description) {
      return NextResponse.json(
        { error: 'Por favor complete todos los campos obligatorios (*)' },
        { status: 400 }
      );
    }

    if (fullName.length < 2 || fullName.length > 80) {
      return NextResponse.json({ error: 'El nombre completo debe tener entre 2 y 80 caracteres' }, { status: 400 });
    }

    const planId = String(formData.get('planId') || '').trim();
    const paymentMethod = String(formData.get('paymentMethod') || '').trim();
    const paymentReference = String(formData.get('paymentReference') || '').trim();
    const referralChannel = String(formData.get('referralChannel') || 'Directo').trim();

    let paymentReceiptUrl = '';
    const receiptFile = formData.get('paymentReceipt') as File | null;
    if (receiptFile && receiptFile.size > 0) {
      if (receiptFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'El comprobante excede el límite de 5 MB.' }, { status: 400 });
      }
      paymentReceiptUrl = await uploadArchivoSeguro(receiptFile, 'solicitudes/comprobantes');
    }

    const socialMedia = {
      instagram: String(formData.get('social_instagram') || '').trim(),
      facebook: String(formData.get('social_facebook') || '').trim(),
      tiktok: String(formData.get('social_tiktok') || '').trim(),
      youtube: String(formData.get('social_youtube') || '').trim()
    };

    const noLogoCreateForMe = formData.get('noLogoCreateForMe') === 'true';
    const noBannerCreateForMe = formData.get('noBannerCreateForMe') === 'true';
    const stylePreference = String(formData.get('stylePreference') || '').trim();

    let logoUrl = '';
    const logoFile = formData.get('logoFile') as File | null;
    if (logoFile && logoFile.size > 0 && !noLogoCreateForMe) {
      if (logoFile.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Logo excede 2 MB' }, { status: 400 });
      logoUrl = await uploadArchivoSeguro(logoFile, 'solicitudes/logos');
    }

    let bannerUrl = '';
    const bannerFile = formData.get('bannerFile') as File | null;
    if (bannerFile && bannerFile.size > 0 && !noBannerCreateForMe) {
      if (bannerFile.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Banner excede 2 MB' }, { status: 400 });
      bannerUrl = await uploadArchivoSeguro(bannerFile, 'solicitudes/banners');
    }

    const noProductsPhotosCreateForMe = formData.get('noProductsPhotosCreateForMe') === 'true';
    let templateFileUrl = '';
    const templateFile = formData.get('templateFile') as File | null;
    if (templateFile && templateFile.size > 0) {
      if (templateFile.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Catálogo excede 5 MB' }, { status: 400 });
      templateFileUrl = await uploadArchivoSeguro(templateFile, 'solicitudes/plantillas');
    }

    const productPhotosUrls = [];
    const productPhotos = formData.getAll('productPhotos');
    for (const photo of productPhotos) {
      if (photo && typeof photo === 'object' && 'size' in photo && (photo as File).size > 0 && productPhotosUrls.length < 18) {
        const file = photo as File;
        if (file.size <= 5 * 1024 * 1024) {
          const url = await uploadArchivoSeguro(file, 'solicitudes/productos');
          productPhotosUrls.push(url);
        }
      }
    }

    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    const resultado = await crearSolicitud({
      businessName,
      fullName,
      phone,
      address,
      email,
      category,
      subcategory,
      description,
      planId,
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      referralChannel,
      socialMedia,
      images: { logoUrl, noLogoCreateForMe, bannerUrl, noBannerCreateForMe, stylePreference },
      products: { templateFileUrl, noProductsPhotosCreateForMe, productPhotosUrls },
      ipAddress
    });

    return NextResponse.json({
      success: true,
      solicitudId: resultado.id,
      whatsappUrl: resultado.whatsappUrl,
      message: resultado.config.confirmationMessage,
      whatsappStatus: resultado.whatsappResult.success ? 'Enviado' : 'Registrado'
    });

  } catch (error: any) {
    console.error('Error en API solicitudes-negocio:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
