#!/usr/bin/env python3
"""Build the site from resume.json.

Outputs (all committed, so GitHub Pages can serve them as-is):
  index.html   the page people see
  profile.md   the same content as Markdown, for AI agents
  llms.txt     short index for LLMs (https://llmstxt.org)
  sitemap.xml

Only the standard library is used. Run with ./build.sh or python3 build.py.
"""

import hashlib
import json
import re
import urllib.request
from datetime import date
from html import escape as e
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).parent
DATA = json.loads((ROOT / "resume.json").read_text(encoding="utf-8"))
B = DATA["basics"]
CASES = json.loads((ROOT / "case-studies.json").read_text(encoding="utf-8"))
SITE = DATA["meta"]["site"].rstrip("/")
TODAY = date.today()
MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


# ───────────────────────── helpers ─────────────────────────

def fmt_month(ym):
    """'2024-01' -> 'jan 2024'"""
    year, month = ym.split("-")
    return f"{MONTHS[int(month) - 1]} {year}"


def date_range(item):
    end = item.get("endDate")
    return f"{fmt_month(item['startDate'])} – {fmt_month(end) if end else 'present'}"


def year_range(item):
    """Education shows years only: '2025 – 2027'"""
    return f"{item['startDate'][:4]} – {item['endDate'][:4]}"


def fetch_contributions():
    """Snapshot of GitHub contributions for the last year -> data/contributions.json.

    The page tries the live API first and falls back to this snapshot, so a failed
    fetch here just keeps the previous snapshot.
    """
    out = ROOT / "data" / "contributions.json"
    url = f"https://github-contributions-api.jogruber.de/v4/{B['handle']}?y=last"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "portfolio-build"})
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = json.load(r)
        days = [[d["date"], d["count"]] for d in raw["contributions"]]
        out.parent.mkdir(exist_ok=True)
        out.write_text(json.dumps({"fetched": TODAY.isoformat(), "days": days}, separators=(",", ":")) + "\n")
        print(f"Fetched {len(days)} days of GitHub contributions")
    except Exception as err:  # offline, rate-limited, API gone: keep what we have
        print(f"Kept existing contributions snapshot ({err})")


def find_photo():
    """basics.image if that file exists, otherwise the first image found in assets/."""
    named = B.get("image")
    if named and (ROOT / named).is_file():
        return named
    for path in sorted((ROOT / "assets").glob("*")):
        if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            return path.relative_to(ROOT).as_posix()
    return None


PHOTO = find_photo()


def asset_version():
    """Short hash of the CSS and JS, appended as ?v= so browsers never show a stale copy."""
    blob = b"".join((ROOT / f).read_bytes() for f in
                    ["css/style.css", "js/main.js", "js/demos.js", "js/galaxy.js", "favicon.svg"])
    return hashlib.sha256(blob).hexdigest()[:8]


def icon(paths, cls=""):
    attr = f' class="{cls}"' if cls else ""
    return (f'<svg{attr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" '
            f'stroke-linecap="round" stroke-linejoin="round">{paths}</svg>')


ICONS = {
    "GitHub": '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    "LinkedIn": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 11v5M8 8v.01M12 16v-5M16 16v-3a2 2 0 0 0-4 0"/>',
    "Devpost": '<path d="M7 3h10l5 9-5 9H7l-5-9z"/><path d="M10 8h2.5a4 4 0 0 1 0 8H10z"/>',
    "Instagram": '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    "resume": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    "copy": '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    "download": '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    "arrow": '<path d="M7 17 17 7M8 7h9v9"/>',
    "right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "agent": '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4M9 13v1.5M15 13v1.5M2 13v2M22 13v2"/>',
    "work": '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    "projects": '<path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>',
    "education": '<path d="M12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>',
    "skills": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    "certs": '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
}


def section(sid, title, body):
    head = icon(ICONS[sid]).replace('stroke-width="1.75"', 'stroke-width="1.5"')
    return f'''
<section class="section" id="{sid}">
    <div class="section-head">
        <span class="tile">{head}</span>
        <h2>{e(title)}</h2>
    </div>
{body}
</section>'''


