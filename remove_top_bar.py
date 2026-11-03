import os
import re

# 1. Update BassfitClientApp.tsx
tsx_path = r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\src\components\BassfitClientApp.tsx"
with open(tsx_path, "r", encoding="utf-8") as f:
    tsx = f.read()

top_bar_tsx = re.compile(
    r'\s*{\/\*\s*TOP ANNOUNCEMENT BAR\s*\*\/}\s*<div className="bg-\[#0F172A\] text-slate-300 text-xs py-1\.5 sm:py-2 px-3 sm:px-4 border-b border-slate-800">.*?<\/div>\s*<\/div>\s*',
    re.DOTALL
)

match_tsx = top_bar_tsx.search(tsx)
assert match_tsx, "Top bar not found in TSX"
tsx = tsx[:match_tsx.start()] + "\n\n" + tsx[match_tsx.end():]

# Verify balance in TSX
p_diff = tsx.count("(") - tsx.count(")")
b_diff = tsx.count("{") - tsx.count("}")
s_diff = tsx.count("[") - tsx.count("]")
print(f"TSX balance: P={p_diff}, B={b_diff}, S={s_diff}")
assert p_diff == 0 and b_diff == 0 and s_diff == 0

with open(tsx_path, "w", encoding="utf-8") as f:
    f.write(tsx)
print("BassfitClientApp.tsx top bar removed!")

# 2. Update all HTML files
html_files = [
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\index.html",
    r"C:\Users\valer\Desktop\Bassfit\VER_PAGINA_WEB_BASSFIT.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\bassfit-peru.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\preview-interactivo.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\bassfit.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\basstfit.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\VER_PAGINA_WEB_BASSFIT.html"
]

target_html_pattern = re.compile(
    r',\s*\/\*#__PURE__\*\/React\.createElement\("div",\s*\{\s*className:\s*"bg-\[#0F172A\] text-slate-300 text-xs py-1\.5 sm:py-2 px-3 sm:px-4 border-b border-slate-800".*?WhatsApp:\s*\+51 967 581 481"\)\)\)\)\)',
    re.DOTALL
)

for fp in html_files:
    if not os.path.exists(fp):
        continue
    with open(fp, "r", encoding="utf-8") as f:
        html = f.read()

    match_html = target_html_pattern.search(html)
    assert match_html, f"Top bar pattern not found in {fp}"
    new_html = html[:match_html.start()] + html[match_html.end():]

    p_diff = new_html.count("(") - new_html.count(")")
    b_diff = new_html.count("{") - new_html.count("}")
    s_diff = new_html.count("[") - new_html.count("]")
    print(f"{os.path.basename(fp)}: P_diff={p_diff}, B_diff={b_diff}, S_diff={s_diff}")
    assert p_diff == 0 and b_diff == 0 and s_diff == 0, f"Unbalanced in {fp}"

    with open(fp, "w", encoding="utf-8") as f:
        f.write(new_html)

print("All HTML files updated: Top blue bar completely removed!")
