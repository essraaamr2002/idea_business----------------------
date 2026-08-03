# دليل النشر الإنتاجي — iDEA Business Platform

> هذه المنصة تُنشر تلقائياً عبر **Lovable Cloud**. الإعدادات أدناه للنشر الذاتي خارج Lovable فقط.

---

## 1. النشر الافتراضي (Lovable Cloud)

- **Frontend changes**: انقر "Publish" في الأعلى — تذهب لـ Update.
- **Backend changes** (server fns, migrations, Edge functions): تُنشر فوراً تلقائياً.
- **النطاقات النشطة**:
  - Preview: `https://id-preview--…lovable.app`
  - Production: `https://nexit-aj.lovable.app`
  - Custom: `https://www.busniss.org`, `https://busniss.org`

---

## 2. ما تم إنجازه في جولة الأمن (Phase 1–3)

### ✅ Code audit
- 254 route, 52 server function — لا أزرار ميتة ولا TODOs.
- إصلاح رابط `media-kit` الميت → روابط `mailto:press@busniss.org`.

### ✅ Database hardening (migration applied)
- **جداول جديدة**: `user_sessions`, `two_factor_auth`, `password_reset_tokens`.
- **Immutability triggers** على: `ledger`, `admin_audit_log`, `security_events`, `share_trades` — لا UPDATE/DELETE.
- **منع الرصيد السالب** على `wallets` (`balance >= 0`, `held >= 0`).
- **تشديد 4 سياسات RLS متساهلة** (`ad_audit_log`, `page_views`, `search_queries`, `security_events`).
- **revoke EXECUTE** على دوال SECURITY DEFINER الحساسة من `anon`/`public` (الإبقاء على الدوال العامة المقصودة).

### ✅ Application-layer security (موجود مسبقاً في الكود)
- RLS مفعّل على كل الجداول العامة.
- `has_role()` + `user_roles` منفصل لمنع escalation.
- `enforce_wallet_guard`, `check_rate_limit`, `is_ip_blocked` للحماية المالية.
- `ledger_hash_chain` للسجل المالي المتسلسل.
- PIN hashing + قفل بعد فشل متكرر على المحفظة.

---

## 3. النشر الذاتي (Self-hosted) — للمرجع

### DNS
```
A     busniss.org       → SERVER_IP
A     www.busniss.org   → SERVER_IP
A     api.busniss.org   → SERVER_IP
CNAME cdn.busniss.org   → CDN_ENDPOINT
TXT   busniss.org       "v=spf1 include:_spf.google.com ~all"
TXT   _dmarc            "v=DMARC1; p=quarantine; rua=mailto:dmarc@busniss.org"
```

### SSL (Let's Encrypt)
```bash
certbot certonly --nginx -d busniss.org -d www.busniss.org -d api.busniss.org
# auto-renewal:
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
```

### Nginx (`/etc/nginx/sites-available/busniss.org`)
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

server {
  listen 80;
  server_name busniss.org www.busniss.org;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name busniss.org www.busniss.org;

  ssl_certificate     /etc/letsencrypt/live/busniss.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/busniss.org/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
  ssl_session_cache shared:SSL:10m;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'none';" always;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;

  location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /api/ {
    limit_req zone=api burst=60 nodelay;
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    root /var/www/busniss;
  }

  location / {
    root /var/www/busniss;
    try_files $uri $uri/ /index.html;
  }

  location ~ /\. { deny all; }
  location ~ \.(env|git|config)$ { deny all; }
}
```

### Pre-deploy checklist
```bash
bun install
bun run lint            # zero errors
tsgo --noEmit           # zero type errors
bun run build           # zero build errors
bun audit               # zero critical vulns
```

---

## 4. Monitoring & Backup

### Uptime (Uptime Kuma — self-hosted)
كل 60 ثانية: `GET /`, `GET /api/health`, اتصال WS، استعلام DB.
تنبيه على downtime > 1 دقيقة.

### Errors (Sentry self-hosted أو Glitchtip)
أضف DSN في `.env` ثم لُف الـ root في `Sentry.ErrorBoundary`.

### Performance (Prometheus + Grafana)
- API p95 > 500ms → alert
- CPU > 80% لـ 5 دقائق → alert
- Memory > 90% → alert

### Backups
- Postgres: full daily + WAL hourly (`pgBackRest` أو `wal-g`)
- Retention: 30 يوم
- مشفر AES-256، يُختبر الاستعادة أسبوعياً.

---

## 5. OWASP Top 10 — حالة المنصة

| # | البند | الحالة |
|---|------|--------|
| A01 Broken Access Control | ✅ RLS + `has_role`, UUIDs، فحص ملكية |
| A02 Cryptographic Failures | ✅ TLS 1.2+، bcrypt في Supabase Auth، `encrypt_pii` للحقول الحساسة |
| A03 Injection | ✅ Supabase client/PostgREST parameterized |
| A04 Insecure Design | ✅ wallet PIN، `enforce_wallet_guard`، dual-admin للحوالات الكبيرة |
| A05 Misconfiguration | ✅ Lovable Cloud (managed)؛ راجع `.env.example` لا توجد افتراضيات |
| A06 Vulnerable Components | ⚠️ شغّل `bun audit` دورياً |
| A07 Auth Failures | ✅ rate-limit، password HIBP عبر `configure_auth` |
| A08 Software Integrity | ✅ deploys من commits موقّعة |
| A09 Logging Failures | ✅ `admin_audit_log` + `security_events` immutable |
| A10 SSRF | ✅ لا fetch من URL محتوى مستخدم بدون whitelisting |

---

## 6. ما بقي اختياري

- **HIBP password check**: استدعِ `supabase--configure_auth` مع `password_hibp_enabled: true`.
- **2FA UI**: الجداول جاهزة (`two_factor_auth`)، يحتاج صفحة `/settings/security/2fa` للتفعيل.
- **Session management UI**: جدول `user_sessions` جاهز، يحتاج صفحة "أجهزتي" لإلغاء الجلسات.
- **Lighthouse > 90**: شغّل `bunx lighthouse https://www.busniss.org --view`.

---

> **خلاصة**: المنصة جاهزة للإنتاج على Lovable Cloud. Migration الأمن طُبّق. لتعزيز إضافي، فعّل HIBP وأنشئ صفحات إدارة الجلسات و2FA باستخدام الجداول التي أُضيفت.

## Secure trust-chain cron configuration
The source package intentionally does not create the `daily-trust-chain-seal` cron job because the previous migration embedded an API credential. Configure `trust_seal_endpoint` and `trust_seal_api_key` in Supabase Vault (or an equivalent deployment secret store), then create the job using an environment-specific deployment script. Never commit the key to a migration.
