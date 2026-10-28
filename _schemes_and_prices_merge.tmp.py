import sys, csv, json, pathlib, re

sys.stdout.reconfigure(encoding="utf-8")

CSV_PATH = "multiligual datasets/prices/Price_Agriculture_commodities_Week.csv"
TS_PATH = pathlib.Path("frontend/src/data/parsedPrices.ts")

src = TS_PATH.read_text(encoding="utf-8")

# ---------- existing commodities from PDFs (dedupe key) ----------
existing = set()
for m in re.finditer(r"commodity:\s*'([^']+)'", src):
    existing.add(m.group(1).strip().lower())

# ---------- classify ----------
VEGETABLE_SIGNALS = [
    "tomato", "potato", "onion", "brinjal", "ladies finger", "okra", "bhindi",
    "bottle gourd", "lauki", "ridge gourd", "ash gourd", "ghiya", "bitter gourd",
    "cucumber", "kheera", "pumpkin", "kaddu", "tinda", "snake gourd", "turai",
    "carrot", "gajar", "radish", "mooli", "beetroot", "chukandar",
    "beans", "green beans", "fine beans", "peas", "garden peas", "parwal",
    "pointed gourd", "ash gourd", "ridge gourd", "snake gourd",
    "apple gourd", "zucchini", "kohlrabi", "knol-khol", "cauliflower", "phool gobhi",
    "cabbage", "patta gobi", "spinach", "palak", "chawli", "legume",
    "drumstick", "moringa", "cocolobe", "kanali", "green chili", "mirch",
    "chilli", "chillies",
    "papaya", "papita",
    "banana", "plantain", "kathal", "jackfruit", "jackfruit seed",
    "watermelon", "kolar", "muskmelon", "kharbuja",
    "mango", "am",
    "aloo",
]

def classify(name: str) -> str:
    n = name.lower()
    if any(s in n for s in ["mango", "banana", "apple", "papaya", "pineapple",
                             "jackfruit", "coconut", "khari", "sweetsop", "soursop",
                             "drumstick", "moringa"]):
        return "fruit"
    if any(s in n for s in VEGETABLE_SIGNALS):
        return "vegetable"
    if any(s in n for s in ["fruit", "dry fruit", "berries", "dates", "raisin",
                             "almond", "walnut", "pistachio", "cashew", "fig",
                             "apricot", "peach", "plum", "cherry", "strawberry"]):
        return "fruit"
    return "other"

def csv_get(row, *names):
    for n in names:
        v = row.get(n)
        if v:
            return v
    return ""

# ---------- parse CSV ----------
with open(CSV_PATH, encoding="utf-8", errors="replace") as f:
    sample = f.read(2048)
    f.seek(0)
    dialect = csv.Sniffer().sniff(sample) if csv.Sniffer().has_header(sample) else csv.excel

records = []
notes = []
with open(CSV_PATH, encoding="utf-8", errors="replace") as f:
    reader = csv.DictReader(f, dialect=dialect)
    for i, row in enumerate(reader, start=2):
        raw_name = csv_get(row, "Commodity", "commodity", "commodity name").strip()
        if not raw_name:
            continue
        category = csv_get(row, "category", "commodity category", "Commodity Category").strip()
        price_raw = csv_get(row, "Min Price", "price", "Modal Price", "price (rs./quintal)").strip()
        raw_price = price_raw.replace(",", "").replace("\u20b9", "").replace("Rs", "").strip()
        try:
            price = float(raw_price) if raw_price else None
        except ValueError:
            price = None
            notes.append(f"row {i}: unparsable price {raw_price!r} for {raw_name}")
        norm = raw_name.strip().lower()
        if norm in existing:
            notes.append(f"row {i}: {raw_name!r} already in parsedPrices.ts (skipped)")
            continue
        records.append({"name": raw_name, "category": category, "price": price, "norm": norm})

veg = [r for r in records if classify(r["name"]) == "vegetable"]
fruit = [r for r in records if classify(r["name"]) == "fruit"]
other = [r for r in records if classify(r["name"]) == "other"]

print(f"total rows: {len(records)}")
print(f"added: {len(records)} | vegetables: {len(veg)} | fruits: {len(fruit)} | other: {len(other)}")
print("unclassifiable:", [r["name"] for r in other])
print("skipped (dup):", sorted({r["name"] for r in records if r["norm"] in existing}))
for n in notes:
    print("NOTE:", n)
