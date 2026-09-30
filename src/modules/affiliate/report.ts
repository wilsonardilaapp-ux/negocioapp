export interface ReportSubscriptionParams {
  event: 'created' | 'renewed' | 'cancelled';
  code: string;
  eventId: string;
  usuarioId?: string;
  email?: string;
  restaurantName?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  occurredAt?: string;
}

export function reportSubscription({
  event,
  code,
  eventId,
  usuarioId,
  email,
  restaurantName,
  planId,
  planName,
  amount,
  currency = 'COP',
  occurredAt = new Date().toISOString()
}: ReportSubscriptionParams) {
  if (!code) return;

  const endpoint = process.env.PARTNERVERSE_API_URL || 'https://partner-comercial-senior.vercel.app/api/affiliate/track-subscription';
  const apiKey = process.env.AFFILIATE_API_KEY || 'aff_live_partnerverse_2026_sec_key_9f8a';

  const payload = {
    code,
    platform_id: 'markix',
    event_id: eventId,
    event,
    usuario_id: usuarioId || '',
    email: email || '',
    restaurant_name: restaurantName || '',
    plan_id: planId || '',
    plan_name: planName || '',
    amount: amount || 0,
    currency,
    occurred_at: occurredAt
  };

  const sendWithRetry = async (retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          console.log(`[Affiliate Report] Evento ${event} reportado con éxito a PartnerVerse:`, data);
          return;
        }
      } catch (err: any) {
        console.warn(`[Affiliate Report] Intento ${i + 1} falló:`, err?.message || err);
      }
    }
  };

  sendWithRetry().catch(e => console.error('[Affiliate Report] Error fatal:', e));
}
