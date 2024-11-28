import { describe, expect, test } from "vitest";
import { cldLoader } from "./cldLoader";
import nodeRuntime from "./lib/node/cld3";

import { CldAsmModule } from "./cldAsmModule";
describe("loadModule", () => {
  test("should load module", async () => {
    expect(typeof nodeRuntime).toBe("function");
    const instance = await new Promise<CldAsmModule>((resolve) => {
      const v = nodeRuntime({
        onRuntimeInitialized: () => {
          resolve(v);
        },
      });
    });
    const cldFactory = cldLoader(instance);
    const cld = cldFactory.create(10);
    const result = cld.findLanguage("Hello, world! This is a test.");
    expect(result.language).toBe("en");
  });
});
