# Moja kuharica

Spletna aplikacija za shranjevanje, pregledovanje in urejanje receptov. Recept vsebuje ime, opis, sestavine, postopek priprave, kategorijo in po želji hranilne vrednosti na 100 g. Uporabnik lahko recepte razvršča po imenu ali kalorijah ter jih filtrira po kategoriji.

## Vsebina

- [O projektu](#o-projektu)
- [Uporabljene tehnologije](#uporabljene-tehnologije)
- [Struktura projekta](#struktura-projekta)
- [Predpogoji](#predpogoji)
- [Namestitev in zagon](#namestitev-in-zagon)
- [Okoljske spremenljivke](#okoljske-spremenljivke)
- [API in Swagger](#api-in-swagger)
- [Navodila za razvijalce](#navodila-za-razvijalce)
- [Standardi kodiranja](#standardi-kodiranja)

## O projektu

Moja kuharica je študijski projekt za vodenje osebne zbirke receptov. Uporabniški vmesnik komunicira z REST API-jem v zaledju. Zaledje shranjuje podatke v PostgreSQL in omogoča osnovne operacije CRUD (ustvarjanje, branje, urejanje in brisanje). API je dokumentiran s Swagger UI.

## Uporabljene tehnologije

| Del | Tehnologija | Verzija v projektu |
|---|---|---|
| Frontend | React | 19.3.1 |
| Frontend | Vite | 7.3.7 |
| Frontend | JavaScript, HTML, CSS | ES moduli; HTML5; CSS3 |
| Backend | Java | 21 |
| Backend | Spring Boot | 4.1.1 |
| Backend | Spring Data JPA / Hibernate | upravlja Spring Boot 4.1.1 |
| Backend | springdoc-openapi / Swagger UI | 3.1.1 |
| Podatkovna baza | PostgreSQL | 17 (Docker image `postgres:17-alpine`) |
| Orodje za gradnjo | Maven Wrapper | Maven 3.10.0; Wrapper 3.3.4 |
| Orodje za gradnjo | npm | različica, priložena namestitvi Node.js |

Različice Reacta in Vite so iz `frontend/package-lock.json`; različice Jave, Spring Boota in springdoc-openapi so iz `backend/demo/pom.xml`.

## Struktura projekta

```text
ReceptiAplikacija/
├── backend/
│   └── demo/
│       ├── .mvn/wrapper/       # Nastavitve Maven Wrapperja
│       ├── src/main/java/      # Java izvorna koda
│       │   └── com/example/demo/
│       │       ├── controller/ # REST API in HTTP končne točke
│       │       ├── model/      # JPA entiteta Recipe
│       │       └── repository/ # Dostop do podatkov s Spring Data JPA
│       ├── src/main/resources/ # Nastavitve aplikacije
│       ├── src/test/java/     # Testna izvorna koda
│       ├── mvnw               # Maven Wrapper za macOS/Linux
│       ├── mvnw.cmd           # Maven Wrapper za Windows
│       └── pom.xml            # Odvisnosti in nastavitev Maven projekta
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # React komponente in delovanje aplikacije
│   │   ├── main.jsx           # Vstopna točka React aplikacije
│   │   └── style.css          # Slogi uporabniškega vmesnika
│   ├── index.html             # HTML dokument za Vite
│   ├── package.json           # Ukazi in odvisnosti frontenda
│   └── package-lock.json      # Zaklenjene različice npm odvisnosti
├── compose.yaml               # Lokalna PostgreSQL baza za Docker
├── .gitignore                 # Datoteke, ki jih Git ne shranjuje
└── README.md                  # Opis projekta in navodila
```

Mapa `frontend` vsebuje uporabniški vmesnik, mapa `backend/demo` pa samostojen Spring Boot projekt. PostgreSQL teče kot ločena storitev Docker Compose.

## Predpogoji

Pred začetkom namesti:

1. **Git** za upravljanje izvorne kode.
2. **Java Development Kit (JDK) 21**.
3. **Node.js 20.19 ali novejši** (ali Node.js 22.12 ali novejši) in npm. To zahtevajo uporabljene različice Vite 7.
4. **Docker Desktop** z Docker Compose za lokalno PostgreSQL bazo.
5. **Visual Studio Code** ali drug urejevalnik kode.

Za Maven ni potrebna ločena namestitev, ker je v projektu Maven Wrapper.

## Namestitev in zagon

Ukaze izvajaj iz terminala. Pot do projekta spodaj zamenjaj s svojo lokacijo.

### 1. Pridobi projekt

Če projekt kloniraš iz GitHuba:

```bash
git clone <URL-repozitorija>
cd ReceptiAplikacija
```

Če že imaš projekt lokalno, odpri mapo `ReceptiAplikacija` v terminalu.

### 2. Zaženi PostgreSQL

Zaženi Docker Desktop, nato v korenski mapi projekta izvedi:

```bash
docker compose up -d
```

Storitev je dosegljiva na `localhost:5432`. Docker Compose ustvari podatkovni volumen `recipe-data`, zato se podatki ohranijo tudi po zaustavitvi vsebnikov.

### 3. Zaženi backend

Odpri nov terminal:

```bash
cd backend/demo
./mvnw spring-boot:run
```

Na Windows ukaz zaženi z `mvnw.cmd spring-boot:run`. Backend posluša na `http://localhost:8080`.

### 4. Zaženi frontend

Odpri še en terminal:

```bash
cd frontend
npm ci
npm run dev
```

Vite izpiše naslov frontend strežnika; privzeto je `http://localhost:5173`. Odpri ga v brskalniku.

### 5. Zaustavi PostgreSQL

V korenski mapi projekta zaženi:

```bash
docker compose down
```

Podatke odstraniš skupaj z Docker volumnom samo, če izrecno zaženeš `docker compose down -v`.

## Okoljske spremenljivke

Backend podpira naslednje spremenljivke. Če jih ne nastaviš, uporabi vrednosti za lokalni razvoj iz `application.properties` in `compose.yaml`.

| Spremenljivka | Privzeta vrednost | Namen |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/recipes` | JDBC naslov PostgreSQL baze |
| `SPRING_DATASOURCE_USERNAME` | `recipes` | Uporabniško ime baze |
| `SPRING_DATASOURCE_PASSWORD` | `recipes_dev` | Geslo lokalne razvojne baze |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Osnovni naslov backend API-ja za frontend |

Privzeti podatki za prijavo so namenjeni samo lokalnemu razvoju. Za drugo okolje jih nastavi zunaj kode in uporabi ustrezne varne vrednosti.

## API in Swagger

Ko backend deluje, je Swagger UI na [`http://localhost:8080/swagger-ui.html`](http://localhost:8080/swagger-ui.html), OpenAPI specifikacija pa na [`http://localhost:8080/v3/api-docs`](http://localhost:8080/v3/api-docs).

| Metoda | Pot | Opis |
|---|---|---|
| `POST` | `/api/recipes` | Ustvari recept |
| `GET` | `/api/recipes` | Vrne vse recepte |
| `GET` | `/api/recipes/{id}` | Vrne recept z izbranim ID-jem |
| `PUT` | `/api/recipes/{id}` | Posodobi recept |
| `DELETE` | `/api/recipes/{id}` | Izbriše recept |

## Navodila za razvijalce

1. Kloniraj repozitorij in ustvari svojo vejo iz `main`:

   ```bash
   git switch -c ime-veje
   ```

2. Spremembe omeji na povezano nalogo in jih pred oddajo lokalno preglej.
3. Spremembe shrani z jasnim commit sporočilom, na primer:

   ```bash
   git add .
   git commit -m "Dodaj filtriranje receptov po kategoriji"
   ```

4. Svojo vejo pošlji na GitHub in odpri Pull Request proti `main`:

   ```bash
   git push -u origin ime-veje
   ```

5. V opisu Pull Requesta na kratko napiši, kaj se je spremenilo in kako si spremembo preverila. Po pregledu spremembe združi v `main`.

V repozitorij ne dodajaj map `node_modules`, `target`, `dist`, IDE nastavitev ali lokalnih skrivnosti. Za posodobitev projekta najprej uporabi `git pull`.

## Standardi kodiranja

- Uporabljaj angleška imena spremenljivk, metod in razredov; besedilo, namenjeno uporabniku, naj bo v slovenščini.
- Imena naj jasno opišejo namen: razredi in React komponente v `PascalCase`, spremenljivke in metode v `camelCase`.
- Java razrede, kontrolerje, entitete in repozitorije hrani v ustreznih paketih (`controller`, `model`, `repository`).
- React komponente in logiko uporabniškega vmesnika hrani v `frontend/src`; ponavljajoče se slogovne vrednosti določi v CSS.
- Uporabljaj UTF-8, dosledno zamikanje in kratke, razumljive metode oziroma komponente.
- Vsaka sprememba naj ohrani ločenost frontenda in backenda ter naj ne vsebuje gesel za produkcijsko okolje.
