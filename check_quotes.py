import pathlib
p = pathlib.Path("frontend/src/data/parsedPrices.ts")
src = p.read_text(encoding="utf-8")
lines = src.split("\n")
for li in range(26, 52):
    l = lines[li]
    q = l.count("'")
    if q % 2 == 1:
        print("line", li + 1, "quotes:", q)
        print("  repr:", repr(l[:150]))
