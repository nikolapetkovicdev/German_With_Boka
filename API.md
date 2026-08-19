# API overview

Svi privatni endpointi koriste NextAuth sesiju i server-side RBAC provere.

- `POST /api/auth/register` - registracija roditelja ili samostalnog ucenika.
- `POST /api/auth/change-password` - promena lozinke prijavljenog korisnika.
- `POST /api/auth/reset-password/request` - razvojni reset token.
- `POST /api/auth/reset-password/confirm` - potvrda resetovanja lozinke.
- `GET /api/students` - ucenici vidljivi trenutnom korisniku.
- `GET /api/slots` - slobodni termini u narednih 30 dana.
- `POST /api/slots` - generisanje termina za nastavnika/admina.
- `POST /api/bookings` - transakciono zadrzavanje termina i kreiranje uplate.
- `POST /api/bookings/:id/paid` - korisnik oznacava da je uplatio.
- `POST /api/bookings/:id/cancel` - otkazivanje bez brisanja casa.
- `POST /api/payments/:id/confirm` - nastavnik/admin potvrdjuje uplatu.
- `POST /api/payments/:id/reject` - nastavnik/admin odbija uplatu.
- `GET /api/payments/:id/receipt` - PDF potvrda evidencije uplate.
- `GET /api/export?format=csv|xlsx|pdf` - autorizovan izvoz sopstvenih podataka.
- `GET/PATCH /api/admin/bank-instructions` - admin upravlja cenama i instrukcijama.
- `POST /api/jobs/run` - rucno pokretanje jobova uz `x-job-secret`.
