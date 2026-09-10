import zipfile
import os

root_dir = os.path.abspath('.')

# 1. Package Frontend dist into frontend-dist.zip (Production static hosting)
dist_dir = os.path.join(root_dir, 'Frontend', 'dist')
frontend_zip_path = os.path.join(root_dir, 'frontend-dist.zip')

if os.path.exists(dist_dir):
    if os.path.exists(frontend_zip_path):
        os.remove(frontend_zip_path)

    with zipfile.ZipFile(frontend_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir).replace(os.sep, '/')
                zipf.write(full_path, rel_path)

    print(f"[OK] Successfully updated {frontend_zip_path} ({os.path.getsize(frontend_zip_path)} bytes)")

# 2. Package Backend into backend.zip (Production Node deployment)
backend_dir = os.path.join(root_dir, 'Backend')
backend_zip_path = os.path.join(root_dir, 'backend.zip')

if os.path.exists(backend_zip_path):
    os.remove(backend_zip_path)

backend_files_and_dirs = [
    ('Backend/src', 'src'),
    ('Backend/package.json', 'package.json'),
    ('Backend/package-lock.json', 'package-lock.json'),
    ('Backend/.env', '.env'),
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

# 3. Package Complete Source Code into Bharat_api_cloud_updated.zip
full_zip_path = os.path.join(root_dir, 'Bharat_api_cloud_updated.zip')
if os.path.exists(full_zip_path):
    os.remove(full_zip_path)

excluded_dirs = {'node_modules', '.git', '.cache', '.gemini', '.system_generated', 'dist'}
excluded_files = {'Bharat_api_cloud_updated.zip', 'frontend-dist.zip', 'backend.zip'}

with zipfile.ZipFile(full_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(root_dir):
        # Skip excluded dirs in-place
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        for file in files:
            if file in excluded_files or file.endswith('.tmp'):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir).replace(os.sep, '/')
            zipf.write(full_path, rel_path)

print(f"[OK] Successfully created Full Project Zip: {full_zip_path} ({os.path.getsize(full_zip_path)} bytes)")

# Remove any extra temporary zip files
for temp_zip in ['frontend_build.zip', 'backend_deploy.zip']:
    p = os.path.join(root_dir, temp_zip)
    if os.path.exists(p):
        os.remove(p)

