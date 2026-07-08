
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';
import 'react-quill/dist/quill.snow.css';

// Importación dinámica robusta con manejo de carga
const QuillEditor = dynamic(
  () => import('react-quill'),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-md bg-muted" />,
  }
);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Asegurar que el componente solo se renderice en el cliente tras el montaje inicial
  // Esto previene el ChunkLoadError al dar tiempo al cargador de Next.js a inicializarse
  useEffect(() => {
    setMounted(true);
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ font: [] }],
        [{ size: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ script: 'sub' }, { script: 'super' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video'],
        ['clean'],
      ],
      handlers: {
        image: function imageHandler() {
          // @ts-ignore - Acceso interno al objeto quill de la instancia
          const quill = this.quill;
          if (!quill) return;

          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            if (!input.files) return;
            const file = input.files[0];
            const MAX_FILE_SIZE_MB = 1;
            const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

            if (file.size > MAX_FILE_SIZE_BYTES) {
              toast({
                variant: 'destructive',
                title: 'Archivo muy pesado',
                description: `El archivo es muy pesado. Máximo ${MAX_FILE_SIZE_MB}MB.`,
              });
              return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onloadend = async () => {
              const mediaDataUri = reader.result as string;
              
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`);
              quill.setSelection(range.index + 1);

              try {
                const result = await uploadMedia({ mediaDataUri });
                quill.deleteText(range.index, 1);
                quill.insertEmbed(range.index, 'image', result.secure_url);
                quill.setSelection(range.index + 1);
              } catch (error: any) {
                console.error('Image upload failed', error);
                quill.deleteText(range.index, 1);
                toast({
                  variant: 'destructive',
                  title: 'Error al subir imagen',
                  description: error.message || 'No se pudo cargar la imagen. Inténtalo de nuevo.',
                });
              }
            };
          };
        }
      },
    },
  }), [toast]);

  if (!mounted) {
    return <div className="h-[200px] w-full rounded-md bg-muted animate-pulse" />;
  }

  return (
    <div className="rich-editor-wrapper text-foreground">
      <QuillEditor
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