def bullets(items):
    if not items:
        return ""
    lis = "".join(f"<li>{e(i)}</li>" for i in items)
    return f'<ul class="bullets">{lis}</ul>'


def chips(words, plain=False):
    cls = "chips chips-plain" if plain else "chips"
    return f'<div class="{cls}">' + "".join(f"<span>{e(w)}</span>" for w in words) + "</div>"


# ───────────────────────── HTML sections ─────────────────────────

def render_hero():
    socials = "".join(
        f'<a href="{e(p["url"])}" target="_blank" rel="noopener me">{icon(ICONS[p["network"]])}{e(p["network"].lower())}</a>'
        for p in B["profiles"]
    )
    socials += f'<a href="{e(B["resume"])}" target="_blank" rel="noopener">{icon(ICONS["resume"])}resume</a>'
    intro = "".join(f"<p>{e(p)}</p>" for p in B["intro"])
    # The photo covers the monogram. It is only used once the file exists.
    photo = f'<img src="{e(PHOTO)}" alt="" width="160" height="160">' if PHOTO else ""
    return f'''
<header class="hero" id="home">
    <div class="hero-top">
        <div class="identity">
            <div class="avatar" aria-hidden="true">aa{photo}</div>
            <h1>{e(B["name"])}</h1>
            <p class="handle"><span>[</span>{e(B["handle"])}<span>]</span> <span class="say">{e(B["nickname"])} · /{e(B["pronunciation"])}/ · {e(B["location"]["region"])}</span></p>
        </div>
        <nav class="socials" aria-label="Profiles">{socials}</nav>
    </div>

    <p class="status"><i></i>{e(B["status"])}</p>

    <div class="intro">
        {intro}
        <p class="now"><span>Currently</span> {e(B["now"])}</p>
    </div>

    <div class="actions">
        <a class="btn btn-primary" href="mailto:{e(B["email"])}" data-hello="{e(B["email"])}"><span data-hello-label>Say hello</span></a>
        <button class="btn" type="button" data-copy="{e(B["email"])}">{icon(ICONS["copy"])}<span data-copy-label>Copy email</span></button>
        <a class="btn" href="{e(B["resume"])}" download>{icon(ICONS["download"])}Resume.pdf</a>
    </div>
</header>'''


def render_glance():
    github = next(p["url"] for p in B["profiles"] if p["network"] == "GitHub")
    return f'''
<section class="glance" aria-label="GitHub activity">
    <div class="strip" id="strip" data-user="{e(B["handle"])}" role="img" aria-label="GitHub contributions per week over the last year"></div>
    <p class="strip-caption"><span id="strip-count">–</span> contributions on <a class="link" href="{e(github)}" target="_blank" rel="noopener">GitHub</a> in the last year</p>
</section>'''


def render_work():
    rows = []
    for w in DATA["work"]:
        prog = f'<p class="progression">{e(w["progression"])}</p>' if w.get("progression") else ""
        rows.append(f'''
        <li class="row">
            <div class="row-top">
                <h3>{e(w["position"])} <span class="at">{e(w["name"])}</span></h3>
                <span class="date">{date_range(w)} · {e(w["location"].lower())}</span>
            </div>
            {prog}{bullets(w["highlights"])}
        </li>''')
    return section("work", "Work", f'    <ol class="rows">{"".join(rows)}\n    </ol>')


