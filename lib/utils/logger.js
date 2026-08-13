function isVerboseEnabled(verbose) {
  if (verbose === true) return true;
  if (typeof verbose === "number") return verbose === 1;
  if (typeof verbose === "string") return verbose === "1" || verbose.toLowerCase() === "true";
  return false;
}

function createLogger({ verbose } = {}) {
  const enabled =
    isVerboseEnabled(verbose) ||
    isVerboseEnabled(process.env.CHECK_GPK_VERBOSE) ||
    isVerboseEnabled(process.env.VERBOSE);

  function log(msg) {
    if (!enabled) return;
    console.error(msg);
  }

  return {
    enabled,
    log,
  };
}

module.exports = {
  createLogger,
};
