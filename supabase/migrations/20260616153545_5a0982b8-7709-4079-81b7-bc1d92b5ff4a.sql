DROP TRIGGER IF EXISTS trg_protect_community_portals_cols ON public.community_portals;
CREATE TRIGGER trg_protect_community_portals_cols
BEFORE INSERT OR UPDATE ON public.community_portals
FOR EACH ROW EXECUTE FUNCTION public.protect_community_portals_cols();
