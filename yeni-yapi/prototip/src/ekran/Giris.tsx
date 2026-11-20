// Giriş ekranı. Prototipte her ad ve şifre kabul edilir; doğrulama Supabase Auth'a bağlanınca gelir.
import { useState } from "react";
import { Alan, Ikon } from "../bilesen/temel";
import { useUygulama } from "../bilesen/uygulama";

export function Giris() {
  const u = useUygulama();
  const [ad, setAd] = useState("Mahmut T.");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const gonder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ad.trim()) { setHata("Kullanıcı adı gerekli"); return; }
    if (!sifre) { setHata("Şifre gerekli"); return; }
    u.girisYap(ad.trim());
  };
  return (
    <div className="giris">
      <form className="erp-card giris-kart" onSubmit={gonder} noValidate>
        <div className="giris-ad">Atölye</div>
        <div className="erp-field__yardim">Talay Ayakkabı · prototip, her şifre kabul edilir</div>
        <Alan etiket="Kullanıcı adı" id="kad"><input id="kad" className="erp-input" value={ad} onChange={(e) => setAd(e.target.value)} autoComplete="username" /></Alan>
        <Alan etiket="Şifre" id="sifre" hata={hata}><input id="sifre" type="password" className="erp-input" value={sifre} onChange={(e) => { setSifre(e.target.value); setHata(""); }} autoComplete="current-password" autoFocus /></Alan>
        <button className="erp-btn erp-btn--primary" type="submit" style={{ justifyContent: "center" }}><Ikon ad="i-check" />Giriş</button>
      </form>
    </div>
  );
}
