# Yönetim erişimi incelemesi

Kullanıcı yerel `/yonetim` girişinin başarılı olduğunu doğruladı. Önceki “Yetkin yok” hatası yeniden üretilemedi; geçmiş hatanın kesin nedeni belirlenmiş değildir.

## Erişimi veren kontrol

`yonetim.tsx` mevcut oturumu bulduğunda önce `verifyAdmin()` çağırır. Sunucudaki `requireSupabaseAuth` Bearer tokenı doğrular, kimliği doğrulanmış JWT `sub` alanından alır. `verifyAdmin` bu kimlik için `user_roles` tablosunda `role = admin` kaydı arar. Başarılı olursa ilk sahip kurulumuna uğramadan panel açılır. Normal admin erişimi service-role anahtarına bağlı değildir; e-posta adresi tek başına admin yetkisi vermez.

Kaynak migrationlarda kullanıcı kendi rolünü okuyabilir; rol atama yetkisi sıradan kullanıcıya verilmez. `app_private.has_role` yönetim tablolarının RLS kontrollerinde kullanılır. Bu inceleme canlı policy/rol durumunun bağımsız denetimi değildir: connector salt okunur sorgu için erişim vermedi.

## Mevcut kırılganlıklar ve öneri

- Rol sorgusunun bağlantı/policy hatası ile gerçekten admin rolü bulunmaması aynı hataya dönüşür. UI bu nedenle geçici bir bağlantı sorununu yetki yokmuş gibi gösterebilir. Güvenli iyileştirme yalnız hata türlerini ayırmaktır; erişim şartını değiştirmek değildir. Hazırlanmış `admin-access.ts` ve testleri bu önerinin taslağıdır, aktif akışa bağlanmamıştır.
- Süresi dolmuş/geçersiz token, eksik sunucu environment değişkeni veya client/server Supabase proje uyuşmazlığı doğrulamayı engeller. Secret değerlerini rapora koymadan yapılandırma kontrol edilmelidir.
- İlk sahip kurulumu ayrı olarak service-role ve `activate_first_owner` RPC kontrolünü kullanmaya devam eder. Bu anahtar eksikse ilk kurulum kullanılamaz; mevcut admin girişini engellemez.

`secure-owner-self-claim.sql` alternatif yaklaşım olarak korunmuştur; migration klasöründen çıkarılmıştır, uygulanacak migration değildir. Çalışan owner/auth kodu mevcut committeki haliyle korunmuştur. Canlı rol/policy değişikliği, yeni claim RPC'si veya RLS gevşetmesi yapılmamıştır.
