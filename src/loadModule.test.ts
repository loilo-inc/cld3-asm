import { describe, expect, test } from "vitest";
import nodeRuntime from "./lib/node/cld3";
import { loadModule } from "./loadModule";
describe("loadModule", () => {
  test("should load module", async () => {
    expect(typeof nodeRuntime).toBe("function");
    const cldFactory = await loadModule({ runtime: nodeRuntime });
    const cld = cldFactory.create(10);
    const result = cld.findLanguage("Hello, world! This is a test.");
    expect(result.language).toBe("en");
  });
});
