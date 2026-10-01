# تفعيل قاعدة بيانات Sawtio

1. افتح **Supabase Dashboard → SQL Editor** في مشروع Sawtio.
2. الصق محتوى [`schema.sql`](./schema.sql) كاملًا وشغّله مرة واحدة.
3. من **Authentication → Providers** فعّل Email، واترك Magic Link مفعّلًا.
4. من **Database → Replication** تأكد أن `rooms` و`messages` مفعّلان في Realtime.
5. أعد فتح الموقع وسجّل الدخول؛ إنشاء الغرف والرسائل الخاصة سيُحفظان في Supabase.

الملف لا يحتوي على مفاتيح سرية. مفتاح المتصفح العام يُقرأ من أسرار Webdev، ولا يُحفظ في GitHub.
