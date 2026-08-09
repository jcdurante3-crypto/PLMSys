import os
import sys
import zlib
import struct
import subprocess

def decode_png(filepath):
    if not os.path.exists(filepath):
        print(f"ERROR: Master PNG file not found at {filepath}")
        sys.exit(1)
        
    file_size = os.path.getsize(filepath)
    if file_size == 0:
        print(f"ERROR: Master PNG file {filepath} is empty (0 bytes).")
        sys.exit(1)

    with open(filepath, 'rb') as f:
        data = f.read()

    # Detect Git LFS pointer text file
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
        print(f"ERROR: {filepath} does not contain a valid PNG magic signature!")
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
        print(f"ERROR: {filepath} is missing IHDR chunk.")
        sys.exit(1)

    if not idat_chunks:
        print(f"ERROR: {filepath} is missing IDAT chunks.")
        sys.exit(1)

    if interlace != 0:
        print(f"ERROR: Interlaced PNGs are not supported. Please resave {filepath} as non-interlaced.")
        sys.exit(1)

    try:
        decompressed = zlib.decompress(b''.join(idat_chunks))
    except Exception as e:
        print(f"ERROR: Failed to decompress PNG IDAT chunks in {filepath}: {e}")
        sys.exit(1)

    bpp_map = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
    if color_type not in bpp_map:
        print(f"ERROR: Unsupported PNG color type {color_type} in {filepath}.")
        sys.exit(1)

    bpp = bpp_map[color_type]
    stride = width * bpp + 1
    expected_size = stride * height

    if len(decompressed) < expected_size:
        print(f"ERROR: Truncated PNG data in {filepath} (expected {expected_size} bytes, got {len(decompressed)}).")
        sys.exit(1)

    raw_rows = []
    prev_row = bytearray(width * bpp)

    for y in range(height):
        row_start = y * stride
        filter_type = decompressed[row_start]
        row_data = decompressed[row_start+1:row_start+stride]

        curr_row = bytearray(width * bpp)
        for x in range(width * bpp):
            filt = row_data[x]
            if filter_type == 0:
                val = filt
            elif filter_type == 1:
                left = curr_row[x - bpp] if x >= bpp else 0
                val = (filt + left) & 0xff
            elif filter_type == 2:
                up = prev_row[x]
                val = (filt + up) & 0xff
            elif filter_type == 3:
                left = curr_row[x - bpp] if x >= bpp else 0
                up = prev_row[x]
                val = (filt + (left + up) // 2) & 0xff
            elif filter_type == 4:
                left = curr_row[x - bpp] if x >= bpp else 0
                up = prev_row[x]
                upleft = prev_row[x - bpp] if x >= bpp else 0
                p = left + up - upleft
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - upleft)
                pr = left if (pa <= pb and pa <= pc) else (up if pb <= pc else upleft)
                val = (filt + pr) & 0xff
            else:
                print(f"ERROR: Unknown PNG filter type {filter_type} in {filepath}.")
                sys.exit(1)
            curr_row[x] = val

        raw_rows.append(curr_row)
        prev_row = curr_row

    rgba_pixels = bytearray(width * height * 4)
    out_idx = 0

    for y in range(height):
        row = raw_rows[y]
        for x in range(width):
            if color_type == 6:  # RGBA
                r, g, b, a = row[x*4], row[x*4+1], row[x*4+2], row[x*4+3]
            elif color_type == 2:  # RGB
                r, g, b, a = row[x*3], row[x*3+1], row[x*3+2], 255
            elif color_type == 0:  # Grayscale
                v = row[x]
                r, g, b, a = v, v, v, 255
            elif color_type == 3:  # Palette
                idx = row[x]
                if plte_chunk and idx * 3 + 2 < len(plte_chunk):
                    r, g, b = plte_chunk[idx*3], plte_chunk[idx*3+1], plte_chunk[idx*3+2]
                else:
                    r = g = b = 0
                a = trns_chunk[idx] if (trns_chunk and idx < len(trns_chunk)) else 255
            rgba_pixels[out_idx] = r
            rgba_pixels[out_idx+1] = g
            rgba_pixels[out_idx+2] = b
            rgba_pixels[out_idx+3] = a
            out_idx += 4

    return width, height, bytes(rgba_pixels)

def resample_rgba(src_w, src_h, src_pixels, dst_w, dst_h):
    if src_w == dst_w and src_h == dst_h:
        return src_pixels

    dst_pixels = bytearray(dst_w * dst_h * 4)
    x_ratio = src_w / dst_w
    y_ratio = src_h / dst_h

    for dy in range(dst_h):
        for dx in range(dst_w):
            sx_start = int(dx * x_ratio)
            sx_end = max(sx_start + 1, int((dx + 1) * x_ratio))
            sy_start = int(dy * y_ratio)
            sy_end = max(sy_start + 1, int((dy + 1) * y_ratio))

            r_sum = g_sum = b_sum = a_sum = count = 0
            for sy in range(sy_start, min(sy_end, src_h)):
                for sx in range(sx_start, min(sx_end, src_w)):
                    idx = (sy * src_w + sx) * 4
                    r_sum += src_pixels[idx]
                    g_sum += src_pixels[idx+1]
                    b_sum += src_pixels[idx+2]
                    a_sum += src_pixels[idx+3]
                    count += 1

            dst_idx = (dy * dst_w + dx) * 4
            if count > 0:
                dst_pixels[dst_idx] = r_sum // count
                dst_pixels[dst_idx+1] = g_sum // count
                dst_pixels[dst_idx+2] = b_sum // count
                dst_pixels[dst_idx+3] = a_sum // count

    return bytes(dst_pixels)

