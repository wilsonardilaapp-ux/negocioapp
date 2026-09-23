import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { Invoice, VerticalType } from '@/types/billing';
import { normalizePhoneNumber } from '@/lib/utils';

/**
 * @fileOverview Servicio de generación de salidas digitales para el POS.
 * Maneja la lógica de construcción de PDF formales y mensajes de WhatsApp.
 */

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

export const InvoiceOutputService = {
  /**
   * Genera la cadena de texto formateada para enviar por WhatsApp.
   */
    generateWhatsAppMessage: (invoice: Invoice, businessName: string) => {
    const itemsText = invoice.items.map(i => `• ${i.quantity}x ${i.name} - ${formatCurrency(i.subtotal)}`).join('\n');
    const effectiveBizName = businessName && businessName !== 'Nuestro Negocio' && businessName !== 'Markix Business' 
      ? businessName 
      : ((invoice as any).businessName || 'Salón de Belleza natural');

    const sFee = (invoice as any).serviceFee ?? Math.max(0, invoice.total - (invoice.subtotal - (invoice.discount || 0) + (invoice.tax || 0) + (invoice.tip || 0)));
    const discPct = invoice.discount > 0 && invoice.subtotal > 0 ? Math.round((invoice.discount / invoice.subtotal) * 100) : null;
    const baseForTip = invoice.subtotal - (invoice.discount || 0);
    const tipPct = invoice.tip > 0 && baseForTip > 0 ? Math.round((invoice.tip / baseForTip) * 100) : 5;

    return `*RESUMEN DE COMPRA - ${effectiveBizName.toUpperCase()}* 🌸\n` +
      `--------------------------------\n` +
      `*Factura:* ${invoice.consecutiveNumber}\n` +
      `*Cliente:* ${invoice.customer.name}\n` +
      `*Fecha:* ${new Date(invoice.createdAt).toLocaleString('es-CO')}\n` +
      `--------------------------------\n` +
      `*PRODUCTOS:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*SUBTOTAL:* ${formatCurrency(invoice.subtotal)}\n` +
      (sFee > 0 ? `*TARIFA DE SERVICIO:* +${formatCurrency(sFee)}\n` : '') +
      (invoice.discount > 0 ? `*DESCUENTO ${discPct ? `(${discPct}%)` : ''}:* -${formatCurrency(invoice.discount)}\n` : '') +
      `*IVA (19%):* ${formatCurrency(invoice.tax)}\n` +
      (invoice.tip > 0 ? `*PROPINA / SERVICIO (${tipPct}%):* ${formatCurrency(invoice.tip)}\n` : '') +
      `*TOTAL:* ${formatCurrency(invoice.total)}\n` +
      `--------------------------------\n` +
      `*PAGO:* ${invoice.paymentMethod.toUpperCase()}\n` +
      `¡Gracias por tu preferencia! 🌸`;
  },

  /**
   * Genera y descarga un PDF formal tamaño A4 con el detalle de la venta.
   */
  downloadPDF: (invoice: Invoice, businessName: string, businessType: string) => {
    const doc = new jsPDF();
    const margin = 14;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(businessName.toUpperCase(), margin, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Comprobante de Venta Formal - ${businessType}`, margin, 28);
    
    // Invoice Info Box
    doc.setFillColor(245, 247, 250);
    doc.rect(130, 12, 65, 20, 'F');
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`FACTURA:`, 135, 20);
    doc.setFontSize(12);
    doc.text(invoice.consecutiveNumber, 155, 20);
    doc.setFontSize(9);
    doc.text(`FECHA: ${new Date(invoice.createdAt).toLocaleDateString()}`, 135, 27);
    
    // Customer Info
    doc.setDrawColor(230);
    doc.line(margin, 38, 200, 38);
    doc.setFontSize(10);
    doc.text('DATOS DEL CLIENTE:', margin, 45);
    doc.setFontSize(11);
    doc.text(invoice.customer.name, margin, 52);
    if (invoice.customer.phone) doc.text(`TEL: ${invoice.customer.phone}`, margin, 58);
    if (invoice.customer.email) doc.text(`EMAIL: ${invoice.customer.email}`, margin, 64);
    
    // Items Table
    const tableData = invoice.items.map(item => [
      item.name.toUpperCase(),
      item.quantity,
      formatCurrency(item.unitPrice),
      formatCurrency(item.subtotal)
    ]);

    (doc as any).autoTable({
      startY: 75,
      head: [['DESCRIPCIÓN', 'CANT', 'V. UNITARIO', 'TOTAL']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;

    // Totals Block
    const rightCol = 140;
    doc.setFontSize(10);
    doc.setTextColor(100);

    const sFee = (invoice as any).serviceFee ?? Math.max(0, invoice.total - (invoice.subtotal - (invoice.discount || 0) + (invoice.tax || 0) + (invoice.tip || 0)));
    const discPct = invoice.discount > 0 && invoice.subtotal > 0 ? Math.round((invoice.discount / invoice.subtotal) * 100) : null;
    let curY = finalY + 15;

    doc.text('SUBTOTAL NETO:', rightCol, curY);
    doc.text(formatCurrency(invoice.subtotal), 195, curY, { align: 'right' });

    if (sFee > 0) {
      curY += 7;
      doc.text('TARIFA DE SERVICIO:', rightCol, curY);
      doc.text(`+${formatCurrency(sFee)}`, 195, curY, { align: 'right' });
    }

    if (invoice.discount > 0) {
      curY += 7;
      doc.text(`DESCUENTO ${discPct ? `(${discPct}%)` : ''}:`, rightCol, curY);
      doc.text(`-${formatCurrency(invoice.discount)}`, 195, curY, { align: 'right' });
    }

    if (invoice.tax > 0) {
      curY += 7;
      doc.text('IVA (19%):', rightCol, curY);
      doc.text(formatCurrency(invoice.tax), 195, curY, { align: 'right' });
    }

    if (invoice.tip > 0) {
      curY += 7;
      doc.text('PROPINA / SERVICIO:', rightCol, curY);
      doc.text(formatCurrency(invoice.tip), 195, curY, { align: 'right' });
    }

    // Border and Total
    curY += 5;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(rightCol, curY, 195, curY);

    curY += 8;
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', rightCol, curY);
    doc.text(formatCurrency(invoice.total), 195, curY, { align: 'right' });

    // Payment Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`MÉTODO DE PAGO: ${invoice.paymentMethod.toUpperCase()}`, margin, finalY + 15);
    if (invoice.atendidoPor) doc.text(`ATENDIDO POR: ${invoice.atendidoPor.toUpperCase()}`, margin, finalY + 22);

    // Final Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerY = 285;
    doc.text('Este documento es un comprobante de operación interna generado por la plataforma MARKIX.', 105, footerY, { align: 'center' });
    
    doc.save(`${invoice.consecutiveNumber}.pdf`);
  }
};
