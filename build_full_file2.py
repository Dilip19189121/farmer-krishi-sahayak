import json, re

with open('frontend/src/data/parsedSchemes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

with open('translations.json', 'r', encoding='utf-8') as f:
    translations = json.load(f)

with open('unique_entries.json', 'r') as f:
    entries = json.load(f)

new_lines = []
for entry in entries:
    id_m = re.search(r'id: "([^"]*)"', entry)
    sid = id_m.group(1) if id_m else "unknown"
    
    trans = translations.get(sid, {})
    name = trans.get('name', {})
    desc = trans.get('description', {})
    elig = trans.get('eligibility', {})
    
    name_m = re.search(r'name: "([^"]*)"', entry)
    desc_m = re.search(r'description: "([^"]*)"', entry)
    elig_m = re.search(r'eligibility: "([^"]*)"', entry)
    
    name_en = name_m.group(1) if name_m else "Unknown"
    desc_en = desc_m.group(1) if desc_m else ""
    elig_en = elig_m.group(1) if elig_m else ""
    
    name_hi = name.get('hi', name_en)
    name_te = name.get('te', name_en)
    desc_hi = desc.get('hi', desc_en)
    desc_te = desc.get('te', desc_en)
    elig_hi = elig.get('hi', elig_en)
    elig_te = elig.get('te', elig_en)
    
    def esc(s):
        return s.replace('\', '\\').replace('"', '\\"')
    
    new_line = '  { id: "' + sid + '", '
    new_line += 'name: { en: "' + esc(name_en) + '", hi: "' + esc(name_hi) + '", te: "' + esc(name_te) + '"}, '
    new_line += 'description: { en: "' + esc(desc_en) + '", hi: "' + esc(desc_hi) + '", te: "' + esc(desc_te) + '"}, '
    new_line += 'eligibility: { en: "' + esc(elig_en) + '", hi: "' + esc(elig_hi) + '", te: "' + esc(elig_te) + '" }, '
    new_line += 'link: "", sourceFile: "", categoryKey: \'all\', stateType: \'all\', eligibilityKey: \'all\' }'
    
    new_lines.append(new_line)

with open('frontend/src/data/parsedSchemes.ts', 'w', encoding='utf-8') as f:
    f.write('// Parsed from the scheme datasets in "multiligual datasets/":\n')
    f.write('//   - PMKISAN/train.jsonl  (official scheme Q&A dataset; description = first knowledge chunk,\n')
    f.write('//     eligibility = first eligibility sentence found in the chunks, link = source_url)\n')
    f.write('//   - PMFBY/PMFBY_Features.pdf + PMFBY/New Schemes-english_.pdf  (PMFBY / WBCIS / UPIS)\n')
    f.write('//   - pacs-cooperative/Revised Scheme guidelines (Computerization of PACS project).pdf\n')
    f.write('\n')
    f.write('export interface ParsedScheme {\n')
    f.write('  id: string;\n')
    f.write('  name: { en: string; hi: string; te: string };\n')
    f.write('  description: { en: string; hi: string; te: string };\n')
    f.write('  eligibility: { en: string; hi: string; te: string };\n')
    f.write('  link: string;\n')
    f.write('  sourceFile: string;\n')
    f.write('  categoryKey: \'all\' | \'dbt\' | \'insurance\' | \'equipment\' | \'irrigation\' | \'organic\' | \'credit\';\n')
    f.write('  stateType: \'all\' | \'central\' | \'state\';\n')
    f.write('  eligibilityKey: \'all\' | \'small\' | \'tenant\' | \'women\';\n')
    f.write('}\n')
    f.write('\n')
    f.write('export const parsedSchemes: ParsedScheme[] = [\n')
    f.write(',\n'.join(new_lines))
    f.write('\n];\n')

print("Generated file with", len(new_lines), "entries")
