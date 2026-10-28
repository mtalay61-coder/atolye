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

function Ekran({ adres }: { adres: string }) {
  if (adres === "siparisler" || adres === "") return <SiparisListesi />;
  if (adres === "siparis-yeni") return <SiparisFormu />;
  if (adres.startsWith("siparis-")) return <SiparisKarti no={adres.slice(8)} />;
  if (adres === "tanimlar") return <Tanimlar />;
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

createRoot(document.getElementById("kok")!).render(<StrictMode><Kok /></StrictMode>);
