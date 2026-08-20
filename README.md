# German with Boka

Funkcionalni MVP za zakazivanje individualnih online casova nemackog jezika. Aplikacija koristi Next.js App Router, TypeScript, Prisma, PostgreSQL, Auth.js/NextAuth credentials autentifikaciju, Tailwind CSS, next-intl, Vitest, Playwright i Capacitor.

## Arhitektura
- `app/` sadrzi App Router stranice i API route handlere.
- `lib/services/` sadrzi poslovnu logiku za rezervacije, placanja, jobove i izvoz.
- `lib/security/` sadrzi RBAC, rate limiting i rad sa lozinkama.
- `lib/providers/` sadrzi prosirive apstrakcije: `PaymentProvider`, `NotificationProvider`, `FileStorageProvider`, `MeetingProvider`.
- `prisma/` sadrzi semu, migraciju i seed.
- `messages/` sadrzi srpski i engleski prevod. Komponente ne nose hardkodovan glavni UI tekst gde je uvedena lokalizacija.

## Zahtevi
- Node.js 22+.
- PostgreSQL 16 ili Docker Compose.
- Za Android debug APK: Android Studio, JDK i Android SDK.

## Instalacija
```bash
npm install
cp .env.example .env
```

Podesiti `NEXTAUTH_SECRET` i `JOB_SECRET` u `.env`. Demo vrednosti nisu za produkciju.

## Baza, migracije i seed
Ako koristis Docker:
```bash
docker compose up -d
npm run db:deploy
npm run db:seed
```

Ako Docker nije dostupan, podigni PostgreSQL rucno i postavi `DATABASE_URL`, pa pokreni iste komande.

Demo lozinka za sve seed naloge: `DemoPassword123!`

Demo nalozi:
- `admin@germanwithboka.local`
- `teacher@germanwithboka.local`
- `parent@germanwithboka.local`
- `student@germanwithboka.local`

Promeniti ili obrisati demo naloge pre produkcije.

## Pokretanje web aplikacije
```bash
npm run dev
```

Otvori `http://localhost:3000/sr/login`.

## Mesecni planer termina
Booking ekran radi kao mesecni planer:
- roditelj ili ucenik bira ucitelja, mesec i vise slobodnih termina;
- 45 minuta je 1 termin, 90 minuta su 2 vezana termina;
- kalkulator odmah prikazuje broj termina i ukupnu cenu po cenovniku izabranog ucitelja;
- jedna uplata i jedan poziv na broj pokrivaju ceo izabrani plan;
- Bojana dobija interni notification i email summary sa listom termina kada je email servis podesen.

MVP namerno ne tretira ovo kao automatski payment processor. Fokus je na koordinaciji termina, sprecavanju preklapanja i jasnom obracunu za rucnu uplatu.

## Bojana admin/ucitelj nalog
Za produkcioni Bojana nalog koristi skriptu bez upisivanja lozinke u repozitorijum:

```powershell
$env:BOJANA_PASSWORD="unesi-lozinku-privremeno"
npm run account:bojana
Remove-Item Env:\BOJANA_PASSWORD
```

Podrazumevani email je `veselinovic.bojana@yahoo.de`. Skripta pravi admin nalog i povezan teacher profil. Posle prve prijave otvoriti `/sr/setup` ili karticu na dashboardu i uneti cenu termina, telefon i stvarne instrukcije za uplatu.

## Testovi i provere
```bash
npm run lint
npm run type-check
npm run test
npm run test:e2e
npm run build
```

Playwright E2E ocekuje podignutu bazu, primenjene migracije i seed podatke.

## Scheduled poslovi
Lokalno:
```bash
npm run jobs:run
```

Zasticeni endpoint:
```bash
curl -X POST http://localhost:3000/api/jobs/run -H "x-job-secret: $JOB_SECRET"
```

Jobovi su idempotentni i pokrivaju:
- oslobadjanje termina posle 30 minuta bez kliknutog `Uplatio sam`;
- istek provere uplate posle 24 sata;
- istek paketa posle 60 dana;
- prosirive tacke za podsetnike i jutarnji pregled nastavnika.

## Firebase Cloud Messaging
Bez Firebase promenljivih aplikacija radi u mock rezimu i upisuje notifikacije u bazu. Za produkciju podesiti:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- javne `NEXT_PUBLIC_FIREBASE_*` vrednosti
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

Native push za Android je pripremljen kroz `@capacitor/push-notifications`; potrebno je dodati stvarni `google-services.json` u Android projekat van javnog repozitorijuma.

## Email notifikacije
Bez email promenljivih aplikacija radi u mock rezimu: rezervacija se cuva, ucitelj dobija internu notifikaciju u aplikaciji, a audit log belezi da email nije stvarno poslat.

Za stvarno slanje emaila preko Resend-a podesiti:
```bash
RESEND_API_KEY="re_..."
EMAIL_FROM="German with Boka <noreply@tvoj-domen.com>"
TEACHER_NOTIFICATION_EMAIL="veselinovic.bojana@yahoo.de"
```

Ako `TEACHER_NOTIFICATION_EMAIL` nije podesen, email ide na email adresu naloga ucitelja. Resend zahteva verifikovan domen ili dozvoljen sender pre produkcionog slanja.

Za Vercel: dodati ove promenljive u Project Settings -> Environment Variables za Production i Preview, zatim uraditi redeploy. Najbrzi test je da roditelj rezervise vise termina kroz `/sr/book`; u audit logu treba da se pojavi `BOOKING_PLAN_EMAIL_SENT` kada Resend stvarno posalje email.

## Bankovne instrukcije
Seed kreira demo instrukcije za `RSD`, `EUR`, `USD`, `CHF`. Administrator ih menja kroz admin API/panel. RSD IPS QR payload se generise prema NBS IPS formatu u `DirectBankPaymentProvider`; demo racun mora biti zamenjen stvarnim podacima pre produkcije.

## Android debug APK
```bash
npm run build
npm run android:add
npm run android:sync
npm run android:debug
```

Debug APK se ocekuje u `android/app/build/outputs/apk/debug/app-debug.apk`. Za potpisani produkcioni APK treba privatni keystore, Play signing podesavanja i produkcioni backend URL. Privatni signing kljuc se ne generise i ne cuva u repozitorijumu.

## MVP ogranicenja
- Nema karticnih placanja, Stripe-a, PayPal-a, Skrill-a ili bankarskog API-ja.
- Refundacije su rucne i evidentiraju se kroz status.
- Video link se unosi rucno; nema Zoom/Google Meet/Teams API integracije.
- Firebase moze raditi u mock rezimu lokalno.
- Fiskalni racun nije integrisan. PDF je samo potvrda evidencije uplate.
- Pravne, fiskalne i knjigovodstvene obaveze moraju biti proverene sa knjigovodjom/pravnikom pre produkcije.
