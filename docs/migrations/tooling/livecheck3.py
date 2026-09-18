#!/usr/bin/env python3
"""Production checks for Phase B batch 2 plus batch 1 redirect recheck.
Usage: livecheck2.py <post-status tsv> <batch2 mapping tsv> <batch1 mapping tsv> <out json>"""
import sys, re, json, urllib.request, urllib.error, concurrent.futures as cf
from html import unescape

SITE = "https://kenashe.ai"
status_rows = [l.rstrip("\n").split("\t") for l in open(sys.argv[1]) if l.strip() and not l.startswith("slug")]
published = [r[0] for r in status_rows if r[1] == "False"]
drafts = [r[0] for r in status_rows if r[1] == "True"]
map2 = [l.rstrip("\n").split("\t") for l in open(sys.argv[2]) if not l.startswith("#")]
priors = [[l.rstrip("\n").split("\t") for l in open(p) if not l.startswith("#")] for p in sys.argv[3:-1]]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
def req(url, method="GET", follow=True):
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    r = urllib.request.Request(url, method=method, headers={"User-Agent": "kenashe-livecheck/1.0", "Cache-Control": "no-cache"})
    try:
        with opener.open(r, timeout=60) as resp: return resp.status, dict(resp.headers), (resp.read() if method == "GET" else b"")
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), b""
def head(url):
    st, h, _ = req(url, "HEAD"); return st, h.get("Content-Type", ""), h.get("Content-Length", "")

sitemap = req(SITE + "/sitemap-0.xml")[2].decode("utf-8", "replace")
out = {"published": [], "drafts": [], "images": [], "og": [], "redirects2": [], "redirects1": [], "spot": []}
img_urls = set()

def check_published(slug):
    url = f"{SITE}/blog/{slug}/"; st, h, body = req(url)
    rec = {"slug": slug, "url": url, "status": st, "in_sitemap": f"/blog/{slug}/" in sitemap, "problems": []}
    if st != 200: rec["problems"].append(f"HTTP {st}"); return rec, set()
    if not rec["in_sitemap"]: rec["problems"].append("missing from sitemap")
    html = body.decode("utf-8", "replace")
    refs = set(re.findall(r'<img[^>]+\bsrc="([^"]+)"', html))
    for ss in re.findall(r'\bsrcset="([^"]+)"', html):
        for c in ss.split(","):
            u = c.strip().split(" ")[0]
            if u: refs.add(u)
    refs = {unescape(u) for u in refs if "/_astro/" in u}
    if re.search(r'/_astro/[^"\s]+\.png', html): rec["problems"].append("page references a .png asset")
    imgs = [i for i in re.findall(r"<img[^>]+>", html) if "/_astro/" in i]
    rec["img_tags"] = len(imgs)
    for i in imgs:
        if not re.search(r'\bwidth="\d+"', i) or not re.search(r'\bheight="\d+"', i): rec["problems"].append("img without width/height")
        if 'alt="' not in i: rec["problems"].append("img without alt")
    og = re.search(r'property="og:image" content="([^"]+)"', html); rec["og_image"] = og.group(1) if og else None
    arts = []
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try: d = json.loads(m.group(1))
        except Exception: rec["problems"].append("ld+json parse error"); continue
        for n in d.get("@graph", [d]):
            if n.get("@type") in ("Article", "BlogPosting", "NewsArticle"): arts.append(n.get("image"))
    rec["schema_image"] = arts[0] if arts else None
    return rec, refs

def check_draft(slug):
    url = f"{SITE}/blog/{slug}/"; st, _, _ = req(url, "HEAD")
    rec = {"slug": slug, "status": st, "in_sitemap": f"/blog/{slug}/" in sitemap, "problems": []}
    if st != 404: rec["problems"].append(f"draft returned {st}")
    if rec["in_sitemap"]: rec["problems"].append("draft in sitemap")
    return rec

def check_og(rec):
    o = {"slug": rec["slug"], "og": rec.get("og_image"), "schema": rec.get("schema_image"), "problems": []}
    if not o["og"]: o["problems"].append("no og:image"); return o
    fallback = o["og"].endswith("/og-default.png")
    o["fallback"] = fallback
    if not fallback and not o["og"].endswith(".webp"): o["problems"].append("og:image not webp")
    st, ct, cl = head(o["og"]); o.update(og_status=st, og_type=ct, og_bytes=cl)
    if st != 200 or not ct.startswith("image/") or (not fallback and ct != "image/webp"): o["problems"].append(f"og {st} {ct}")
    if o["schema"] != o["og"]: o["problems"].append("schema image differs from og:image")
    return o

