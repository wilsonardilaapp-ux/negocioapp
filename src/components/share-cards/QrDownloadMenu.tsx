'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeLib from 'qrcode';

interface QrDownloadMenuProps {
  url: string;
  channelName: string;
  className?: string;
  variant?: 'ghost' | 'default' | 'outline';
  fullWidth?: boolean;
  label?: string;
}

const SIZES = [
  { name: 'Pequeño', size: 200, label: '(200×200 px)' },
  { name: 'Mediano', size: 400, label: '(400×400 px)' },
  { name: 'Grande', size: 600, label: '(600×600 px)' },
  { name: 'Póster', size: 1000, label: '(1000×1000 px)' },
] as const;

export function QrDownloadMenu({
  url,
  channelName,
  className = '',
  variant = 'ghost',
  fullWidth = false,
  label = 'Descargar PNG'
}: QrDownloadMenuProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const cleanSlug = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const handleDownload = async (size: number) => {
    if (!url) {
      toast({ variant: 'destructive', title: 'Error', description: 'URL no válida para generar el QR.' });
      return;
    }

    try {
      setIsGenerating(true);

      // Generar PNG vectorial directo al tamaño exacto con margen blanco
      const dataUrl = await QRCodeLib.toDataURL(url, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      const safeChannel = cleanSlug(channelName) || 'canal';
      const filename = `qr-${safeChannel}-${size}px.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'QR Descargado',
        description: `Imagen descargada en resolución ${size}×${size} px.`
      });
    } catch (err: any) {
      console.error('Error generando QR de alta resolución:', err);
      toast({
        variant: 'destructive',
        title: 'Error al generar QR',
        description: 'No se pudo generar la imagen del código QR.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          disabled={isGenerating}
          aria-label={`Descargar código QR para ${channelName}`}
          aria-haspopup="menu"
          className={fullWidth 
            ? `w-full font-black h-12 gap-2 ${className}` 
            : `h-7 text-[10px] font-black uppercase text-muted-foreground hover:text-primary gap-1.5 ${className}`}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="center" 
        side="bottom" 
        sideOffset={6}
        className="w-56 p-1 bg-white shadow-xl border border-gray-100 rounded-xl z-50 animate-in fade-in-80 zoom-in-95"
      >
        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
          <Download className="h-3 w-3 text-primary" /> DESCARGAR QR
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-gray-100" />

        {SIZES.map((item) => (
          <DropdownMenuItem
            key={item.size}
            onClick={() => handleDownload(item.size)}
            className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors focus:bg-primary/10 focus:text-primary"
          >
            <span>{item.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground font-normal">
              {item.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
