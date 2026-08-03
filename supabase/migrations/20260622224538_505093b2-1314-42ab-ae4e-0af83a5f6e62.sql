
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_owner ON public.ad_campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active ON public.ad_campaigns(status, end_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ad_events_campaign ON public.ad_events(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_viewer ON public.ad_events(viewer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_campaign ON public.ad_conversions(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_sector ON public.projects(sector);
CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_shares_user ON public.project_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_project ON public.project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_investment_offers_project ON public.investment_offers(project_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_offers_investor ON public.investment_offers(investor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_offers_owner ON public.investment_offers(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON public.ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.ledger(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_payer ON public.commission_ledger(payer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_user_status ON public.payout_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.community_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON public.community_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.community_post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON public.community_follows(followee_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sector_follows_sector ON public.sector_follows(sector);
CREATE INDEX IF NOT EXISTS idx_sector_follows_user ON public.sector_follows(user_id);

CREATE INDEX IF NOT EXISTS idx_share_orders_project_status ON public.share_orders(project_id, status);
CREATE INDEX IF NOT EXISTS idx_share_orders_user ON public.share_orders(user_id, created_at DESC);
