import { DefaultSubscriptionPlans } from '@/models/subscription-plan';
import { reportSubscription } from '@/modules/affiliate/report';

import { NextResponse } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { getAdminFirestore } from '@/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  const firestore = await getAdminFirestore();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = session.metadata?.businessId;
        const stripeSubscriptionId = session.subscription as string;
        const stripeCustomerId = session.customer as string;

        if (!businessId) {
          throw new Error('businessId no encontrado en metadata de la sesión.');
        }

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const plan = getPlanFromPriceId(subscription.items.data[0].price.id) || 'pro';
        const planObj = DefaultSubscriptionPlans.find(p => p.id === plan) || { id: plan, name: plan, price: 29 };

        if (!plan) {
          throw new Error(`Plan no encontrado para priceId: ${subscription.items.data[0].price.id}`);
        }

        const subscriptionData = {
          plan: plan,
          status: 'active',
          stripeSubscriptionId,
          stripeCustomerId,
          currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
          updatedAt: Timestamp.now(),
        };

        const subRef = firestore.collection('businesses').doc(businessId).collection('subscription').doc('current');
        await subRef.set(subscriptionData, { merge: true });

        try {
          const bDoc = await firestore.collection('businesses').doc(businessId).get();
          const bData = bDoc.data() || {};
          const affCode = session.metadata?.affiliateCode || bData.affiliateCode || bData.referredByCode;
          if (affCode) {
            reportSubscription({
              event: 'created',
              code: affCode,
              eventId: session.id || `${stripeSubscriptionId}_created`,
              usuarioId: businessId,
              email: (session.customer_details as any)?.email || session.customer_email || bData.email,
              restaurantName: bData.name || 'Restaurante Markix',
              planId: planObj.id,
              planName: planObj.name,
              amount: planObj.price,
              currency: 'USD'
            });
          }
        } catch(e) { console.warn('[Webhook] Error created:', e); }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer as string;
        const plan = getPlanFromPriceId(subscription.items.data[0].price.id) || 'pro';
        const planObj = DefaultSubscriptionPlans.find(p => p.id === plan) || { id: plan, name: plan, price: 29 };

        if (!plan) {
          throw new Error(`Plan no encontrado para priceId: ${subscription.items.data[0].price.id}`);
        }

        const businessQuery = await firestore.collectionGroup('subscription')
            .where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();

        if (businessQuery.empty) {
          throw new Error(`No se encontró negocio para stripeCustomerId: ${stripeCustomerId}`);
        }
        
        const businessDoc = businessQuery.docs[0];

        const subscriptionData = {
          plan,
          status: subscription.status as any,
          currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
          updatedAt: Timestamp.now(),
        };
        await businessDoc.ref.update(subscriptionData);

        try {
          const bData = businessDoc.data() || {};
          const affCode = (subscription.metadata as any)?.affiliateCode || bData.affiliateCode || bData.referredByCode;
          if (affCode) {
            reportSubscription({
              event: 'cancelled',
              code: affCode,
              eventId: `${subscription.id}_cancelled`,
              usuarioId: businessDoc.id,
              email: bData.email,
              restaurantName: bData.name || 'Restaurante Markix'
            });
          }
        } catch(e) { console.warn('[Webhook] Error cancelled:', e); }

        try {
          const bData = businessDoc.data() || {};
          const affCode = (subscription.metadata as any)?.affiliateCode || bData.affiliateCode || bData.referredByCode;
          if (affCode) {
            reportSubscription({
              event: 'renewed',
              code: affCode,
              eventId: `${subscription.id}_${subscription.current_period_end}`,
              usuarioId: businessDoc.id,
              email: bData.email,
              restaurantName: bData.name || 'Restaurante Markix',
              planId: planObj.id,
              planName: planObj.name,
              amount: planObj.price,
              currency: 'USD'
            });
          }
        } catch(e) { console.warn('[Webhook] Error renewed:', e); }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer as string;
        
        const businessQuery = await firestore.collectionGroup('subscription')
            .where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();

        if (businessQuery.empty) {
           throw new Error(`No se encontró negocio para stripeCustomerId: ${stripeCustomerId}`);
        }

        const businessDoc = businessQuery.docs[0];

        // Degradar a plan híbrido gratuito real (WxZYuL7JwmkSKBXGn1QZ)
        const subscriptionData = {
            plan: 'WxZYuL7JwmkSKBXGn1QZ',
            status: 'canceled',
            stripeSubscriptionId: null, // Limpiar
            currentPeriodEnd: null,
            updatedAt: Timestamp.now(),
        };
        await businessDoc.ref.update(subscriptionData);
        break;
      }

      default:
        console.log(`Evento de webhook no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json({ error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
