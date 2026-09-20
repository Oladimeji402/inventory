-- Let the merchant owner's dashboard see new/updated orders live instead of
-- requiring a manual refresh. Only the owner's session can actually receive
-- these events — Realtime enforces the same RLS as a normal SELECT, and the
-- anon-key staff sessions (verify_employee_pin) have no auth.uid() to pass
-- is_tenant_member(), so they still poll via the staff_online_orders RPC.

alter publication supabase_realtime add table public.store_orders;
alter publication supabase_realtime add table public.order_items;
