import json, re

with open('processed_entries.json', 'r') as f:
    entries = json.load(f)

# Filter to unique schemes
seen = set()
unique = []
for e in entries:
    # Extract id
    id_m = re.search(r'id: "([^"]*)"', e)
    if id_m and id_m.group(1) not in seen:
        seen.add(id_m.group(1))
        unique.append(e)

print(f"Unique schemes: {len(unique)}")

# Save
with open('unique_entries.json', 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False)
