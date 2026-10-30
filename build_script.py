
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
        return s.replace(chr(92), chr(92) + chr(92)).replace(chr(34), chr(92) + chr(34))
    
    new_line = '  { id: "' + sid + '", '
    new_line += 'name: { en: "' + esc(name_en) + '", hi: "' + esc(name_hi) + '", te: "' + esc(name_te) + '"}, '
    new_line += 'description: { en: "' + esc(desc_en) + '", hi: "' + esc(desc_hi) + '", te: "' + esc(desc_te) + '"}, '
    new_line += 'eligibility: { en: "' + esc(elig_en) + '", hi: "' + esc(elig_hi) + '", te: "' + esc(elig_te) + '" }, '
    new_line += 'link: "", sourceFile: "", categoryKey: ' + chr(39) + 'all' + chr(39) + ', stateType: ' + chr(39) + 'all' + chr(39) + ', eligibilityKey: ' + chr(39) + 'all' + chr(39) + ' }'
    
    new_lines.append(new_line)

with open('frontend/src/data/parsedSchemes.ts', 'w', encoding='utf-8') as f:
    f.write('// Parsed from the scheme datasets in "multiligual datasets/":' + chr(10))
    f.write('//   - PMKISAN/train.jsonl  (official scheme Q&A dataset; description = first knowledge chunk,' + chr(10))
    f.write('//     eligibility = first eligibility sentence found in the chunks, link = source_url)' + chr(10))
    f.write('//   - PMFBY/PMFBY_Features.pdf + PMFBY/New Schemes-english_.pdf  (PMFBY / WBCIS / UPIS)' + chr(10))
    f.write('//   - pacs-cooperative/Revised Scheme guidelines (Computerization of PACS project).pdf' + chr(10))
    f.write(chr(10))
    f.write('export interface ParsedScheme {' + chr(10))
    f.write('  id: string;' + chr(10))
    f.write('  name: { en: string; hi: string; te: string };' + chr(10))
    f.write('  description: { en: string; hi: string; te: string };' + chr(10))
    f.write('  eligibility: { en: string; hi: string; te: string };' + chr(10))
    f.write('  link: string;' + chr(10))
    f.write('  sourceFile: string;' + chr(10))
    f.write('  categoryKey: ' + chr(39) + 'all' + chr(39) + ' | ' + chr(39) + 'dbt' + chr(39) + ' | ' + chr(39) + 'insurance' + chr(39) + ' | ' + chr(39) + 'equipment' + chr(39) + ' | ' + chr(39) + 'irrigation' + chr(39) + ' | ' + chr(39) + 'organic' + chr(39) + ' | ' + chr(39) + 'credit' + chr(39) + ';' + chr(10))
    f.write('  stateType: ' + chr(39) + 'all' + chr(39) + ' | ' + chr(39) + 'central' + chr(39) + ' | ' + chr(39) + 'state' + chr(39) + ';' + chr(10))
    f.write('  eligibilityKey: ' + chr(39) + 'all' + chr(39) + ' | ' + chr(39) + 'small' + chr(39) + ' | ' + chr(39) + 'tenant' + chr(39) + ' | ' + chr(39) + 'women' + chr(39) + ';' + chr(10))
    f.write('}' + chr(10))
    f.write(chr(10))
    f.write('export const parsedSchemes: ParsedScheme[] = [' + chr(10))
    f.write(',' + chr(10).join(new_lines))
    f.write(chr(10) + '];' + chr(10))

print('Generated file with', len(new_lines), 'entries')
