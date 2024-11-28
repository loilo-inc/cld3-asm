import type { CldAsmRuntime } from "./cldAsmModule";
import type { CldFactory } from "./cldFactory";
import { cldLoader } from "./cldLoader";
import type { MainModule } from "./lib/node/cld3";

export async function loadModule({
  runtime,
  logger,
}: {
  logger?: Console;
  runtime: CldAsmRuntime;
}): Promise<CldFactory> {
  return runtime().then((Module: MainModule) => {
    return cldLoader(Module, logger);
  });
}
