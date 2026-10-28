import pathlib
p = pathlib.Path("frontend/src/data/parsedPrices.ts")
raw = p.read_bytes()
# Current 4 bytes: 0x5b 0x7b 0x7b 0x20 = [ { { space
# Target:        0x5b 0x7b 0x20 = [ { space
# Remove one 0x7b (the second one)
raw = raw.replace(bytes([0x5b, 0x7b, 0x7b, 0x20]), bytes([0x5b, 0x7b, 0x20]))
p.write_bytes(raw)
print("removed:", raw.count(b"[{' "))
PYEOF