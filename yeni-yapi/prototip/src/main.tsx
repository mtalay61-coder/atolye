// Giriş noktası: adrese göre ekran seçer. Ekran eklemek = buraya bir satır + menu.ts'te adres.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./uygulama.css";
import { UygulamaSaglayici, useAdres, useUygulama } from "./bilesen/uygulama";
import { Giris } from "./ekran/Giris";
import { Kabuk } from "./ekran/Kabuk";
import { Planlanan } from "./ekran/Planlanan";
import { SiparisListesi } from "./ekran/SiparisListesi";
import { SiparisKarti } from "./ekran/SiparisKarti";
import { SiparisFormu } from "./ekran/SiparisFormu";
import { Tanimlar } from "./ekran/Tanimlar";
import { CariListesi } from "./ekran/CariListesi";
import { CariKarti } from "./ekran/CariKarti";
import { UrunRenkKarti } from "./ekran/UrunRenkleri";
import { DegiskenKarti, DegiskenTuruKarti } from "./ekran/Degiskenler";

function Ekran({ adres }: { adres: string }) {
  if (adres === "siparisler" || adres === "") return <SiparisListesi />;
  if (adres === "siparis-yeni") return <SiparisFormu />;
  if (adres.startsWith("siparis-")) return <SiparisKarti no={adres.slice(8)} />;
  if (adres === "cariler") return <CariListesi />;
  if (adres === "cari-yeni") return <CariKarti kod={null} />;
  if (adres.startsWith("cari-")) return <CariKarti kod={adres.slice(5)} />;
  if (adres === "tanimlar") return <Tanimlar />;
  if (adres === "urun-renk-yeni") return <UrunRenkKarti id={null} />;
  if (adres.startsWith("urun-renk-")) return <UrunRenkKarti id={adres.slice(10)} />;
  if (adres === "degisken-turu-yeni") return <DegiskenTuruKarti id={null} />;
  if (adres.startsWith("degisken-turu-")) return <DegiskenTuruKarti id={adres.slice(14)} />;
  if (adres.startsWith("degisken-yeni-")) return <DegiskenKarti id={null} yeniTur={adres.slice(14)} />;
  if (adres.startsWith("degisken-")) return <DegiskenKarti id={adres.slice(9)} />;
  if (adres.startsWith("modul-")) return <Planlanan kod={adres.slice(6)} />;
  return <Planlanan kod="?" />;
}

function Uygulama({ adres }: { adres: string }) {
  const u = useUygulama();
  if (!u.kullanici) return <Giris />;
  return <Kabuk adres={adres}><Ekran key={adres} adres={adres} /></Kabuk>;
}

function Kok() {
  const [adres, git] = useAdres();
  return <UygulamaSaglayici git={git}><Uygulama adres={adres} /></UygulamaSaglayici>;
}

// Büyük harfli etiketler (text-transform) Türkçe kuralla yazılsın: "VERGİ DAİRESİ", "İL".
document.documentElement.lang = "tr";
createRoot(document.getElementById("kok")!).render(<StrictMode><Kok /></StrictMode>);
