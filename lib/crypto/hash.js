const crypto = require("crypto");
const BigInteger = require("bigi");

const { hexToBuf } = require("../utils/bytes");

function sha256ToScalarModN(pkBytes, nBigInteger) {
  const pkBuf = Buffer.isBuffer(pkBytes) ? Buffer.from(pkBytes) : hexToBuf(pkBytes);
  const h = crypto.createHash("sha256").update(pkBuf).digest();
  return BigInteger.fromBuffer(h).mod(nBigInteger);
}

module.exports = {
  sha256ToScalarModN,
};
