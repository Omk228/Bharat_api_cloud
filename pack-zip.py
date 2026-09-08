import zipfile
import os

dist_dir = os.path.abspath('Frontend/dist')
zip_path = os.path.abspath('frontend-dist.zip')

if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            full_path = os.path.join(root, file)
            # Ensure Unix forward slashes for Linux compatibility (Hostinger)
            rel_path = os.path.relpath(full_path, dist_dir).replace(os.sep, '/')
            zipf.write(full_path, rel_path)

print(f"[OK] Successfully generated {zip_path} with Unix paths")
