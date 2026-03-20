
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import type { Stripe } from 'stripe';

export async function POST(req: Request) {
  try {
    const { stripeCustomerId } = await req.json();

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'Stripe Customer ID is required.' }, { status: 400 });
    }

    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 20,
    });

    const billingHistory = invoices.data.map((invoice: Stripe.Invoice) => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000),
      description: invoice.lines.data[0]?.description || 'Suscripción',
      amount: invoice.amount_paid / 100,
      status: invoice.status,
      invoiceUrl: invoice.hosted_invoice_url,
    }));

    return NextResponse.json(billingHistory);

  } catch (error: any) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
