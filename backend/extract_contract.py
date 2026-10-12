import json, urllib.request

url = "http://127.0.0.1:8000/openapi.json"
with urllib.request.urlopen(url, timeout=15) as r:
    d = json.loads(r.read().decode("utf-8"))

info = d.get("info", {})
schemes = d.get("components", {}).get("securitySchemes", {})
paths = d.get("paths", {})

auth_map = {}
for p in sorted(paths):
    for m, ep in paths[p].items():
        sec = ep.get("security")
        if sec:
            for s in sec:
                for k in s.keys():
                    auth_map.setdefault(p, set()).add(k)

print("TITLE: " + info.get("title"))
print("VERSION: " + info.get("version"))
print("AUTH_SCHEMES: " + json.dumps(list(schemes.keys())))
print("BEAER_AUTH_ENDPOINTS: " + json.dumps(sorted(auth_map.keys())))
print("URL: http://127.0.0.1:8000")
print()

for p in sorted(paths):
    item = paths[p]
    for m in sorted(k for k in item if k != "parameters"):
        ep = item[m]
        tags = ep.get("tags", [])
        summary = ep.get("summary", "")
        opid = ep.get("operationId", "")
        sec = ep.get("security")
        params = ep.get("parameters", [])
        body_media = None
        body_ref = None
        req_required = False
        rb = ep.get("requestBody")
        if rb:
            req_required = bool(rb.get("required", False))
            if rb.get("content"):
                for media, sch in rb["content"].items():
                    body_media = media
                    body_ref = sch.get("$ref", "")
        resp_200 = ep.get("responses", {}).get("200", {})
        resp_content = resp_200.get("content", {})
        resp_schema = resp_content.get("application/json", {}).get("schema", {}).get("$ref", "")
        resp_desc = resp_200.get("description", "")
        print("## " + m.upper() + " " + p)
        print("   tags: " + ",".join(tags))
        print("   summary: " + summary)
        print("   operationId: " + opid)
        print("   security: " + json.dumps(sec))
        if params:
            print("   params: " + json.dumps([(x.get("name"), x.get("in"), x.get("required")) for x in params]))
        if req_required:
            print("   requestBody: " + body_media + " " + body_ref)
        print("   response: " + resp_schema + " :: " + resp_desc)
        print()
