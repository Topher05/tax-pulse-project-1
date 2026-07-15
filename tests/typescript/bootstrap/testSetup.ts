import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workerThreads = require("node:worker_threads") as {
  markAsUncloneable?: (value: unknown) => void;
};

if (typeof workerThreads.markAsUncloneable !== "function") {
  workerThreads.markAsUncloneable = () => undefined;
}
