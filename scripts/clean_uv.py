#!/usr/bin/env python3
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'Data' / 'weather_dataset_final.json'
OUT = DATA.with_name('weather_dataset_final.json')
BACKUP = DATA.with_name('weather_dataset_final.json.bak2')

print('Loading', DATA)
with open(DATA, 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

# backup
print('Writing backup', BACKUP)
with open(BACKUP, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

cleaned = {}
summary = {'total':0, 'suspicious':0}
for region, arr in data.items():
    newarr = []
    for rec in arr:
        summary['total'] += 1
        uv = None
        try:
            uv = float(rec.get('uv')) if rec.get('uv') is not None else None
        except Exception:
            uv = None
        cond = (rec.get('condition') or '').strip()
        if uv is not None and uv >= 8 and cond != 'Nắng':
            # nullify UV to avoid contaminating condition-based UV stats
            rec['uv_cleaned'] = rec.get('uv')
            rec['uv'] = None
            summary['suspicious'] += 1
        newarr.append(rec)
    cleaned[region] = newarr

print('Suspicious UV records:', summary['suspicious'], 'of', summary['total'])

print('Writing cleaned dataset to', OUT)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=2)

print('Done')