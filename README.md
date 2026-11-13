# colmeabhi.github.io

My portfolio. The whole site is generated from one file, `resume.json`.

## Update

1. Edit `resume.json`.
2. Run `./build.sh` (Python 3, no dependencies).
3. Commit and push.

## What gets built

| File | For |
|---|---|
| `index.html` | people |
| `profile.md`, `llms.txt`, `resume.json` | AI agents |
| `case-studies/*.html` and `.md` | long-form write-ups, from `case-studies.json` |
| `sitemap.xml` | search engines |

Photo: put a square image in `assets/` and rebuild.

Demos in the project write-ups live in `js/demos.js`; the small galaxy in the N-body project is `js/galaxy.js`.
Colours and fonts are set at the top of `css/style.css`.
