# 💖 Romantic Birthday Website

A premium, interactive romantic birthday surprise website built with **HTML5, CSS3 & Vanilla JavaScript**.

## 🌸 Features

| Step | Page | Highlights |
|------|------|-----------|
| 1 | Countdown | Live countdown to midnight birthday, floating hearts, skip button |
| 2 | Hey My Love | Animated greeting, YES/NO buttons (NO runs away!) |
| 3 | Catch Butterflies | 8 animated SVG butterflies to catch, glass jar game |
| 4 | Birthday Wishes | Balloon & rose decorations, romantic card, NO still flees |
| 5 | Final — I Love You | Glowing heart, moonlight effect, forever message |

## 🎵 Adding Background Music

1. Place your `.mp3` file in `assets/music/`
2. Rename it to `background.mp3` **or** update the `<source src="...">` in `index.html`

## 🗓️ Changing the Birthday Date

Open `script.js` and update:
```js
BIRTHDAY: new Date(2026, 6, 12, 0, 0, 0),
//                  year  month-1  day  H  M  S
```

## 💌 Changing the Name

Open `index.html` and change `My Love` in the birthday heading:
```html
<span class="name-highlight">My Love</span>
```

## 📁 Project Structure

```
birthday-website/
├── index.html        ← All 5 steps
├── style.css         ← Full design system
├── script.js         ← All interactivity & logic
└── assets/
    ├── music/        ← Place background.mp3 here
    ├── images/       ← Optional custom images
    ├── icons/        ← Optional custom icons
    └── butterflies/  ← Reserved for future use
```

## 🚀 How to Open

Just double-click `index.html` — no server needed!

---
Made with ❤️ for a very special person.
