"""Fail on clipped text or replacement glyphs in an exported evidence pack.
Run with a Python environment containing PyMuPDF; optional second arg renders pages.
"""
import sys, json, pathlib, fitz
source = pathlib.Path(sys.argv[1])
folder = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
if folder: folder.mkdir(parents=True, exist_ok=True)
doc = fitz.open(source)
issues = []
for index, page in enumerate(doc):
    if folder: page.get_pixmap(matrix=fitz.Matrix(1, 1)).save(folder / f"page-{index + 1}.png")
    if "\ufffd" in page.get_text(): issues.append(f"Page {index + 1}: replacement glyph")
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                x0, y0, x1, y1 = span["bbox"]
                if x0 < 0 or y0 < 0 or x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
                    issues.append(f"Page {index + 1}: clipped text: {span['text'][:50]}")
result = {"source": str(source), "pages": len(doc), "issues": issues}
if folder: (folder / "report.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result))
sys.exit(1 if issues else 0)
