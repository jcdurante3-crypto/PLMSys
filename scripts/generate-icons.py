import os
import sys
import zlib
import struct
import subprocess

def decode_png(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Not a PNG file')
    
    offset = 8
    width = height = bit_depth = color_type = compression = filter_method = interlace = None
    idat_chunks = []
    
    while offset < len(data):
        length, chunk_type = struct.unpack('>I4s', data[offset:offset+8])
        chunk_data = data[offset+8:offset+8+length]
        offset += 12 + length
        
        if chunk_type == b'IHDR':
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack('>IIBBBBB', chunk_data)
        elif chunk_type == b'IDAT':
            idat_chunks.append(chunk_data)
        elif chunk_type == b'IEND':
            break
            
    decompressed = zlib.decompress(b''.join(idat_chunks))
    stride = width * 4 + 1
    pixels = bytearray(width * height * 4)
    
    prev_row = bytearray(width * 4)
    for y in range(height):
        row_start = y * stride
        filter_type = decompressed[row_start]
        row_data = decompressed[row_start+1:row_start+stride]
        
        curr_row = bytearray(width * 4)
        for x in range(width * 4):
            filt = row_data[x]
            if filter_type == 0: val = filt
            elif filter_type == 1: val = (filt + (curr_row[x - 4] if x >= 4 else 0)) & 0xff
            elif filter_type == 2: val = (filt + prev_row[x]) & 0xff
            elif filter_type == 3: val = (filt + ((curr_row[x - 4] if x >= 4 else 0) + prev_row[x]) // 2) & 0xff
            elif filter_type == 4:
                left = curr_row[x - 4] if x >= 4 else 0
                up = prev_row[x]
                upleft = prev_row[x - 4] if x >= 4 else 0
                p = left + up - upleft
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - upleft)
                pr = left if (pa <= pb and pa <= pc) else (up if pb <= pc else upleft)
                val = (filt + pr) & 0xff
            curr_row[x] = val
            
        pixels[y*width*4:(y+1)*width*4] = curr_row
        prev_row = curr_row
        
    return width, height, bytes(pixels)

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
        sys.exit(1)

    print(f"Running Tauri CLI icon generation from {master_png}...")
    try:
        subprocess.run(["npx", "tauri", "icon", master_png], check=True)
    except Exception as e:
        print(f"Warning: npx tauri icon failed: {e}")

    print(f"Generating MSVC RC.EXE-compatible Windows ICO file from {master_png}...")
    src_w, src_h, src_pixels = decode_png(master_png)
    sizes = [16, 24, 32, 48, 64, 128]

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
        w_byte = size
        h_byte = size
        bpp = 32
        planes = 1
        dir_bytes += struct.pack('<BBBBHHII',
            w_byte, h_byte, 0, 0, planes, bpp, chunk_len, current_offset
        )
        current_offset += chunk_len

    ico_file = header + dir_bytes + b''.join(image_chunks)

    os.makedirs(os.path.dirname(target_ico), exist_ok=True)
    with open(target_ico, 'wb') as f:
        f.write(ico_file)

    print(f"Successfully generated MSVC RC.EXE compatible ICO file: {target_ico} ({len(ico_file)} bytes)")

if __name__ == "__main__":
    master_png = sys.argv[1] if len(sys.argv) > 1 else "assets/app-icon.png"
    target_ico = sys.argv[2] if len(sys.argv) > 2 else "src-tauri/icons/icon.ico"
    generate_icons(master_png, target_ico)
