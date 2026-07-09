import { fileURLToPath } from "node:url";

export { applySeed, main } from "./db/seed.js";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  import("./db/seed.js")
    .then(({ main }) => main())
    .catch((error: unknown) => {
      console.info('Seed Failure')
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
