import zipfile
import os

root_dir = os.path.abspath('.')

# 1. Package Frontend into frontend-dist.zip
dist_dir = os.path.join(root_dir, 'Frontend', 'dist')
frontend_zip_path = os.path.join(root_dir, 'frontend-dist.zip')

if os.path.exists(frontend_zip_path):
    os.remove(frontend_zip_path)

with zipfile.ZipFile(frontend_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dist_dir).replace(os.sep, '/')
            zipf.write(full_path, rel_path)

print(f"[OK] Successfully updated {frontend_zip_path} ({os.path.getsize(frontend_zip_path)} bytes)")

# 2. Package Backend into backend.zip
backend_dir = os.path.join(root_dir, 'Backend')
backend_zip_path = os.path.join(root_dir, 'backend.zip')

if os.path.exists(backend_zip_path):
    os.remove(backend_zip_path)

backend_files_and_dirs = [
    ('Backend/src', 'src'),
    ('Backend/package.json', 'package.json'),
    ('Backend/package-lock.json', 'package-lock.json'),
    ('Backend/.env.example', '.env.example'),
    ('Backend/export-db.js', 'export-db.js'),
    ('bharat_api_dump.sql', 'bharat_api_dump.sql')
]

with zipfile.ZipFile(backend_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for src_path, arc_name in backend_files_and_dirs:
        full_src = os.path.join(root_dir, src_path)
        if os.path.isdir(full_src):
            for root, dirs, files in os.walk(full_src):
                for file in files:
                    file_full = os.path.join(root, file)
                    rel = os.path.relpath(file_full, full_src).replace(os.sep, '/')
                    zipf.write(file_full, f"{arc_name}/{rel}")
        elif os.path.exists(full_src):
            zipf.write(full_src, arc_name)

print(f"[OK] Successfully updated {backend_zip_path} ({os.path.getsize(backend_zip_path)} bytes)")

# Remove any extra temporary zip files
for temp_zip in ['frontend_build.zip', 'backend_deploy.zip']:
    p = os.path.join(root_dir, temp_zip)
    if os.path.exists(p):
        os.remove(p)
