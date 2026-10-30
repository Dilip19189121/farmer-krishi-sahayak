import re

with open('frontend/src/data/parsedSchemes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

arr_start = content.find('export const parsedSchemes: ParsedScheme[] = [')
arr_end = content.rfind(']')
array_content = content[arr_start:arr_end]

# Extract entries using id as the anchor
# Each entry: { id: "XXX", name: "...", description: "...", eligibility: "...", ... }
entries = []
for m in re.finditer(r'\{ id: "([^"]*)"', array_content):
    # Find the end of this entry (the closing } at end of line)
    start = m.start()
    # Find the next occurrence of 'id: ' after this one
    next_id = re.search(r'\{ id: "', array_content[m.end():])
    if next_id:
        end = m.start() + next_id.start()
    else:
        end = array_content.rfind(']')
    entry_text = array_content[start:end]
    entries.append(entry_text)

print(f"Found {len(entries)} entries")
# Save for later processing
with open('/tmp/entries.txt', 'w', encoding='utf-8') as f:
    for e in entries:
        f.write(e + '\n')
