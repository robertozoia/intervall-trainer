# Intervall-Trainer

**▶ Online: https://robertozoia.github.io/intervall-trainer/**

Kleine Web-App zum Üben von Intervallen (Prime, Sekunde, Terz, Quarte, Tritonus, Quinte, Sexte, Septime, Oktave):

- **Lernen** – alle Intervalle mit Notenbeispiel, Klang und Merklied
- **Noten lesen** – markiertes Intervall in einer Melodie benennen und auf dem Klavier spielen
  - *Stufe 1*: Viertelnoten in einem Takt
  - *Stufe 2*: Taktarten, Rhythmen (Achtel, Halbe, punktierte Noten), Pausen, Hilfslinien (A3–C6), Tonarten bis 3 ♯/♭ und Vorzeichen
- **Hören** – gespieltes Intervall am Klang erkennen
- **Prüfung** – 10 gemischte Aufgaben mit Punkten
- **Statistik** – Trefferquote pro Intervall; schwierige Intervalle kommen öfter dran

Oberfläche auf Deutsch oder Spanisch (⚙️ Einstellungen).

## Lokal starten

Reine statische Seite, kein Build. Wegen der ES-Module braucht es einen kleinen Webserver:

```sh
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Tests der Musiktheorie-Logik (Node ≥ 18):

```sh
node --test tests/
```

## Veröffentlichen

GitHub Pages: Settings → Pages → Deploy from branch → `main` / `(root)`.

## Bibliotheken und Klänge

- [VexFlow](https://www.vexflow.com/) 4.2.5 (MIT) – `vendor/vexflow.min.js`
- [Tone.js](https://tonejs.github.io/) 14.7.77 (MIT) – `vendor/tone.min.js`
- Klavier-Samples: *Salamander Grand Piano* von Alexander Holm (CC BY 3.0), über die Tone.js-Audiosammlung – `samples/`
