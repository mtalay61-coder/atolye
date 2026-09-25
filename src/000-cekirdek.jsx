import React, { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Hammer, Plus, Trash2, Search, AlertTriangle, Palette,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, X, Loader2, Boxes, Image as ImageIcon, Check,
  Home, TrendingUp, PackageCheck, ArrowRight, Users, FileText, ClipboardList, Printer, Pencil, Truck, Save, Upload, Wallet, Landmark, Receipt, Compass, RefreshCw, Archive, Package, Scissors, Layers, Maximize2, ArrowLeft, ScanLine,
  // Proses ikonları için: atölyedeki iş adımlarını temsil eden ikonlar.
  Footprints, PackageOpen, Sparkles, Wrench, Armchair, Shirt, Brush, Ruler, Flame, Droplet, Zap, Paintbrush,
  ScrollText, Lock, Camera,
  // Rapor sekmesi (245-rapor): kurucu, dışa aktarma, kapsam rozetleri.
  Settings, Download, User,
  MessageCircle, Mail, LogOut,
} from "lucide-react";

/* ---------------------------------------------------------
   Token sistemi
   Renk: leather-dark #2B1D14, saddle #8A5A38, cream #F2E8D8,
         ink #4B3625, tape-orange #E1611F, stitch #C9B99A

   Koyu yüzeyler (#4B3625 menü/şerit, #634731 ikincil, #8C6445 ayraç) kahve ile vurgu turuncusu
   (#E1611F, 20°) ARASINDA, 26° tonunda. Saf kahve sıcak vurgunun yanında donuk kalıyordu;
   mürekkep siyahı (#221B14) ise krem zeminin yanında sert ve itici duruyordu.
   Tip: Başlık -> Space Grotesk, Gövde -> Inter, Rakam -> IBM Plex Mono
   İmza: dikiş çizgisi (stitch) ayraçlar + deri dokulu panel kenarları
--------------------------------------------------------- */

const FONT_LINK_ID = "atolye-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const KATEGORILER = ["Hammadde", "Yarı Mamul", "Mamul", "Hizmet"];
const CAT_COLORS = { "Hammadde": "var(--erp-brown)", "Yarı Mamul": "#C97B3D", "Mamul": "var(--erp-primary)", "Hizmet": "var(--erp-purple)" };
