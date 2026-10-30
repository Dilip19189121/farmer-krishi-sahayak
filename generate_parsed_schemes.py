import json, re

with open('unique_entries.json', 'r') as f:
    entries = json.load(f)

# Load translations
with open('translations.json', 'r', encoding='utf-8') as f:
    translations = json.load(f)

# Read original file
with open('frontend/src/data/parsedSchemes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the array start and end
arr_start = content.find('export const parsedSchemes: ParsedScheme[] = [')
arr_end = content.rfind(']')

# Build new array entries
new_entries = []
for entry in entries:
    id_m = re.search(r'id: "([^"]*)"', entry)
    sid = id_m.group(1) if id_m else "unknown"
    
    # Find the text
    start = entry.find('{')
    end = entry.rfind('}')
    base_entry = entry[start:end+1]
    
    # Get translations
    trans = translations.get(sid, {})
    name = trans.get('name', {})
    desc = trans.get('description', {})
    elig = trans.get('eligibility', {})
    
    # Replace each field
    # name: name: "..." -> name: { en: "...", hi: "...", te: "..." },
    old_name = re.search(r'name: "([^"]*)"', entry).group(1)
    new_name = f'name: {{ en: "{old_name}", hi: "{{hi}}", te: "{{te}}" }}'.format(
        hi=name.get('hi', ''), te=name.get('te', ''))
    
    # description
    old_desc = re.search(r'description: "([^"]*)"', entry).group(1)
    new_desc = f'description: {{ en: "{old_desc}", hi: "{{hi}}", te: "{{te}}" }}'.format(
        hi=desc.get('hi', ''), te=desc.get('te', ''))
    
    # eligibility
    old_elig = re.search(r'eligibility: "([^"]*)"', entry).group(1)
    new_elig = f'eligibility: {{ en: "{old_elig}", hi: "{{hi}}", te: "{{te}}" }}'.format(
        hi=elig.get('hi', ''), te=elig.get('te', ''))
    
    new_entry = base_entry
    new_entry = new_entry.replace(f'name: "{old_name}"', new_name, 1)
    new_entry = new_entry.replace(f'description: "{old_desc}"', new_desc, 1)
    new_entry = new_entry.replace(f'eligibility: "{old_elig}"', new_elig, 1)
    
    new_entries.append(new_entry)

# Build new content
new_array = '[\n' + ',\n'.join(f'  {{ {e} }}' for e in new_entries) + '\n]'

# Replace the old array
new_content = content[:arr_start] + 'export const parsedSchemes: ParsedScheme[] = ' + new_array + content[arr_end:]

with open('frontend/src/data/parsedSchemes.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Generated file with {len(new_entries)} entries")
