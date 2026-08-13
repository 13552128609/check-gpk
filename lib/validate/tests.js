const ecurveK1 = require("ecurve");
const ecurveBn = require("ecurve-bn256");

const { normalize64Bytes, bytesEq64 } = require("../utils/bytes");
const { pointTo64Bytes } = require("../ecc/points");
const { recoverGpkFromShares } = require("../ecc/recover");

function TestLagrangeECC(threshold, xScalars, gpkValue, gpkSharesRow) {
  const ecparams = ecurveBn.getCurveByName("bn256g1");
  const gpkBuf64 = normalize64Bytes(gpkValue);
  const shares64 = gpkSharesRow.map(normalize64Bytes);

  const recoveredPt = recoverGpkFromShares({
    shares64,
    xScalars,
    threshold,
    ec: ecurveBn,
    ecparams,
  });

  const recovered64 = pointTo64Bytes(recoveredPt);
  return bytesEq64(recovered64, gpkBuf64);
}

function TestLagrangeECCEcdsa(threshold, xScalars, gpkValue, gpkSharesRow) {
  const ecparams = ecurveK1.getCurveByName("secp256k1");
  const gpkBuf64 = normalize64Bytes(gpkValue);
  const shares64 = gpkSharesRow.map(normalize64Bytes);

  const recoveredPt = recoverGpkFromShares({
    shares64,
    xScalars,
    threshold,
    ec: ecurveK1,
    ecparams,
  });

  const recovered64 = pointTo64Bytes(recoveredPt);
  return bytesEq64(recovered64, gpkBuf64);
}

function TestLagrangeECC340(threshold, xScalars, gpkValue, gpkSharesRow) {
  const ecparams = ecurveK1.getCurveByName("secp256k1");
  const gpkBuf64 = normalize64Bytes(gpkValue);
  const shares64 = gpkSharesRow.map(normalize64Bytes);

  const recoveredPt = recoverGpkFromShares({
    shares64,
    xScalars,
    threshold,
    ec: ecurveK1,
    ecparams,
  });

  const recovered64 = pointTo64Bytes(recoveredPt);
  return bytesEq64(recovered64, gpkBuf64);
}

module.exports = {
  TestLagrangeECC,
  TestLagrangeECCEcdsa,
  TestLagrangeECC340,
};
