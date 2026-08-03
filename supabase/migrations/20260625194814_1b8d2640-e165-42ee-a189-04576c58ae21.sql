
REVOKE EXECUTE ON FUNCTION public.post_live_event(text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_event_new_project() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_event_market_listing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_event_new_bid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_event_new_post() FROM PUBLIC, anon, authenticated;
