# Production checklist

- Zameniti sve demo naloge i lozinke.
- Postaviti jak `NEXTAUTH_SECRET`, `JOB_SECRET` i produkcioni `DATABASE_URL`.
- Potvrditi bankovne instrukcije, cene, model i poziv na broj.
- Potvrditi fiskalne i poslovne obaveze sa knjigovodjom pre izdavanja dokumenata.
- Podesiti Firebase projekat, FCM kljuceve i Android `google-services.json`.
- Podesiti privatni file storage ili ogranicen server storage sa backupom.
- Podesiti HTTPS, secure cookies i produkcioni domain.
- Podesiti monitoring, backup baze i log retention bez tajni.
- Podesiti cron za `/api/jobs/run` sa tajnim headerom.
- Uraditi dodatni security review za upload, IDOR, CSRF i rate limiting pre javne upotrebe.
- Generisati produkcioni Android signing key van repozitorijuma.
