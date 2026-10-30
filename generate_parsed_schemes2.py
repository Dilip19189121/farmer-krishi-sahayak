import json, re

with open('unique_entries.json', 'r') as f:
    entries = json.load(f)

with open('translations.json', 'r', encoding='utf-8') as f:
    translations = json.load(f)

with open('frontend/src/data/parsedSchemes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

arr_start = content.find('export const parsedSchemes: ParsedScheme[] = [')
arr_end = content.rfind(']')

new_entries = []
for entry in entries:
    id_m = re.search(r'id: "([^"]*)"', entry)
    sid = id_m.group(1) if id_m else "unknown"
    
    start = entry.find('{')
    end = entry.rfind('}')
    base_entry = entry[start:end+1]
    
    trans = translations.get(sid, {})
    name = trans.get('name', {})
    desc = trans.get('description', {})
    elig = trans.get('eligibility', {})
    
    # Extract old values
    old_name = re.search(r'name: "([^"]*)"', entry).group(1)
    old_desc = re.search(r'description: "([^"]*)"', entry).group(1)
    old_elig = re.search(r'eligibility: "([^"]*)"', entry).group(1)
    
    # Build new field strings
    new_name = 'name: { en: "' + old_name + '", hi: "' + name.get('hi', '') + '", te: "' + name.get('te', '') + '" }'
    new_desc = 'description: { en: "' + old_desc + '", hi: "' + desc.get('hi', '') + '", te: "' + desc.get('te', '') + '" }'
    new_elig = 'eligibility: { en: "' + old_elig + '", hi: "' + elig.get('hi', '') + '", te: "' + elig.get('te', '') + '" }'
    
    new_entry = base_entry
    new_entry = new_entry.replace('name: "' + old_name + '"', new_name, 1)
    new_entry = new_entry.replace('description: "' + old_desc + '"', new_desc, 1)
    new_entry = new_entry.replace('eligibility: "' + old_elig + '"', new_elig, 1)
    
    new_entries.append(new_entry)

new_array = '[\n' + ',\n'.join('  { ' + e + ' }' for e in new_entries) + '\n]'

new_content = content[:arr_start] + 'export const parsedSchemes: ParsedScheme[] = ' + new_array + content[arr_end:]

with open('frontend/src/data/parsedSchemes.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Generated file with", len(new_entries), "entries")
