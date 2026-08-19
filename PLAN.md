# PLAN.md

## Pretpostavke za MVP
- Aplikacija se pokrece lokalno kao Next.js App Router projekat sa PostgreSQL bazom kroz Docker Compose.
- Autentifikacija koristi email i lozinku preko Auth.js/NextAuth credentials providera, uz server-side RBAC provere.
- Firebase Cloud Messaging radi u mock modu dok se ne podese stvarne Firebase promenljive.
- Uplate su samo rucno evidentirane direktne uplate; kartice, Stripe, bankarski API i automatski refund ostaju za kasnije.
- Android APK se priprema kroz Capacitor konfiguraciju i dokumentovane komande; privatni signing kljucevi se ne cuvaju u repozitorijumu.

## Faze
1. Inicijalizacija projekta
   - Kreirati Next.js + TypeScript + Tailwind strukturu.
   - Dodati Prisma, PostgreSQL Docker Compose, env primer i osnovne skripte.
   - Definisati i migrirati normalizovanu Prisma semu.

2. Domen, bezbednost i autentifikacija
   - Implementirati RBAC, validaciju, rate limiting i server-side autorizaciju.
   - Dodati registraciju, prijavu, odjavu, promenu i reset lozinke u MVP formi.
   - Seedovati demo naloge za ADMIN, TEACHER, PARENT i STUDENT.

3. Raspored, rezervacije i placanja
   - Implementirati raspolozivost, slotove, transakcione rezervacije i rokove.
   - Implementirati PaymentProvider apstrakciju za direktnu uplatu, NBS IPS QR payload i statusne tokove.
   - Implementirati paket od cetiri kredita, credit ledger, refund queue i audit log.

4. Sadrzaj casa, fajlovi, notifikacije i izvoz
   - Implementirati LessonContent, priloge sa kontrolisanim pristupom i zakljucavanje tri sata pre casa.
   - Dodati NotificationProvider mock/FCM sloj, preferencije i scheduled job funkcije.
   - Dodati CSV/XLSX/PDF eksport uz autorizaciju.

5. Interfejs i internacionalizacija
   - Izgraditi mobile-first dashboarde za roditelja/ucenika, nastavnika i administratora.
   - Dodati tok rezervacije, upravljanje uplatama, rasporedom i jezicima.
   - Tekstove drzati u prevodima za srpski latinicu i engleski.

6. Android i dokumentacija
   - Dodati Capacitor konfiguraciju i Android projekat/komande gde okruzenje dozvoli.
   - Napisati README, API opis i produkcioni checklist.

7. Verifikacija
   - Posle kljucnih faza pokrenuti relevantne testove.
   - Na kraju pokrenuti lint, type-check, Vitest, Playwright, Prisma migraciju/seed i produkcioni build.
   - Ispraviti pronadjene greske i dokumentovati realna MVP ogranicenja.
