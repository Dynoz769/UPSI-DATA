#!/usr/bin/env python3
"""Gabungkan src/ jadi satu fail Index.html untuk ditampal ke Google Apps Script.

Jangan edit Index.html terus. Edit fail dalam src/, kemudian jalankan:
    python3 apps-script/bina.py
"""
from pathlib import Path

DIR = Path(__file__).resolve().parent
SRC = DIR / 'src'

css = (SRC / 'gaya.css').read_text(encoding='utf-8')
body = (SRC / 'body.html').read_text(encoding='utf-8')
js = (SRC / 'app.js').read_text(encoding='utf-8')

html = f'''<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <base target="_top">
  <!-- Dijana oleh apps-script/bina.py daripada apps-script/src/. Jangan edit terus. -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
{css}  </style>
</head>
<body>
{body}
  <script>
{js}  </script>
</body>
</html>
'''

(DIR / 'Index.html').write_text(html, encoding='utf-8')
print(f'Index.html dijana ({len(html) // 1024} KB)')