def render_projects():
    featured = [p for p in DATA["projects"] if p.get("featured")]
    rest = [p for p in DATA["projects"] if not p.get("featured")]

    cards = []
    for p in featured:
        badge = f'<span class="badge">{e(p["badge"])}</span>' if p.get("badge") else ""
        demo = f'<div class="demo" data-demo="{e(p["demo"])}"></div>' if p.get("demo") else ""
        links = f'<a class="proj-link" href="{e(p["url"])}" target="_blank" rel="noopener">{e(link_label(p["url"]))}{icon(ICONS["arrow"], "arrow")}</a>'
        if p.get("caseStudy"):
            links = (f'<a class="proj-link proj-link-primary" href="case-studies/{e(p["caseStudy"])}.html">Read the case study'
                     f'{icon(ICONS["right"], "arrow")}</a>' + links)
        cards.append(f'''
        <article class="proj">
            <div class="proj-top">
                <h3>{e(p["title"])}</h3>{badge}
            </div>
            <p>{e(p["description"])}</p>
            {bullets(p.get("highlights"))}
            {demo}
            {chips(p["keywords"])}
            <div class="proj-links">{links}</div>
        </article>''')

    more = []
    for p in rest:
        badge = f' <span class="badge badge-quiet">{e(p["badge"])}</span>' if p.get("badge") else ""
        inner = f'''<span class="more-name">{e(p["title"])}{badge}</span>
            <span class="more-desc">{e(p["description"])}</span>'''
        if p.get("url"):
            more.append(f'''
        <a class="more-row" href="{e(p["url"])}" target="_blank" rel="noopener">
            {inner}
            {icon(ICONS["arrow"], "arrow")}
        </a>''')
        else:
            more.append(f'''
        <div class="more-row">
            {inner}
        </div>''')

    body = f'''    <div class="projects">{"".join(cards)}
    </div>

    <h3 class="sub-head">More things I've built</h3>
    <div class="more">{"".join(more)}
    </div>'''
    return section("projects", "Projects", body)


def link_label(url):
    return "Devpost" if "devpost.com" in url else "Code on GitHub"


def inline(text):
    """Tiny inline formatter for case-study text: `code` and **bold**."""
    text = e(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)


def plain(text):
    return text.replace("**", "")


def render_block(block):
    if isinstance(block, str):
        return f"<p>{inline(block)}</p>"
    if "list" in block:
        return '<ul class="bullets">' + "".join(f"<li>{inline(i)}</li>" for i in block["list"]) + "</ul>"
    if "code" in block:
        return f'<pre class="code"><code>{e(block["code"])}</code></pre>'
    if "note" in block:
        return f'<p class="note">{inline(block["note"])}</p>'
    if "demo" in block:
        return f'<div class="demo demo-boxed" data-demo="{e(block["demo"])}"></div>'
    if "diagram" in block:
        svg = (ROOT / "case-studies" / "diagrams" / f'{block["diagram"]}.svg').read_text(encoding="utf-8")
        return f'<figure class="diagram">{svg}<figcaption>{inline(block.get("caption", ""))}</figcaption></figure>'
    if "table" in block:
        head = "".join(f"<th>{inline(h)}</th>" for h in block["table"]["head"])
        rows = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in block["table"]["rows"])
        return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'
    raise ValueError(f"unknown case-study block: {block}")


def render_case(case):
    project = next(p for p in DATA["projects"] if p["name"] == case["project"])
    meta = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in case["meta"])
    sections = "".join(
        f'<section class="case-section"><h2>{e(sec["heading"])}</h2>' + "".join(render_block(b) for b in sec["body"]) + "</section>"
        for sec in case["sections"])
    others = "".join(
        f'<a class="more-row" href="{e(c["slug"])}.html"><span class="more-name">{e(c["title"])}</span>'
        f'<span class="more-desc">{e(c["subtitle"])}</span>{icon(ICONS["right"], "arrow")}</a>'
        for c in CASES if c["slug"] != case["slug"])
    return f'''
<article class="case">
    <a class="back" href="../#projects">{icon(ICONS["left"])}{e(B["name"])}</a>
    <p class="eyebrow">Case study</p>
    <h1>{e(case["title"])}</h1>
    <p class="case-sub">{e(case["subtitle"])}</p>
    <dl class="case-meta">{meta}</dl>
    <div class="actions">
        <a class="btn btn-primary" href="{e(project["url"])}" target="_blank" rel="noopener">Code on GitHub</a>
        <a class="btn" href="{e(case["slug"])}.md">Read as Markdown</a>
    </div>
    <div class="tldr"><span>In short</span><p>{inline(case["tldr"])}</p></div>
    {sections}
</article>

<section class="section case-next">
    <h3 class="sub-head">Another case study</h3>
    <div class="more">{others}</div>
</section>

<footer class="foot">
    <div class="foot-row">
        <a href="../">© {TODAY.year} {e(B["name"].lower())}</a>
        <a href="mailto:{e(B["email"])}">{e(B["email"])}</a>
    </div>
</footer>'''


