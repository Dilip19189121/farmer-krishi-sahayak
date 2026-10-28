import pathlib

p = pathlib.Path("frontend/src/data/parsedPrices.ts")
src = p.read_text(encoding="utf-8")

# The builder produced prices: [{' date:  ->  prices: [{' date:  (no quote after [)
old = "[{' date:"
new = "[{' date:"
n = src.count(old)
print("stray-quote occurrences:", n)
src = src.replace("['", "[{")
p.write_text(src, encoding="utf-8")
print("done")
