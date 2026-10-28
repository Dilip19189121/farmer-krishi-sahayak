import pathlib
p = pathlib.Path("frontend/src/data/parsedPrices.ts")
raw = p.read_bytes()
i = raw.find(b"prices: [")
for j in range(22):
    b = raw[i + j]
    print(j, hex(b), repr(chr(b)))
