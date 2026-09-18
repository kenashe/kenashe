#!/usr/bin/env bash
# Phase B batch assembly, hardened after the batch 2 and batch 4 slips (a step that ran from the
# wrong directory inside an `&&` list did not stop `set -e`, so a commit was created without its
# redirects and mapping). Rules enforced here:
#   1. Every step runs from an explicit absolute directory; no reliance on the caller's cwd.
#   2. Dependencies (node, python3, sharp, rollup, tool scripts, input lists) are checked up front.
#   3. Every step is followed by an explicit exit-status check; any failure aborts before `git commit`.
#   4. Mapping, redirect, and content validation MUST pass before the commit is created.
#   5. This script never pushes. Pushing and opening the PR stay a separate, credentialed step.
#
# Usage: prepare_batch.sh <batch-number> <start-line> <end-line> [--dry-run]
#   e.g. prepare_batch.sh 5 401 500
# Environment overrides (for tests): REPO, TOOLS, OUTDIR, WORK.
set -Eeuo pipefail
IFS=$'\n\t'

die() { echo "ABORT [$1]: $2" >&2; exit "${3:-1}"; }
step() { echo "== $*"; }

N="${1:?batch number}"; START="${2:?start line}"; END="${3:?end line}"; DRY="${4:-}"
NN=$(printf '%02d' "$N")
REPO="${REPO:-/tmp/kfull}"
TOOLS="${TOOLS:-/agent/workspace/phaseb}"
OUTDIR="${OUTDIR:-$TOOLS/out}"
WORK="${WORK:-/tmp/batch${N}}"

# ---- 1. Dependency and location checks (fail before touching anything) ---------------------
step "checks"
[ -d "$REPO/.git" ] || die deps "not a git repo: $REPO"
[ -d "$TOOLS" ] || die deps "tools dir missing: $TOOLS"
for f in convert.mjs oldurls.mjs rewrite_refs.py mapping.generic.mjs; do [ -f "$TOOLS/$f" ] || die deps "tool script missing: $TOOLS/$f"; done
command -v node >/dev/null || die deps "node not found"
command -v python3 >/dev/null || die deps "python3 not found"
( cd "$TOOLS" && node -e "require.resolve('sharp'); require.resolve('rollup')" ) 2>/dev/null || die deps "sharp/rollup not installed in $TOOLS (run: cd $TOOLS && npm install sharp@0.33 rollup)"
mkdir -p "$OUTDIR" "$WORK"
( cd "$REPO" && [ -z "$(git status --porcelain)" ] ) || die repo "working tree not clean in $REPO"
( cd "$REPO" && git fetch -q origin master && git checkout -q master && git reset -q --hard origin/master ) || die repo "could not sync master"
BASE=$(cd "$REPO" && git rev-parse HEAD); echo "$BASE" > "$WORK/rollback_sha"
echo "base master: $BASE"

# ---- 2. Selection and pre-change status ------------------------------------------------------
step "selection"
( cd "$REPO" && ls src/assets/blog | sort | sed -n "${START},${END}p" ) > "$WORK/slugs.txt"
[ "$(wc -l < "$WORK/slugs.txt")" -eq $((END-START+1)) ] || die select "expected $((END-START+1)) slugs, got $(wc -l < "$WORK/slugs.txt")"
for i in $(seq 1 $((N-1))); do
  prev="/tmp/batch${i}/slugs.txt"; [ -f "$prev" ] || prev="/tmp/batch${i}_slugs.txt"
  [ -f "$prev" ] || continue
  ov=$(grep -c -F -x -f "$prev" "$WORK/slugs.txt" || true); [ "$ov" -eq 0 ] || die select "overlap with batch $i: $ov slugs"
