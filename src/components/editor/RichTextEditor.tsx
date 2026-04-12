'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';
import 'quill/dist/quill.snow.css';

// Using a more explicit dynamic import to resolve the module correctly.
// This pattern helps Next.js's bundler handle non-standard module exports.
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
        // Use a standard function to get the correct `this` context from Quill
        image: function imageHandler() {
          // @ts-ignore - `this.quill` is the Quill instance bound by the library.
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

  return (
    <div className="rich-editor-wrapper">
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
