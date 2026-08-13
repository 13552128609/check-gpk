const BigInteger = require("bigi");

function pointFrom64Bytes(buf64, ec, ecparams) {
  const x = BigInteger.fromBuffer(buf64.slice(0, 32));
  const y = BigInteger.fromBuffer(buf64.slice(32, 64));
  return ec.Point.fromAffine(ecparams, x, y);
}

function pointTo64Bytes(pt) {
  const enc = pt.getEncoded(false);
  if (enc.length !== 65 || enc[0] !== 0x04) {
    throw new Error("unexpected point encoding");
  }
  return Buffer.from(enc.slice(1));
}

module.exports = {
  pointFrom64Bytes,
  pointTo64Bytes,
};
