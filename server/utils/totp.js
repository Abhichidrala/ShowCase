const crypto = require('crypto');

// Decodes a base32 string into a Buffer
function decodeBase32(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let cleaned = str.toUpperCase().replace(/=+$/, '');
  let val = 0;
  let count = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) continue; // skip invalid chars
    val = (val << 5) | idx;
    count += 5;
    if (count >= 8) {
      bytes.push((val >>> (count - 8)) & 255);
      count -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Encodes bytes into a base32 string
function encodeBase32(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

// Generates a 2FA secret (base32 and URI for QR code)
function generateSecret(username) {
  const rawSecret = crypto.randomBytes(10); // 80 bits
  const secret = encodeBase32(rawSecret);
  const otpauthUrl = `otpauth://totp/ShowcaseSaaS:${username}?secret=${secret}&issuer=ShowcaseSaaS`;
  return { secret, otpauthUrl };
}

// Verifies a TOTP token
function verifyTOTP(token, secret) {
  if (!token || !secret) return false;
  
  // Clean token
  const cleanToken = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const key = decodeBase32(secret);
  const epoch = Math.round(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);

  // Allow a window of +/- 1 time steps to account for clock drift
  for (let i = -1; i <= 1; i++) {
    const checkCounter = counter + i;
    
    // Create counter buffer (8 bytes, big-endian)
    const buffer = Buffer.alloc(8);
    let tmp = checkCounter;
    for (let j = 7; j >= 0; j--) {
      buffer[j] = tmp & 255;
      tmp = tmp >> 8;
    }

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 15;
    const binary =
      ((hash[offset] & 127) << 24) |
      ((hash[offset + 1] & 255) << 16) |
      ((hash[offset + 2] & 255) << 8) |
      (hash[offset + 3] & 255);

    const otp = binary % 1000000;
    const otpStr = otp.toString().padStart(6, '0');

    if (otpStr === cleanToken) {
      return true;
    }
  }
  return false;
}

module.exports = {
  generateSecret,
  verifyTOTP
};
