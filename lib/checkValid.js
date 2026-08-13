const { ethers } = require("ethers");
const ecurveK1 = require("ecurve");
const ecurveBn = require("ecurve-bn256");

const { SMG_ABI, GPK_ABI } = require("./eth/abis");
const { hexToBuf } = require("./utils/bytes");
const { createLogger } = require("./utils/logger");
const { sha256ToScalarModN } = require("./crypto/hash");
const { TestLagrangeECC, TestLagrangeECCEcdsa, TestLagrangeECC340 } = require("./validate/tests");

async function checkValid({ groupId, smgAddr, gpkAddr, rpcUrl, verbose }) {
  const logger = createLogger({ verbose });

  if (!groupId || !smgAddr || !gpkAddr || !rpcUrl) {
    throw new Error("missing required params: groupId, smgAddr, gpkAddr, rpcUrl");
  }

  logger.log(`[checkValid] rpc=${rpcUrl}`);
  logger.log(`[checkValid] groupId=${groupId}`);
  logger.log(`[checkValid] smg=${smgAddr}`);
  logger.log(`[checkValid] gpk=${gpkAddr}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const smgSc = new ethers.Contract(smgAddr, SMG_ABI, provider);
  const gpkSc = new ethers.Contract(gpkAddr, GPK_ABI, provider);

  logger.log("[checkValid] fetching gpkCount...");
  const gpkCount = Number(await gpkSc.getGpkCount(groupId));
  if (!Number.isFinite(gpkCount) || gpkCount <= 0) {
    throw new Error(`invalid gpkCount=${gpkCount}`);
  }

  logger.log(`[checkValid] gpkCount=${gpkCount}`);

  const fetchCount = Math.min(3, gpkCount);

  logger.log(`[checkValid] fetching ${fetchCount} gpk values...`);

  const gpk = new Array(fetchCount);
  for (let i = 0; i < fetchCount; i++) {
    gpk[i] = await gpkSc.getGpkbyIndex(groupId, i);
    logger.log(`[checkValid] got gpk[${i}] (${hexToBuf(gpk[i]).length} bytes)`);
  }

  logger.log("[checkValid] fetching groupMap.smNumber...");
  const groupInfo = await gpkSc.groupMap(groupId);
  const smNumber = Number(groupInfo.smNumber);
  if (!Number.isFinite(smNumber) || smNumber <= 0) {
    throw new Error(`invalid smNumber=${smNumber}`);
  }

  logger.log(`[checkValid] smNumber=${smNumber}`);

  logger.log(`[checkValid] fetching gpkShares (gpkIndex=0..${fetchCount - 1}, smIndex=0..${smNumber - 1})...`);
  const gpkShares = Array.from({ length: fetchCount }, () => new Array(smNumber));
  for (let smIndex = 0; smIndex < smNumber; smIndex++) {
    if (smIndex === 0 || (smIndex + 1) % 10 === 0 || smIndex === smNumber - 1) {
      logger.log(`[checkValid] gpkShare progress: smIndex=${smIndex + 1}/${smNumber}`);
    }
    for (let gpkIndex = 0; gpkIndex < fetchCount; gpkIndex++) {
      gpkShares[gpkIndex][smIndex] = await gpkSc.getGpkSharebyIndex(groupId, smIndex, gpkIndex);
    }
  }

  logger.log("[checkValid] gpkShares fetched.");

  logger.log("[checkValid] fetching threshold...");
  const threshold = Number(await smgSc.getThresholdByGrpId(groupId));
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error(`invalid threshold=${threshold}`);
  }

  logger.log(`[checkValid] threshold=${threshold}`);

  const thresholds = [threshold, Math.floor(threshold / 2) + 1, threshold].slice(0, fetchCount);
  logger.log(`[checkValid] thresholds=${JSON.stringify(thresholds)}`);

  logger.log("[checkValid] fetching working PKs...");
  const wkingPks = new Array(smNumber);
  for (let smIndex = 0; smIndex < smNumber; smIndex++) {
    if (smIndex === 0 || (smIndex + 1) % 10 === 0 || smIndex === smNumber - 1) {
      logger.log(`[checkValid] workingPk progress: smIndex=${smIndex + 1}/${smNumber}`);
    }
    const info = await smgSc.getSelectedSmInfo(groupId, smIndex);
    wkingPks[smIndex] = info.PK;
  }

  logger.log("[checkValid] working PKs fetched.");

  const k1params = ecurveK1.getCurveByName("secp256k1");
  const bnparams = ecurveBn.getCurveByName("bn256g1");

  logger.log("[checkValid] computing xValues...");
  const xValuesK1 = wkingPks.map((pk) => sha256ToScalarModN(hexToBuf(pk), k1params.n));
  const xValuesBn = wkingPks.map((pk) => sha256ToScalarModN(hexToBuf(pk), bnparams.n));

  logger.log("[checkValid] running checks...");

  const results = [];
  const item = { grpId: groupId };

  for (let i = 0; i < fetchCount; i++) {
    let ok = false;

    if (i === 0) {
      ok = TestLagrangeECC(thresholds[i], xValuesBn, hexToBuf(gpk[i]), gpkShares[i].map(hexToBuf));
    } else if (i === 1) {
      ok = TestLagrangeECCEcdsa(thresholds[i], xValuesK1, hexToBuf(gpk[i]), gpkShares[i].map(hexToBuf));
    } else if (i === 2) {
      ok = TestLagrangeECC340(thresholds[i], xValuesK1, hexToBuf(gpk[i]), gpkShares[i].map(hexToBuf));
    }

    item[i] = ok;
    logger.log(`[checkValid] check index=${i} result=${ok}`);
  }

  logger.log("[checkValid] done.");

  results.push(item);

  return {
    grpId: groupId,
    gpkCount,
    smNumber,
    thresholds,
    results,
  };
}

module.exports = {
  checkValid,
};
