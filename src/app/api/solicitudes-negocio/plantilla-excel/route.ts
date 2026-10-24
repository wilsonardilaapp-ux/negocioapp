import { NextResponse } from 'next/server';
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
