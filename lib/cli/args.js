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

module.exports = {
  parseArgs,
};
