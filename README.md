# colmeabhi.github.io

Portfolio site. Everything is generated from one file.

```
resume.json ──► build.py ──► index.html    the page people see
(edit this)                  profile.md    same content as Markdown, for AI agents
                             llms.txt      short index for LLMs (llmstxt.org)
                             sitemap.xml
```

## Updating

1. Edit `resume.json` (it follows the [JSON Resume](https://jsonresume.org/schema) schema, plus a few extra fields such as `featured` and `badge` on projects).
2. Run `./build.sh` (needs only Python 3).
3. Commit the regenerated files.

Layout lives in `template.html` and `build.py`, styles in `css/style.css`, behaviour in `js/main.js`.
The month-by-month timeline strip is driven by the `PERIODS` list in `js/main.js`.

## For agents

`/llms.txt`, `/profile.md` and `/resume.json` are served next to the page and linked from the
"agents" menu, `<link rel="alternate">` tags, `robots.txt` and the sitemap.
