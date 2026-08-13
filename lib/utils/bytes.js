function hexToBuf(hex) {
  if (Buffer.isBuffer(hex)) return Buffer.from(hex);
  if (typeof hex !== "string") {
    throw new Error("expected hex string");
  }
  const h = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error("invalid hex length");
  return Buffer.from(h, "hex");
}

function normalize64Bytes(hexOrBuf) {
  const buf = Buffer.isBuffer(hexOrBuf) ? Buffer.from(hexOrBuf) : hexToBuf(hexOrBuf);
  if (buf.length !== 64) {
    throw new Error(`expected 64 bytes, got ${buf.length}`);
  }
  return buf;
}

function bytesEq64(a64, b64) {
  return Buffer.compare(a64, b64) === 0;
}

module.exports = {
  hexToBuf,
  normalize64Bytes,
  bytesEq64,
};
