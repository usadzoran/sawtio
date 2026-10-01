# تشغيل Sawtio على GitHub Pages

يُنشر الموقع عبر `.github/workflows/deploy-pages.yml` كنسخة Static، بينما تبقى المصادقة والبيانات في Supabase.

## إعداد GitHub مرة واحدة

من مستودع `usadzoran/sawtio` افتح **Settings → Secrets and variables → Actions** وأضف:

- `VITE_SUPABASE_URL` = رابط مشروع Supabase
- `VITE_SUPABASE_ANON_KEY` = publishable/anon key للمتصفح فقط

ثم افتح **Settings → Pages** واختر **GitHub Actions** كمصدر النشر.

بعد كل push إلى `main` سيُنشر الموقع على:

`https://usadzoran.github.io/sawtio/`

التوجيه يستخدم Hash URLs حتى لا تفشل صفحات GitHub عند فتح صفحة الإدارة مباشرة:

`https://usadzoran.github.io/sawtio/#/admin`

لا تضع `SUPABASE_SECRET_KEY` أو `SUPABASE_MANAGEMENT_TOKEN` في GitHub Actions أو في ملفات الواجهة.
