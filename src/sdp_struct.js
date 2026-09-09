class SdpStruct {
  constructor() {
    this.values = new Map();
    this.data = null;
    this.offset = 0;
  }

  get(key) {
    return this.values.get(key);
  }

  getLong(key) {
    const val = this.values.get(key);
    if (typeof val === 'number') return val;
    if (typeof val === 'bigint') return Number(val);
    return 0;
  }

  getString(key) {
    const val = this.values.get(key);
    if (typeof val === 'string') return val;
    return null;
  }

  getStruct(key) {
    const val = this.values.get(key);
    if (val instanceof SdpStruct) return val;
    return null;
  }

  getList(key) {
    const val = this.values.get(key);
    if (Array.isArray(val)) return val;
    return null;
  }

  getMap(key) {
    const val = this.values.get(key);
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof SdpStruct)) {
      return val;
    }
    return null;
  }

  has(key) {
    return this.values.has(key);
  }

  put(key, value) {
    this.values.set(key, value);
  }

  tags() {
    return this.values.keys();
  }

  raw() {
    if (!this.data) {
      this.build();
    }
    return this.data;
  }

  build() {
    const buffer = [];
    buffer.push(0x70);
    
    for (const [key, value] of this.values) {
      // Write key
      if (key < 15) {
        buffer.push(key);
      } else {
        buffer.push(0x0F);
        this.writeNumber(buffer, key);
      }
      
      // Write value based on type
      if (typeof value === 'number') {
        buffer.push(0x00);
        this.writeNumber(buffer, Math.abs(value));
        if (value < 0) {
          // Mark as negative by setting sign bit
          buffer[buffer.length - 2] = 0x01;
        }
      } else if (typeof value === 'string') {
        buffer.push(0x04);
        const bytes = Buffer.from(value, 'utf8');
        this.writeNumber(buffer, bytes.length);
        buffer.push(...bytes);
      } else if (value instanceof SdpStruct) {
        buffer.push(0x07);
        const raw = value.raw();
        for (let i = 1; i < raw.length - 1; i++) {
          buffer.push(raw[i]);
        }
        buffer.push(0x80);
      } else if (Array.isArray(value)) {
        buffer.push(0x05);
        this.writeNumber(buffer, value.length);
        for (const item of value) {
          const itemStruct = new SdpStruct();
          itemStruct.put(0, item);
          const itemData = itemStruct.raw();
          for (let i = 1; i < itemData.length - 1; i++) {
            buffer.push(itemData[i]);
          }
          buffer.push(0x80);
        }
      } else if (value && typeof value === 'object') {
        buffer.push(0x06);
        const entries = Object.entries(value);
        this.writeNumber(buffer, entries.length);
        for (const [k, v] of entries) {
          const keyStruct = new SdpStruct();
          keyStruct.put(0, k);
          const keyData = keyStruct.raw();
          for (let i = 1; i < keyData.length - 1; i++) {
            buffer.push(keyData[i]);
          }
          buffer.push(0x80);
          
          const valStruct = new SdpStruct();
          valStruct.put(0, v);
          const valData = valStruct.raw();
          for (let i = 1; i < valData.length - 1; i++) {
            buffer.push(valData[i]);
          }
          buffer.push(0x80);
        }
      }
    }
    
    buffer.push(0x80);
    this.data = Buffer.from(buffer);
    return this.data;
  }

  writeNumber(buffer, num) {
    const bytes = [];
    do {
      let byte = num & 0x7F;
      num >>>= 7;
      if (num > 0) byte |= 0x80;
      bytes.push(byte);
    } while (num > 0);
    buffer.push(...bytes);
  }

  readNumber(buffer, offset) {
    let result = 0;
    let shift = 0;
    let pos = offset;
    while (pos < buffer.length) {
      const byte = buffer[pos];
      result |= (byte & 0x7F) << shift;
      pos++;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return { value: result, nextOffset: pos };
  }

  static decode(data) {
    const struct = new SdpStruct();
    struct.data = data;
    struct.offset = 0;
    struct.unpack();
    return struct;
  }

  unpack() {
    this.values.clear();
    if (!this.data || this.data.length === 0) return this;
    
    this.offset = 1; // Skip STRUCT_BEGIN (0x70)
    
    while (this.offset < this.data.length) {
      const byte = this.data[this.offset];
      if (byte === 0x80) {
        this.offset++;
        break;
      }
      
      // Read key
      let key;
      if (byte === 0x0F) {
        this.offset++;
        const result = this.readNumber(this.data, this.offset);
        key = result.value;
        this.offset = result.nextOffset;
      } else {
        key = byte;
        this.offset++;
      }
      
      if (this.offset >= this.data.length) break;
      
      // Read type
      const type = this.data[this.offset];
      this.offset++;
      
      // Read value based on type
      let value;
      switch (type) {
        case 0x00: { // Positive integer
          const result = this.readNumber(this.data, this.offset);
          value = result.value;
          this.offset = result.nextOffset;
          break;
        }
        case 0x01: { // Negative integer
          const result = this.readNumber(this.data, this.offset);
          value = -result.value;
          this.offset = result.nextOffset;
          break;
        }
        case 0x04: { // String
          const lenResult = this.readNumber(this.data, this.offset);
          const len = lenResult.value;
          this.offset = lenResult.nextOffset;
          if (this.offset + len <= this.data.length) {
            value = this.data.toString('utf8', this.offset, this.offset + len);
            this.offset += len;
          }
          break;
        }
        case 0x07: { // Struct
          const struct = new SdpStruct();
          // Find the end of this struct
          let depth = 1;
          let pos = this.offset;
          while (pos < this.data.length && depth > 0) {
            if (this.data[pos] === 0x70) depth++;
            else if (this.data[pos] === 0x80) depth--;
            pos++;
          }
          if (depth === 0) {
            struct.data = this.data.slice(this.offset - 1, pos);
            struct.unpack();
            value = struct;
            this.offset = pos;
          }
          break;
        }
        default:
          // Unknown type, skip
          this.offset++;
          break;
      }
      
      if (value !== undefined) {
        this.values.set(key, value);
      }
    }
    
    return this;
  }

  static build(...args) {
    const struct = new SdpStruct();
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        struct.put(args[i], args[i + 1]);
      }
    }
    struct.build();
    return struct;
  }

  toString() {
    return `SdpStruct{${this.values.size} entries}`;
  }
}

module.exports = SdpStruct;