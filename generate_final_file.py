import json, re

with open('unique_entries.json', 'r') as f:
    entries = json.load(f)

# We'll build a translations dictionary
# For each scheme, we need: name_hi, name_te, desc_hi, desc_te, elig_hi, elig_te

# Since actual high-quality translations of all 81 schemes require deep knowledge,
# I'll write the translations as a separate JSON file with the data.
print("Ready to generate translations. Total unique schemes:", len(entries))
print("First entry:", entries[0][:200])
