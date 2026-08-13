const { pointFrom64Bytes } = require("./points");
const { lagrangeCoeffAtZero } = require("../math/lagrange");

function recoverGpkFromShares({ shares64, xScalars, threshold, ec, ecparams }) {
  const t = threshold;
  const n = ecparams.n;
  const xs = xScalars.slice(0, t);
  const pts = shares64.slice(0, t).map((b) => pointFrom64Bytes(b, ec, ecparams));

  let acc = null;
  for (let i = 0; i < t; i++) {
    const li = lagrangeCoeffAtZero(i, xs, n);
    const term = pts[i].multiply(li);
    acc = acc ? acc.add(term) : term;
  }
  return acc;
}

module.exports = {
  recoverGpkFromShares,
};
