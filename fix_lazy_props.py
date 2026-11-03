import os
import re

html_files = [
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\index.html",
    r"C:\Users\valer\Desktop\Bassfit\VER_PAGINA_WEB_BASSFIT.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\bassfit-peru.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\preview-interactivo.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\bassfit.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\basstfit.html",
    r"C:\Users\valer\Desktop\Bassfit\bassfit-headless\public\VER_PAGINA_WEB_BASSFIT.html"
]

for fp in html_files:
    if not os.path.exists(fp):
        continue
    with open(fp, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix: remove broken loading/decoding inside resolveImg(...)
    # e.g.: resolveImg(\n    loading: "lazy",\n    decoding: "async",\n    
    content = re.sub(
        r'resolveImg\(\s*loading:\s*"lazy",\s*decoding:\s*"async",\s*',
        'resolveImg(',
        content
    )

    # Now correctly put loading: "lazy", decoding: "async" inside the props object:
    # /*#__PURE__*/React.createElement("img", {\n  src: resolveImg
    # -> /*#__PURE__*/React.createElement("img", {\n  loading: "lazy",\n  decoding: "async",\n  src: resolveImg
    content = re.sub(
        r'(\/\*#__PURE__\*\/React\.createElement\("img",\s*\{)(\s*\n\s*src:\s*resolveImg)',
        r'\1\n  loading: "lazy",\n  decoding: "async",\2',
        content
    )

    # Balance check
    p_diff = content.count("(") - content.count(")")
    b_diff = content.count("{") - content.count("}")
    s_diff = content.count("[") - content.count("]")
    print(f"{os.path.basename(fp)}: P_diff={p_diff}, B_diff={b_diff}, S_diff={s_diff}")
    assert p_diff == 0 and b_diff == 0 and s_diff == 0, f"Unbalanced brackets in {fp}"

    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

print("All HTML files fixed with correct JS props!")

