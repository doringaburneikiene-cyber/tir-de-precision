# Tir de précision dienynas

Petankės **tir de précision** (tikslaus mušimo) treniruočių registravimo ir analizės programėlė telefonui.

- Pilna serija 5 rungtys × 4 atstumai (6–9 m) pagal FIPJP taisykles, arba pratimai su viena rungtimi
- Kiekvieno metimo rezultatas, klaidos kryptis, pataikymo būdas
- Keli žaidėjai vienoje treniruotėje su automatiniu keitimusi
- Statistika: progresas, silpnos vietos pagal rungtį ir atstumą, klaidų kryptys
- Knygelė: raktiniai žodžiai, ritualas, „jei nesiseka“ planas, įrašai po treniruočių, peržiūra prieš varžybas, 1 min. kvėpavimas
- Virtualus treneris „Karo“ (pokalbio mygtukas apačioje dešinėje): pokalbis su Claude, remiantis žaidėjo statistika ir knygele
- Spalvų temos: Plienas, Rožė, Šalavijas (su tamsia versija)
- Kalbos: lietuvių, anglų, prancūzų (parenkama pagal telefono kalbą, keičiama skiltyje „Žaidėjai“)
- Veikia be interneto, įsidiegia į telefono pradžios ekraną (PWA)
- Duomenys saugomi telefone; atsarginė kopija JSON, metimų eksportas CSV

## Struktūra

```
web/                 programėlė (tai, kas talpinama Netlify)
  index.html         visa programėlė
  i18n.js            vertimai (EN, FR); raktas – lietuviškas tekstas
  manifest.webmanifest
  sw.js              darbas be interneto (pakeiskite VERSION išleidžiant naują versiją)
  icons/
netlify.toml         Netlify nustatymai (publikuojamas aplankas: web)
netlify/functions/
  coach.mjs          virtualaus trenerio tarpininkas į Claude API (/api/coach)
```

## Talpinimas

Netlify svetainė (https://beautiful-kleicha-2b3367.netlify.app) prijungta prie šio projekto: kiekvienas pakeitimas `main` šakoje automatiškai atnaujina svetainę.

Kuri versija paskelbta, galima patikrinti atidarius `/sw.js` – eilutėje `const VERSION` matosi versijos numeris. Išleidžiant naują versiją, šį numerį reikia padidinti, kad telefonai pasiimtų atnaujinimą.

## Virtualaus trenerio nustatymai (Netlify → Environment variables)

- `ANTHROPIC_API_KEY` – Claude API raktas (būtinas)
- `COACH_CODE` – prieigos kodas; jei nustatytas, treneris veikia tik jį įvedus programėlėje
- `COACH_MODEL` – modelis (numatytasis `claude-sonnet-5`)

## Ateities planai

- Paskyros ir sinchronizavimas tarp įrenginių
- Android versija Google Play (Capacitor, `webDir: web`)
- Vaizdo įrašų analizė (svarbiausi kadrai, judesio matavimas)
