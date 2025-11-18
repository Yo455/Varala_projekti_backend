# Varala_projekti_backend

🗓️ Kalenteri-demo (ICS → FullCalendar)

Tämä projekti on yksinkertainen ICS-kalenterien lukija ja näyttäjä.
Se koostuu kahdesta osasta:

Backend (Node.js / Express): Lukee .ics-kalenteritiedostoja verkosta (webcal/http/https) ja muuntaa ne JSON-muotoon.

Frontend (React / FullCalendar): Näyttää kalenteritapahtumat selaimessa visuaalisessa viikkonäkymässä.

🚀 Toiminnot

Syötä yksi tai kaksi ICS-linkkiä (esim. Google Calendar tai Outlookin kalenterin julkinen linkki).

Sovellus hakee tapahtumat backendin kautta ja näyttää ne FullCalendarissa.

Jos linkkejä ei anneta, näytetään demotapahtumat (Treeni ja Ottelu).

Voi tallentaa eri profiileille omat lukujärjestykset

🛠️ Asennus ja käynnistys

1. Kloonaa projekti

    git clone https://github.com/Yo455/Varala_projekti_backend.git

    Oikeaan branchiin pääsee git checkout komennolla `git checkout <branchin nimi>`

2. Asenna riippuvuudet

    npm install (asennus pitää tehdä alikansiossa Varala_projekti_backend)


4. Käynnistä sovellus

    npm start (käynnistys pitää tehdä alikansiossa Varala_projekti_backend)
    ![Logo](pictures/npmstart.png)

    selaimeen ohjelman saa auki localhost kohdasta seuraamalla linkkiä:
    ![Logo](pictures/local.png)

5. Tarkastele tietokantaa

    Komennolla `docker exec -it my_postgres psql -U myuser -d mydb ` pääsee katsomaan tietokantaa komentokehotteen kautta.
    Voi tarkastella tallennettuja url-linkkejä komennon ` select * from saved_urls; ` avulla.


