import pathlib
p = pathlib.Path("frontend/src/data/parsedPrices.ts")
src = p.read_text(encoding="utf-8")
lines = src.split("\n")
print("total entries:", len([l for l in lines if l.strip().startswith("{ group:")]))
print("Vegetables:", src.count("group: 'Vegetables'"))
print("Fruits:", src.count("group: 'Fruits'"))
print("PDF sourceFile:", src.count("Market_Wise_Price_Arrival"))
print("CSV sourceFile:", src.count("Price_Agriculture_commodities_Week.csv"))
print("quotes on line 27:", lines[26].count("'"))
print("odd-quote lines:", sum(1 for l in lines if l.count("'") % 2 == 1))
# Verify no '[' followed by quote remains
print("stray [{' count:", src.count("['"))
print("fixed [{' count:", src.count("[{'"))