def case_markdown(case):
    project = next(p for p in DATA["projects"] if p["name"] == case["project"])
    L = [f"# {case['title']}", "", f"> {case['subtitle']}", "",
         f"Case study by {B['name']} ({SITE}). Code: {project['url']}", ""]
    L += [f"- **{k}:** {v}" for k, v in case["meta"]]
    L += ["", f"**In short:** {case['tldr']}", ""]
    for sec in case["sections"]:
        L += [f"## {sec['heading']}", ""]
        for b in sec["body"]:
            if isinstance(b, str):
                L += [b, ""]
            elif "list" in b:
                L += [f"- {i}" for i in b["list"]] + [""]
            elif "code" in b:
                L += ["```", b["code"], "```", ""]
            elif "note" in b:
                L += [f"> Note: {b['note']}", ""]
            elif "diagram" in b and b.get("caption"):
                L += [f"_Diagram: {b['caption']}_", ""]
            elif "table" in b:
                L += ["| " + " | ".join(b["table"]["head"]) + " |", "|" + "---|" * len(b["table"]["head"])]
                L += ["| " + " | ".join(r) + " |" for r in b["table"]["rows"]] + [""]
    return "\n".join(L)


def render_education():
    rows = []
    for ed in DATA["education"]:
        rows.append(f'''
        <li class="row">
            <div class="row-top">
                <h3>{e(ed["studyType"])}, {e(ed["area"])} <span class="at">{e(ed["institution"])}</span></h3>
                <span class="date">{year_range(ed)}</span>
            </div>
            {bullets(ed["highlights"])}
        </li>''')
    return section("education", "Education", f'    <ol class="rows">{"".join(rows)}\n    </ol>')


def render_skills():
    rows = "".join(
        f'''
        <div class="skill">
            <dt>{e(s["name"])}</dt>
            <dd>{chips(s["keywords"], plain=True)}</dd>
        </div>''' for s in DATA["skills"])
    return section("skills", "Skills", f'    <dl class="skills">{rows}\n    </dl>')


def render_certs():
    items = "".join(
        f'<li><span class="cert-name">{e(c["name"])}</span><span class="date">{e(c["issuer"].lower())}</span></li>'
        for c in DATA["certificates"])
    items += "".join(
        f'<li><span class="cert-name">{e(a["title"])}</span><span class="date">{e(a.get("awarder", "").lower())}</span></li>'
        for a in DATA["awards"])
    return section("certs", "Certifications & awards", f'    <ul class="certs">{items}</ul>')


def render_contact():
    linkedin = next(p["url"] for p in B["profiles"] if p["network"] == "LinkedIn")
    return f'''
<section class="section chat" id="contact" aria-label="Contact">
    <p class="bubble them">nice work! what's the best way to reach you?</p>
    <p class="bubble me">thanks! email is the fastest</p>
    <p class="bubble me">
        write to <button type="button" class="link" data-copy="{e(B["email"])}"><span data-copy-label>{e(B["email"])}</span></button>
        or ping me on <a class="link" href="{e(linkedin)}" target="_blank" rel="noopener">linkedin</a>
    </p>
    <p class="bubble them">perfect, talk soon</p>
    <p class="bubble me">looking forward to it</p>
</section>

<footer class="foot">
    <blockquote>"{e(DATA["quote"])}"</blockquote>
    <nav class="foot-agents" aria-label="Machine-readable versions">
        <span class="foot-agents-label">{icon(ICONS["agent"])}for agents</span>
        <a href="llms.txt">/llms.txt</a>
        <a href="profile.md">/profile.md</a>
        <a href="resume.json">/resume.json</a>
    </nav>
    <div class="foot-row">
        <span>© {TODAY.year} {e(B["name"].lower())}</span>
        <span>last updated: {TODAY.strftime("%B %Y").lower()}</span>
    </div>
</footer>'''


