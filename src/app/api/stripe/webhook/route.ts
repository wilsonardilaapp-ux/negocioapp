
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
        const plan = getPlanFromPriceId(subscription.items.data[0].price.id);

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
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer as string;
        const plan = getPlanFromPriceId(subscription.items.data[0].price.id);

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

        // Degradar a plan 'free'
        const subscriptionData = {
            plan: 'free',
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
