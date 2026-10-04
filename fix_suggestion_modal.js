const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'app', '(public)', 'catalog', '[businessId]', 'page.tsx');

// 1. Respaldo de seguridad previo
fs.copyFileSync(filePath, `${filePath}.bak`);
console.log(`[BACKUP CREADO] ${filePath}.bak`);

let content = fs.readFileSync(filePath, 'utf8');

// 2. Restaurar <SuggestionModal /> antes de <CartDrawer
const modalJSX = `            {activeSuggestion && (
                <SuggestionModal 
                    isOpen={!!activeSuggestion}
                    onOpenChange={(open) => !open && setActiveSuggestion(null)}
                    originalProduct={activeSuggestion.original}
                    suggestion={activeSuggestion.suggestion}
                    onAccept={acceptSuggestion}
                    onDecline={() => {
                        handleAddToCart(activeSuggestion.original, 1);
                        setActiveSuggestion(null);
                        setIsCartOpen(true);
                    }}
                />
            )}

            <CartDrawer`;

if (!content.includes('<SuggestionModal')) {
  content = content.replace('<CartDrawer', modalJSX);
  console.log('✅ <SuggestionModal /> restaurado en el JSX.');
} else {
  console.log('ℹ️ <SuggestionModal /> ya estaba presente.');
}

// 3. Conectar ProductViewModal para que el botón en "Ver" también active la sugerencia
const oldViewModalHandler = `                onAddToCart={(qty) => {
                    handleAddToCart(selectedProduct!, qty);
                    setSelectedProduct(null);
                    setIsCartOpen(true);
                }}`;

const newViewModalHandler = `                onAddToCart={(qty) => {
                    const prod = selectedProduct!;
                    setSelectedProduct(null);
                    if (qty === 1) {
                        handleBuyNow(prod);
                    } else {
                        handleAddToCart(prod, qty);
                        setIsCartOpen(true);
                    }
                }}`;

if (content.includes(oldViewModalHandler)) {
  content = content.replace(oldViewModalHandler, newViewModalHandler);
  console.log('✅ Flujo de sugerencias conectado también al modal "Ver" (ProductViewModal).');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n=== REPARACIÓN APLICADA CON ÉXITO ===');