def json_ld():
    ld = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": B["name"],
        "alternateName": B["nickname"],
        "jobTitle": B["label"],
        "description": B["summary"],
        "email": B["email"],
        "url": SITE + "/",
        "address": {"@type": "PostalAddress", "addressRegion": B["location"]["region"], "addressCountry": "US"},
        "sameAs": [p["url"] for p in B["profiles"]],
        **({"image": f"{SITE}/{PHOTO}"} if PHOTO else {}),
        "alumniOf": [{"@type": "CollegeOrUniversity", "name": ed["institution"]} for ed in DATA["education"]],
        "hasCredential": [
            {"@type": "EducationalOccupationalCredential", "name": c["name"]} for c in DATA["certificates"]
        ],
        "knowsAbout": sorted({k for s in DATA["skills"] for k in s["keywords"]}),
    }
    return json.dumps(ld, indent=4, ensure_ascii=False)


def page(content, *, title, description, canonical, root="", og_type="website",
         json_ld_text="{}", alternate="", extra_js="", body_class=""):
    ask = quote(f"Read {SITE}/llms.txt and {SITE}/profile.md, then tell me about "
                f"{B['name']}: what he has built, what he is good at, and which roles he would fit.")
    html = (ROOT / "template.html").read_text(encoding="utf-8")
    for key, value in {
        "{{TITLE}}": e(title), "{{DESCRIPTION}}": e(description), "{{CANONICAL}}": canonical,
        "{{OGTYPE}}": og_type, "{{ALTERNATE}}": alternate, "{{EXTRA_JS}}": extra_js,
        "{{BODYCLASS}}": body_class, "{{ROOT}}": root,
        "{{EMAIL}}": e(B["email"]), "{{SITE}}": SITE, "{{ASK}}": ask,
        "{{JSONLD}}": json_ld_text, "{{CONTENT}}": content, "{{V}}": asset_version(),
    }.items():
        html = html.replace(key, value)
    return html


def build_html():
    content = "".join([
        render_hero(), render_glance(), render_work(), render_projects(),
        render_education(), render_skills(), render_certs(), render_contact(),
    ])
    canvas = '<canvas class="galaxy" id="galaxy" aria-hidden="true"></canvas>'
    return page(canvas + content, title=f"{B['name']} | {B['label']}", description=B["summary"],
                canonical=f"{SITE}/", og_type="profile", json_ld_text=json_ld(),
                extra_js=f'\n    <script src="js/galaxy.js?v={asset_version()}"></script>')


def build_case(case):
    url = f"{SITE}/case-studies/{case['slug']}.html"
    ld = json.dumps({
        "@context": "https://schema.org", "@type": "TechArticle", "headline": case["title"],
        "description": case["subtitle"], "url": url,
        "author": {"@type": "Person", "name": B["name"], "url": SITE + "/"},
    }, indent=4, ensure_ascii=False)
    alt = (f'\n    <link rel="alternate" type="text/markdown" href="{SITE}/case-studies/{case["slug"]}.md" '
           f'title="This case study (Markdown)">')
    return page(render_case(case), title=f"{case['title']} | {B['name']}", description=plain(case["subtitle"]),
                canonical=url, root="../", og_type="article", json_ld_text=ld, alternate=alt, body_class="case-page")


# ───────────────────────── Markdown for agents ─────────────────────────

