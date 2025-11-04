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

🛠️ Asennus ja käynnistys

1. Kloonaa projekti

    git clone https://github.com/Yo455/Varala_projekti_backend.git

2. Kun olet kloonannut projektin, olet oletuksena main/master-haarassa. Tässä projektissa kehitys tapahtuu API-haarassa, joten vaihda siihen komennolla:

    git checkout API

    Ja tarkista että haara on oikea

    git branch

    Pitäisi näyttää tältä

    * API
      main

3. Asenna riippuvuudet

    npm install

4. Käynnistä sovellus

    npm start

