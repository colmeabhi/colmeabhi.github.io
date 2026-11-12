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

Demos in the project cards live in `js/demos.js`; the galaxy behind the header is `js/galaxy.js`.
