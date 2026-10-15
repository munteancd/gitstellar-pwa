# 🌟 GitStellar - Random GitHub Repos PWA

**🔗 Live: https://munteancd.github.io/gitstellar-pwa/**

**GitStellar** este o aplicație Progressive Web App (PWA) modernă și ultra-rapidă care te ajută să descoperi repozitorii GitHub populare și fascinante cu cel puțin 100 de stele (sau configurat după preferințe).

![GitStellar Banner](icon.svg)

## ✨ Caracteristici Principale

- 🎲 **Descoperire Aleatorie Inteligentă**: Interoghează API-ul GitHub cu paginare și modificatori aleatori pentru rezultate diverse de fiecare dată.
- 🔍 **Ce face, pe înțeles**: Gemini citește README-ul și explică în română, pe 4 carduri: *Pe scurt*, *Exemplu*, *Cum îl încerci* (comanda exactă, verificată în README) și *Merită dacă…*. Fără cheie Gemini, cardurile arată direct ce scrie în README, fără să inventeze nimic.
- 🎯 **Filtre Personalizate**: Filtrează după numărul minim de stele (100+, 500+, 1.000+, 5.000+, 10.000+, 50.000+) și după limbajul de programare (JS, TS, Python, Rust, Go, C++, etc.).
- 💎 **Interfață Glassmorphism Ultra-Modernă**: Stil dark minimalist cu culori vibrante, efect de sticlă mată și animații fluide.
- ⭐ **Sistem de Favorite (Bookmarks)**: Salvează repozitoriile preferate local (`localStorage`) și accesează-le oricând.
- 📋 **Copiere `git clone` la un click**: Copiază instant comanda de clonare în clipboard cu notificare Vizuală.
- 📱 **Suport PWA & Offline**: Instalabil pe desktop și mobil ("Add to Home Screen"), cu Service Worker inclus.
- ⌨️ **Scurtături Tastatură**: Apasă `Space` sau `R` pentru a descoperi un nou repozitoriu.

## 🛠️ Tehnologii Utilizate

- **HTML5 & CSS3**: Custom Design System cu CSS Variables, Flexbox, Grid și Glassmorphism (`backdrop-filter`).
- **JavaScript (Vanilla ES6+)**: Fără dependințe grele, interacțiune directă cu GitHub REST API v3.
- **Service Worker & Web Manifest**: Configurație PWA standard.

## 🚀 Rulare Locală

1. Clonează repozitoriul:
   ```bash
   git clone https://github.com/munteancd/gitstellar-pwa.git
   cd gitstellar-pwa
   ```
2. Deschide `index.html` în browser sau folosește un server local:
   ```bash
   npx http-server . -p 3000
   ```
3. Accesează `http://127.0.0.1:3000`.

## 📜 Licență

Acest proiect este licențiat sub licența MIT.
