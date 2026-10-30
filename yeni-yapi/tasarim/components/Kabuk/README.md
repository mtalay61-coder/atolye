# Kabuk

Her ekranın çerçevesi: solda koyu yan menü, üstte firma ve oturum çubuğu, altında ekranın araç çubuğu ve içerik.

- Sağlanan: menü öğeleri (grup başlıklarıyla), etkin öğe (`aria-current="page"`), firma adı, kullanıcı adı, bağlantı rozeti.
- Yan menü `erp-nav-w` (176px), daraltılmış `erp-nav-w-dar` (64px); 720px altında menü gizlenir, üst çubuktaki menü düğmesiyle açılır.
- Etkin menü öğesi `erp-shell-2` zemin, beyaz yazı ve solda 3px `erp-accent` çizgi taşır.
- Üst çubukta bağlantı durumu hep görünür: Bağlı (`erp-ok`), Çevrimdışı (`erp-void`), bekleyen yazma sayacı.
- Panel rolü (atölye cihazı) menüsüz açılır; yalnız üst çubuk ve tek ekran.
