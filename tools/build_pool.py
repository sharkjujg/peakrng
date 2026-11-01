#!/usr/bin/env python3
"""Build data/pool-v1.json from Wikidata (CC0): a snapshot of well-documented mountains and volcanoes.

Eligible: a mountain, summit or volcano type (listed explicitly, because Wikidata often types a peak only by a specific kind),
with an English name, an elevation (several documented values are fine if they agree within 2%, otherwise the place is left out),
coordinates (same idea, within 0.1 degree) and at least one country. The pool is every such place linked
from at least T Wikimedia pages, with T the largest threshold that still leaves >= TARGET places. Wikidata keeps changing, so a
rerun gives a newer snapshot, not the same bytes.

Usage: python tools/build_pool.py   (network; several minutes; waits between requests)
"""
import collections
import datetime as dt
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

UA = "PeakRNG-fan-prototype/0.1 (https://github.com/sharkjujg/peakrng)"
ENDPOINT = "https://query.wikidata.org/sparql"
FLOOR, TARGET = 12, 3000
TYPES = {"Q8502": "mountain", "Q207326": "summit", "Q1061151": "massif", "Q8072": "volcano", "Q212057": "shield volcano", "Q169358": "stratovolcano",
         "Q1330974": "active volcano", "Q1197120": "extinct volcano", "Q1325302": "dormant volcano", "Q1200524": "complex volcano"}
VOLCANO_KINDS = {k for k in TYPES.values() if "volcano" in k}
CORE = f"""
  VALUES ?type {{ {" ".join("wd:" + q for q in TYPES)} }}
  ?f wdt:P31 ?type ; wikibase:sitelinks ?sl . FILTER(?sl >= {FLOOR})
  FILTER EXISTS {{ ?f wdt:P2044 ?_e . ?f wdt:P625 ?_c . ?f wdt:P17 ?_k }}
"""


def sparql(q, tries=4):
    url = ENDPOINT + "?" + urllib.parse.urlencode({"query": q, "format": "json"})
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=170) as r:
                rows = json.load(r)["results"]["bindings"]
            time.sleep(1.5)
            return rows
        except Exception as e:  # network hiccup or Wikidata timeout: back off and retry
            print("  retry", i, e, file=sys.stderr, flush=True)
            time.sleep(15 * (i + 1))
    raise SystemExit("Wikidata query failed")


def values(uris, body, size=400):
    out = collections.defaultdict(set)
    for i in range(0, len(uris), size):
        vals = " ".join("wd:" + u.rsplit("/", 1)[1] for u in uris[i:i + size])
        for r in sparql(f"SELECT DISTINCT ?f ?v WHERE {{ VALUES ?f {{ {vals} }} {body} }}"):
            out[r["f"]["value"]].add(r["v"]["value"])
    return out


