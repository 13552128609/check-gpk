#!/usr/bin/env node

const { ethers } = require("ethers");
const crypto = require("crypto");
const BigInteger = require("bigi");
const ecurveK1 = require("ecurve");
const ecurveBn = require("ecurve-bn256");

const SMG_ABI = [
  "function getThresholdByGrpId(bytes32 groupId) view returns (uint256)",
  "function getSelectedSmInfo(bytes32 groupId, uint256 index) view returns (address wkAddr, bytes PK, bytes enodeId)",
];

const GPK_ABI = [
  "function getGpkCount(bytes32 groupId) view returns (uint256)",
  "function getGpkbyIndex(bytes32 groupId, uint8 gpkIndex) view returns (bytes)",
  "function getGpkSharebyIndex(bytes32 groupId, uint16 smIndex, uint8 gpkIndex) view returns (bytes)",
  "function groupMap(bytes32 groupId) view returns (bytes32 groupId_, uint16 round, uint32 ployCommitPeriod, uint32 defaultPeriod, uint32 negotiatePeriod, uint16 smNumber)",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!k || !k.startsWith("--")) continue;
    args[k.slice(2)] = v;
    i++;
  }
  return args;
}

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

function sha256ToScalarModN(pkBytes, nBigInteger) {
  const pkBuf = Buffer.isBuffer(pkBytes) ? Buffer.from(pkBytes) : hexToBuf(pkBytes);
  const h = crypto.createHash("sha256").update(pkBuf).digest();
  return BigInteger.fromBuffer(h).mod(nBigInteger);
}

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

function bytesEq64(a64, b64) {
  return Buffer.compare(a64, b64) === 0;
}

function TestLagrangeECC_bn256(threshold, xScalars, gpkValue, gpkSharesRow) {
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

async function main() {
  const args = parseArgs(process.argv);

  const groupId = args.groupId;
  const smgAddr = args.smg;
  const gpkAddr = args.gpk;
  const rpcUrl = args.rpc;

  if (!groupId || !smgAddr || !gpkAddr || !rpcUrl) {
    console.error("Usage: node main.js --groupId <0xbytes32> --smg <addr> --gpk <addr> --rpc <url>");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const smgSc = new ethers.Contract(smgAddr, SMG_ABI, provider);
  const gpkSc = new ethers.Contract(gpkAddr, GPK_ABI, provider);

  const gpkCount = Number(await gpkSc.getGpkCount(groupId));
  if (!Number.isFinite(gpkCount) || gpkCount <= 0) {
    throw new Error(`invalid gpkCount=${gpkCount}`);
  }

  const fetchCount = Math.min(3, gpkCount);

  const gpk = new Array(fetchCount);
  for (let i = 0; i < fetchCount; i++) {
    gpk[i] = await gpkSc.getGpkbyIndex(groupId, i);
  }

  const groupInfo = await gpkSc.groupMap(groupId);
  const smNumber = Number(groupInfo.smNumber);
  if (!Number.isFinite(smNumber) || smNumber <= 0) {
    throw new Error(`invalid smNumber=${smNumber}`);
  }

  const gpkShares = Array.from({ length: fetchCount }, () => new Array(smNumber));
  for (let smIndex = 0; smIndex < smNumber; smIndex++) {
    for (let gpkIndex = 0; gpkIndex < fetchCount; gpkIndex++) {
      gpkShares[gpkIndex][smIndex] = await gpkSc.getGpkSharebyIndex(groupId, smIndex, gpkIndex);
    }
  }

  const threshold = Number(await smgSc.getThresholdByGrpId(groupId));
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error(`invalid threshold=${threshold}`);
  }

  const thresholds = [threshold, Math.floor(threshold / 2) + 1, threshold].slice(0, fetchCount);

  const wkingPks = new Array(smNumber);
  for (let smIndex = 0; smIndex < smNumber; smIndex++) {
    const info = await smgSc.getSelectedSmInfo(groupId, smIndex);
    wkingPks[smIndex] = info.PK;
  }

  const k1params = ecurveK1.getCurveByName("secp256k1");
  const bnparams = ecurveBn.getCurveByName("bn256g1");
  const xValuesK1 = wkingPks.map((pk) => sha256ToScalarModN(hexToBuf(pk), k1params.n));
  const xValuesBn = wkingPks.map((pk) => sha256ToScalarModN(hexToBuf(pk), bnparams.n));

  const results = [];
  const item = { grpId: groupId };

  for (let i = 0; i < fetchCount; i++) {
    let ok = false;
    if (i === 0) {
      ok = TestLagrangeECC_bn256(thresholds[i], xValuesBn, hexToBuf(gpk[i]), gpkShares[i].map(hexToBuf));
    } else if (i === 1) {
      ok = TestLagrangeECCEcdsa(thresholds[i], xValuesK1, hexToBuf(gpk[i]), gpkShares[i].map(hexToBuf));
    } else if (i === 2) {
      ok = TestLagrangeECC340(thresholds[i], xValuesK1, hexToBuf(gpk[i]), gpkShares[i].map(hexToBuf));
    }
    item[i] = ok;
  }

  results.push(item);

  console.log(
    JSON.stringify(
      {
        grpId: groupId,
        gpkCount,
        smNumber,
        thresholds,
        results,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});

/*
node /home/jacob/wanchain/check-gpk/main.js \
  --groupId 0x000000000000000000000000000000000000000000000041726965735f303639 \
  --smg  0x1e7450d5d17338a348c5438546f0b4d0a5fbeab6 \
  --gpk 0xfc86ad558163c4933ebcfa217945af6e9a3bce06 \
  --rpc https://gwan-ssl.wandevs.org:56891
*/