def check_img(u):
    full = u if u.startswith("http") else SITE + u; st, ct, cl = head(full)
    return {"url": full, "status": st, "type": ct, "bytes": cl, "ok": st == 200 and ct.startswith("image/")}

def check_redirect(row):
    old, new, served, role, slug = row
    o = {"old": old, "expected": new, "problems": []}
    if served != "200": o["skipped"] = True; return o
    st, h, _ = req(old, "HEAD", follow=False); loc = h.get("Location", ""); o.update(status=st, location=loc)
    if st != 308: o["problems"].append(f"status {st}")
    if loc not in (new, new.replace(SITE, "")): o["problems"].append(f"location {loc}")
    st2, ct2, cl2 = head(new); o.update(dest_status=st2, dest_type=ct2, dest_bytes=cl2)
    if st2 != 200 or ct2 != "image/webp": o["problems"].append(f"destination {st2} {ct2}")
    return o

def spot(path):
    st, h, body = req(SITE + path); html = body.decode("utf-8", "replace")
    return {"path": path, "status": st, "png_assets": len(re.findall(r'/_astro/[^"\s]+\.png', html)), "imgs": len(re.findall(r"<img", html)), "ok": st == 200}

with cf.ThreadPoolExecutor(12) as ex:
    for rec, refs in ex.map(check_published, published): out["published"].append(rec); img_urls |= refs
    out["drafts"] = list(ex.map(check_draft, drafts))
    out["og"] = list(ex.map(check_og, out["published"]))
with cf.ThreadPoolExecutor(16) as ex:
    out["images"] = list(ex.map(check_img, sorted(img_urls)))
    out["redirects2"] = list(ex.map(check_redirect, map2))
    out["redirects1"] = [r for m in priors for r in ex.map(check_redirect, m)]
out["spot"] = [spot(p) for p in ["/", "/blog/", "/writing/", "/newsroom/", "/building/", "/blog/2026-09-17-ai-citations-are-not-just-a-source-order-game/"]]
json.dump(out, open(sys.argv[-1], "w"), indent=1)

P = out["published"]; D = out["drafts"]; I = out["images"]; O = out["og"]
R2 = [r for r in out["redirects2"] if not r.get("skipped")]; R1 = [r for r in out["redirects1"] if not r.get("skipped")]
print(f"published: {len(P)} checked, {sum(1 for r in P if r['status']==200)} HTTP 200, {sum(1 for r in P if r['in_sitemap'])} in sitemap, {sum(1 for r in P if r['problems'])} with problems, {sum(r.get('img_tags',0) for r in P)} <img> tags")
print(f"drafts: {len(D)} checked, {sum(1 for r in D if r['status']==404)} HTTP 404, {sum(1 for r in D if r['in_sitemap'])} in sitemap, {sum(1 for r in D if r['problems'])} with problems")
print(f"image variants: {len(I)} unique URLs, {sum(1 for r in I if r['ok'])} ok, {sum(1 for r in I if not r['ok'])} failed")
print(f"og/schema: {len(O)} posts, {sum(1 for r in O if not r['problems'])} ok, {sum(1 for r in O if r['problems'])} with problems, og-default fallbacks: {sum(1 for r in O if r.get('fallback'))}")
print(f"new batch redirects: {len(R2)} checked, {sum(1 for r in R2 if not r['problems'])} ok, {sum(1 for r in R2 if r['problems'])} failed")
print(f"prior batches redirects: {len(R1)} checked, {sum(1 for r in R1 if not r['problems'])} ok, {sum(1 for r in R1 if r['problems'])} failed")
print("spot:", [(s['path'], s['status'], f"png={s['png_assets']}", f"imgs={s['imgs']}") for s in out['spot']])
for sect in ("published", "drafts", "og", "images", "redirects2", "redirects1", "spot"):
    for r in out[sect]:
        bad = r.get("problems") or (sect == "images" and not r["ok"]) or (sect == "spot" and (not r["ok"] or r["png_assets"]))
        if bad: print("  FAIL", sect, r.get("url") or r.get("old") or r.get("slug") or r.get("path"), r.get("problems") or r)
