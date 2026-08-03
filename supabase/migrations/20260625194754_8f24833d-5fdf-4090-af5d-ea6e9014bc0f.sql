
-- Realtime for the live news feed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='articles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.articles';
  END IF;
END $$;

ALTER TABLE public.articles REPLICA IDENTITY FULL;

-- Helper: insert a live event article row safely
CREATE OR REPLACE FUNCTION public.post_live_event(
  _title text,
  _excerpt text,
  _content text,
  _event_type text,
  _ref_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug text;
BEGIN
  _slug := 'evt-' || _event_type || '-' || substr(replace(_ref_id::text,'-',''),1,8)
        || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  INSERT INTO public.articles(
    slug, title, excerpt, content, category, event_type, event_ref_id,
    language, published, ai_generated, published_at
  ) VALUES (
    _slug, left(_title,200), left(_excerpt,500), _content,
    'live_event', _event_type, _ref_id,
    'ar', true, false, now()
  )
  ON CONFLICT (slug) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- never block the source transaction
  NULL;
END;
$$;

-- Trigger: new project published
CREATE OR REPLACE FUNCTION public.trg_event_new_project() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('active','published','approved') THEN
    PERFORM public.post_live_event(
      'مشروع جديد: ' || COALESCE(NEW.name,'بدون اسم'),
      'تم طرح مشروع جديد على منصة فكرة بزنس' ||
        CASE WHEN NEW.sector IS NOT NULL THEN ' في قطاع ' || NEW.sector ELSE '' END ||
        CASE WHEN NEW.country IS NOT NULL THEN ' — ' || NEW.country ELSE '' END || '.',
      '📢 **مشروع جديد على المنصة**' || E'\n\n' ||
      '**' || COALESCE(NEW.name,'') || '**' || E'\n\n' ||
      COALESCE(left(NEW.description,400),'') || E'\n\n' ||
      '[عرض المشروع](/projects/' || NEW.id::text || ')',
      'new_project', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_new_project ON public.projects;
CREATE TRIGGER event_new_project
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.trg_event_new_project();

-- Trigger: project listed on parallel market
CREATE OR REPLACE FUNCTION public.trg_event_market_listing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(OLD.marketplace_listed,false) = false AND COALESCE(NEW.marketplace_listed,false) = true THEN
    PERFORM public.post_live_event(
      'إدراج جديد في السوق الموازي: ' || COALESCE(NEW.name,''),
      'تم إدراج المشروع في السوق الموازي ومتاح للتداول.',
      '🔁 **السوق الموازي**' || E'\n\n' ||
      'تم إدراج **' || COALESCE(NEW.name,'') || '** في السوق الموازي.' || E'\n\n' ||
      '[عرض المشروع](/projects/' || NEW.id::text || ')',
      'marketplace_listing', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_market_listing ON public.projects;
CREATE TRIGGER event_market_listing
AFTER UPDATE OF marketplace_listed ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.trg_event_market_listing();

-- Trigger: new bid
CREATE OR REPLACE FUNCTION public.trg_event_new_bid() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _curr text;
BEGIN
  SELECT currency INTO _curr FROM public.auctions WHERE id = NEW.auction_id;
  PERFORM public.post_live_event(
    'مزايدة جديدة بقيمة ' || to_char(NEW.amount, 'FM999,999,999') || ' ' || COALESCE(_curr,''),
    'تم تقديم مزايدة جديدة على أحد المزادات النشطة.',
    '🔨 **مزايدة جديدة**' || E'\n\n' ||
    'القيمة: **' || to_char(NEW.amount, 'FM999,999,999') || ' ' || COALESCE(_curr,'') || '**' || E'\n\n' ||
    '[عرض المزاد](/auctions/' || NEW.auction_id::text || ')',
    'new_bid', NEW.auction_id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_new_bid ON public.bids;
CREATE TRIGGER event_new_bid
AFTER INSERT ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.trg_event_new_bid();

-- Trigger: new community post approved
CREATE OR REPLACE FUNCTION public.trg_event_new_post() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(NEW.post_type,'') IN ('ad','announcement','offer') THEN
    PERFORM public.post_live_event(
      'إعلان جديد: ' || COALESCE(NEW.title, left(NEW.content,80)),
      left(COALESCE(NEW.content,''),200),
      '📣 **إعلان مجتمعي جديد**' || E'\n\n' ||
      COALESCE(left(NEW.content,500),'') || E'\n\n' ||
      '[فتح المنشور](/community?post=' || NEW.id::text || ')',
      'community_post', NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS event_new_post ON public.community_posts;
CREATE TRIGGER event_new_post
AFTER INSERT ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_event_new_post();
