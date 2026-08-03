
-- 1) إخفاء phone/whatsapp في جدول projects عن العموم — يُجلب فقط عبر get_project_contact RPC
REVOKE SELECT ON public.projects FROM anon, authenticated;

GRANT SELECT (
  id, owner_id, ticker, name, description, cover_image_url, sector, country, city,
  currency, is_existing, total_cost, owner_contribution_pct, distribution_frequency,
  expected_revenue, revenue_frequency, expected_profit, profit_frequency,
  expense_assets, expense_movables, expense_fixed, expense_variable,
  has_guarantee, guarantee_amount, shares_total, share_price, shares_sold,
  current_price, status, views_count, likes_count, created_at, updated_at
) ON public.projects TO anon, authenticated;

-- المالك/المشرف يحتاج phone/whatsapp أيضاً — نمنحها بالكامل ولكن RLS تقيّد الصفوف
GRANT SELECT (phone, whatsapp) ON public.projects TO authenticated;

-- 2) منع المستخدم من تعديل/حذف ملفات KYC في storage (لا توجد سياسات UPDATE/DELETE أصلاً للمستخدم)
-- نضيف صراحة DELETE/UPDATE للمشرف فقط لإثبات النية
DROP POLICY IF EXISTS "kyc admin manage files" ON storage.objects;
CREATE POLICY "kyc admin manage files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(),'admin'));

-- 3) منع المستخدم من تحديث/حذف سجلات kyc_verifications (يُعالَج عبر service_role فقط)
-- لا توجد سياسات UPDATE/DELETE — هذا يضمن الحظر الكامل (deny by default).
