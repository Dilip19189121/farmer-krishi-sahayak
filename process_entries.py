import json, re

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

with open('processed_entries.json', 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
