import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import archiver from "archiver";

export async function packageLambda(sourceDirectory, outputPath) {
  const source = resolve(sourceDirectory);
  const output = resolve(outputPath);

  await mkdir(resolve(output, ".."), { recursive: true });
  await rm(output, { force: true });

  await new Promise((resolvePromise, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const outputStream = createWriteStream(output);

    outputStream.on("close", resolvePromise);
    archive.on("error", reject);
    archive.pipe(outputStream);
    archive.directory(source, false);
    void archive.finalize();
  });

  console.log(`Created ${output}`);
}