done
: > "$WORK/pngs.txt"
while read -r s; do ( cd "$REPO" && ls "src/assets/blog/$s"/*.png 2>/dev/null ) >> "$WORK/pngs.txt" || true; done < "$WORK/slugs.txt"
[ -s "$WORK/pngs.txt" ] || die select "no PNGs in selection"
( cd "$REPO" && grep -ho 'assets/blog/[^)]*' $(sed 's#^#src/content/blog/#; s#$#.mdx#' "$WORK/slugs.txt") | grep -v -E '/(hero|inline-[0-9]+)\.png$' ) && die select "non-standard image references found" || true
SM=$(curl -sfL https://kenashe.ai/sitemap-0.xml) || die net "sitemap fetch failed"
: > "$WORK/pre.tsv"
while read -r s; do
  d=$(grep -q '^draft: true' "$REPO/src/content/blog/$s.mdx" && echo True || echo False)
  h=$(grep -q '^image:' "$REPO/src/content/blog/$s.mdx" && echo True || echo False)
  code=$(curl -s -o "$WORK/page.html" -w '%{http_code}' "https://kenashe.ai/blog/$s/")
  og=$(grep -o 'property="og:image" content="[^"]*"' "$WORK/page.html" | cut -d'"' -f4 || true)
  insm=$(grep -c "/blog/$s/" <<<"$SM" || true)
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$s" "$d" "$code" "$insm" "$og" "$h" >> "$WORK/pre.tsv"
done < "$WORK/slugs.txt"
python3 - "$WORK/pre.tsv" <<'PY' || die status "published/draft status inconsistent with production"
import sys
rows=[l.rstrip("\n").split("\t") for l in open(sys.argv[1])]
pub=[r for r in rows if r[1]=="False"]; dr=[r for r in rows if r[1]=="True"]
bad=[r[0] for r in rows if (r[1]=="False" and (r[2]!="200" or r[3]=="0")) or (r[1]=="True" and (r[2]!="404" or r[3]!="0"))]
print(f"published {len(pub)} (all 200 + sitemap), drafts {len(dr)} (all 404, no sitemap); anomalies: {bad}")
sys.exit(1 if bad else 0)
PY

# ---- 3. Convert ------------------------------------------------------------------------------
step "convert"
rm -rf "$WORK/out"; mkdir -p "$WORK/out"
( cd "$TOOLS" && node convert.mjs "$REPO" "$WORK/pngs.txt" "$WORK/out" 2> "$WORK/convert.log" ) || die convert "conversion failed (see $WORK/convert.log)"
[ -f "$WORK/out/report.json" ] || die convert "no conversion report"
python3 - "$WORK/out/report.json" "$WORK/pngs.txt" <<'PY' || die convert "conversion report inconsistent"
import sys,json
r=json.load(open(sys.argv[1])); n=sum(1 for l in open(sys.argv[2]) if l.strip())
assert len(r)==n, f"converted {len(r)} of {n}"
assert all(x["width"]==1536 and x["height"]==1024 for x in r), "dimension change"
print(f"converted {len(r)} files: {sum(x['before'] for x in r):,} B -> {sum(x['after'] for x in r):,} B")
PY

# ---- 4. Old URLs and served-today status -----------------------------------------------------
step "old urls"
( cd "$TOOLS" && node oldurls.mjs "$WORK/pngs.txt" ) > "$WORK/oldurls.tsv" || die hash "old-URL hashing failed"
[ "$(wc -l < "$WORK/oldurls.tsv")" -eq "$(wc -l < "$WORK/pngs.txt")" ] || die hash "old-URL count mismatch"
: > "$WORK/oldstatus.tsv"
while IFS=$'\t' read -r p u; do printf '%s\t%s\t%s\n' "$p" "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$u")" >> "$WORK/oldstatus.tsv"; done < "$WORK/oldurls.tsv"
python3 - "$WORK/oldstatus.tsv" "$WORK/pre.tsv" <<'PY' || die hash "live og:image does not match computed old URLs"
import sys
old={l.split("\t")[1] for l in open(sys.argv[1])}
pub=[l.rstrip("\n").split("\t") for l in open(sys.argv[2]) if l.split("\t")[1]=="False"]
hero=[r for r in pub if "/_astro/hero." in r[4]]
ok=sum(1 for r in hero if r[4] in old); print(f"og:image cross-check: {ok}/{len(hero)} hero posts match; {len(pub)-len(hero)} published posts use a non-hero og:image (exceptions, recorded)")
sys.exit(0 if ok==len(hero) else 1)
PY

# ---- 5. Apply to a branch --------------------------------------------------------------------
step "branch"
BR="phase-b/batch-${NN}"
( cd "$REPO" && git checkout -q -B "$BR" origin/master ) || die git "could not create $BR"
cp -r "$WORK/out/src/assets/blog/." "$REPO/src/assets/blog/" || die apply "copy of webp files failed"
python3 "$TOOLS/rewrite_refs.py" "$REPO" "$WORK/slugs.txt" --apply || die apply "reference rewrite reported problems"
( cd "$REPO" && xargs rm -f < "$WORK/pngs.txt" ) || die apply "png removal failed"

# ---- 6. Mapping and redirects (run from TOOLS so rollup resolves) ----------------------------
step "mapping"
MAP="$OUTDIR/batch${N}-site-image-url-mapping.tsv"; RED="$OUTDIR/batch${N}-redirects.json"
( cd "$TOOLS" && PNGS="$WORK/pngs.txt" OLDSTATUS="$WORK/oldstatus.tsv" REPO="$REPO" WEBPDIR="$REPO" MAPOUT="$MAP" REDOUT="$RED" BATCH="$N" node mapping.generic.mjs ) || die mapping "mapping/redirect generation failed"
[ -s "$MAP" ] && [ -s "$RED" ] || die mapping "mapping or redirects file missing/empty"

# ---- 7. Validate everything BEFORE committing -------------------------------------------------
step "validate"
python3 - "$REPO" "$WORK/slugs.txt" "$WORK/pngs.txt" "$MAP" "$RED" "$WORK/oldstatus.tsv" <<'PY' || die validate "validation failed; nothing committed"
import sys,json,re,os,subprocess
repo,slugs_f,pngs_f,map_f,red_f,old_f=sys.argv[1:7]
slugs=[s.strip() for s in open(slugs_f) if s.strip()]; pngs=[p.strip() for p in open(pngs_f) if p.strip()]
# content: no png files/refs remain; every ref resolves; only extensions changed
for s in slugs:
    assert not [f for f in os.listdir(f"{repo}/src/assets/blog/{s}") if f.endswith(".png")], f"png left in {s}"
    t=open(f"{repo}/src/content/blog/{s}.mdx",encoding="utf-8").read()
    assert not re.search(rf"assets/blog/{re.escape(s)}/[^)\s]*\.png", t), f"png ref left in {s}"
    for m in re.finditer(r'\.\./\.\./assets/blog/([^)\s"]+)', t): assert os.path.exists(f"{repo}/src/assets/blog/{m.group(1)}"), f"unresolved ref {m.group(1)}"
diff=subprocess.check_output(["git","-C",repo,"diff","--","src/content/blog"],text=True)
lines=[l[1:] for l in diff.splitlines() if l[:1] in "+-" and not l.startswith(("+++","---"))]
norm={}
for l in lines: k=re.sub(r"\.(png|webp)\b",".EXT",l); norm[k]=norm.get(k,0)+1
assert all(v==2 for v in norm.values()), "an MDX change is not extension-only"
assert len(lines)//2==len(pngs), f"changed refs {len(lines)//2} != images {len(pngs)}"
# mapping/redirects
rows=[l.rstrip("\n").split("\t") for l in open(map_f) if not l.startswith("#")]; assert len(rows)==len(pngs), "mapping row count"
served=sum(1 for r in rows if r[2]=="200"); new=json.load(open(red_f)); assert len(new)==served, f"redirects {len(new)} != served {served}"
vj=json.load(open(f"{repo}/vercel.json")); existing=vj["redirects"]
assert set(vj.keys())=={"redirects"}, "unexpected vercel.json keys (rewrites/headers?)"
srcs=[r["source"] for r in existing+new]; assert len(srcs)==len(set(srcs)), "duplicate redirect source"
assert not any(r["destination"] in set(srcs) for r in existing+new), "redirect chain/loop"
for r in new:
    assert re.fullmatch(r"/_astro/(hero|inline-\d+)\.[A-Za-z0-9_-]{8}\.png", r["source"]) and re.fullmatch(r"/_astro/(hero|inline-\d+)\.[A-Za-z0-9_-]{8}\.webp", r["destination"]) and r["permanent"] is True, r
    slug=next(x[4] for x in rows if x[1].endswith(r["destination"])); base=r["destination"].rsplit("/",1)[1].split(".")[0]
    assert os.path.exists(f"{repo}/src/assets/blog/{slug}/{base}.webp"), f"destination file missing {r['destination']}"
total=len(existing)+len(new); assert total<=2048, "redirect limit"
print(f"validated: {len(slugs)} posts, {len(pngs)} images, {len(new)} redirects ({len(existing)} -> {total} of 2048), content extension-only, all refs resolve")
vj["redirects"]=existing+new; json.dump(vj,open(f"{repo}/vercel.json","w"),indent=2); open(f"{repo}/vercel.json","a").write("\n")
PY

# ---- 8. Records, then commit (only reached if everything above passed) ------------------------
step "records"
cp "$MAP" "$REPO/docs/migrations/phase-b-batch-${NN}-site-image-urls.tsv" || die records "mapping copy failed"
{ printf '# Raw GitHub URL changes, Phase B batch %s\n# PNG paths 404 at master after the batch; permanent at pre-batch commit %s; WebP path valid at master.\n# old_master_url\tpermanent_pre_merge_url\tnew_master_url\n' "$N" "$BASE"
  while read -r p; do printf 'https://raw.githubusercontent.com/kenashe/kenashe/master/%s\thttps://raw.githubusercontent.com/kenashe/kenashe/%s/%s\thttps://raw.githubusercontent.com/kenashe/kenashe/master/%s\n' "$p" "$BASE" "$p" "${p%.png}.webp"; done < "$WORK/pngs.txt"; } > "$REPO/docs/migrations/phase-b-batch-${NN}-raw-github-urls.tsv"
{ printf '# Batch %s post status before migration (%s)\n# slug\tdraft\thttp_before\tin_sitemap\tog_image_before\thas_hero_frontmatter\n' "$N" "$(date -u +%F)"; cat "$WORK/pre.tsv"; } > "$REPO/docs/migrations/phase-b-batch-${NN}-post-status.tsv"
grep -q "Batch ${N} " "$REPO/docs/migrations/README.md" || printf '\n### Batch %s (posts %s to %s in migration order)\n\n- Same three files as earlier batches (`phase-b-batch-%s-*.tsv`).\n' "$N" "$START" "$END" "$NN" >> "$REPO/docs/migrations/README.md"

if [ "$DRY" = "--dry-run" ]; then step "dry run: validated, NOT committing"; ( cd "$REPO" && git status --short | awk '{print $1}' | sort | uniq -c ); exit 0; fi
step "commit"
( cd "$REPO" && git add -A src/assets/blog src/content/blog vercel.json docs/migrations ) || die git "git add failed"
( cd "$REPO" && git -c user.name="Ken Ashe" -c user.email="kenashe@gmail.com" commit -q -F - <<EOF
Digest images: batch ${N} of PNG to WebP re-encode (posts ${START}-${END}) with redirects

Phase B batch ${N} (DECISIONS.md D16), same procedure as earlier batches: sharp WebP quality 80,
dimensions unchanged, frontmatter and inline references moved .png -> .webp (extension only),
PNGs removed from the tree (history keeps them). Exact 308 redirects for the original-image URLs
production served before the batch; existing redirects preserved. Records under docs/migrations/.
Assembled by phaseb/prepare_batch.sh with pre-commit validation.
EOF
) || die git "commit failed"
# post-commit sanity: the commit must contain the redirects and the mapping
C=$(cd "$REPO" && git rev-parse HEAD)
[ "$(cd "$REPO" && git show "$C:vercel.json" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["redirects"]))')" -eq "$(python3 -c "import json; print(len(json.load(open('$REPO/vercel.json'))['redirects']))")" ] || die git "committed vercel.json does not match validated one"
( cd "$REPO" && git show "$C:docs/migrations/phase-b-batch-${NN}-site-image-urls.tsv" >/dev/null ) || die git "mapping record missing from commit"
echo "READY: branch $BR commit ${C:0:7} (not pushed). Push and open the PR as a separate credentialed step."
