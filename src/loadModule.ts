import { CldAsmModule } from "./cldAsmModule";
import { CldFactory } from "./cldFactory";
import { cldLoader } from "./cldLoader";

export async function loadModule({
  runtime,
}: {
  runtime: ({}: { onRuntimeInitialized: () => void }) => CldAsmModule;
}): Promise<CldFactory> {
  const instance = await new Promise<CldAsmModule>((resolve) => {
    const v = runtime({
      onRuntimeInitialized: () => resolve(v),
    });
  });
  return cldLoader(instance);
}
