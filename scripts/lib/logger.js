// One format for every script: "[step] message".
export function createLogger(step) {
  return {
    log: (msg) => console.log(`[${step}] ${msg}`),
    warn: (msg) => console.warn(`[${step}] WARN: ${msg}`),
    error: (msg) => console.error(`[${step}] ${msg}`),
    // Final line of every script.
    done: (msg) => console.log(`[${step}] done: ${msg}`),
  };
}

// Wraps a script's main function: logs "FAILED: reason" and exits 1 (see ARCHITECTURE.md).
export async function run(step, main) {
  const logger = createLogger(step);
  try {
    await main(logger);
  } catch (err) {
    logger.error(`FAILED: ${err.message}`);
    // exitCode, not exit(): exiting at once can crash Node on Windows while a socket is still closing.
    process.exitCode = 1;
  }
}
