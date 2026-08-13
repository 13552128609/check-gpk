#!/usr/bin/env node

const { parseArgs } = require("./lib/cli/args");
const { checkValid } = require("./lib/checkValid");

async function main() {
  const args = parseArgs(process.argv);

  const groupId = args.groupId;
  const smgAddr = args.smg;
  const gpkAddr = args.gpk;
  const rpcUrl = args.rpc;
  const verbose = args.verbose;

  if (!groupId || !smgAddr || !gpkAddr || !rpcUrl) {
    console.error("Usage: node main.js --groupId <0xbytes32> --smg <addr> --gpk <addr> --rpc <url>");
    process.exit(1);
  }

  const out = await checkValid({
    groupId,
    smgAddr,
    gpkAddr,
    rpcUrl,
    verbose,
  });

  console.log(JSON.stringify(out, null, 2));
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
  --rpc https://gwan-ssl.wandevs.org:56891 \
  --verbose 1
*/