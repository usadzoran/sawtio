# تفعيل الرسائل الخاصة في قاعدة بيانات Sawtio

قاعدة البيانات الحالية تحتوي أصلًا على جداول `rooms` و`room_participants` و`room_messages` و`profiles` و`wallets` و`gifts`. لا تحذفها ولا تعِد إنشاءها.

1. افتح **Supabase Dashboard → SQL Editor** في مشروع Sawtio.
2. الصق محتوى [`schema.sql`](./schema.sql) كاملًا وشغّله مرة واحدة؛ الملف يضيف فقط جداول `direct_conversations` و`direct_conversation_members` و`direct_messages`.
3. من **Authentication → Providers** فعّل Email، واترك Magic Link مفعّلًا.
4. من **Database → Replication** تأكد أن `room_messages` و`direct_messages` مفعّلان في Realtime.
5. أعد فتح الموقع وسجّل الدخول؛ الغرف تُقرأ من مخططك الحالي، والرسائل الخاصة تُحفظ في الجداول الجديدة.

الملف لا يحتوي على مفاتيح سرية. مفتاح المتصفح العام يُقرأ من أسرار Webdev، ولا يُحفظ في GitHub.
