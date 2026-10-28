import shutil
import glob
import os

src_dir = "02_Rules"
dst_dir = os.path.join(".agent", "skills", "uml-designer", "references")
os.makedirs(dst_dir, exist_ok=True)

files = glob.glob(os.path.join(src_dir, "*.md"))
for f in files:
    fname = os.path.basename(f)
    dst_f = os.path.join(dst_dir, fname)
    shutil.copy(f, dst_f)
    print(f"Copied {fname} to {dst_dir}")

print("Rule synchronization complete.")
