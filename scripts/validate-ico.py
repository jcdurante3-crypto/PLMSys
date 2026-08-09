import os
import sys
import struct

def validate_ico(ico_path="src-tauri/icons/icon.ico"):
    if not os.path.exists(ico_path):
        print(f"ERROR: {ico_path} does not exist!")
        sys.exit(1)
        
    with open(ico_path, 'rb') as f:
        data = f.read()
        
    file_size = len(data)
    if file_size < 6:
        print(f"ERROR: {ico_path} is too small to be a valid ICO file ({file_size} bytes).")
        sys.exit(1)
        
    reserved, ico_type, count = struct.unpack('<HHH', data[:6])
    if reserved != 0:
        print(f"ERROR: {ico_path} reserved header field must be 0, found {reserved}.")
        sys.exit(1)
        
    if ico_type != 1:
        print(f"ERROR: {ico_path} header type must be 1 (ICO), found {ico_type}.")
        sys.exit(1)
        
    if count == 0:
        print(f"ERROR: {ico_path} contains 0 icon entries.")
        sys.exit(1)
        
    header_table_end = 6 + count * 16
    if header_table_end > file_size:
        print(f"ERROR: {ico_path} header claims {count} entries, requiring {header_table_end} bytes, but file is only {file_size} bytes.")
        sys.exit(1)
        
    print(f"Validating Windows ICO resource file: {ico_path} ({file_size} bytes, {count} entries)...")
    
    seen_offsets = set()
    ranges = []
    
    for i in range(count):
        offset = 6 + i * 16
        w_raw, h_raw, colors, res, planes, bpp, img_size, img_offset = struct.unpack('<BBBBHHII', data[offset:offset+16])
        
        w = 256 if w_raw == 0 else w_raw
        h = 256 if h_raw == 0 else h_raw
        
        if img_size == 0:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} has image size 0.")
            sys.exit(1)
            
        if img_offset < header_table_end:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} offset {img_offset} overlaps directory header.")
            sys.exit(1)
            
        if img_offset + img_size > file_size:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} image range [{img_offset}:{img_offset + img_size}] exceeds file size {file_size}.")
            sys.exit(1)
            
        if img_offset in seen_offsets:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} has duplicate offset {img_offset}.")
            sys.exit(1)
        seen_offsets.add(img_offset)
        
        ranges.append((img_offset, img_offset + img_size, i, w, h))
        
        if img_offset + 40 > file_size:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} truncated image header at offset {img_offset}.")
            sys.exit(1)
            
        header = data[img_offset:img_offset+40]
        
        # Check for PNG magic bytes (8 bytes: 89 50 4E 47 0D 0A 1A 0A)
        if header.startswith(b'\x89PNG'):
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} is PNG-encoded!")
            print("Microsoft Windows Resource Compiler (RC.EXE) fails with 'RC2176 : old DIB' on PNG-encoded ICO entries.")
            print("Please regenerate the ICO file using 'npm run icons'.")
            sys.exit(1)
            
        biSize, biWidth, biHeight, biPlanes, biBitCount = struct.unpack('<IiiHH', header[:16])
        biCompression, biSizeImage = struct.unpack('<II', header[16:24])
        
        if biSize != 40:
            print(f"ERROR: Entry {i} ({w}x{h}) in {ico_path} has unexpected BITMAPINFOHEADER size ({biSize} != 40).")
            print("This indicates a malformed or corrupted DIB header in the ICO file.")
            sys.exit(1)
            
        if biWidth != w:
            print(f"WARNING: Entry {i} DIB biWidth ({biWidth}) does not match directory width ({w}).")
            
        if biHeight != 2 * h:
            print(f"WARNING: Entry {i} DIB biHeight ({biHeight}) expected to be 2*h ({2*h}).")
            
        if biPlanes != 1:
            print(f"ERROR: Entry {i} DIB biPlanes ({biPlanes}) must be 1.")
            sys.exit(1)
            
        if biBitCount not in [1, 4, 8, 16, 24, 32]:
            print(f"ERROR: Entry {i} DIB biBitCount ({biBitCount}) is not a supported bit depth.")
            sys.exit(1)
            
        if biCompression not in [0, 3]:  # BI_RGB = 0, BI_BITFIELDS = 3
            print(f"ERROR: Entry {i} DIB biCompression ({biCompression}) must be BI_RGB (0) or BI_BITFIELDS (3).")
            sys.exit(1)
            
        print(f"  ✓ Entry {i}: {w}x{h} px | {biBitCount} bpp | Uncompressed BI_RGB DIB | Size: {img_size} B | Offset: {img_offset}")

    # Check for overlapping ranges
    ranges.sort(key=lambda r: r[0])
    for j in range(len(ranges) - 1):
        r1 = ranges[j]
        r2 = ranges[j+1]
        if r1[1] > r2[0]:
            print(f"ERROR: Entry {r1[2]} ({r1[3]}x{r1[4]}) range [{r1[0]}:{r1[1]}] overlaps Entry {r2[2]} ({r2[3]}x{r2[4]}) range [{r2[0]}:{r2[1]}].")
            sys.exit(1)
            
    print("SUCCESS: src-tauri/icons/icon.ico is a genuine, MSVC RC.EXE-compatible Windows ICO resource file.")

if __name__ == "__main__":
    ico_path = sys.argv[1] if len(sys.argv) > 1 else "src-tauri/icons/icon.ico"
    validate_ico(ico_path)
