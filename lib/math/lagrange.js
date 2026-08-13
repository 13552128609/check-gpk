const BigInteger = require("bigi");

function modInv(a, n) {
  return a.modInverse(n);
}

function lagrangeCoeffAtZero(i, xs, n) {
  let num = BigInteger.ONE;
  let den = BigInteger.ONE;
  const xi = xs[i];

  for (let j = 0; j < xs.length; j++) {
    if (j === i) continue;
    const xj = xs[j];
    num = num.multiply(xj).mod(n);

    let diff = xj.subtract(xi).mod(n);
    if (diff.signum() < 0) diff = diff.add(n);
    den = den.multiply(diff).mod(n);
  }

  const denInv = modInv(den, n);
  return num.multiply(denInv).mod(n);
}

module.exports = {
  lagrangeCoeffAtZero,
};
