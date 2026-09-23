const fs = require('fs');

// 1. Inyectar planContext en catalog/[businessId]/page.tsx
const pagePath = 'src/app/(public)/catalog/[businessId]/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');

const targetModalInvocation = `<PurchaseModal 
                isOpen={isPurchaseModalOpen}
                onOpenChange={setIsPurchaseModalOpen}
                cartItems={cartItems}
                onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))}
                onUpdateQuantity={(id, qty) => setCartItems(prev => prev.map(i => i.id === id ? {...i, quantity: qty} : i))}
                onClearCart={() => setCartItems([])}
                businessId={pageData.resolvedBusinessId!}
                businessInfo={pageData.headerConfig?.businessInfo || null}
                paymentSettings={pageData.paymentSettings}
                origin={orderOrigin}
                externalCoupon={appliedCoupon}
            />`;

const newModalInvocation = `<PurchaseModal 
                isOpen={isPurchaseModalOpen}
                onOpenChange={setIsPurchaseModalOpen}
                cartItems={cartItems}
                onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))}
                onUpdateQuantity={(id, qty) => setCartItems(prev => prev.map(i => i.id === id ? {...i, quantity: qty} : i))}
                onClearCart={() => setCartItems([])}
                businessId={pageData.resolvedBusinessId!}
                businessInfo={pageData.headerConfig?.businessInfo || null}
                paymentSettings={pageData.paymentSettings}
                origin={orderOrigin}
                externalCoupon={appliedCoupon}
                planContext={pricingContext}
            />`;

if (pageContent.includes(targetModalInvocation)) {
  pageContent = pageContent.replace(targetModalInvocation, newModalInvocation);
  fs.writeFileSync(pagePath, pageContent, 'utf8');
  console.log('✅ planContext inyectado en PurchaseModal dentro de page.tsx');
} else {
  // Reemplazo defensivo por regex
  pageContent = pageContent.replace(
    /externalCoupon={appliedCoupon}\s*\/>/,
    `externalCoupon={appliedCoupon}\n                planContext={pricingContext}\n            />`
  );
  fs.writeFileSync(pagePath, pageContent, 'utf8');
  console.log('✅ planContext inyectado (regex) en PurchaseModal dentro de page.tsx');
}

// 2. Ajustar subtotalProducts en purchase-modal.tsx para desglose limpio
const modalPath = 'src/components/catalogo/purchase-modal.tsx';
let modalContent = fs.readFileSync(modalPath, 'utf8');

const oldSubtotal = `const subtotalProducts = useMemo(() => {
      return cartItems.reduce((sum, item) => {
          const unitPrice = item.appliedPromotion?.discountedPrice ?? item.price;
          return sum + (unitPrice * item.quantity);
      }, 0);
  }, [cartItems]);`;

const newSubtotal = `const subtotalProducts = useMemo(() => {
      return cartItems.reduce((sum, item) => {
          const unitPrice = (planContext?.planType === 'hibrido' && item.basePrice)
            ? (item.appliedPromotion?.discountedPrice ?? item.basePrice)
            : (item.appliedPromotion?.discountedPrice ?? item.price);
          return sum + (unitPrice * item.quantity);
      }, 0);
  }, [cartItems, planContext]);`;

if (modalContent.includes(oldSubtotal)) {
  modalContent = modalContent.replace(oldSubtotal, newSubtotal);
  fs.writeFileSync(modalPath, modalContent, 'utf8');
  console.log('✅ subtotalProducts ajustado en purchase-modal.tsx');
} else {
  console.log('ℹ️ subtotalProducts ya estaba actualizado.');
}

console.log('\n🎉 Corrección aplicada.');
