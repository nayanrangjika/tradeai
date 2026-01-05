
/* Pure JS TOTP Generator (HMAC-SHA1) */

const sha1 = (params: Uint8Array): Uint8Array => {
  const M = new Uint8Array(params);
  const len = M.length * 8;
  const N = Math.ceil((len + 1 + 64) / 512);
  const M_padded = new Uint8Array(N * 64);
  M_padded.set(M);
  M_padded[M.length] = 0x80;
  
  const view = new DataView(M_padded.buffer);
  view.setUint32(M_padded.length - 4, len, false); // Append length in bits

  const H = new Uint32Array([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]);
  
  const W = new Uint32Array(80);

  for (let i = 0; i < N; i++) {
    const offset = i * 64;
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(offset + t * 4, false);
    }
    for (let t = 16; t < 80; t++) {
      const v = W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16];
      W[t] = (v << 1) | (v >>> 31);
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4];

    for (let t = 0; t < 80; t++) {
      let s, k;
      if (t < 20) {
        s = (b & c) | ((~b) & d);
        k = 0x5A827999;
      } else if (t < 40) {
        s = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (t < 60) {
        s = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        s = b ^ c ^ d;
        k = 0xCA62C1D6;
      }

      const temp = ((a << 5) | (a >>> 27)) + s + e + k + W[t];
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, H[0], false);
  resView.setUint32(4, H[1], false);
  resView.setUint32(8, H[2], false);
  resView.setUint32(12, H[3], false);
  resView.setUint32(16, H[4], false);
  return result;
};

const hmacSha1 = (key: Uint8Array, message: Uint8Array): Uint8Array => {
  let K = new Uint8Array(key);
  if (K.length > 64) {
    K = sha1(K);
  }
  if (K.length < 64) {
    const temp = new Uint8Array(64);
    temp.set(K);
    K = temp;
  }

  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = K[i] ^ 0x36;
    opad[i] = K[i] ^ 0x5C;
  }

  const inner = new Uint8Array(64 + message.length);
  inner.set(ipad);
  inner.set(message, 64);
  const innerHash = sha1(inner);

  const outer = new Uint8Array(64 + 20);
  outer.set(opad);
  outer.set(innerHash, 64);
  return sha1(outer);
};

export const generateTotp = (secret: string): string => {
  // Base32 Decode
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let cleanSecret = secret.replace(/\s/g, '').toUpperCase().replace(/=+$/, '');
  
  let bits = "";
  for(let i = 0; i < cleanSecret.length; i++) {
    const val = alphabet.indexOf(cleanSecret.charAt(i));
    if(val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for(let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i*8, 8), 2);
  }

  // Counter
  const epoch = Math.round(new Date().getTime() / 1000.0);
  const time = Math.floor(epoch / 30);
  
  const msg = new Uint8Array(8);
  const view = new DataView(msg.buffer);
  view.setUint32(4, time, false);

  // HMAC
  const hash = hmacSha1(bytes, msg);

  // Truncate
  const offset = hash[19] & 0xf;
  const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
};
