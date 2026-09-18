#!/usr/bin/env python3
"""Rewrite MDX references from .png to .webp for a set of post slugs, and verify.

Usage: rewrite_refs.py <repoRoot> <slugs file> [--apply]
Without --apply it only reports what would change. Checks, per slug:
  - every ../../assets/blog/<slug>/*.png reference in the MDX has a matching .webp file on disk
  - after rewrite no .png reference to that slug remains
  - alt text, frontmatter fields, and all other bytes are unchanged (only the extension moves)
"""
import re, sys, os, pathlib

repo = pathlib.Path(sys.argv[1]); slugs = [s.strip() for s in open(sys.argv[2]) if s.strip()]
apply = "--apply" in sys.argv
problems = []; changed = 0; refs = 0
for slug in slugs:
    mdx = repo / "src/content/blog" / f"{slug}.mdx"
    if not mdx.exists(): problems.append(f"{slug}: mdx missing"); continue
    text = mdx.read_text(encoding="utf-8")
    pat = re.compile(rf"(\.\./\.\./assets/blog/{re.escape(slug)}/(hero|inline-\d+))\.png")
    hits = pat.findall(text)
    for full, _ in hits:
        webp = repo / "src/assets/blog" / slug / (full.rsplit("/", 1)[1] + ".webp")
        if not webp.exists(): problems.append(f"{slug}: missing {webp.name}")
    new = pat.sub(r"\1.webp", text)
    refs += len(hits)
    if new != text:
        # only extensions may differ
        if re.sub(r"\.webp\b", ".png", new) != text: problems.append(f"{slug}: unexpected diff")
        if re.search(rf"assets/blog/{re.escape(slug)}/[^)\n]*\.png", new): problems.append(f"{slug}: png ref remains")
        changed += 1
        if apply: mdx.write_text(new, encoding="utf-8")
print(f"slugs={len(slugs)} mdx_changed={changed} refs_rewritten={refs} problems={len(problems)} applied={apply}")
for p in problems: print("  PROBLEM", p)
sys.exit(1 if problems else 0)
