
-- Henkilö
CREATE TABLE IF NOT EXISTS Henkilo (
    henkilo_oid CHAR(36) PRIMARY KEY,
    etunimi VARCHAR(50),
    sukunimi VARCHAR(50)
);

-- Oppilaitos
CREATE TABLE IF NOT EXISTS Oppilaitos (
    oppilaitos_id SERIAL PRIMARY KEY,
    nimi VARCHAR(100),
    tyyppi VARCHAR(20) CHECK (tyyppi IN ('Perusopetus','Ammatillinen','Lukio','AMK','Yliopisto','Urheilu'))
);

-- Opinto-oikeus
CREATE TABLE IF NOT EXISTS OpintoOikeus (
    opinto_oikeus_id SERIAL PRIMARY KEY,
    henkilo_oid CHAR(36) NOT NULL REFERENCES Henkilo(henkilo_oid),
    oppilaitos_id INT NOT NULL REFERENCES Oppilaitos(oppilaitos_id),
    koulutus_tyyppi VARCHAR(20) CHECK (koulutus_tyyppi IN ('Perusopetus','Ammatillinen','Lukio','AMK','Yliopisto','Urheilu')),
    aloitus_pvm DATE,
    paattymis_pvm DATE
);

-- Suoritukset (kaikki koulutusmuodot yhdessä)
CREATE TABLE IF NOT EXISTS Suoritus (
    suoritus_id SERIAL PRIMARY KEY,
    opinto_oikeus_id INT NOT NULL REFERENCES OpintoOikeus(opinto_oikeus_id),
    nimi VARCHAR(100),
    numero VARCHAR(20),
    tila VARCHAR(20) CHECK (tila IN ('Suoritettu','Kesken','Hyväksytty','Hylätty')),
    aloitus_pvm DATE,
    lopetus_pvm DATE,
    arvosana VARCHAR(20)
);

INSERT INTO Henkilo (henkilo_oid, etunimi, sukunimi) VALUES
('000000000000', 'Pekka', 'Pesäpalloilija');

INSERT INTO Oppilaitos (nimi, tyyppi) VALUES
('Helsingin Yliopisto', 'Yliopisto'),
('Tampereen AMK', 'AMK'),
('Turun Lukio', 'Lukio');

CREATE TABLE IF NOT EXISTS Opiskelija (
    opiskelija_id SERIAL PRIMARY KEY,
    henkilo_oid CHAR(36) NOT NULL REFERENCES Henkilo(henkilo_oid),
    opiskelijanumero VARCHAR(20) UNIQUE,
    lukujärjestys_linkki VARCHAR(255)
);

INSERT INTO Opiskelija (henkilo_oid, opiskelijanumero, lukujärjestys_linkki) VALUES
('000000000000', 'OP123456', 'http://lukujarjestys.example.com/pekka');