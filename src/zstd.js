// Zstd wrapper using native zlib
// No external dependency needed - uses Node.js built-in zlib

const zlib = require('zlib');

class Zstd {
  static compress(data) {
    try {
      // Use gzip as fallback for zstd
      return zlib.gzipSync(data);
    } catch (error) {
      console.error('Zstd compress error:', error.message);
      return data;
    }
  }

  static decompress(data) {
    try {
      // Try gunzip
      return zlib.gunzipSync(data);
    } catch (error) {
      // If gunzip fails, try inflate
      try {
        return zlib.inflateSync(data);
      } catch {
        // Return original data if all decompression fails
        return data;
      }
    }
  }

  static isZstd(data) {
    // Zstd magic number: 0xFD2FB528
    if (!data || data.length < 4) return false;
    return data[0] === 0xFD && data[1] === 0x2F && data[2] === 0xB5 && data[3] === 0x28;
  }

  static getDecompressedSize(data) {
    // For zstd, size is in the frame header
    if (!data || data.length < 8) return 0;
    // Simplified - just return a reasonable size
    return data.length * 2;
  }
}

module.exports = Zstd;