def settle(vals, tol, absolute=False):
    """One number from several documented values: their median when they agree within tol (a fraction, or degrees if absolute), else None."""
    v = sorted(vals)
    if not v:
        return None
    mid = v[len(v) // 2]
    return mid if v[-1] - v[0] <= (tol if absolute else tol * max(1.0, abs(mid))) else None


def label_of(prop):
    return f'?f wdt:{prop} ?x . ?x rdfs:label ?v . FILTER(LANG(?v) = "en")'


print("place list…", flush=True)
sitelinks, kind = {}, collections.defaultdict(set)
for r in sparql(f"SELECT DISTINCT ?f ?sl ?type WHERE {{ {CORE} }}"):
    u = r["f"]["value"]
    sitelinks[u] = int(r["sl"]["value"])
    kind[u].add(TYPES[r["type"]["value"].rsplit("/", 1)[1]])
uris = list(sitelinks)
print(len(uris), "candidates; fetching facts in chunks…", flush=True)
names = values(uris, '?f rdfs:label ?v . FILTER(LANG(?v) = "en")')
elev = {u: {round(float(x), 1) for x in v} for u, v in values(uris, "?f p:P2044/psn:P2044/wikibase:quantityAmount ?v").items()}
prom = {u: {round(float(x), 1) for x in v} for u, v in values(uris, "?f p:P2660/psn:P2660/wikibase:quantityAmount ?v").items()}
coords, countries, ranges = values(uris, "?f wdt:P625 ?v"), values(uris, label_of("P17")), values(uris, label_of("P4552"))

today = dt.datetime.now(dt.timezone.utc).date().isoformat()
places, dropped = [], collections.Counter()
for u in uris:
    nm = names.get(u, set())
    el = settle(elev.get(u, ()), 0.02)  # famous peaks carry several measurements that differ by metres: accept those, drop real conflicts
    pts = [re.match(r"Point\((-?[\d.]+) (-?[\d.]+)\)", c) for c in coords.get(u, ())]
    pts = [(float(p.group(2)), float(p.group(1))) for p in pts if p]
    lat, lon = (settle([p[0] for p in pts], 0.1, absolute=True), settle([p[1] for p in pts], 0.1, absolute=True)) if pts else (None, None)
    if len(nm) != 1 or re.fullmatch(r"Q\d+", next(iter(nm))):
        dropped["no single English name"] += 1
    elif el is None or el < 50:
        dropped["missing, conflicting or tiny elevation"] += 1
    elif lat is None or lon is None:
        dropped["missing or conflicting coordinates"] += 1
    elif not countries.get(u):
        dropped["no country"] += 1
    else:
        pr = settle(prom.get(u, ()), 0.05)
        if pr is not None and pr > el + 1:
            pr = None  # a prominence above the elevation is a data error: treat as unknown
        places.append({"id": u.rsplit("/", 1)[1], "name": next(iter(nm)), "elevation": el, "prominence": pr,
                       "lat": round(lat, 3), "lon": round(lon, 3), "countries": sorted(countries[u]),
                       "range": sorted(ranges.get(u, ()))[0] if ranges.get(u) else None,
                       "type": "volcano" if kind[u] & VOLCANO_KINDS else "mountain", "_sl": sitelinks[u]})
print("dropped:", dict(dropped), "kept:", len(places), flush=True)

threshold = FLOOR
for t in range(FLOOR, 400):
    if sum(p["_sl"] >= t for p in places) >= TARGET:
        threshold = t
    else:
        break
places = sorted((p for p in places if p["_sl"] >= threshold), key=lambda p: int(p["id"][1:]))
for p in places:
    del p["_sl"]
n = len(places)


def coverage(f):
    return f"known for {sum(bool(p[f]) for p in places):,} of {n:,}; unknown never satisfies a badge"


meta = {"version": "v1", "publishedAt": today, "capturedAt": today, "source": "Wikidata, CC0 (https://www.wikidata.org)",
        "provenance": f"Snapshot of Wikidata taken {today} by tools/build_pool.py. Facts only; no photographs or maps.",
        "selection": f"Mountains, summits and volcanoes with an elevation, coordinates and a country (values that disagree by more than 2% or 0.1 degree are left out), linked from at least {threshold} Wikimedia pages.",
        "sitelinkThreshold": threshold,
        "fieldStatus": {"id": "known", "name": "known", "elevation": "known (metres above sea level)", "lat": "known", "lon": "known", "countries": "known", "type": "known",
                        "prominence": coverage("prominence"), "range": coverage("range")}}
lines = ",\n".join("  " + json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in places)
out = '{"meta":' + json.dumps(meta, ensure_ascii=False) + ',\n"members":[\n' + lines + "\n]}\n"
path = pathlib.Path(__file__).resolve().parent.parent / "data" / "pool-v1.json"
path.parent.mkdir(exist_ok=True)
path.write_bytes(out.encode("utf-8"))
print(f"wrote {path}: {n} places, sitelink threshold {threshold}", flush=True)
