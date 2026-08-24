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
    
    return `*RESUMEN DE COMPRA - ${businessName.toUpperCase()}* 📄\n` +
      `--------------------------------\n` +
      `*Factura:* ${invoice.consecutiveNumber}\n` +
      `*Cliente:* ${invoice.customer.name}\n` +
      `*Fecha:* ${new Date(invoice.createdAt).toLocaleString()}\n` +
      `--------------------------------\n` +
      `*PRODUCTOS:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*SUBTOTAL:* ${formatCurrency(invoice.subtotal)}\n` +
      (invoice.discount > 0 ? `*DESCUENTO:* -${formatCurrency(invoice.discount)}\n` : '') +
      `*IVA:* ${formatCurrency(invoice.tax)}\n` +
      (invoice.tip > 0 ? `*PROPINA:* ${formatCurrency(invoice.tip)}\n` : '') +
      `*TOTAL:* ${formatCurrency(invoice.total)}\n` +
      `--------------------------------\n` +
      `*PAGO:* ${invoice.paymentMethod.toUpperCase()}\n` +
      `¡Gracias por tu preferencia! 🚀`;
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
    doc.text('SUBTOTAL:', rightCol, finalY + 15);
    doc.text(formatCurrency(invoice.subtotal), 195, finalY + 15, { align: 'right' });
    
    if (invoice.discount > 0) {
        doc.text('DESCUENTOS:', rightCol, finalY + 22);
        doc.text(`-${formatCurrency(invoice.discount)}`, 195, finalY + 22, { align: 'right' });
    }
    
    doc.text('IMPUESTOS:', rightCol, finalY + 29);
    doc.text(formatCurrency(invoice.tax), 195, finalY + 29, { align: 'right' });

    if (invoice.tip > 0) {
        doc.text('PROPINA/SERVICIO:', rightCol, finalY + 36);
        doc.text(formatCurrency(invoice.tip), 195, finalY + 36, { align: 'right' });
    }

    // Border and Total
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(rightCol, finalY + 42, 195, finalY + 42);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL FINAL:', rightCol, finalY + 52);
    doc.text(formatCurrency(invoice.total), 195, finalY + 52, { align: 'right' });

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
