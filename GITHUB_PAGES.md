# تشغيل Sawtio على GitHub Pages

تم تجهيز نسخة Static من تطبيق React في جذر المستودع حتى تعمل مع إعداد GitHub Pages الحالي:

- **Source:** `main`
- **Folder:** `/ (root)`
- **URL:** https://usadzoran.github.io/sawtio/

التوجيه الداخلي يستخدم Hash URLs، لذلك لوحة الإدارة تفتح عبر:

https://usadzoran.github.io/sawtio/#/admin

## تحديث النسخة المنشورة

بعد تعديل الواجهة شغّل:

```bash
GITHUB_PAGES=true pnpm build:static
rm -rf assets api __manus__
cp -r dist/public/assets assets
cp -r dist/public/api api
cp -r dist/public/__manus__ __manus__
cp dist/public/index.html index.html
cp dist/public/manus-routes.json manus-routes.json
touch .nojekyll
git add . && git commit -m "Update GitHub Pages build" && git push origin main
```

يُستخدم مفتاح Supabase browser-safe داخل الحزمة الأمامية فقط. لا تضع `SUPABASE_SECRET_KEY` أو `SUPABASE_MANAGEMENT_TOKEN` في GitHub أو ملفات البناء العامة.
