# Nakae Dole E-Learning

Static web app for GitHub Pages:

- Main page: `index.html`
- Admin page: `admin/index.html`
- Admin password: `admin0`
- Footer text is embedded in both pages.
- Logo is loaded from `https://img2.pic.in.th/.5767ec9fdaa5699b.png`

## GitHub Pages upload

Upload these files and folders to the target repository:

- `index.html`
- `404.html`
- `admin/`
- `assets/`

Then enable GitHub Pages from the repository settings. For a repository under `https://github.com/nakae-dole`, the public site will normally be:

```text
https://nakae-dole.github.io/<repository-name>/
```

If the repository name is `nakae-dole.github.io`, the public site will be:

```text
https://nakae-dole.github.io/
```

## Data behavior

The app tries to sync with this Google Apps Script URL:

```text
https://script.google.com/macros/s/AKfycbwqcwrcYkXZlsA5zPHvFphLGCkECNhgmSt2aeHUCSmuiWvbx4ItNUpu_1m2AeOQqNlW/exec
```

Requests are sent as `POST` with a JSON string body using `Content-Type: text/plain;charset=utf-8`.

Expected actions:

- `listLessons` returns `{ "ok": true, "lessons": [...] }`
- `addLesson` accepts `{ "lesson": {...} }`
- `satisfaction` accepts `{ "lessonId": "..." }`
- `listFeedback` returns `{ "ok": true, "feedback": [...] }`
- `addFeedback` accepts `{ "feedback": {...} }`

If the Apps Script endpoint is unavailable or does not match this contract, the app falls back to browser `localStorage` so the static site can still be previewed and tested.

## Pic.in.th upload

The admin page uploads directly from the browser with:

```text
POST https://pic.in.th/api/1/upload
Header: X-API-Key
Multipart field: source
```

The API key is stored only in the current browser when the checkbox is selected.
