"use client";

import React, { useEffect, useRef, useState } from 'react';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Moved outside the component to prevent re-creation on every render
const sizeWhitelist = [
    '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', 
    '20px', '24px', '28px', '32px', '36px', '48px', '60px', '72px'
];

const fontWhitelist = [
    'sans-serif', 'serif', 'monospace', 'arial', 'comic-sans', 
    'courier-new', 'georgia', 'helvetica', 'lucida'
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadQuill = async () => {
      const Quill = (await import('quill')).default;

      if (editorRef.current && !quillInstance.current) {
        const toolbarOptions = [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'font': fontWhitelist }],
          [{ 'size': sizeWhitelist }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'script': 'sub' }, { 'script': 'super' }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'indent': '-1' }, { 'indent': '+1' }, { 'align': [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'video'],
          ['clean']
        ];

        const imageHandler = () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
              if (input.files) {
                  const file = input.files[0];
                  if (file.size > MAX_FILE_SIZE_BYTES) {
                      toast({
                          variant: 'destructive',
                          title: "Archivo muy pesado",
                          description: `El archivo es muy pesado. Máximo ${MAX_FILE_SIZE_MB}MB.`,
                      });
                      input.value = "";
                      return;
                  }
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  const range = quillInstance.current.getSelection(true);
                  reader.onloadend = async () => {
                      const mediaDataUri = reader.result as string;
                      try {
                          quillInstance.current.insertEmbed(range.index, 'image', `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`);
                          quillInstance.current.setSelection(range.index + 1);

                          const result = await uploadMedia({ mediaDataUri });
                          
                          quillInstance.current.deleteText(range.index, 1);
                          quillInstance.current.insertEmbed(range.index, 'image', result.secure_url);
                          quillInstance.current.setSelection(range.index + 1);
                      } catch (error) {
                          console.error('Image upload failed', error);
                          if (range) {
                              quillInstance.current.deleteText(range.index, 1);
                          }
                      }
                  }
              }
          };
        };

        quillInstance.current = new Quill(editorRef.current, {
          theme: 'snow',
          placeholder: placeholder || 'Escribe aquí...',
          modules: {
            toolbar: toolbarOptions
          }
        });

        quillInstance.current.getModule('toolbar').addHandler('image', imageHandler);

        quillInstance.current.on('text-change', () => {
          const html = quillInstance.current.root.innerHTML;
          if (html !== '<p><br></p>') {
            onChange(html);
          } else {
            onChange('');
          }
        });
        
        setIsLoaded(true);
      }
    };

    if (typeof window !== 'undefined') {
      loadQuill();
    }
  }, [placeholder, onChange, toast]);

  useEffect(() => {
    // This effect ensures that if the 'value' prop changes from the parent,
    // and the editor is loaded, the content is updated.
    if (isLoaded && quillInstance.current && value !== quillInstance.current.root.innerHTML) {
        quillInstance.current.root.innerHTML = value || '<p><br></p>';
    }
  }, [value, isLoaded]); // Depends on both value and isLoaded

  return (
    <div className="rich-editor-wrapper">
      {/* CSS Inyectado para mostrar las etiquetas de tamaño y fuente en el menú */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ql-picker.ql-size .ql-picker-label::before,
        .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value) !important;
        }
        .ql-picker.ql-size .ql-picker-item[data-value]::before {
          content: attr(data-value) !important;
        }
        .ql-picker.ql-size .ql-picker-label:not([data-value])::before {
          content: 'Normal' !important;
        }
        .ql-picker.ql-font .ql-picker-label::before,
        .ql-picker.ql-font .ql-picker-item::before {
          content: attr(data-value) !important;
        }
         .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before {
            content: "Sans Serif" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before {
            content: "Serif" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before {
            content: "Monospace" !important;
        }
         .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before {
            content: "Arial" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="comic-sans"]::before {
            content: "Comic Sans" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="courier-new"]::before {
            content: "Courier New" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="georgia"]::before {
            content: "Georgia" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="helvetica"]::before {
            content: "Helvetica" !important;
        }
        .ql-picker.ql-font .ql-picker-label[data-value="lucida"]::before {
            content: "Lucida" !important;
        }
      `}} />
      <div ref={editorRef} />
    </div>
  );
};

export default RichTextEditor;