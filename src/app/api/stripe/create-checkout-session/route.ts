
import { NextResponse, NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminFirestore } from '@/firebase/server-init';

export async function POST(req: NextRequest) {
  try {
    const { priceId, businessId, userId, email } = await req.json();
    
    if (!priceId || !businessId || !userId || !email) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    const firestore = await getAdminFirestore();
    const subscriptionSnap = await firestore.collection('businesses').doc(businessId).collection('subscription').doc('current').get();
    let stripeCustomerId = subscriptionSnap.exists ? subscriptionSnap.data()?.stripeCustomerId : null;
    
    // Si no existe un cliente de Stripe, creamos uno
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: email,
            name: `Business: ${businessId}`,
            metadata: {
                userId: userId,
                businessId: businessId
            }
        });
        stripeCustomerId = customer.id;

        // Guardamos el nuevo ID de cliente en Firestore
        await firestore.collection('businesses').doc(businessId).collection('subscription').doc('current').set({
            stripeCustomerId: stripeCustomerId
        }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/dashboard/pagos?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/dashboard/pagos`,
      metadata: {
        businessId: businessId
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Error en create-checkout-session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
