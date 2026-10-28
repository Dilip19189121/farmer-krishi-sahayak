import pathlib

p = pathlib.Path("frontend/src/data/parsedPrices.ts")
raw = p.read_bytes()
print("stray quote hex 0x27 count:", raw.count(b"'\x27"))
# Replace the 3-byte sequence [ { ' with [ { {  (i.e. remove the quote after { )
# Bytes: 0x5b 0x7b 0x27  ->  0x5b 0x7b 0x27
raw = raw.replace(b"[{'", b"[{{")
p.write_bytes(raw)
print("done")
