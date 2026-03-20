
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { stripeSubscriptionId, action } = await req.json();

    if (!stripeSubscriptionId || !action) {
      return NextResponse.json({ error: 'Subscription ID and action are required.' }, { status: 400 });
    }
    
    if (action === 'cancel') {
        const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
            cancel_at_period_end: true,
        });
        return NextResponse.json({ success: true, subscription: updatedSubscription });
    }
    
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

  } catch (error: any) {
    console.error('Error managing subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
