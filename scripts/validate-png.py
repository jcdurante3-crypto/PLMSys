import os
import sys
import zlib
import struct

def validate_png(filepath="assets/app-icon.png"):
    if not os.path.exists(filepath):
        print(f"ERROR: Master icon file not found at {filepath}")
        sys.exit(1)
        
    file_size = os.path.getsize(filepath)
    if file_size == 0:
        print(f"ERROR: Master icon file {filepath} is empty (0 bytes).")
        sys.exit(1)
        
    with open(filepath, 'rb') as f:
        data = f.read()
        
    # Check for Git LFS pointer
    if data.startswith(b'version https://git-lfs') or data.startswith(b'version https://'):
        text_sample = data[:200].decode('utf-8', errors='ignore').strip()
        print(f"ERROR: {filepath} is a Git LFS pointer file, not a binary PNG file!")
        print(f"File contents preview:\n{text_sample}")
        print("Please ensure Git LFS files are checked out in CI (e.g. actions/checkout with lfs: true).")
        sys.exit(1)
        
    # Check PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'
    if not data.startswith(png_sig):
        first_bytes = data[:16].hex(' ')
        print(f"ERROR: {filepath} does not contain a valid PNG signature!")
        print(f"Expected signature: {png_sig.hex(' ')}")
        print(f"Detected signature: {first_bytes}")
        sys.exit(1)
        
    offset = 8
    width = height = bit_depth = color_type = compression = filter_method = interlace = None
    idat_chunks = []
    plte_chunk = None
    trns_chunk = None
    
    while offset < len(data):
        if offset + 8 > len(data):
            break
        length, chunk_type = struct.unpack('>I4s', data[offset:offset+8])
        chunk_data = data[offset+8:offset+8+length]
        offset += 12 + length
        
        if chunk_type == b'IHDR':
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack('>IIBBBBB', chunk_data)
        elif chunk_type == b'PLTE':
            plte_chunk = chunk_data
        elif chunk_type == b'tRNS':
            trns_chunk = chunk_data
        elif chunk_type == b'IDAT':
            idat_chunks.append(chunk_data)
        elif chunk_type == b'IEND':
            break

    if width is None or height is None:
        print(f"ERROR: {filepath} is missing required IHDR header chunk.")
        sys.exit(1)
        
    if not idat_chunks:
        print(f"ERROR: {filepath} contains no IDAT image data chunks.")
        sys.exit(1)

    color_names = {
        0: "Grayscale",
        2: "RGB",
        3: "Palette/Indexed",
        4: "Grayscale + Alpha",
        6: "RGBA"
    }
    color_str = color_names.get(color_type, f"Unknown ({color_type})")

    print(f"Validating Master PNG icon: {filepath}")
    print(f"  ✓ File size: {file_size} bytes")
    print(f"  ✓ PNG signature: VALID")
    print(f"  ✓ Dimensions: {width}x{height} px")
    print(f"  ✓ Bit depth: {bit_depth}-bit")
    print(f"  ✓ Color type: {color_str}")
    print(f"  ✓ Interlace: {'Yes (Adam7)' if interlace != 0 else 'No (Standard)'}")
    print(f"  ✓ Git LFS pointer: NO (Binary asset)")

    if interlace != 0:
        print(f"ERROR: Interlaced PNGs are not supported. Please resave {filepath} as non-interlaced.")
        sys.exit(1)

    try:
        decompressed = zlib.decompress(b''.join(idat_chunks))
    except Exception as e:
        print(f"ERROR: Failed to decompress PNG IDAT chunks: {e}")
        sys.exit(1)

    bpp_map = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
    bpp = bpp_map.get(color_type, 4)
    stride = width * bpp + 1
    expected_size = stride * height

    if len(decompressed) < expected_size:
        print(f"ERROR: Truncated PNG image data (expected {expected_size} bytes decompressed, got {len(decompressed)}).")
        sys.exit(1)

    print(f"  ✓ IDAT decompression & pixel integrity: VALID ({len(decompressed)} decompressed bytes)")
    print("SUCCESS: Master PNG icon is valid and ready for icon generation.")

if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else "assets/app-icon.png"
    validate_png(filepath)
