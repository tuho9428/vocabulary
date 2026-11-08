"""Re-extract the pinned original PDF (developer-only dependency: pypdf==7.0.0)."""
from pathlib import Path
from hashlib import sha256
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
folder = root / "src/content/sources"
pdf = folder / "uscis-2025.pdf"
expected = "f280608c0fb6dc1eba344b4746a7ba52d02fe411fba30cedd4371819f0abe11c"
if sha256(pdf.read_bytes()).hexdigest() != expected:
    raise SystemExit("PDF changed: review the official source before updating the bank")
reader = PdfReader(pdf)
if len(reader.pages) != 19:
    raise SystemExit("Expected the reviewed 19-page M-1778 source")
text = "\n\f\n".join(page.extract_text() for page in reader.pages)
if sha256(text.encode("utf-8")).hexdigest() != "07fa5d35a16e8f316838a5e2589f5fbeaf3f30fd2c06d2ea0750206302735ab0":
    raise SystemExit("Extraction differs: use pypdf==7.0.0 and review before changing the pinned text")
(folder / "uscis-2025.txt").write_text(text, encoding="utf-8", newline="\n")
print("Extracted and verified 19 pages; run npm run import:uscis2025")
