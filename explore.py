"""
Explore the eAIP HTML structure. Run from the project root:
    python explore.py
It writes explore_out.txt. Paste that file's content back.
"""
import re
from pathlib import Path
from bs4 import BeautifulSoup

BASE = Path(r"data\raw\2026-10-01\eAIP_Package_10-2026\eAIP_Main\html\eAIP")
OUT = Path("explore_out.txt")
MAX = 3500  # max chars of HTML per snippet


def load(name):
    text = (BASE / name).read_text(encoding="utf-8", errors="replace")
    return BeautifulSoup(text, "lxml")


def clean(tag):
    html = str(tag)
    html = re.sub(r"\s+", " ", html)
    return html[:MAX]


lines = []


def log(s=""):
    lines.append(s)


# ---------- EBBR ----------
soup = load("EB-AD-2.EBBR-en-GB.html")
log("=== EB-AD-2.EBBR-en-GB.html ===")
log(f"tables: {len(soup.find_all('table'))}")

ids = []
for t in soup.find_all(id=True):
    if re.search(r"AD-2\.\d+", t["id"]) and t["id"] not in ids:
        ids.append(t["id"])
log(f"section-like ids ({len(ids)}), first 40:")
for i in ids[:40]:
    log("  " + i)

for key in ["2.2", "2.3", "2.12", "2.13"]:
    log()
    log(f"--- element(s) with id containing 'AD-{key}' ---")
    found = [t for t in soup.find_all(id=True) if re.search(rf"AD-{re.escape(key)}$", t["id"])]
    if not found:
        log("  none found")
    for t in found[:1]:
        log(f"  tag={t.name} id={t['id']} class={t.get('class')}")
        log(clean(t))

# ---------- ENR 4.1 ----------
soup = load("EB-ENR-4.1-en-GB.html")
log()
log("=== EB-ENR-4.1-en-GB.html ===")
tables = soup.find_all("table")
log(f"tables: {len(tables)}")
if tables:
    rows = tables[0].find_all("tr")
    log(f"rows in first table: {len(rows)}")
    for r in rows[:4]:
        log(clean(r))

# ---------- ENR 4.4 ----------
soup = load("EB-ENR-4.4-en-GB.html")
log()
log("=== EB-ENR-4.4-en-GB.html ===")
tables = soup.find_all("table")
log(f"tables: {len(tables)}")
if tables:
    rows = tables[0].find_all("tr")
    log(f"rows in first table: {len(rows)}")
    for r in rows[:4]:
        log(clean(r))

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {OUT.resolve()} ({len(lines)} lines)")
