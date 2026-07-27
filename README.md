# Salon Raspored

Kompletna PWA aplikacija za zakazivanje termina u frizerskom salonu — slobodan kalendar (bez fiksnih 15-minutnih termina), više frizera, baza klijenata, sinkronizacija u stvarnom vremenu preko Supabase, rad na mobitelu i laptopu s istim računom, offline pregled, tamni način rada, backup/restore i ispis.

## 1. Preduvjeti

- Node.js 18+ i npm
- Besplatan [Supabase](https://supabase.com) račun

## 2. Postavljanje Supabase baze

1. Idi na [supabase.com](https://supabase.com) → **New project**.
2. Kad se projekt kreira, otvori **SQL Editor** i zalijepi cijeli sadržaj datoteke `supabase/schema.sql` iz ovog projekta, pa klikni **Run**. Ovo kreira sve tablice, sigurnosna pravila (RLS) i automatsko sprječavanje preklapanja termina.
3. Otvori **Project Settings → API** i zapamti:
   - `Project URL`
   - `anon public` ključ
4. (Opcionalno, za "Prijava s Googleom") Otvori **Authentication → Providers → Google** i uključi ga prema Supabase uputama (treba Google OAuth Client ID/Secret iz Google Cloud Consolea). Bez ovoga, prijava s email + lozinkom radi odmah.
5. U **Authentication → URL Configuration** dodaj svoju domenu (i `http://localhost:5173` za razvoj) u **Redirect URLs**.

## 3. Pokretanje projekta lokalno

```bash
npm install
cp .env.example .env
# otvori .env i unesi svoj VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY
npm run dev
```

Aplikacija se otvara na `http://localhost:5173`.

Prva osoba koja se registrira automatski dobiva svoj "salon" (radni prostor) i jednog frizera unaprijed kreiranog. Svi koji se kasnije žele pridružiti istom salonu (npr. zaposlenici) trenutno se ručno vežu tako da im administrator u Supabase tablici `profiles` postavi isti `salon_id` — ili proširiš aplikaciju s pozivnicama (vidi odjeljak "Moguća proširenja" niže).

## 4. Objava (deploy)

Aplikacija je standardni Vite projekt pa radi na bilo kojem staticom hostingu:

```bash
npm run build
```

Rezultat je u `dist/` folderu. Preporučeno:

- **Vercel** ili **Netlify**: povuci repozitorij, postavi build command `npm run build`, output `dist`, i dodaj `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` kao environment varijable.

Nakon objave, dodaj produkcijsku domenu i u Supabase **Authentication → URL Configuration → Redirect URLs**.

## 5. Instalacija kao mobilna aplikacija (PWA)

- **Android (Chrome):** otvori stranicu → izbornik (⋮) → "Dodaj na početni zaslon".
- **iPhone (Safari):** otvori stranicu → gumb Podijeli → "Dodaj na Home Screen".
- **Laptop (Chrome/Edge):** ikona za instalaciju u adresnoj traci.

Nakon instalacije aplikacija radi u punom zaslonu, a posljednje učitani termini ostaju vidljivi i bez interneta (Service Worker + lokalni cache). Čim se veza vrati, sve se automatski ponovno sinkronizira.

> Napomena o ikonama: u `public/` su generirane privremene ikone (`icon-192.png`, `icon-512.png`). Zamijeni ih pravim logotipom salona za produkciju.

## 6. Kako radi kalendar

- Klik i povlačenje po praznom prostoru → kreira novi termin točno onog trajanja koje povučeš.
- Povlačenje postojećeg termina → mijenja vrijeme (drag & drop).
- Povlačenje donjeg ruba termina → produžuje/skraćuje trajanje.
- Preklapanje termina za istog frizera nije moguće — baza (`no_overlap_per_barber` ograničenje) i sučelje to sprječavaju te prikazuju upozorenje.
- Prikazi: **Dan** (stupci = frizeri), **Tjedan** (stupci = dani, za odabranog frizera), **Mjesec** (pregled + klik na dan otvara dnevni prikaz).
- Na mobitelu se stupci vodoravno pomiču (scroll/swipe).

## 7. Struktura projekta

```
src/
  components/     # TimeGrid, BookingModal, BarberManager, MonthView, TopBar
  context/        # AuthContext (Supabase Auth), ThemeContext (light/dark)
  hooks/          # useBarbers, useClients, useBookings (Supabase + realtime)
  lib/            # supabase klijent, backup export/import, ispis, datumi
  pages/          # Login
  types/          # zajednički TypeScript tipovi
supabase/
  schema.sql      # kompletna shema baze, RLS pravila, realtime, trigeri
```

## 8. Moguća proširenja

- Pozivanje dodatnih zaposlenika u salon (invite-by-email flow).
- Slanje SMS/WhatsApp podsjetnika (checkbox za podsjetnik već postoji u bazi — `reminder_enabled` — spreman za spajanje na servis poput Twilija putem Supabase Edge Function-a).
- Izvoz u PDF trenutno koristi izravni ispis iz preglednika (Print → Save as PDF), što radi na svim uređajima bez dodatnih biblioteka.
