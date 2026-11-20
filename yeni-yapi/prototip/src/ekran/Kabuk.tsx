// Kabuk kalıbı: koyu yan menü, üst çubuk (firma, bağlantı, kullanıcı menüsü), prototip şeridi, içerik.
import { tanimDurumu } from "./TanimSayfasi";
import { useState, type ReactNode } from "react";
import { Ikon, Menu } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";
import { MENU, etkinKod, ogeAdresi } from "../menu";

export function Kabuk({ adres, children }: { adres: string; children: ReactNode }) {
  const u = useUygulama();
  const [menuAcik, setMenuAcik] = useState(false);
  const [kullaniciMenu, setKullaniciMenu] = useState(false);
  const etkin = etkinKod(adres);
  return (
    <div className="erp-shell kabuk" data-menu-acik={menuAcik}>
      <nav className="erp-nav kabuk-nav" aria-label="Menü">
        <div className="erp-nav__ad">Atölye</div>
        {MENU.map((g) => (
          <div key={g.ad}>
            <div className="erp-nav__grup">{g.ad}</div>
            {g.ogeler.map((o) => (
              <a key={o.kod} href={"#" + ogeAdresi(o)} aria-current={etkin === o.kod ? "page" : undefined} onClick={() => setMenuAcik(false)}>
                {o.ad}{!o.adres && <span className="kabuk-plan" title="Ekranı henüz çizilmedi">·</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <main className="erp-main kabuk-ana">
        <div className="erp-topbar">
          <button className="erp-btn kabuk-menu-dugme" aria-expanded={menuAcik} onClick={() => setMenuAcik(!menuAcik)}>Menü</button>
          <b>Talay Ayakkabı</b>
          <span className="erp-toolbar__gap" />
          {u.cevrimdisi
            ? <span className="erp-badge erp-badge--void"><Ikon ad="i-ban" />Çevrimdışı</span>
            : <span className="erp-badge erp-badge--ok"><Ikon ad="i-check" />Bağlı</span>}
          <span style={{ position: "relative" }}>
            <button className="erp-btn" onClick={() => setKullaniciMenu(!kullaniciMenu)} aria-haspopup="menu">{u.kullanici}</button>
            {kullaniciMenu && (
              <Menu kapat={() => setKullaniciMenu(false)} ogeler={[
                { ad: "Görünüm (tema)", ikon: "i-edit", onClick: () => { tanimDurumu.sekme = "gorunum"; u.git("tanimlar"); } },
                { ad: u.cevrimdisi ? "Bağlantıyı geri getir (deneme)" : "Çevrimdışını dene", ikon: "i-ban", onClick: () => u.cevrimdisiYap(!u.cevrimdisi) },
                "-",
                { ad: "Çıkış", ikon: "i-back", onClick: u.cikisYap },
              ]} />
            )}
          </span>
        </div>
        <div className="erp-serit erp-serit--uyari prototip-serit"><Ikon ad="i-info" />Prototip · örnek veri, hiçbir şey kaydedilmez.</div>
        {u.cevrimdisi && <div className="erp-serit erp-serit--cevrimdisi" role="alert"><Ikon ad="i-ban" />Çevrimdışı · kayıt girilemez. Bağlantı gelince ekran kendiliğinden açılır.</div>}
        <div className="kabuk-icerik">{children}</div>
      </main>
    </div>
  );
}
