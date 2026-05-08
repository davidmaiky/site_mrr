import json
with open('data.json','r',encoding='utf-8') as f:
    data = json.load(f)

months_23 = [m for m in data[0]['monthly'].keys() if '/23' in m]
months_24 = [m for m in data[0]['monthly'].keys() if '/24' in m]
months_25 = [m for m in data[0]['monthly'].keys() if '/25' in m]

for year, ms in [('2023', months_23), ('2024', months_24), ('2025', months_25)]:
    visat_total = sum(sum(d['monthly'].get(m,0) for m in ms) for d in data if d['marca']=='VISAT')
    prime_total = sum(sum(d['monthly'].get(m,0) for m in ms) for d in data if d['marca']=='PRIME')
    print(f'{year} - VISAT: R$ {visat_total:,.2f}, PRIME: R$ {prime_total:,.2f}, Total: R$ {visat_total+prime_total:,.2f}')

totals = {}
for d in data:
    key = f"{d['marca']} - {d['distribuidor']}"
    totals[key] = sum(d['monthly'].values())

sorted_t = sorted(totals.items(), key=lambda x: x[1], reverse=True)[:10]
print()
for name, val in sorted_t:
    print(f'{name}: R$ {val:,.2f}')
    
# States summary
state_totals = {}
for d in data:
    st = d['estado']
    state_totals[st] = state_totals.get(st, 0) + sum(d['monthly'].values())
print()
sorted_s = sorted(state_totals.items(), key=lambda x: x[1], reverse=True)[:10]
for name, val in sorted_s:
    print(f'{name}: R$ {val:,.2f}')