def build_markdown():
    L = [
        f"# {B['name']}",
        "",
        f"> {B['summary']}",
        "",
        f"- **Role:** {B['label']}",
        f"- **Status:** {B['status']}",
        f"- **Location:** {B['location']['region']}",
        f"- **Email:** {B['email']}",
        f"- **Website:** {SITE}",
        f"- **Resume (PDF):** {SITE}/{B['resume']}",
    ]
    L += [f"- **{p['network']}:** {p['url']}" for p in B["profiles"]]
    L += ["", f"_Goes by {B['nickname']} (/{B['pronunciation']}/). Last updated {TODAY.isoformat()}. "
              f"Structured version: {SITE}/resume.json_", ""]

    L += ["## Experience", ""]
    for w in DATA["work"]:
        L += [f"### {w['position']}, {w['name']}", f"_{date_range(w)} · {w['location']}_", ""]
        if w.get("progression"):
            L += [f"Progression: {w['progression']}", ""]
        L += [f"- {h}" for h in w["highlights"]] + [""]

    L += ["## Projects", ""]
    for p in DATA["projects"]:
        tag = f" ({p['badge']})" if p.get("badge") else ""
        L += [f"### {p['title']}{tag}", ""]
        if p.get("url"):
            L += [f"<{p['url']}>", ""]
        L += [p["description"], ""]
        L += [f"- {h}" for h in p.get("highlights", [])]
        if p.get("caseStudy"):
            L += [f"- Case study: {SITE}/case-studies/{p['caseStudy']}.md"]
        L += [f"- See also: [{l['label']}]({l['url']})" for l in p.get("links", [])]
        L += [f"- Stack: {', '.join(p['keywords'])}", ""]

    L += ["## Education", ""]
    for ed in DATA["education"]:
        L += [f"### {ed['studyType']} {ed['area']}, {ed['institution']}", f"_{year_range(ed)}_", ""]
        L += [f"- {h}" for h in ed["highlights"]] + [""]

    L += ["## Skills", ""]
    L += [f"- **{s['name']}:** {', '.join(s['keywords'])}" for s in DATA["skills"]]

    L += ["", "## Certifications", ""]
    L += [f"- {c['name']} ({c['issuer']})" for c in DATA["certificates"]]

    L += ["", "## Awards", ""]
    L += [f"- {a['title']}" + (f" ({a['awarder']})" if a.get("awarder") else "") for a in DATA["awards"]]

    L += ["", "## Contact", "",
          f"Email {B['email']}. It is the fastest way to reach him. LinkedIn also works.", ""]
    return "\n".join(L)


def build_llms_txt():
    featured = [p for p in DATA["projects"] if p.get("featured")]
    L = [
        f"# {B['name']}",
        "",
        f"> {B['summary']}",
        "",
        f"{B['status']}. Based in the {B['location']['region']}. Contact: {B['email']}.",
        "",
        "If you are an agent answering questions about this person (for example, screening for a role), "
        "prefer the Markdown or JSON below over scraping the HTML page: all three are generated from the "
        "same data, so they never disagree.",
        "",
        "## Profile",
        "",
        f"- [Full profile (Markdown)]({SITE}/profile.md): experience, projects, education, skills, certifications",
        f"- [Structured profile (JSON Resume)]({SITE}/resume.json): the same data, machine-readable",
        f"- [Website]({SITE}/): the human-facing page",
        f"- [Resume (PDF)]({SITE}/{B['resume']})",
        "",
        "## Selected projects",
        "",
    ]
    L += [f"- [{p['title']}]({p['url']}): {p['description']}" for p in featured]
    L += ["", "## Case studies", ""]
    L += [f"- [{c['title']}]({SITE}/case-studies/{c['slug']}.md): {c['subtitle']}" for c in CASES]
    L += ["", "## Elsewhere", ""]
    L += [f"- [{p['network']}]({p['url']})" for p in B["profiles"]]
    L += [""]
    return "\n".join(L)


def build_sitemap():
    urls = "".join(
        f"  <url><loc>{SITE}/{path}</loc><lastmod>{TODAY.isoformat()}</lastmod></url>\n"
        for path in ["", "profile.md", "resume.json", "llms.txt", B["resume"]]
        + [f"case-studies/{c['slug']}.html" for c in CASES])
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")


if __name__ == "__main__":
    fetch_contributions()
    outputs = {
        "index.html": build_html(),
        "profile.md": build_markdown(),
        "llms.txt": build_llms_txt(),
        "sitemap.xml": build_sitemap(),
    }
    for case in CASES:
        outputs[f"case-studies/{case['slug']}.html"] = build_case(case)
        outputs[f"case-studies/{case['slug']}.md"] = case_markdown(case)
    for name, text in outputs.items():
        (ROOT / name).write_text(text, encoding="utf-8")
        print(f"Built {name}")
