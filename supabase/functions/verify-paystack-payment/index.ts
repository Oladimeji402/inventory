// Verifies a Paystack transaction server-side and marks the order paid.
//
// Deploy:  supabase functions deploy verify-paystack-payment
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.)
//
// The browser only ever sends { orderId, reference }. The amount that must have
// been paid is read from the order row, never from the request.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return reply(500, { error: 'Payment verification is not configured' });

  let orderId: string, reference: string;
  try {
    ({ orderId, reference } = await req.json());
  } catch {
    return reply(400, { error: 'Invalid request body' });
  }
  if (!orderId || !reference) return reply(400, { error: 'orderId and reference are required' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: order, error: orderError } = await admin
    .from('store_orders')
    .select('id, total, payment_status, payment_reference')
    .eq('id', orderId)
    .single();
  if (orderError || !order) return reply(404, { error: 'Order not found' });
  if (order.payment_status === 'paid') return reply(200, { paid: true });

  // The reference the shopper paid with must be the one recorded on the order.
  if (order.payment_reference && order.payment_reference !== reference) {
    return reply(400, { error: 'Payment reference does not match this order' });
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  const payload = await res.json().catch(() => null);
  const tx = payload?.data;

  if (!res.ok || !payload?.status || tx?.status !== 'success') {
    return reply(402, { paid: false, error: 'Payment was not successful' });
  }
  if (tx.currency !== 'NGN') return reply(402, { paid: false, error: 'Unexpected currency' });

  const paidNaira = Number(tx.amount) / 100;
  const { error: confirmError } = await admin.rpc('confirm_order_payment', {
    p_order_id: orderId,
    p_reference: reference,
    p_amount: paidNaira
  });
  if (confirmError) return reply(402, { paid: false, error: confirmError.message });

  return reply(200, { paid: true });
});
