'use client';

import React, { useMemo, useState, useEffect, type ComponentType } from 'react';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';
import 'react-quill/dist/quill.snow.css';

// Definimos la interfaz para las props de ReactQuill para mantener el tipado estricto
interface ReactQuillProps {
  theme?: string;
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  placeholder?: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [EditorComponent, setEditorComponent] = useState<ComponentType<ReactQuillProps> | null>(null);

  // Cargamos la librería de forma asíncrona solo en el cliente
  useEffect(() => {
    setMounted(true);
    
    const loadQuill = async () => {
      try {
        const { default: Quill } = await import('react-quill');
        // Se usa cast a unknown -> ComponentType para evitar error TS2345 en SetStateAction
        setEditorComponent(() => Quill as unknown as ComponentType<ReactQuillProps>);
      } catch (error) {
        console.error('Error loading RichTextEditor:', error);
        toast({
          variant: 'destructive',
          title: 'Error de carga',
          description: 'No se pudo cargar el editor de texto. Por favor, refresca la página.',
        });
      }
    };

    loadQuill();
  }, [toast]);

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
            if (!input.files || input.files.length === 0) return;
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

  // Mientras no esté montado o el componente no esté cargado, mostramos el esqueleto de carga
  if (!mounted || !EditorComponent) {
    return <div className="h-[200px] w-full rounded-md bg-muted animate-pulse border border-input" />;
  }

  return (
    <div className="rich-editor-wrapper text-foreground min-h-[200px]">
      <EditorComponent
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