def make_dib_entry_32bit(w, h, rgba_bytes):
    xor_size = w * h * 4
    and_row_bytes = ((w + 31) // 32) * 4
    and_size = and_row_bytes * h
    bi_size_image = xor_size + and_size

    header = struct.pack('<IiiHHIIiiII',
        40,             # biSize
        w,              # biWidth
        2 * h,          # biHeight (MUST BE 2 * h for ICO DIB!)
        1,              # biPlanes
        32,             # biBitCount
        0,              # biCompression (BI_RGB)
        bi_size_image,  # biSizeImage
        0, 0,           # biXPelsPerMeter, biYPelsPerMeter
        0, 0            # biClrUsed, biClrImportant
    )

    xor_bytes = bytearray(xor_size)
    for y in range(h):
        src_y = y
        dst_y = h - 1 - y  # DIB rows are stored bottom-to-top
        for x in range(w):
            src_idx = (src_y * w + x) * 4
            dst_idx = (dst_y * w + x) * 4
            r = rgba_bytes[src_idx]
            g = rgba_bytes[src_idx+1]
            b = rgba_bytes[src_idx+2]
            a = rgba_bytes[src_idx+3]
            xor_bytes[dst_idx] = b
            xor_bytes[dst_idx+1] = g
            xor_bytes[dst_idx+2] = r
            xor_bytes[dst_idx+3] = a

    and_bytes = bytearray(and_size)
    for y in range(h):
        src_y = y
        dst_y = h - 1 - y
        for x in range(w):
            src_idx = (src_y * w + x) * 4
            a = rgba_bytes[src_idx+3]
            if a < 128:
                byte_idx = (dst_y * and_row_bytes) + (x // 8)
                bit_idx = 7 - (x % 8)
                and_bytes[byte_idx] |= (1 << bit_idx)

    return header + xor_bytes + and_bytes

def generate_icons(master_png="assets/app-icon.png", target_ico="src-tauri/icons/icon.ico"):
    if not os.path.exists(master_png):
        print(f"Error: Master PNG file not found at {master_png}")
        if os.path.exists(target_ico):
            os.remove(target_ico)
        sys.exit(1)

    # 1. Decode & validate Master PNG FIRST before attempting generation or touching target files
    print(f"Reading and validating Master PNG icon: {master_png}...")
    try:
        src_w, src_h, src_pixels = decode_png(master_png)
    except Exception as e:
        print(f"ERROR: Failed to decode Master PNG ({master_png}): {e}")
        if os.path.exists(target_ico):
            os.remove(target_ico)
        sys.exit(1)

    # 2. Try running Tauri CLI icon generation if available
    print(f"Running Tauri CLI icon generation from {master_png}...")
    try:
        use_shell = (os.name == 'nt')
        subprocess.run(["npx", "tauri", "icon", master_png], check=True, shell=use_shell)
    except Exception as e:
        print(f"Notice: npx tauri icon warning (continuing with custom MSVC ICO generator): {e}")

    # 3. Generate MSVC RC.EXE-compatible Windows ICO file from decoded pixels
    print(f"Generating MSVC RC.EXE-compatible Windows ICO file from {master_png}...")
    sizes = [16, 24, 32, 48, 64, 128, 256]

    image_chunks = []
    for size in sizes:
        resized_px = resample_rgba(src_w, src_h, src_pixels, size, size)
        chunk = make_dib_entry_32bit(size, size, resized_px)
        image_chunks.append(chunk)

    count = len(sizes)
    header = struct.pack('<HHH', 0, 1, count)

    dir_size = 6 + count * 16
    current_offset = dir_size

    dir_bytes = bytearray()
    for i, size in enumerate(sizes):
        chunk_len = len(image_chunks[i])
        w_byte = 0 if size == 256 else size
        h_byte = 0 if size == 256 else size
        bpp = 32
        planes = 1
        dir_bytes += struct.pack('<BBBBHHII',
            w_byte, h_byte, 0, 0, planes, bpp, chunk_len, current_offset
        )
        current_offset += chunk_len

    ico_file = header + dir_bytes + b''.join(image_chunks)

    os.makedirs(os.path.dirname(target_ico), exist_ok=True)
    tmp_ico = target_ico + ".tmp"
    with open(tmp_ico, 'wb') as f:
        f.write(ico_file)

    os.replace(tmp_ico, target_ico)
    print(f"Successfully generated MSVC RC.EXE compatible ICO file: {target_ico} ({len(ico_file)} bytes)")

if __name__ == "__main__":
    master_png = sys.argv[1] if len(sys.argv) > 1 else "assets/app-icon.png"
    target_ico = sys.argv[2] if len(sys.argv) > 2 else "src-tauri/icons/icon.ico"
    generate_icons(master_png, target_ico)
