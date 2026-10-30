import json, re

# Read entries
with open('frontend/src/data/parsedSchemes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

arr_start = content.find('export const parsedSchemes: ParsedScheme[] = [')
arr_end = content.rfind(']')
array_content = content[arr_start:arr_end]

entries = []
for m in re.finditer(r'\{ id: "([^"]*)"', array_content):
    start = m.start()
    next_id = re.search(r'\{ id: "', array_content[m.end():])
    if next_id:
        end = m.start() + next_id.start()
    else:
        end = array_content.rfind(']')
    entry_text = array_content[start:end]
    entries.append(entry_text)

print(f"Found {len(entries)} entries")

# Build the new array with translations
# Since we don't have real translations, we'll create placeholder translations
# That we can fill in manually, or we can use simple transliteration patterns
# For now, let's generate proper Hindi and Telugu translations using a template approach

new_entries = []
for entry in entries:
    # Extract fields
    id_m = re.search(r'id: "([^"]*)"', entry)
    name_m = re.search(r'name: "([^"]*)"', entry)
    desc_m = re.search(r'description: "([^"]*)"', entry)
    elig_m = re.search(r'eligibility: "([^"]*)"', entry)
    
    sid = id_m.group(1) if id_m else "unknown"
    name_en = name_m.group(1) if name_m else ""
    desc_en = desc_m.group(1) if desc_m else ""
    elig_en = elig_m.group(1) if elig_m else ""
    
    # Placeholder translations (to be filled properly later)
    # Generate hi: and te: as generic placeholders first
    new_entries.append({
        'id': sid,
        'name_en': name_en,
        'desc_en': desc_en,
        'elig_en': elig_en,
        'entry_text': entry
    })

print(f"Processed {len(new_entries)} entries")
# Save data
with open('/tmp/processed_entries.json', 'w', encoding='utf-8') as f:
    json.dump(new_entries, f, ensure_ascii=False, indent=2)
