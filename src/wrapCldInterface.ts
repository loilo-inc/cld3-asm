import type { MainModule } from "./lib/node/cld3";

/**
 * @internal
 *
 * Wrap cld3 exported interfaces via cwrap for resuable mannter.
 */
export const wrapCldInterface = (cwrap: MainModule["cwrap"]) => ({
  /**
   * get size of struct for interop.
   *
   * int get_SizeLanguageResult()
   */
  sizeLanguageResult: cwrap("get_SizeLanguageResult", "number"),

  /**
   * Return unknown language identifier
   *
   * const char* get_UnknownIdentifier()
   */
  getUnknownIdentifier: cwrap("get_UnknownIdentifier", "number"),

  /**
   * Min number of bytes needed to make a prediction if the default constructoris called.
   *
   * int get_MinNumBytesDefault()
   */
  getMinNumBytesDefault: cwrap("get_MinNumBytesDefault", "number"),

  /**
   * Max number of bytes to consider to make a prediction if the default constructor is called.
   *
   * int get_MaxNumBytesDefault()
   */
  getMaxNumBytesDefault: cwrap("get_MaxNumBytesDefault", "number"),

  /**
   * Max number of input bytes to process.
   *
   * int get_MaxNumBytesInput()
   */
  getMaxNumBytesInput: cwrap("get_MaxNumBytesInput", "number"),

  /**
   * CldHandle* Cld_create(int min_num_bytes, int max_num_bytes)
   */
  create: cwrap("Cld_create", "number", ["number", "number"]),

  /**
   * void Cld_destroy(CldHandle* pCld)
   */
  destroy: cwrap("Cld_destroy", undefined, ["number"]),

  /**
   * void Cld_findLanguage(CldHandle* pCld, const char* text, LanguageResult* out_result)
   */
  findLanguage: cwrap("Cld_findLanguage", undefined, [
    "number",
    "number",
    "number",
  ]),

  /**
   * int Cld_findTopNMostFreqLangs(CldHandle* pCld, const char* text, int num_langs, LanguageResult** out_results)
   */
  findTopNMostFreqLangs: cwrap("Cld_findTopNMostFreqLangs", "number", [
    "number",
    "number",
    "number",
    "number",
  ]),
});
