import os
import sys
import struct

def validate_ico(ico_path="src-tauri/icons/icon.ico"):
    if not os.path.exists(ico_path):
        print(f"ERROR: {ico_path} does not exist!")
        sys.exit(1)
        
    with open(ico_path, 'rb') as f:
        data = f.read()
        
    if len(data) < 6:
        print(f"ERROR: {ico_path} is too small to be a valid ICO file ({len(data)} bytes).")
        sys.exit(1)
        
    reserved, ico_type, count = struct.unpack('<HHH', data[:6])
    if reserved != 0 or ico_type != 1 or count == 0:
        print(f"ERROR: {ico_path} has an invalid ICO header (reserved={reserved}, type={ico_type}, count={count}).")
        sys.exit(1)
        
    print(f"Validating Windows ICO resource file: {ico_path} ({len(data)} bytes, {count} entries)...")
    
    for i in range(count):
        offset = 6 + i * 16
        if offset + 16 > len(data):
            print(f"ERROR: Truncated directory entry {i} in {ico_path}")
            sys.exit(1)
            
        w, h, colors, res, planes, bpp, size, img_offset = struct.unpack('<BBBBHHII', data[offset:offset+16])
        w = 256 if w == 0 else w
        h = 256 if h == 0 else h
        
        if img_offset + 40 > len(data):
            print(f"ERROR: Truncated image header at offset {img_offset} in {ico_path}")
            sys.exit(1)
            
        header = data[img_offset:img_offset+40]
        
        # Check for PNG chunk header in ICO
        if header.startswith(b'\x89PNG'):
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} is PNG-encoded!")
            print("Microsoft Windows Resource Compiler (RC.EXE) fails with 'RC2176 : old DIB' on PNG-encoded ICO entries.")
            print("Please regenerate the ICO file using 'npm run icons'.")
            sys.exit(1)
            
        biSize, biW, biH, biPlanes, biBitCount = struct.unpack('<IiiHH', header[:16])
        biComp, biSizeImage = struct.unpack('<II', header[16:24])
        
        if biSize != 40:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} has unexpected BITMAPINFOHEADER size ({biSize} != 40).")
            sys.exit(1)
            
        if biComp != 0:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} uses compression ({biComp} != BI_RGB).")
            sys.exit(1)
            
        print(f"  ✓ Entry {i}: {w}x{h} px | {biBitCount} bpp | Uncompressed BI_RGB DIB | Size: {size} B")
        
    print("SUCCESS: src-tauri/icons/icon.ico is a genuine, MSVC RC.EXE-compatible Windows ICO resource file.")

if __name__ == "__main__":
    ico_path = sys.argv[1] if len(sys.argv) > 1 else "src-tauri/icons/icon.ico"
    validate_ico(ico_path)
