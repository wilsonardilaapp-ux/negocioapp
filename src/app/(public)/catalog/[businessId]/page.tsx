// ... contenido anterior ...
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';

// Dentro del componente principal CatalogPage, al final del JSX retornado:
    return (
        <div className="bg-muted/40 min-h-screen pb-20">
            {/* ... JSX existente ... */}
            
            <PublicMenuChatWidget businessId={pageData.resolvedBusinessId!} />
        </div>
    );
}
// ... resto del archivo ...
