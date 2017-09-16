var Module = function(Module) {
  Module = Module || {};
  var Module = Module;

  var Module;
  if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};
  var moduleOverrides = {};
  for (var key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key];
    }
  }
  var ENVIRONMENT_IS_WEB = false;
  var ENVIRONMENT_IS_WORKER = false;
  var ENVIRONMENT_IS_NODE = false;
  var ENVIRONMENT_IS_SHELL = false;
  if (Module['ENVIRONMENT']) {
    if (Module['ENVIRONMENT'] === 'WEB') {
      ENVIRONMENT_IS_WEB = true;
    } else if (Module['ENVIRONMENT'] === 'WORKER') {
      ENVIRONMENT_IS_WORKER = true;
    } else if (Module['ENVIRONMENT'] === 'NODE') {
      ENVIRONMENT_IS_NODE = true;
    } else if (Module['ENVIRONMENT'] === 'SHELL') {
      ENVIRONMENT_IS_SHELL = true;
    } else {
      throw new Error(
        "The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL."
      );
    }
  } else {
    ENVIRONMENT_IS_WEB = typeof window === 'object';
    ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
    ENVIRONMENT_IS_NODE =
      typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
  }
  if (ENVIRONMENT_IS_NODE) {
    if (!Module['print']) Module['print'] = console.log;
    if (!Module['printErr']) Module['printErr'] = console.warn;
    var nodeFS;
    var nodePath;
    Module['read'] = function shell_read(filename, binary) {
      if (!nodeFS) nodeFS = require('fs');
      if (!nodePath) nodePath = require('path');
      filename = nodePath['normalize'](filename);
      var ret = nodeFS['readFileSync'](filename);
      return binary ? ret : ret.toString();
    };
    Module['readBinary'] = function readBinary(filename) {
      var ret = Module['read'](filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret);
      }
      assert(ret.buffer);
      return ret;
    };
    Module['load'] = function load(f) {
      globalEval(read(f));
    };
    if (!Module['thisProgram']) {
      if (process['argv'].length > 1) {
        Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
      } else {
        Module['thisProgram'] = 'unknown-program';
      }
    }
    Module['arguments'] = process['argv'].slice(2);
    if (typeof module !== 'undefined') {
      module['exports'] = Module;
    }
    process['on']('uncaughtException', function(ex) {
      if (!(ex instanceof ExitStatus)) {
        throw ex;
      }
    });
    Module['inspect'] = function() {
      return '[Emscripten Module object]';
    };
  } else if (ENVIRONMENT_IS_SHELL) {
    if (!Module['print']) Module['print'] = print;
    if (typeof printErr != 'undefined') Module['printErr'] = printErr;
    if (typeof read != 'undefined') {
      Module['read'] = read;
    } else {
      Module['read'] = function shell_read() {
        throw 'no read() available';
      };
    }
    Module['readBinary'] = function readBinary(f) {
      if (typeof readbuffer === 'function') {
        return new Uint8Array(readbuffer(f));
      }
      var data = read(f, 'binary');
      assert(typeof data === 'object');
      return data;
    };
    if (typeof scriptArgs != 'undefined') {
      Module['arguments'] = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
    if (typeof quit === 'function') {
      Module['quit'] = function(status, toThrow) {
        quit(status);
      };
    }
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module['read'] = function shell_read(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      Module['readBinary'] = function readBinary(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    Module['readAsync'] = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
        } else {
          onerror();
        }
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
    if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
    if (typeof console !== 'undefined') {
      if (!Module['print'])
        Module['print'] = function shell_print(x) {
          console.log(x);
        };
      if (!Module['printErr'])
        Module['printErr'] = function shell_printErr(x) {
          console.warn(x);
        };
    } else {
      var TRY_USE_DUMP = false;
      if (!Module['print'])
        Module['print'] =
          TRY_USE_DUMP && typeof dump !== 'undefined'
            ? function(x) {
                dump(x);
              }
            : function(x) {};
    }
    if (ENVIRONMENT_IS_WORKER) {
      Module['load'] = importScripts;
    }
    if (typeof Module['setWindowTitle'] === 'undefined') {
      Module['setWindowTitle'] = function(title) {
        document.title = title;
      };
    }
  } else {
    throw 'Unknown runtime environment. Where are we?';
  }
  function globalEval(x) {
    eval.call(null, x);
  }
  if (!Module['load'] && Module['read']) {
    Module['load'] = function load(f) {
      globalEval(Module['read'](f));
    };
  }
  if (!Module['print']) {
    Module['print'] = function() {};
  }
  if (!Module['printErr']) {
    Module['printErr'] = Module['print'];
  }
  if (!Module['arguments']) {
    Module['arguments'] = [];
  }
  if (!Module['thisProgram']) {
    Module['thisProgram'] = './this.program';
  }
  if (!Module['quit']) {
    Module['quit'] = function(status, toThrow) {
      throw toThrow;
    };
  }
  Module.print = Module['print'];
  Module.printErr = Module['printErr'];
  Module['preRun'] = [];
  Module['postRun'] = [];
  for (var key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key];
    }
  }
  moduleOverrides = undefined;
  var Runtime = {
    setTempRet0: function(value) {
      tempRet0 = value;
      return value;
    },
    getTempRet0: function() {
      return tempRet0;
    },
    stackSave: function() {
      return STACKTOP;
    },
    stackRestore: function(stackTop) {
      STACKTOP = stackTop;
    },
    getNativeTypeSize: function(type) {
      switch (type) {
        case 'i1':
        case 'i8':
          return 1;
        case 'i16':
          return 2;
        case 'i32':
          return 4;
        case 'i64':
          return 8;
        case 'float':
          return 4;
        case 'double':
          return 8;
        default: {
          if (type[type.length - 1] === '*') {
            return Runtime.QUANTUM_SIZE;
          } else if (type[0] === 'i') {
            var bits = parseInt(type.substr(1));
            assert(bits % 8 === 0);
            return bits / 8;
          } else {
            return 0;
          }
        }
      }
    },
    getNativeFieldSize: function(type) {
      return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
    },
    STACK_ALIGN: 16,
    prepVararg: function(ptr, type) {
      if (type === 'double' || type === 'i64') {
        if (ptr & 7) {
          assert((ptr & 7) === 4);
          ptr += 4;
        }
      } else {
        assert((ptr & 3) === 0);
      }
      return ptr;
    },
    getAlignSize: function(type, size, vararg) {
      if (!vararg && (type == 'i64' || type == 'double')) return 8;
      if (!type) return Math.min(size, 8);
      return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
    },
    dynCall: function(sig, ptr, args) {
      if (args && args.length) {
        return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
      } else {
        return Module['dynCall_' + sig].call(null, ptr);
      }
    },
    functionPointers: [],
    addFunction: function(func) {
      for (var i = 0; i < Runtime.functionPointers.length; i++) {
        if (!Runtime.functionPointers[i]) {
          Runtime.functionPointers[i] = func;
          return 2 * (1 + i);
        }
      }
      throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
    },
    removeFunction: function(index) {
      Runtime.functionPointers[(index - 2) / 2] = null;
    },
    warnOnce: function(text) {
      if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
      if (!Runtime.warnOnce.shown[text]) {
        Runtime.warnOnce.shown[text] = 1;
        Module.printErr(text);
      }
    },
    funcWrappers: {},
    getFuncWrapper: function(func, sig) {
      assert(sig);
      if (!Runtime.funcWrappers[sig]) {
        Runtime.funcWrappers[sig] = {};
      }
      var sigCache = Runtime.funcWrappers[sig];
      if (!sigCache[func]) {
        if (sig.length === 1) {
          sigCache[func] = function dynCall_wrapper() {
            return Runtime.dynCall(sig, func);
          };
        } else if (sig.length === 2) {
          sigCache[func] = function dynCall_wrapper(arg) {
            return Runtime.dynCall(sig, func, [arg]);
          };
        } else {
          sigCache[func] = function dynCall_wrapper() {
            return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
          };
        }
      }
      return sigCache[func];
    },
    getCompilerSetting: function(name) {
      throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
    },
    stackAlloc: function(size) {
      var ret = STACKTOP;
      STACKTOP = (STACKTOP + size) | 0;
      STACKTOP = (STACKTOP + 15) & -16;
      return ret;
    },
    staticAlloc: function(size) {
      var ret = STATICTOP;
      STATICTOP = (STATICTOP + size) | 0;
      STATICTOP = (STATICTOP + 15) & -16;
      return ret;
    },
    dynamicAlloc: function(size) {
      var ret = HEAP32[DYNAMICTOP_PTR >> 2];
      var end = ((ret + size + 15) | 0) & -16;
      HEAP32[DYNAMICTOP_PTR >> 2] = end;
      if (end >= TOTAL_MEMORY) {
        var success = enlargeMemory();
        if (!success) {
          HEAP32[DYNAMICTOP_PTR >> 2] = ret;
          return 0;
        }
      }
      return ret;
    },
    alignMemory: function(size, quantum) {
      var ret = (size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16));
      return ret;
    },
    makeBigInt: function(low, high, unsigned) {
      var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * 4294967296 : +(low >>> 0) + +(high | 0) * 4294967296;
      return ret;
    },
    GLOBAL_BASE: 1024,
    QUANTUM_SIZE: 4,
    __dummy__: 0
  };
  Module['Runtime'] = Runtime;
  var ABORT = 0;
  var EXITSTATUS = 0;
  function assert(condition, text) {
    if (!condition) {
      abort('Assertion failed: ' + text);
    }
  }
  function getCFunc(ident) {
    var func = Module['_' + ident];
    if (!func) {
      try {
        func = eval('_' + ident);
      } catch (e) {}
    }
    assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
    return func;
  }
  var cwrap, ccall;
  (function() {
    var JSfuncs = {
      stackSave: function() {
        Runtime.stackSave();
      },
      stackRestore: function() {
        Runtime.stackRestore();
      },
      arrayToC: function(arr) {
        var ret = Runtime.stackAlloc(arr.length);
        writeArrayToMemory(arr, ret);
        return ret;
      },
      stringToC: function(str) {
        var ret = 0;
        if (str !== null && str !== undefined && str !== 0) {
          var len = (str.length << 2) + 1;
          ret = Runtime.stackAlloc(len);
          stringToUTF8(str, ret, len);
        }
        return ret;
      }
    };
    var toC = { string: JSfuncs['stringToC'], array: JSfuncs['arrayToC'] };
    ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = Runtime.stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      if (returnType === 'string') ret = Pointer_stringify(ret);
      if (stack !== 0) {
        if (opts && opts.async) {
          EmterpreterAsync.asyncFinalizers.push(function() {
            Runtime.stackRestore(stack);
          });
          return;
        }
        Runtime.stackRestore(stack);
      }
      return ret;
    };
    var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
    function parseJSFunc(jsfunc) {
      var parsed = jsfunc
        .toString()
        .match(sourceRegex)
        .slice(1);
      return { arguments: parsed[0], body: parsed[1], returnValue: parsed[2] };
    }
    var JSsource = null;
    function ensureJSsource() {
      if (!JSsource) {
        JSsource = {};
        for (var fun in JSfuncs) {
          if (JSfuncs.hasOwnProperty(fun)) {
            JSsource[fun] = parseJSFunc(JSfuncs[fun]);
          }
        }
      }
    }
    cwrap = function cwrap(ident, returnType, argTypes) {
      argTypes = argTypes || [];
      var cfunc = getCFunc(ident);
      var numericArgs = argTypes.every(function(type) {
        return type === 'number';
      });
      var numericRet = returnType !== 'string';
      if (numericRet && numericArgs) {
        return cfunc;
      }
      var argNames = argTypes.map(function(x, i) {
        return '$' + i;
      });
      var funcstr = '(function(' + argNames.join(',') + ') {';
      var nargs = argTypes.length;
      if (!numericArgs) {
        ensureJSsource();
        funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
        for (var i = 0; i < nargs; i++) {
          var arg = argNames[i],
            type = argTypes[i];
          if (type === 'number') continue;
          var convertCode = JSsource[type + 'ToC'];
          funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
          funcstr += convertCode.body + ';';
          funcstr += arg + '=(' + convertCode.returnValue + ');';
        }
      }
      var cfuncname = parseJSFunc(function() {
        return cfunc;
      }).returnValue;
      funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
      if (!numericRet) {
        var strgfy = parseJSFunc(function() {
          return Pointer_stringify;
        }).returnValue;
        funcstr += 'ret = ' + strgfy + '(ret);';
      }
      if (!numericArgs) {
        ensureJSsource();
        funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
      }
      funcstr += 'return ret})';
      return eval(funcstr);
    };
  })();
  Module['ccall'] = ccall;
  Module['cwrap'] = cwrap;
  function setValue(ptr, value, type, noSafe) {
    type = type || 'i8';
    if (type.charAt(type.length - 1) === '*') type = 'i32';
    switch (type) {
      case 'i1':
        HEAP8[ptr >> 0] = value;
        break;
      case 'i8':
        HEAP8[ptr >> 0] = value;
        break;
      case 'i16':
        HEAP16[ptr >> 1] = value;
        break;
      case 'i32':
        HEAP32[ptr >> 2] = value;
        break;
      case 'i64':
        (tempI64 = [
          value >>> 0,
          ((tempDouble = value),
          +Math_abs(tempDouble) >= 1
            ? tempDouble > 0
              ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0
              : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[ptr >> 2] = tempI64[0]),
          (HEAP32[(ptr + 4) >> 2] = tempI64[1]);
        break;
      case 'float':
        HEAPF32[ptr >> 2] = value;
        break;
      case 'double':
        HEAPF64[ptr >> 3] = value;
        break;
      default:
        abort('invalid type for setValue: ' + type);
    }
  }
  Module['setValue'] = setValue;
  function getValue(ptr, type, noSafe) {
    type = type || 'i8';
    if (type.charAt(type.length - 1) === '*') type = 'i32';
    switch (type) {
      case 'i1':
        return HEAP8[ptr >> 0];
      case 'i8':
        return HEAP8[ptr >> 0];
      case 'i16':
        return HEAP16[ptr >> 1];
      case 'i32':
        return HEAP32[ptr >> 2];
      case 'i64':
        return HEAP32[ptr >> 2];
      case 'float':
        return HEAPF32[ptr >> 2];
      case 'double':
        return HEAPF64[ptr >> 3];
      default:
        abort('invalid type for setValue: ' + type);
    }
    return null;
  }
  Module['getValue'] = getValue;
  var ALLOC_NORMAL = 0;
  var ALLOC_STACK = 1;
  var ALLOC_STATIC = 2;
  var ALLOC_DYNAMIC = 3;
  var ALLOC_NONE = 4;
  Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
  Module['ALLOC_STACK'] = ALLOC_STACK;
  Module['ALLOC_STATIC'] = ALLOC_STATIC;
  Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
  Module['ALLOC_NONE'] = ALLOC_NONE;
  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === 'number') {
      zeroinit = true;
      size = slab;
    } else {
      zeroinit = false;
      size = slab.length;
    }
    var singleType = typeof types === 'string' ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
      ret = ptr;
    } else {
      ret = [
        typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc,
        Runtime.stackAlloc,
        Runtime.staticAlloc,
        Runtime.dynamicAlloc
      ][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
    }
    if (zeroinit) {
      var ptr = ret,
        stop;
      assert((ret & 3) == 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0;
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0;
      }
      return ret;
    }
    if (singleType === 'i8') {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret);
      } else {
        HEAPU8.set(new Uint8Array(slab), ret);
      }
      return ret;
    }
    var i = 0,
      type,
      typeSize,
      previousType;
    while (i < size) {
      var curr = slab[i];
      if (typeof curr === 'function') {
        curr = Runtime.getFunctionIndex(curr);
      }
      type = singleType || types[i];
      if (type === 0) {
        i++;
        continue;
      }
      if (type == 'i64') type = 'i32';
      setValue(ret + i, curr, type);
      if (previousType !== type) {
        typeSize = Runtime.getNativeTypeSize(type);
        previousType = type;
      }
      i += typeSize;
    }
    return ret;
  }
  Module['allocate'] = allocate;
  function getMemory(size) {
    if (!staticSealed) return Runtime.staticAlloc(size);
    if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
    return _malloc(size);
  }
  Module['getMemory'] = getMemory;
  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return '';
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
      t = HEAPU8[(ptr + i) >> 0];
      hasUtf |= t;
      if (t == 0 && !length) break;
      i++;
      if (length && i == length) break;
    }
    if (!length) length = i;
    var ret = '';
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK;
      }
      return ret;
    }
    return Module['UTF8ToString'](ptr);
  }
  Module['Pointer_stringify'] = Pointer_stringify;
  function AsciiToString(ptr) {
    var str = '';
    while (1) {
      var ch = HEAP8[ptr++ >> 0];
      if (!ch) return str;
      str += String.fromCharCode(ch);
    }
  }
  Module['AsciiToString'] = AsciiToString;
  function stringToAscii(str, outPtr) {
    return writeAsciiToMemory(str, outPtr, false);
  }
  Module['stringToAscii'] = stringToAscii;
  var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
  function UTF8ArrayToString(u8Array, idx) {
    var endPtr = idx;
    while (u8Array[endPtr]) ++endPtr;
    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
      return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
    } else {
      var u0, u1, u2, u3, u4, u5;
      var str = '';
      while (1) {
        u0 = u8Array[idx++];
        if (!u0) return str;
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        u1 = u8Array[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode(((u0 & 31) << 6) | u1);
          continue;
        }
        u2 = u8Array[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          u3 = u8Array[idx++] & 63;
          if ((u0 & 248) == 240) {
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
          } else {
            u4 = u8Array[idx++] & 63;
            if ((u0 & 252) == 248) {
              u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
            } else {
              u5 = u8Array[idx++] & 63;
              u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
            }
          }
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
        }
      }
    }
  }
  Module['UTF8ArrayToString'] = UTF8ArrayToString;
  function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr);
  }
  Module['UTF8ToString'] = UTF8ToString;
  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 192 | (u >> 6);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 224 | (u >> 12);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx) break;
        outU8Array[outIdx++] = 240 | (u >> 18);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx) break;
        outU8Array[outIdx++] = 248 | (u >> 24);
        outU8Array[outIdx++] = 128 | ((u >> 18) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else {
        if (outIdx + 5 >= endIdx) break;
        outU8Array[outIdx++] = 252 | (u >> 30);
        outU8Array[outIdx++] = 128 | ((u >> 24) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 18) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx;
  }
  Module['stringToUTF8Array'] = stringToUTF8Array;
  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  }
  Module['stringToUTF8'] = stringToUTF8;
  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343) u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
      if (u <= 127) {
        ++len;
      } else if (u <= 2047) {
        len += 2;
      } else if (u <= 65535) {
        len += 3;
      } else if (u <= 2097151) {
        len += 4;
      } else if (u <= 67108863) {
        len += 5;
      } else {
        len += 6;
      }
    }
    return len;
  }
  Module['lengthBytesUTF8'] = lengthBytesUTF8;
  var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
  function demangle(func) {
    var __cxa_demangle_func = Module['___cxa_demangle'] || Module['__cxa_demangle'];
    if (__cxa_demangle_func) {
      try {
        var s = func.substr(1);
        var len = lengthBytesUTF8(s) + 1;
        var buf = _malloc(len);
        stringToUTF8(s, buf, len);
        var status = _malloc(4);
        var ret = __cxa_demangle_func(buf, 0, 0, status);
        if (getValue(status, 'i32') === 0 && ret) {
          return Pointer_stringify(ret);
        }
      } catch (e) {
      } finally {
        if (buf) _free(buf);
        if (status) _free(status);
        if (ret) _free(ret);
      }
      return func;
    }
    Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
    return func;
  }
  function demangleAll(text) {
    var regex = /__Z[\w\d_]+/g;
    return text.replace(regex, function(x) {
      var y = demangle(x);
      return x === y ? x : x + ' [' + y + ']';
    });
  }
  function jsStackTrace() {
    var err = new Error();
    if (!err.stack) {
      try {
        throw new Error(0);
      } catch (e) {
        err = e;
      }
      if (!err.stack) {
        return '(no stack trace available)';
      }
    }
    return err.stack.toString();
  }
  function stackTrace() {
    var js = jsStackTrace();
    if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
    return demangleAll(js);
  }
  Module['stackTrace'] = stackTrace;
  var WASM_PAGE_SIZE = 65536;
  var ASMJS_PAGE_SIZE = 16777216;
  function alignUp(x, multiple) {
    if (x % multiple > 0) {
      x += multiple - x % multiple;
    }
    return x;
  }
  var HEAP, buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  function updateGlobalBuffer(buf) {
    Module['buffer'] = buffer = buf;
  }
  function updateGlobalBufferViews() {
    Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
    Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
    Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
    Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
    Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
    Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
    Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
    Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
  }
  var STATIC_BASE, STATICTOP, staticSealed;
  var STACK_BASE, STACKTOP, STACK_MAX;
  var DYNAMIC_BASE, DYNAMICTOP_PTR;
  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;
  function abortOnCannotGrowMemory() {
    abort(
      'Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' +
        TOTAL_MEMORY +
        ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 '
    );
  }
  function enlargeMemory() {
    abortOnCannotGrowMemory();
  }
  var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
  var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
  if (TOTAL_MEMORY < TOTAL_STACK)
    Module.printErr(
      'TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')'
    );
  if (Module['buffer']) {
    buffer = Module['buffer'];
  } else {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
      Module['wasmMemory'] = new WebAssembly.Memory({
        initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
        maximum: TOTAL_MEMORY / WASM_PAGE_SIZE
      });
      buffer = Module['wasmMemory'].buffer;
    } else {
      buffer = new ArrayBuffer(TOTAL_MEMORY);
    }
  }
  updateGlobalBufferViews();
  function getTotalMemory() {
    return TOTAL_MEMORY;
  }
  HEAP32[0] = 1668509029;
  HEAP16[1] = 25459;
  if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw 'Runtime error: expected the system to be little-endian!';
  Module['HEAP'] = HEAP;
  Module['buffer'] = buffer;
  Module['HEAP8'] = HEAP8;
  Module['HEAP16'] = HEAP16;
  Module['HEAP32'] = HEAP32;
  Module['HEAPU8'] = HEAPU8;
  Module['HEAPU16'] = HEAPU16;
  Module['HEAPU32'] = HEAPU32;
  Module['HEAPF32'] = HEAPF32;
  Module['HEAPF64'] = HEAPF64;
  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == 'function') {
        callback();
        continue;
      }
      var func = callback.func;
      if (typeof func === 'number') {
        if (callback.arg === undefined) {
          Module['dynCall_v'](func);
        } else {
          Module['dynCall_vi'](func, callback.arg);
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg);
      }
    }
  }
  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  var runtimeExited = false;
  function preRun() {
    if (Module['preRun']) {
      if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
      while (Module['preRun'].length) {
        addOnPreRun(Module['preRun'].shift());
      }
    }
    callRuntimeCallbacks(__ATPRERUN__);
  }
  function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__);
  }
  function preMain() {
    callRuntimeCallbacks(__ATMAIN__);
  }
  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true;
  }
  function postRun() {
    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length) {
        addOnPostRun(Module['postRun'].shift());
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
  }
  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
  }
  Module['addOnPreRun'] = addOnPreRun;
  function addOnInit(cb) {
    __ATINIT__.unshift(cb);
  }
  Module['addOnInit'] = addOnInit;
  function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb);
  }
  Module['addOnPreMain'] = addOnPreMain;
  function addOnExit(cb) {
    __ATEXIT__.unshift(cb);
  }
  Module['addOnExit'] = addOnExit;
  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
  }
  Module['addOnPostRun'] = addOnPostRun;
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  Module['intArrayFromString'] = intArrayFromString;
  function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      var chr = array[i];
      if (chr > 255) {
        chr &= 255;
      }
      ret.push(String.fromCharCode(chr));
    }
    return ret.join('');
  }
  Module['intArrayToString'] = intArrayToString;
  function writeStringToMemory(string, buffer, dontAddNull) {
    Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');
    var lastChar, end;
    if (dontAddNull) {
      end = buffer + lengthBytesUTF8(string);
      lastChar = HEAP8[end];
    }
    stringToUTF8(string, buffer, Infinity);
    if (dontAddNull) HEAP8[end] = lastChar;
  }
  Module['writeStringToMemory'] = writeStringToMemory;
  function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer);
  }
  Module['writeArrayToMemory'] = writeArrayToMemory;
  function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
      HEAP8[buffer++ >> 0] = str.charCodeAt(i);
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0;
  }
  Module['writeAsciiToMemory'] = writeAsciiToMemory;
  if (!Math['imul'] || Math['imul'](4294967295, 5) !== -5)
    Math['imul'] = function imul(a, b) {
      var ah = a >>> 16;
      var al = a & 65535;
      var bh = b >>> 16;
      var bl = b & 65535;
      return (al * bl + ((ah * bl + al * bh) << 16)) | 0;
    };
  Math.imul = Math['imul'];
  if (!Math['fround']) {
    var froundBuffer = new Float32Array(1);
    Math['fround'] = function(x) {
      froundBuffer[0] = x;
      return froundBuffer[0];
    };
  }
  Math.fround = Math['fround'];
  if (!Math['clz32'])
    Math['clz32'] = function(x) {
      x = x >>> 0;
      for (var i = 0; i < 32; i++) {
        if (x & (1 << (31 - i))) return i;
      }
      return 32;
    };
  Math.clz32 = Math['clz32'];
  if (!Math['trunc'])
    Math['trunc'] = function(x) {
      return x < 0 ? Math.ceil(x) : Math.floor(x);
    };
  Math.trunc = Math['trunc'];
  var Math_abs = Math.abs;
  var Math_cos = Math.cos;
  var Math_sin = Math.sin;
  var Math_tan = Math.tan;
  var Math_acos = Math.acos;
  var Math_asin = Math.asin;
  var Math_atan = Math.atan;
  var Math_atan2 = Math.atan2;
  var Math_exp = Math.exp;
  var Math_log = Math.log;
  var Math_sqrt = Math.sqrt;
  var Math_ceil = Math.ceil;
  var Math_floor = Math.floor;
  var Math_pow = Math.pow;
  var Math_imul = Math.imul;
  var Math_fround = Math.fround;
  var Math_round = Math.round;
  var Math_min = Math.min;
  var Math_clz32 = Math.clz32;
  var Math_trunc = Math.trunc;
  var runDependencies = 0;
  var runDependencyWatcher = null;
  var dependenciesFulfilled = null;
  function addRunDependency(id) {
    runDependencies++;
    if (Module['monitorRunDependencies']) {
      Module['monitorRunDependencies'](runDependencies);
    }
  }
  Module['addRunDependency'] = addRunDependency;
  function removeRunDependency(id) {
    runDependencies--;
    if (Module['monitorRunDependencies']) {
      Module['monitorRunDependencies'](runDependencies);
    }
    if (runDependencies == 0) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
      }
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }
  Module['removeRunDependency'] = removeRunDependency;
  Module['preloadedImages'] = {};
  Module['preloadedAudios'] = {};
  var memoryInitializer = null;
  function integrateWasmJS(Module) {
    var method = Module['wasmJSMethod'] || 'native-wasm';
    Module['wasmJSMethod'] = method;
    var wasmTextFile = Module['wasmTextFile'] || 'cld3.wast';
    var wasmBinaryFile = Module['wasmBinaryFile'] || 'cld3.wasm';
    var asmjsCodeFile = Module['asmjsCodeFile'] || 'cld3.temp.asm.js';
    if (typeof Module['locateFile'] === 'function') {
      wasmTextFile = Module['locateFile'](wasmTextFile);
      wasmBinaryFile = Module['locateFile'](wasmBinaryFile);
      asmjsCodeFile = Module['locateFile'](asmjsCodeFile);
    }
    var wasmPageSize = 64 * 1024;
    var asm2wasmImports = {
      'f64-rem': function(x, y) {
        return x % y;
      },
      'f64-to-int': function(x) {
        return x | 0;
      },
      'i32s-div': function(x, y) {
        return ((x | 0) / (y | 0)) | 0;
      },
      'i32u-div': function(x, y) {
        return ((x >>> 0) / (y >>> 0)) >>> 0;
      },
      'i32s-rem': function(x, y) {
        return ((x | 0) % (y | 0)) | 0;
      },
      'i32u-rem': function(x, y) {
        return ((x >>> 0) % (y >>> 0)) >>> 0;
      },
      debugger: function() {
        debugger;
      }
    };
    var info = { global: null, env: null, asm2wasm: asm2wasmImports, parent: Module };
    var exports = null;
    function lookupImport(mod, base) {
      var lookup = info;
      if (mod.indexOf('.') < 0) {
        lookup = (lookup || {})[mod];
      } else {
        var parts = mod.split('.');
        lookup = (lookup || {})[parts[0]];
        lookup = (lookup || {})[parts[1]];
      }
      if (base) {
        lookup = (lookup || {})[base];
      }
      if (lookup === undefined) {
        abort('bad lookupImport to (' + mod + ').' + base);
      }
      return lookup;
    }
    function mergeMemory(newBuffer) {
      var oldBuffer = Module['buffer'];
      if (newBuffer.byteLength < oldBuffer.byteLength) {
        Module['printErr'](
          'the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here'
        );
      }
      var oldView = new Int8Array(oldBuffer);
      var newView = new Int8Array(newBuffer);
      if (!memoryInitializer) {
        oldView.set(
          newView.subarray(Module['STATIC_BASE'], Module['STATIC_BASE'] + Module['STATIC_BUMP']),
          Module['STATIC_BASE']
        );
      }
      newView.set(oldView);
      updateGlobalBuffer(newBuffer);
      updateGlobalBufferViews();
    }
    var WasmTypes = { none: 0, i32: 1, i64: 2, f32: 3, f64: 4 };
    function fixImports(imports) {
      if (!0) return imports;
      var ret = {};
      for (var i in imports) {
        var fixed = i;
        if (fixed[0] == '_') fixed = fixed.substr(1);
        ret[fixed] = imports[i];
      }
      return ret;
    }
    function getBinary() {
      try {
        var binary;
        if (Module['wasmBinary']) {
          binary = Module['wasmBinary'];
          binary = new Uint8Array(binary);
        } else if (Module['readBinary']) {
          binary = Module['readBinary'](wasmBinaryFile);
        } else {
          throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
        }
        return binary;
      } catch (err) {
        abort(err);
      }
    }
    function getBinaryPromise() {
      var electronNodeContext =
        Module['ENVIRONMENT'] === 'NODE' && typeof window !== 'undefined' && !!window.process && !!window.require;
      if (!Module['wasmBinary'] && typeof fetch === 'function' && !electronNodeContext) {
        return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
          if (!response['ok']) {
            throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
          }
          return response['arrayBuffer']();
        });
      }
      return new Promise(function(resolve, reject) {
        resolve(getBinary());
      });
    }
    function doJustAsm(global, env, providedBuffer) {
      if (typeof Module['asm'] !== 'function' || Module['asm'] === methodHandler) {
        if (!Module['asmPreload']) {
          eval(Module['read'](asmjsCodeFile));
        } else {
          Module['asm'] = Module['asmPreload'];
        }
      }
      if (typeof Module['asm'] !== 'function') {
        Module['printErr']('asm evalling did not set the module properly');
        return false;
      }
      return Module['asm'](global, env, providedBuffer);
    }
    function doNativeWasm(global, env, providedBuffer) {
      if (typeof WebAssembly !== 'object') {
        Module['printErr']('no native wasm support detected');
        return false;
      }
      if (!(Module['wasmMemory'] instanceof WebAssembly.Memory)) {
        Module['printErr']('no native wasm Memory in use');
        return false;
      }
      env['memory'] = Module['wasmMemory'];
      info['global'] = { NaN: NaN, Infinity: Infinity };
      info['global.Math'] = global.Math;
      info['env'] = env;
      function receiveInstance(instance) {
        exports = instance.exports;
        if (exports.memory) mergeMemory(exports.memory);
        Module['asm'] = exports;
        Module['usingWasm'] = true;
        removeRunDependency('wasm-instantiate');
      }
      addRunDependency('wasm-instantiate');
      if (Module['instantiateWasm']) {
        try {
          return Module['instantiateWasm'](info, receiveInstance);
        } catch (e) {
          Module['printErr']('Module.instantiateWasm callback failed with error: ' + e);
          return false;
        }
      }
      getBinaryPromise()
        .then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        })
        .then(function(output) {
          receiveInstance(output['instance']);
        })
        .catch(function(reason) {
          Module['printErr']('failed to asynchronously prepare wasm: ' + reason);
          abort(reason);
        });
      return {};
    }
    function doWasmPolyfill(global, env, providedBuffer, method) {
      if (typeof WasmJS !== 'function') {
        Module['printErr']('WasmJS not detected - polyfill not bundled?');
        return false;
      }
      var wasmJS = WasmJS({});
      wasmJS['outside'] = Module;
      wasmJS['info'] = info;
      wasmJS['lookupImport'] = lookupImport;
      assert(providedBuffer === Module['buffer']);
      info.global = global;
      info.env = env;
      assert(providedBuffer === Module['buffer']);
      env['memory'] = providedBuffer;
      assert(env['memory'] instanceof ArrayBuffer);
      wasmJS['providedTotalMemory'] = Module['buffer'].byteLength;
      var code;
      if (method === 'interpret-binary') {
        code = getBinary();
      } else {
        code = Module['read'](method == 'interpret-asm2wasm' ? asmjsCodeFile : wasmTextFile);
      }
      var temp;
      if (method == 'interpret-asm2wasm') {
        temp = wasmJS['_malloc'](code.length + 1);
        wasmJS['writeAsciiToMemory'](code, temp);
        wasmJS['_load_asm2wasm'](temp);
      } else if (method === 'interpret-s-expr') {
        temp = wasmJS['_malloc'](code.length + 1);
        wasmJS['writeAsciiToMemory'](code, temp);
        wasmJS['_load_s_expr2wasm'](temp);
      } else if (method === 'interpret-binary') {
        temp = wasmJS['_malloc'](code.length);
        wasmJS['HEAPU8'].set(code, temp);
        wasmJS['_load_binary2wasm'](temp, code.length);
      } else {
        throw 'what? ' + method;
      }
      wasmJS['_free'](temp);
      wasmJS['_instantiate'](temp);
      if (Module['newBuffer']) {
        mergeMemory(Module['newBuffer']);
        Module['newBuffer'] = null;
      }
      exports = wasmJS['asmExports'];
      return exports;
    }
    Module['asmPreload'] = Module['asm'];
    var asmjsReallocBuffer = Module['reallocBuffer'];
    var wasmReallocBuffer = function(size) {
      var PAGE_MULTIPLE = Module['usingWasm'] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
      size = alignUp(size, PAGE_MULTIPLE);
      var old = Module['buffer'];
      var oldSize = old.byteLength;
      if (Module['usingWasm']) {
        try {
          var result = Module['wasmMemory'].grow((size - oldSize) / wasmPageSize);
          if (result !== (-1 | 0)) {
            return (Module['buffer'] = Module['wasmMemory'].buffer);
          } else {
            return null;
          }
        } catch (e) {
          return null;
        }
      } else {
        exports['__growWasmMemory']((size - oldSize) / wasmPageSize);
        return Module['buffer'] !== old ? Module['buffer'] : null;
      }
    };
    Module['reallocBuffer'] = function(size) {
      if (finalMethod === 'asmjs') {
        return asmjsReallocBuffer(size);
      } else {
        return wasmReallocBuffer(size);
      }
    };
    var finalMethod = '';
    Module['asm'] = function(global, env, providedBuffer) {
      global = fixImports(global);
      env = fixImports(env);
      if (!env['table']) {
        var TABLE_SIZE = Module['wasmTableSize'];
        if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
        var MAX_TABLE_SIZE = Module['wasmMaxTableSize'];
        if (typeof WebAssembly === 'object' && typeof WebAssembly.Table === 'function') {
          if (MAX_TABLE_SIZE !== undefined) {
            env['table'] = new WebAssembly.Table({ initial: TABLE_SIZE, maximum: MAX_TABLE_SIZE, element: 'anyfunc' });
          } else {
            env['table'] = new WebAssembly.Table({ initial: TABLE_SIZE, element: 'anyfunc' });
          }
        } else {
          env['table'] = new Array(TABLE_SIZE);
        }
        Module['wasmTable'] = env['table'];
      }
      if (!env['memoryBase']) {
        env['memoryBase'] = Module['STATIC_BASE'];
      }
      if (!env['tableBase']) {
        env['tableBase'] = 0;
      }
      var exports;
      var methods = method.split(',');
      for (var i = 0; i < methods.length; i++) {
        var curr = methods[i];
        finalMethod = curr;
        if (curr === 'native-wasm') {
          if ((exports = doNativeWasm(global, env, providedBuffer))) break;
        } else if (curr === 'asmjs') {
          if ((exports = doJustAsm(global, env, providedBuffer))) break;
        } else if (curr === 'interpret-asm2wasm' || curr === 'interpret-s-expr' || curr === 'interpret-binary') {
          if ((exports = doWasmPolyfill(global, env, providedBuffer, curr))) break;
        } else {
          abort('bad method: ' + curr);
        }
      }
      if (!exports)
        throw 'no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods';
      return exports;
    };
    var methodHandler = Module['asm'];
  }
  integrateWasmJS(Module);
  var ASM_CONSTS = [];
  STATIC_BASE = Runtime.GLOBAL_BASE;
  STATICTOP = STATIC_BASE + 499744;
  __ATINIT__.push(
    {
      func: function() {
        __GLOBAL__sub_I_any_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_api_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_descriptor_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_duration_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_empty_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_field_mask_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_message_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_source_context_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_struct_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_timestamp_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_type_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_wrappers_pb_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_parser_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_nnet_language_identifier_cc();
      }
    },
    {
      func: function() {
        __GLOBAL__sub_I_bind_cpp();
      }
    }
  );
  memoryInitializer =
    Module['wasmJSMethod'].indexOf('asmjs') >= 0 || Module['wasmJSMethod'].indexOf('interpret-asm2wasm') >= 0
      ? 'cld3.js.mem'
      : null;
  var STATIC_BUMP = 499744;
  Module['STATIC_BASE'] = STATIC_BASE;
  Module['STATIC_BUMP'] = STATIC_BUMP;
  var tempDoublePtr = STATICTOP;
  STATICTOP += 16;
  var structRegistrations = {};
  function embind_init_charCodes() {
    var codes = new Array(256);
    for (var i = 0; i < 256; ++i) {
      codes[i] = String.fromCharCode(i);
    }
    embind_charCodes = codes;
  }
  var embind_charCodes = undefined;
  function readLatin1String(ptr) {
    var ret = '';
    var c = ptr;
    while (HEAPU8[c]) {
      ret += embind_charCodes[HEAPU8[c++]];
    }
    return ret;
  }
  var char_0 = 48;
  var char_9 = 57;
  function makeLegalFunctionName(name) {
    if (undefined === name) {
      return '_unknown';
    }
    name = name.replace(/[^a-zA-Z0-9_]/g, '$');
    var f = name.charCodeAt(0);
    if (f >= char_0 && f <= char_9) {
      return '_' + name;
    } else {
      return name;
    }
  }
  function createNamedFunction(name, body) {
    name = makeLegalFunctionName(name);
    return new Function(
      'body',
      'return function ' + name + '() {\n' + '    "use strict";' + '    return body.apply(this, arguments);\n' + '};\n'
    )(body);
  }
  function extendError(baseErrorType, errorName) {
    var errorClass = createNamedFunction(errorName, function(message) {
      this.name = errorName;
      this.message = message;
      var stack = new Error(message).stack;
      if (stack !== undefined) {
        this.stack = this.toString() + '\n' + stack.replace(/^Error(:[^\n]*)?\n/, '');
      }
    });
    errorClass.prototype = Object.create(baseErrorType.prototype);
    errorClass.prototype.constructor = errorClass;
    errorClass.prototype.toString = function() {
      if (this.message === undefined) {
        return this.name;
      } else {
        return this.name + ': ' + this.message;
      }
    };
    return errorClass;
  }
  var BindingError = undefined;
  function throwBindingError(message) {
    throw new BindingError(message);
  }
  function requireFunction(signature, rawFunction) {
    signature = readLatin1String(signature);
    function makeDynCaller(dynCall) {
      var args = [];
      for (var i = 1; i < signature.length; ++i) {
        args.push('a' + i);
      }
      var name = 'dynCall_' + signature + '_' + rawFunction;
      var body = 'return function ' + name + '(' + args.join(', ') + ') {\n';
      body += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\n';
      body += '};\n';
      return new Function('dynCall', 'rawFunction', body)(dynCall, rawFunction);
    }
    var fp;
    if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
      fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
    } else if (typeof FUNCTION_TABLE !== 'undefined') {
      fp = FUNCTION_TABLE[rawFunction];
    } else {
      var dc = Module['asm']['dynCall_' + signature];
      if (dc === undefined) {
        dc = Module['asm']['dynCall_' + signature.replace(/f/g, 'd')];
        if (dc === undefined) {
          throwBindingError('No dynCall invoker for signature: ' + signature);
        }
      }
      fp = makeDynCaller(dc);
    }
    if (typeof fp !== 'function') {
      throwBindingError('unknown function pointer with signature ' + signature + ': ' + rawFunction);
    }
    return fp;
  }
  function __embind_register_value_object(
    rawType,
    name,
    constructorSignature,
    rawConstructor,
    destructorSignature,
    rawDestructor
  ) {
    structRegistrations[rawType] = {
      name: readLatin1String(name),
      rawConstructor: requireFunction(constructorSignature, rawConstructor),
      rawDestructor: requireFunction(destructorSignature, rawDestructor),
      fields: []
    };
  }
  function ___assert_fail(condition, filename, line, func) {
    ABORT = true;
    throw 'Assertion failed: ' +
      Pointer_stringify(condition) +
      ', at: ' +
      [
        filename ? Pointer_stringify(filename) : 'unknown filename',
        line,
        func ? Pointer_stringify(func) : 'unknown function'
      ] +
      ' at ' +
      stackTrace();
  }
  var awaitingDependencies = {};
  var registeredTypes = {};
  var typeDependencies = {};
  var InternalError = undefined;
  function throwInternalError(message) {
    throw new InternalError(message);
  }
  function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
    myTypes.forEach(function(type) {
      typeDependencies[type] = dependentTypes;
    });
    function onComplete(typeConverters) {
      var myTypeConverters = getTypeConverters(typeConverters);
      if (myTypeConverters.length !== myTypes.length) {
        throwInternalError('Mismatched type converter count');
      }
      for (var i = 0; i < myTypes.length; ++i) {
        registerType(myTypes[i], myTypeConverters[i]);
      }
    }
    var typeConverters = new Array(dependentTypes.length);
    var unregisteredTypes = [];
    var registered = 0;
    dependentTypes.forEach(function(dt, i) {
      if (registeredTypes.hasOwnProperty(dt)) {
        typeConverters[i] = registeredTypes[dt];
      } else {
        unregisteredTypes.push(dt);
        if (!awaitingDependencies.hasOwnProperty(dt)) {
          awaitingDependencies[dt] = [];
        }
        awaitingDependencies[dt].push(function() {
          typeConverters[i] = registeredTypes[dt];
          ++registered;
          if (registered === unregisteredTypes.length) {
            onComplete(typeConverters);
          }
        });
      }
    });
    if (0 === unregisteredTypes.length) {
      onComplete(typeConverters);
    }
  }
  function registerType(rawType, registeredInstance, options) {
    options = options || {};
    if (!('argPackAdvance' in registeredInstance)) {
      throw new TypeError('registerType registeredInstance requires argPackAdvance');
    }
    var name = registeredInstance.name;
    if (!rawType) {
      throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
    }
    if (registeredTypes.hasOwnProperty(rawType)) {
      if (options.ignoreDuplicateRegistrations) {
        return;
      } else {
        throwBindingError("Cannot register type '" + name + "' twice");
      }
    }
    registeredTypes[rawType] = registeredInstance;
    delete typeDependencies[rawType];
    if (awaitingDependencies.hasOwnProperty(rawType)) {
      var callbacks = awaitingDependencies[rawType];
      delete awaitingDependencies[rawType];
      callbacks.forEach(function(cb) {
        cb();
      });
    }
  }
  function __embind_register_void(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
      isVoid: true,
      name: name,
      argPackAdvance: 0,
      fromWireType: function() {
        return undefined;
      },
      toWireType: function(destructors, o) {
        return undefined;
      }
    });
  }
  function __ZSt18uncaught_exceptionv() {
    return !!__ZSt18uncaught_exceptionv.uncaught_exception;
  }
  var EXCEPTIONS = {
    last: 0,
    caught: [],
    infos: {},
    deAdjust: function(adjusted) {
      if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
      for (var ptr in EXCEPTIONS.infos) {
        var info = EXCEPTIONS.infos[ptr];
        if (info.adjusted === adjusted) {
          return ptr;
        }
      }
      return adjusted;
    },
    addRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount++;
    },
    decRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      assert(info.refcount > 0);
      info.refcount--;
      if (info.refcount === 0 && !info.rethrown) {
        if (info.destructor) {
          Module['dynCall_vi'](info.destructor, ptr);
        }
        delete EXCEPTIONS.infos[ptr];
        ___cxa_free_exception(ptr);
      }
    },
    clearRef: function(ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount = 0;
    }
  };
  function ___resumeException(ptr) {
    if (!EXCEPTIONS.last) {
      EXCEPTIONS.last = ptr;
    }
    throw ptr +
      ' - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.';
  }
  function ___cxa_find_matching_catch() {
    var thrown = EXCEPTIONS.last;
    if (!thrown) {
      return (Runtime.setTempRet0(0), 0) | 0;
    }
    var info = EXCEPTIONS.infos[thrown];
    var throwntype = info.type;
    if (!throwntype) {
      return (Runtime.setTempRet0(0), thrown) | 0;
    }
    var typeArray = Array.prototype.slice.call(arguments);
    var pointer = Module['___cxa_is_pointer_type'](throwntype);
    if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
    HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
    thrown = ___cxa_find_matching_catch.buffer;
    for (var i = 0; i < typeArray.length; i++) {
      if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
        thrown = HEAP32[thrown >> 2];
        info.adjusted = thrown;
        return (Runtime.setTempRet0(typeArray[i]), thrown) | 0;
      }
    }
    thrown = HEAP32[thrown >> 2];
    return (Runtime.setTempRet0(throwntype), thrown) | 0;
  }
  function ___cxa_throw(ptr, type, destructor) {
    EXCEPTIONS.infos[ptr] = {
      ptr: ptr,
      adjusted: ptr,
      type: type,
      destructor: destructor,
      refcount: 0,
      caught: false,
      rethrown: false
    };
    EXCEPTIONS.last = ptr;
    if (!('uncaught_exception' in __ZSt18uncaught_exceptionv)) {
      __ZSt18uncaught_exceptionv.uncaught_exception = 1;
    } else {
      __ZSt18uncaught_exceptionv.uncaught_exception++;
    }
    throw ptr +
      ' - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.';
  }
  Module['_memset'] = _memset;
  function getShiftFromSize(size) {
    switch (size) {
      case 1:
        return 0;
      case 2:
        return 1;
      case 4:
        return 2;
      case 8:
        return 3;
      default:
        throw new TypeError('Unknown type size: ' + size);
    }
  }
  function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
      name: name,
      fromWireType: function(wt) {
        return !!wt;
      },
      toWireType: function(destructors, o) {
        return o ? trueValue : falseValue;
      },
      argPackAdvance: 8,
      readValueFromPointer: function(pointer) {
        var heap;
        if (size === 1) {
          heap = HEAP8;
        } else if (size === 2) {
          heap = HEAP16;
        } else if (size === 4) {
          heap = HEAP32;
        } else {
          throw new TypeError('Unknown boolean type size: ' + name);
        }
        return this['fromWireType'](heap[pointer >> shift]);
      },
      destructorFunction: null
    });
  }
  function _abort() {
    Module['abort']();
  }
  function simpleReadValueFromPointer(pointer) {
    return this['fromWireType'](HEAPU32[pointer >> 2]);
  }
  function __embind_register_std_string(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
      name: name,
      fromWireType: function(value) {
        var length = HEAPU32[value >> 2];
        var a = new Array(length);
        for (var i = 0; i < length; ++i) {
          a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
        }
        _free(value);
        return a.join('');
      },
      toWireType: function(destructors, value) {
        if (value instanceof ArrayBuffer) {
          value = new Uint8Array(value);
        }
        function getTAElement(ta, index) {
          return ta[index];
        }
        function getStringElement(string, index) {
          return string.charCodeAt(index);
        }
        var getElement;
        if (value instanceof Uint8Array) {
          getElement = getTAElement;
        } else if (value instanceof Uint8ClampedArray) {
          getElement = getTAElement;
        } else if (value instanceof Int8Array) {
          getElement = getTAElement;
        } else if (typeof value === 'string') {
          getElement = getStringElement;
        } else {
          throwBindingError('Cannot pass non-string to std::string');
        }
        var length = value.length;
        var ptr = _malloc(4 + length);
        HEAPU32[ptr >> 2] = length;
        for (var i = 0; i < length; ++i) {
          var charCode = getElement(value, i);
          if (charCode > 255) {
            _free(ptr);
            throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
          }
          HEAPU8[ptr + 4 + i] = charCode;
        }
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      },
      argPackAdvance: 8,
      readValueFromPointer: simpleReadValueFromPointer,
      destructorFunction: function(ptr) {
        _free(ptr);
      }
    });
  }
  function __embind_register_std_wstring(rawType, charSize, name) {
    name = readLatin1String(name);
    var getHeap, shift;
    if (charSize === 2) {
      getHeap = function() {
        return HEAPU16;
      };
      shift = 1;
    } else if (charSize === 4) {
      getHeap = function() {
        return HEAPU32;
      };
      shift = 2;
    }
    registerType(rawType, {
      name: name,
      fromWireType: function(value) {
        var HEAP = getHeap();
        var length = HEAPU32[value >> 2];
        var a = new Array(length);
        var start = (value + 4) >> shift;
        for (var i = 0; i < length; ++i) {
          a[i] = String.fromCharCode(HEAP[start + i]);
        }
        _free(value);
        return a.join('');
      },
      toWireType: function(destructors, value) {
        var HEAP = getHeap();
        var length = value.length;
        var ptr = _malloc(4 + length * charSize);
        HEAPU32[ptr >> 2] = length;
        var start = (ptr + 4) >> shift;
        for (var i = 0; i < length; ++i) {
          HEAP[start + i] = value.charCodeAt(i);
        }
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      },
      argPackAdvance: 8,
      readValueFromPointer: simpleReadValueFromPointer,
      destructorFunction: function(ptr) {
        _free(ptr);
      }
    });
  }
  function _pthread_once(ptr, func) {
    if (!_pthread_once.seen) _pthread_once.seen = {};
    if (ptr in _pthread_once.seen) return;
    Module['dynCall_v'](func);
    _pthread_once.seen[ptr] = 1;
  }
  function __embind_register_value_object_field(
    structType,
    fieldName,
    getterReturnType,
    getterSignature,
    getter,
    getterContext,
    setterArgumentType,
    setterSignature,
    setter,
    setterContext
  ) {
    structRegistrations[structType].fields.push({
      fieldName: readLatin1String(fieldName),
      getterReturnType: getterReturnType,
      getter: requireFunction(getterSignature, getter),
      getterContext: getterContext,
      setterArgumentType: setterArgumentType,
      setter: requireFunction(setterSignature, setter),
      setterContext: setterContext
    });
  }
  function ClassHandle_isAliasOf(other) {
    if (!(this instanceof ClassHandle)) {
      return false;
    }
    if (!(other instanceof ClassHandle)) {
      return false;
    }
    var leftClass = this.$$.ptrType.registeredClass;
    var left = this.$$.ptr;
    var rightClass = other.$$.ptrType.registeredClass;
    var right = other.$$.ptr;
    while (leftClass.baseClass) {
      left = leftClass.upcast(left);
      leftClass = leftClass.baseClass;
    }
    while (rightClass.baseClass) {
      right = rightClass.upcast(right);
      rightClass = rightClass.baseClass;
    }
    return leftClass === rightClass && left === right;
  }
  function shallowCopyInternalPointer(o) {
    return {
      count: o.count,
      deleteScheduled: o.deleteScheduled,
      preservePointerOnDelete: o.preservePointerOnDelete,
      ptr: o.ptr,
      ptrType: o.ptrType,
      smartPtr: o.smartPtr,
      smartPtrType: o.smartPtrType
    };
  }
  function throwInstanceAlreadyDeleted(obj) {
    function getInstanceTypeName(handle) {
      return handle.$$.ptrType.registeredClass.name;
    }
    throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
  }
  function ClassHandle_clone() {
    if (!this.$$.ptr) {
      throwInstanceAlreadyDeleted(this);
    }
    if (this.$$.preservePointerOnDelete) {
      this.$$.count.value += 1;
      return this;
    } else {
      var clone = Object.create(Object.getPrototypeOf(this), { $$: { value: shallowCopyInternalPointer(this.$$) } });
      clone.$$.count.value += 1;
      clone.$$.deleteScheduled = false;
      return clone;
    }
  }
  function runDestructor(handle) {
    var $$ = handle.$$;
    if ($$.smartPtr) {
      $$.smartPtrType.rawDestructor($$.smartPtr);
    } else {
      $$.ptrType.registeredClass.rawDestructor($$.ptr);
    }
  }
  function ClassHandle_delete() {
    if (!this.$$.ptr) {
      throwInstanceAlreadyDeleted(this);
    }
    if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
      throwBindingError('Object already scheduled for deletion');
    }
    this.$$.count.value -= 1;
    var toDelete = 0 === this.$$.count.value;
    if (toDelete) {
      runDestructor(this);
    }
    if (!this.$$.preservePointerOnDelete) {
      this.$$.smartPtr = undefined;
      this.$$.ptr = undefined;
    }
  }
  function ClassHandle_isDeleted() {
    return !this.$$.ptr;
  }
  var delayFunction = undefined;
  var deletionQueue = [];
  function flushPendingDeletes() {
    while (deletionQueue.length) {
      var obj = deletionQueue.pop();
      obj.$$.deleteScheduled = false;
      obj['delete']();
    }
  }
  function ClassHandle_deleteLater() {
    if (!this.$$.ptr) {
      throwInstanceAlreadyDeleted(this);
    }
    if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
      throwBindingError('Object already scheduled for deletion');
    }
    deletionQueue.push(this);
    if (deletionQueue.length === 1 && delayFunction) {
      delayFunction(flushPendingDeletes);
    }
    this.$$.deleteScheduled = true;
    return this;
  }
  function init_ClassHandle() {
    ClassHandle.prototype['isAliasOf'] = ClassHandle_isAliasOf;
    ClassHandle.prototype['clone'] = ClassHandle_clone;
    ClassHandle.prototype['delete'] = ClassHandle_delete;
    ClassHandle.prototype['isDeleted'] = ClassHandle_isDeleted;
    ClassHandle.prototype['deleteLater'] = ClassHandle_deleteLater;
  }
  function ClassHandle() {}
  var registeredPointers = {};
  function ensureOverloadTable(proto, methodName, humanName) {
    if (undefined === proto[methodName].overloadTable) {
      var prevFunc = proto[methodName];
      proto[methodName] = function() {
        if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
          throwBindingError(
            "Function '" +
              humanName +
              "' called with an invalid number of arguments (" +
              arguments.length +
              ') - expects one of (' +
              proto[methodName].overloadTable +
              ')!'
          );
        }
        return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
      };
      proto[methodName].overloadTable = [];
      proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
    }
  }
  function exposePublicSymbol(name, value, numArguments) {
    if (Module.hasOwnProperty(name)) {
      if (
        undefined === numArguments ||
        (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])
      ) {
        throwBindingError("Cannot register public name '" + name + "' twice");
      }
      ensureOverloadTable(Module, name, name);
      if (Module.hasOwnProperty(numArguments)) {
        throwBindingError(
          'Cannot register multiple overloads of a function with the same number of arguments (' + numArguments + ')!'
        );
      }
      Module[name].overloadTable[numArguments] = value;
    } else {
      Module[name] = value;
      if (undefined !== numArguments) {
        Module[name].numArguments = numArguments;
      }
    }
  }
  function RegisteredClass(
    name,
    constructor,
    instancePrototype,
    rawDestructor,
    baseClass,
    getActualType,
    upcast,
    downcast
  ) {
    this.name = name;
    this.constructor = constructor;
    this.instancePrototype = instancePrototype;
    this.rawDestructor = rawDestructor;
    this.baseClass = baseClass;
    this.getActualType = getActualType;
    this.upcast = upcast;
    this.downcast = downcast;
    this.pureVirtualFunctions = [];
  }
  function upcastPointer(ptr, ptrClass, desiredClass) {
    while (ptrClass !== desiredClass) {
      if (!ptrClass.upcast) {
        throwBindingError(
          'Expected null or instance of ' + desiredClass.name + ', got an instance of ' + ptrClass.name
        );
      }
      ptr = ptrClass.upcast(ptr);
      ptrClass = ptrClass.baseClass;
    }
    return ptr;
  }
  function constNoSmartPtrRawPointerToWireType(destructors, handle) {
    if (handle === null) {
      if (this.isReference) {
        throwBindingError('null is not a valid ' + this.name);
      }
      return 0;
    }
    if (!handle.$$) {
      throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
    }
    if (!handle.$$.ptr) {
      throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    return ptr;
  }
  function genericPointerToWireType(destructors, handle) {
    if (handle === null) {
      if (this.isReference) {
        throwBindingError('null is not a valid ' + this.name);
      }
      if (this.isSmartPointer) {
        var ptr = this.rawConstructor();
        if (destructors !== null) {
          destructors.push(this.rawDestructor, ptr);
        }
        return ptr;
      } else {
        return 0;
      }
    }
    if (!handle.$$) {
      throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
    }
    if (!handle.$$.ptr) {
      throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
    }
    if (!this.isConst && handle.$$.ptrType.isConst) {
      throwBindingError(
        'Cannot convert argument of type ' +
          (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) +
          ' to parameter type ' +
          this.name
      );
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    if (this.isSmartPointer) {
      if (undefined === handle.$$.smartPtr) {
        throwBindingError('Passing raw pointer to smart pointer is illegal');
      }
      switch (this.sharingPolicy) {
        case 0:
          if (handle.$$.smartPtrType === this) {
            ptr = handle.$$.smartPtr;
          } else {
            throwBindingError(
              'Cannot convert argument of type ' +
                (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) +
                ' to parameter type ' +
                this.name
            );
          }
          break;
        case 1:
          ptr = handle.$$.smartPtr;
          break;
        case 2:
          if (handle.$$.smartPtrType === this) {
            ptr = handle.$$.smartPtr;
          } else {
            var clonedHandle = handle['clone']();
            ptr = this.rawShare(
              ptr,
              __emval_register(function() {
                clonedHandle['delete']();
              })
            );
            if (destructors !== null) {
              destructors.push(this.rawDestructor, ptr);
            }
          }
          break;
        default:
          throwBindingError('Unsupporting sharing policy');
      }
    }
    return ptr;
  }
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
    if (handle === null) {
      if (this.isReference) {
        throwBindingError('null is not a valid ' + this.name);
      }
      return 0;
    }
    if (!handle.$$) {
      throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
    }
    if (!handle.$$.ptr) {
      throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
    }
    if (handle.$$.ptrType.isConst) {
      throwBindingError(
        'Cannot convert argument of type ' + handle.$$.ptrType.name + ' to parameter type ' + this.name
      );
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    return ptr;
  }
  function RegisteredPointer_getPointee(ptr) {
    if (this.rawGetPointee) {
      ptr = this.rawGetPointee(ptr);
    }
    return ptr;
  }
  function RegisteredPointer_destructor(ptr) {
    if (this.rawDestructor) {
      this.rawDestructor(ptr);
    }
  }
  function RegisteredPointer_deleteObject(handle) {
    if (handle !== null) {
      handle['delete']();
    }
  }
  function downcastPointer(ptr, ptrClass, desiredClass) {
    if (ptrClass === desiredClass) {
      return ptr;
    }
    if (undefined === desiredClass.baseClass) {
      return null;
    }
    var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
    if (rv === null) {
      return null;
    }
    return desiredClass.downcast(rv);
  }
  function getInheritedInstanceCount() {
    return Object.keys(registeredInstances).length;
  }
  function getLiveInheritedInstances() {
    var rv = [];
    for (var k in registeredInstances) {
      if (registeredInstances.hasOwnProperty(k)) {
        rv.push(registeredInstances[k]);
      }
    }
    return rv;
  }
  function setDelayFunction(fn) {
    delayFunction = fn;
    if (deletionQueue.length && delayFunction) {
      delayFunction(flushPendingDeletes);
    }
  }
  function init_embind() {
    Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
    Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
    Module['flushPendingDeletes'] = flushPendingDeletes;
    Module['setDelayFunction'] = setDelayFunction;
  }
  var registeredInstances = {};
  function getBasestPointer(class_, ptr) {
    if (ptr === undefined) {
      throwBindingError('ptr should not be undefined');
    }
    while (class_.baseClass) {
      ptr = class_.upcast(ptr);
      class_ = class_.baseClass;
    }
    return ptr;
  }
  function getInheritedInstance(class_, ptr) {
    ptr = getBasestPointer(class_, ptr);
    return registeredInstances[ptr];
  }
  function makeClassHandle(prototype, record) {
    if (!record.ptrType || !record.ptr) {
      throwInternalError('makeClassHandle requires ptr and ptrType');
    }
    var hasSmartPtrType = !!record.smartPtrType;
    var hasSmartPtr = !!record.smartPtr;
    if (hasSmartPtrType !== hasSmartPtr) {
      throwInternalError('Both smartPtrType and smartPtr must be specified');
    }
    record.count = { value: 1 };
    return Object.create(prototype, { $$: { value: record } });
  }
  function RegisteredPointer_fromWireType(ptr) {
    var rawPointer = this.getPointee(ptr);
    if (!rawPointer) {
      this.destructor(ptr);
      return null;
    }
    var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
    if (undefined !== registeredInstance) {
      if (0 === registeredInstance.$$.count.value) {
        registeredInstance.$$.ptr = rawPointer;
        registeredInstance.$$.smartPtr = ptr;
        return registeredInstance['clone']();
      } else {
        var rv = registeredInstance['clone']();
        this.destructor(ptr);
        return rv;
      }
    }
    function makeDefaultHandle() {
      if (this.isSmartPointer) {
        return makeClassHandle(this.registeredClass.instancePrototype, {
          ptrType: this.pointeeType,
          ptr: rawPointer,
          smartPtrType: this,
          smartPtr: ptr
        });
      } else {
        return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this, ptr: ptr });
      }
    }
    var actualType = this.registeredClass.getActualType(rawPointer);
    var registeredPointerRecord = registeredPointers[actualType];
    if (!registeredPointerRecord) {
      return makeDefaultHandle.call(this);
    }
    var toType;
    if (this.isConst) {
      toType = registeredPointerRecord.constPointerType;
    } else {
      toType = registeredPointerRecord.pointerType;
    }
    var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
    if (dp === null) {
      return makeDefaultHandle.call(this);
    }
    if (this.isSmartPointer) {
      return makeClassHandle(toType.registeredClass.instancePrototype, {
        ptrType: toType,
        ptr: dp,
        smartPtrType: this,
        smartPtr: ptr
      });
    } else {
      return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp });
    }
  }
  function init_RegisteredPointer() {
    RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
    RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
    RegisteredPointer.prototype['argPackAdvance'] = 8;
    RegisteredPointer.prototype['readValueFromPointer'] = simpleReadValueFromPointer;
    RegisteredPointer.prototype['deleteObject'] = RegisteredPointer_deleteObject;
    RegisteredPointer.prototype['fromWireType'] = RegisteredPointer_fromWireType;
  }
  function RegisteredPointer(
    name,
    registeredClass,
    isReference,
    isConst,
    isSmartPointer,
    pointeeType,
    sharingPolicy,
    rawGetPointee,
    rawConstructor,
    rawShare,
    rawDestructor
  ) {
    this.name = name;
    this.registeredClass = registeredClass;
    this.isReference = isReference;
    this.isConst = isConst;
    this.isSmartPointer = isSmartPointer;
    this.pointeeType = pointeeType;
    this.sharingPolicy = sharingPolicy;
    this.rawGetPointee = rawGetPointee;
    this.rawConstructor = rawConstructor;
    this.rawShare = rawShare;
    this.rawDestructor = rawDestructor;
    if (!isSmartPointer && registeredClass.baseClass === undefined) {
      if (isConst) {
        this['toWireType'] = constNoSmartPtrRawPointerToWireType;
        this.destructorFunction = null;
      } else {
        this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
        this.destructorFunction = null;
      }
    } else {
      this['toWireType'] = genericPointerToWireType;
    }
  }
  function replacePublicSymbol(name, value, numArguments) {
    if (!Module.hasOwnProperty(name)) {
      throwInternalError('Replacing nonexistant public symbol');
    }
    if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
      Module[name].overloadTable[numArguments] = value;
    } else {
      Module[name] = value;
      Module[name].argCount = numArguments;
    }
  }
  var UnboundTypeError = undefined;
  function getTypeName(type) {
    var ptr = ___getTypeName(type);
    var rv = readLatin1String(ptr);
    _free(ptr);
    return rv;
  }
  function throwUnboundTypeError(message, types) {
    var unboundTypes = [];
    var seen = {};
    function visit(type) {
      if (seen[type]) {
        return;
      }
      if (registeredTypes[type]) {
        return;
      }
      if (typeDependencies[type]) {
        typeDependencies[type].forEach(visit);
        return;
      }
      unboundTypes.push(type);
      seen[type] = true;
    }
    types.forEach(visit);
    throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
  }
  function __embind_register_class(
    rawType,
    rawPointerType,
    rawConstPointerType,
    baseClassRawType,
    getActualTypeSignature,
    getActualType,
    upcastSignature,
    upcast,
    downcastSignature,
    downcast,
    name,
    destructorSignature,
    rawDestructor
  ) {
    name = readLatin1String(name);
    getActualType = requireFunction(getActualTypeSignature, getActualType);
    if (upcast) {
      upcast = requireFunction(upcastSignature, upcast);
    }
    if (downcast) {
      downcast = requireFunction(downcastSignature, downcast);
    }
    rawDestructor = requireFunction(destructorSignature, rawDestructor);
    var legalFunctionName = makeLegalFunctionName(name);
    exposePublicSymbol(legalFunctionName, function() {
      throwUnboundTypeError('Cannot construct ' + name + ' due to unbound types', [baseClassRawType]);
    });
    whenDependentTypesAreResolved(
      [rawType, rawPointerType, rawConstPointerType],
      baseClassRawType ? [baseClassRawType] : [],
      function(base) {
        base = base[0];
        var baseClass;
        var basePrototype;
        if (baseClassRawType) {
          baseClass = base.registeredClass;
          basePrototype = baseClass.instancePrototype;
        } else {
          basePrototype = ClassHandle.prototype;
        }
        var constructor = createNamedFunction(legalFunctionName, function() {
          if (Object.getPrototypeOf(this) !== instancePrototype) {
            throw new BindingError("Use 'new' to construct " + name);
          }
          if (undefined === registeredClass.constructor_body) {
            throw new BindingError(name + ' has no accessible constructor');
          }
          var body = registeredClass.constructor_body[arguments.length];
          if (undefined === body) {
            throw new BindingError(
              'Tried to invoke ctor of ' +
                name +
                ' with invalid number of parameters (' +
                arguments.length +
                ') - expected (' +
                Object.keys(registeredClass.constructor_body).toString() +
                ') parameters instead!'
            );
          }
          return body.apply(this, arguments);
        });
        var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
        constructor.prototype = instancePrototype;
        var registeredClass = new RegisteredClass(
          name,
          constructor,
          instancePrototype,
          rawDestructor,
          baseClass,
          getActualType,
          upcast,
          downcast
        );
        var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
        var pointerConverter = new RegisteredPointer(name + '*', registeredClass, false, false, false);
        var constPointerConverter = new RegisteredPointer(name + ' const*', registeredClass, false, true, false);
        registeredPointers[rawType] = { pointerType: pointerConverter, constPointerType: constPointerConverter };
        replacePublicSymbol(legalFunctionName, constructor);
        return [referenceConverter, pointerConverter, constPointerConverter];
      }
    );
  }
  var emval_free_list = [];
  var emval_handle_array = [{}, { value: undefined }, { value: null }, { value: true }, { value: false }];
  function __emval_decref(handle) {
    if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
      emval_handle_array[handle] = undefined;
      emval_free_list.push(handle);
    }
  }
  var PTHREAD_SPECIFIC = {};
  function _pthread_getspecific(key) {
    return PTHREAD_SPECIFIC[key] || 0;
  }
  function runDestructors(destructors) {
    while (destructors.length) {
      var ptr = destructors.pop();
      var del = destructors.pop();
      del(ptr);
    }
  }
  function __embind_finalize_value_object(structType) {
    var reg = structRegistrations[structType];
    delete structRegistrations[structType];
    var rawConstructor = reg.rawConstructor;
    var rawDestructor = reg.rawDestructor;
    var fieldRecords = reg.fields;
    var fieldTypes = fieldRecords
      .map(function(field) {
        return field.getterReturnType;
      })
      .concat(
        fieldRecords.map(function(field) {
          return field.setterArgumentType;
        })
      );
    whenDependentTypesAreResolved([structType], fieldTypes, function(fieldTypes) {
      var fields = {};
      fieldRecords.forEach(function(field, i) {
        var fieldName = field.fieldName;
        var getterReturnType = fieldTypes[i];
        var getter = field.getter;
        var getterContext = field.getterContext;
        var setterArgumentType = fieldTypes[i + fieldRecords.length];
        var setter = field.setter;
        var setterContext = field.setterContext;
        fields[fieldName] = {
          read: function(ptr) {
            return getterReturnType['fromWireType'](getter(getterContext, ptr));
          },
          write: function(ptr, o) {
            var destructors = [];
            setter(setterContext, ptr, setterArgumentType['toWireType'](destructors, o));
            runDestructors(destructors);
          }
        };
      });
      return [
        {
          name: reg.name,
          fromWireType: function(ptr) {
            var rv = {};
            for (var i in fields) {
              rv[i] = fields[i].read(ptr);
            }
            rawDestructor(ptr);
            return rv;
          },
          toWireType: function(destructors, o) {
            for (var fieldName in fields) {
              if (!(fieldName in o)) {
                throw new TypeError('Missing field');
              }
            }
            var ptr = rawConstructor();
            for (fieldName in fields) {
              fields[fieldName].write(ptr, o[fieldName]);
            }
            if (destructors !== null) {
              destructors.push(rawDestructor, ptr);
            }
            return ptr;
          },
          argPackAdvance: 8,
          readValueFromPointer: simpleReadValueFromPointer,
          destructorFunction: rawDestructor
        }
      ];
    });
  }
  var PTHREAD_SPECIFIC_NEXT_KEY = 1;
  var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
  };
  function _pthread_key_create(key, destructor) {
    if (key == 0) {
      return ERRNO_CODES.EINVAL;
    }
    HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
    PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
    PTHREAD_SPECIFIC_NEXT_KEY++;
    return 0;
  }
  function count_emval_handles() {
    var count = 0;
    for (var i = 5; i < emval_handle_array.length; ++i) {
      if (emval_handle_array[i] !== undefined) {
        ++count;
      }
    }
    return count;
  }
  function get_first_emval() {
    for (var i = 5; i < emval_handle_array.length; ++i) {
      if (emval_handle_array[i] !== undefined) {
        return emval_handle_array[i];
      }
    }
    return null;
  }
  function init_emval() {
    Module['count_emval_handles'] = count_emval_handles;
    Module['get_first_emval'] = get_first_emval;
  }
  function __emval_register(value) {
    switch (value) {
      case undefined: {
        return 1;
      }
      case null: {
        return 2;
      }
      case true: {
        return 3;
      }
      case false: {
        return 4;
      }
      default: {
        var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
        emval_handle_array[handle] = { refcount: 1, value: value };
        return handle;
      }
    }
  }
  function requireRegisteredType(rawType, humanName) {
    var impl = registeredTypes[rawType];
    if (undefined === impl) {
      throwBindingError(humanName + ' has unknown type ' + getTypeName(rawType));
    }
    return impl;
  }
  function __emval_take_value(type, argv) {
    type = requireRegisteredType(type, '_emval_take_value');
    var v = type['readValueFromPointer'](argv);
    return __emval_register(v);
  }
  function _embind_repr(v) {
    if (v === null) {
      return 'null';
    }
    var t = typeof v;
    if (t === 'object' || t === 'array' || t === 'function') {
      return v.toString();
    } else {
      return '' + v;
    }
  }
  function integerReadValueFromPointer(name, shift, signed) {
    switch (shift) {
      case 0:
        return signed
          ? function readS8FromPointer(pointer) {
              return HEAP8[pointer];
            }
          : function readU8FromPointer(pointer) {
              return HEAPU8[pointer];
            };
      case 1:
        return signed
          ? function readS16FromPointer(pointer) {
              return HEAP16[pointer >> 1];
            }
          : function readU16FromPointer(pointer) {
              return HEAPU16[pointer >> 1];
            };
      case 2:
        return signed
          ? function readS32FromPointer(pointer) {
              return HEAP32[pointer >> 2];
            }
          : function readU32FromPointer(pointer) {
              return HEAPU32[pointer >> 2];
            };
      default:
        throw new TypeError('Unknown integer type: ' + name);
    }
  }
  function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
    name = readLatin1String(name);
    if (maxRange === -1) {
      maxRange = 4294967295;
    }
    var shift = getShiftFromSize(size);
    var fromWireType = function(value) {
      return value;
    };
    if (minRange === 0) {
      var bitshift = 32 - 8 * size;
      fromWireType = function(value) {
        return (value << bitshift) >>> bitshift;
      };
    }
    var isUnsignedType = name.indexOf('unsigned') != -1;
    registerType(primitiveType, {
      name: name,
      fromWireType: fromWireType,
      toWireType: function(destructors, value) {
        if (typeof value !== 'number' && typeof value !== 'boolean') {
          throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
        }
        if (value < minRange || value > maxRange) {
          throw new TypeError(
            'Passing a number "' +
              _embind_repr(value) +
              '" from JS side to C/C++ side to an argument of type "' +
              name +
              '", which is outside the valid range [' +
              minRange +
              ', ' +
              maxRange +
              ']!'
          );
        }
        return isUnsignedType ? value >>> 0 : value | 0;
      },
      argPackAdvance: 8,
      readValueFromPointer: integerReadValueFromPointer(name, shift, minRange !== 0),
      destructorFunction: null
    });
  }
  function __exit(status) {
    Module['exit'](status);
  }
  function _exit(status) {
    __exit(status);
  }
  function _pthread_setspecific(key, value) {
    if (!(key in PTHREAD_SPECIFIC)) {
      return ERRNO_CODES.EINVAL;
    }
    PTHREAD_SPECIFIC[key] = value;
    return 0;
  }
  function __embind_register_emval(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
      name: name,
      fromWireType: function(handle) {
        var rv = emval_handle_array[handle].value;
        __emval_decref(handle);
        return rv;
      },
      toWireType: function(destructors, value) {
        return __emval_register(value);
      },
      argPackAdvance: 8,
      readValueFromPointer: simpleReadValueFromPointer,
      destructorFunction: null
    });
  }
  function ___cxa_allocate_exception(size) {
    return _malloc(size);
  }
  function ___cxa_pure_virtual() {
    ABORT = true;
    throw 'Pure virtual function called!';
  }
  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
    var typeMapping = [
      Int8Array,
      Uint8Array,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array
    ];
    var TA = typeMapping[dataTypeIndex];
    function decodeMemoryView(handle) {
      handle = handle >> 2;
      var heap = HEAPU32;
      var size = heap[handle];
      var data = heap[handle + 1];
      return new TA(heap['buffer'], data, size);
    }
    name = readLatin1String(name);
    registerType(
      rawType,
      { name: name, fromWireType: decodeMemoryView, argPackAdvance: 8, readValueFromPointer: decodeMemoryView },
      { ignoreDuplicateRegistrations: true }
    );
  }
  function floatReadValueFromPointer(name, shift) {
    switch (shift) {
      case 2:
        return function(pointer) {
          return this['fromWireType'](HEAPF32[pointer >> 2]);
        };
      case 3:
        return function(pointer) {
          return this['fromWireType'](HEAPF64[pointer >> 3]);
        };
      default:
        throw new TypeError('Unknown float type: ' + name);
    }
  }
  function __embind_register_float(rawType, name, size) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
      name: name,
      fromWireType: function(value) {
        return value;
      },
      toWireType: function(destructors, value) {
        if (typeof value !== 'number' && typeof value !== 'boolean') {
          throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
        }
        return value;
      },
      argPackAdvance: 8,
      readValueFromPointer: floatReadValueFromPointer(name, shift),
      destructorFunction: null
    });
  }
  function _sched_yield() {
    return 0;
  }
  function ___cxa_begin_catch(ptr) {
    var info = EXCEPTIONS.infos[ptr];
    if (info && !info.caught) {
      info.caught = true;
      __ZSt18uncaught_exceptionv.uncaught_exception--;
    }
    if (info) info.rethrown = false;
    EXCEPTIONS.caught.push(ptr);
    EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
    return ptr;
  }
  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest;
  }
  Module['_memcpy'] = _memcpy;
  var SYSCALLS = {
    varargs: 0,
    get: function(varargs) {
      SYSCALLS.varargs += 4;
      var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
      return ret;
    },
    getStr: function() {
      var ret = Pointer_stringify(SYSCALLS.get());
      return ret;
    },
    get64: function() {
      var low = SYSCALLS.get(),
        high = SYSCALLS.get();
      if (low >= 0) assert(high === 0);
      else assert(high === -1);
      return low;
    },
    getZero: function() {
      assert(SYSCALLS.get() === 0);
    }
  };
  function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function validateThis(this_, classType, humanName) {
    if (!(this_ instanceof Object)) {
      throwBindingError(humanName + ' with invalid "this": ' + this_);
    }
    if (!(this_ instanceof classType.registeredClass.constructor)) {
      throwBindingError(humanName + ' incompatible with "this" of type ' + this_.constructor.name);
    }
    if (!this_.$$.ptr) {
      throwBindingError('cannot call emscripten binding method ' + humanName + ' on deleted object');
    }
    return upcastPointer(this_.$$.ptr, this_.$$.ptrType.registeredClass, classType.registeredClass);
  }
  function __embind_register_class_class_property(
    rawClassType,
    fieldName,
    rawFieldType,
    rawFieldPtr,
    getterSignature,
    getter,
    setterSignature,
    setter
  ) {
    fieldName = readLatin1String(fieldName);
    getter = requireFunction(getterSignature, getter);
    whenDependentTypesAreResolved([], [rawClassType], function(classType) {
      classType = classType[0];
      var humanName = classType.name + '.' + fieldName;
      var desc = {
        get: function() {
          throwUnboundTypeError('Cannot access ' + humanName + ' due to unbound types', [
            getterReturnType,
            setterArgumentType
          ]);
        },
        enumerable: true,
        configurable: true
      };
      if (setter) {
        desc.set = function() {
          throwUnboundTypeError('Cannot access ' + humanName + ' due to unbound types', [
            getterReturnType,
            setterArgumentType
          ]);
        };
      } else {
        desc.set = function(v) {
          throwBindingError(humanName + ' is a read-only property');
        };
      }
      Object.defineProperty(classType.registeredClass.constructor, fieldName, desc);
      whenDependentTypesAreResolved([], [rawFieldType], function(fieldType) {
        fieldType = fieldType[0];
        var desc = {
          get: function() {
            return fieldType['fromWireType'](getter(rawFieldPtr));
          },
          enumerable: true
        };
        if (setter) {
          setter = requireFunction(setterSignature, setter);
          desc.set = function(v) {
            var destructors = [];
            setter(rawFieldPtr, fieldType['toWireType'](destructors, v));
            runDestructors(destructors);
          };
        }
        Object.defineProperty(classType.registeredClass.constructor, fieldName, desc);
        return [];
      });
      return [];
    });
  }
  function ___setErrNo(value) {
    if (Module['___errno_location']) HEAP32[Module['___errno_location']() >> 2] = value;
    return value;
  }
  Module['_sbrk'] = _sbrk;
  Module['_memmove'] = _memmove;
  function ___gxx_personality_v0() {}
  function heap32VectorToArray(count, firstElement) {
    var array = [];
    for (var i = 0; i < count; i++) {
      array.push(HEAP32[(firstElement >> 2) + i]);
    }
    return array;
  }
  function __embind_register_class_constructor(
    rawClassType,
    argCount,
    rawArgTypesAddr,
    invokerSignature,
    invoker,
    rawConstructor
  ) {
    var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    invoker = requireFunction(invokerSignature, invoker);
    whenDependentTypesAreResolved([], [rawClassType], function(classType) {
      classType = classType[0];
      var humanName = 'constructor ' + classType.name;
      if (undefined === classType.registeredClass.constructor_body) {
        classType.registeredClass.constructor_body = [];
      }
      if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
        throw new BindingError(
          'Cannot register multiple constructors with identical number of parameters (' +
            (argCount - 1) +
            ") for class '" +
            classType.name +
            "'! Overload resolution is currently only performed using the parameter count, not actual type info!"
        );
      }
      classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
        throwUnboundTypeError('Cannot construct ' + classType.name + ' due to unbound types', rawArgTypes);
      };
      whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
        classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
          if (arguments.length !== argCount - 1) {
            throwBindingError(
              humanName + ' called with ' + arguments.length + ' arguments, expected ' + (argCount - 1)
            );
          }
          var destructors = [];
          var args = new Array(argCount);
          args[0] = rawConstructor;
          for (var i = 1; i < argCount; ++i) {
            args[i] = argTypes[i]['toWireType'](destructors, arguments[i - 1]);
          }
          var ptr = invoker.apply(null, args);
          runDestructors(destructors);
          return argTypes[0]['fromWireType'](ptr);
        };
        return [];
      });
      return [];
    });
  }
  Module['_llvm_bswap_i32'] = _llvm_bswap_i32;
  function _llvm_trap() {
    abort('trap!');
  }
  function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        offset_high = SYSCALLS.get(),
        offset_low = SYSCALLS.get(),
        result = SYSCALLS.get(),
        whence = SYSCALLS.get();
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[result >> 2] = stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function new_(constructor, argumentList) {
    if (!(constructor instanceof Function)) {
      throw new TypeError('new_ called with constructor type ' + typeof constructor + ' which is not a function');
    }
    var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function() {});
    dummy.prototype = constructor.prototype;
    var obj = new dummy();
    var r = constructor.apply(obj, argumentList);
    return r instanceof Object ? r : obj;
  }
  function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
    var argCount = argTypes.length;
    if (argCount < 2) {
      throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
    }
    var isClassMethodFunc = argTypes[1] !== null && classType !== null;
    var argsList = '';
    var argsListWired = '';
    for (var i = 0; i < argCount - 2; ++i) {
      argsList += (i !== 0 ? ', ' : '') + 'arg' + i;
      argsListWired += (i !== 0 ? ', ' : '') + 'arg' + i + 'Wired';
    }
    var invokerFnBody =
      'return function ' +
      makeLegalFunctionName(humanName) +
      '(' +
      argsList +
      ') {\n' +
      'if (arguments.length !== ' +
      (argCount - 2) +
      ') {\n' +
      "throwBindingError('function " +
      humanName +
      " called with ' + arguments.length + ' arguments, expected " +
      (argCount - 2) +
      " args!');\n" +
      '}\n';
    var needsDestructorStack = false;
    for (var i = 1; i < argTypes.length; ++i) {
      if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
        needsDestructorStack = true;
        break;
      }
    }
    if (needsDestructorStack) {
      invokerFnBody += 'var destructors = [];\n';
    }
    var dtorStack = needsDestructorStack ? 'destructors' : 'null';
    var args1 = ['throwBindingError', 'invoker', 'fn', 'runDestructors', 'retType', 'classParam'];
    var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
    if (isClassMethodFunc) {
      invokerFnBody += 'var thisWired = classParam.toWireType(' + dtorStack + ', this);\n';
    }
    for (var i = 0; i < argCount - 2; ++i) {
      invokerFnBody +=
        'var arg' +
        i +
        'Wired = argType' +
        i +
        '.toWireType(' +
        dtorStack +
        ', arg' +
        i +
        '); // ' +
        argTypes[i + 2].name +
        '\n';
      args1.push('argType' + i);
      args2.push(argTypes[i + 2]);
    }
    if (isClassMethodFunc) {
      argsListWired = 'thisWired' + (argsListWired.length > 0 ? ', ' : '') + argsListWired;
    }
    var returns = argTypes[0].name !== 'void';
    invokerFnBody +=
      (returns ? 'var rv = ' : '') + 'invoker(fn' + (argsListWired.length > 0 ? ', ' : '') + argsListWired + ');\n';
    if (needsDestructorStack) {
      invokerFnBody += 'runDestructors(destructors);\n';
    } else {
      for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
        var paramName = i === 1 ? 'thisWired' : 'arg' + (i - 2) + 'Wired';
        if (argTypes[i].destructorFunction !== null) {
          invokerFnBody += paramName + '_dtor(' + paramName + '); // ' + argTypes[i].name + '\n';
          args1.push(paramName + '_dtor');
          args2.push(argTypes[i].destructorFunction);
        }
      }
    }
    if (returns) {
      invokerFnBody += 'var ret = retType.fromWireType(rv);\n' + 'return ret;\n';
    } else {
    }
    invokerFnBody += '}\n';
    args1.push(invokerFnBody);
    var invokerFunction = new_(Function, args1).apply(null, args2);
    return invokerFunction;
  }
  function __embind_register_class_function(
    rawClassType,
    methodName,
    argCount,
    rawArgTypesAddr,
    invokerSignature,
    rawInvoker,
    context,
    isPureVirtual
  ) {
    var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    methodName = readLatin1String(methodName);
    rawInvoker = requireFunction(invokerSignature, rawInvoker);
    whenDependentTypesAreResolved([], [rawClassType], function(classType) {
      classType = classType[0];
      var humanName = classType.name + '.' + methodName;
      if (isPureVirtual) {
        classType.registeredClass.pureVirtualFunctions.push(methodName);
      }
      function unboundTypesHandler() {
        throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
      }
      var proto = classType.registeredClass.instancePrototype;
      var method = proto[methodName];
      if (
        undefined === method ||
        (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)
      ) {
        unboundTypesHandler.argCount = argCount - 2;
        unboundTypesHandler.className = classType.name;
        proto[methodName] = unboundTypesHandler;
      } else {
        ensureOverloadTable(proto, methodName, humanName);
        proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
      }
      whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
        var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
        if (undefined === proto[methodName].overloadTable) {
          memberFunction.argCount = argCount - 2;
          proto[methodName] = memberFunction;
        } else {
          proto[methodName].overloadTable[argCount - 2] = memberFunction;
        }
        return [];
      });
      return [];
    });
  }
  function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.get(),
        iov = SYSCALLS.get(),
        iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []];
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(iov + i * 8) >> 2];
        var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr + j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
      if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  Module['_llvm_ctlz_i64'] = _llvm_ctlz_i64;
  function __emval_incref(handle) {
    if (handle > 4) {
      emval_handle_array[handle].refcount += 1;
    }
  }
  embind_init_charCodes();
  BindingError = Module['BindingError'] = extendError(Error, 'BindingError');
  InternalError = Module['InternalError'] = extendError(Error, 'InternalError');
  init_ClassHandle();
  init_RegisteredPointer();
  init_embind();
  UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');
  init_emval();
  __ATEXIT__.push(function() {
    var fflush = Module['_fflush'];
    if (fflush) fflush(0);
    var printChar = ___syscall146.printChar;
    if (!printChar) return;
    var buffers = ___syscall146.buffers;
    if (buffers[1].length) printChar(1, 10);
    if (buffers[2].length) printChar(2, 10);
  });
  DYNAMICTOP_PTR = allocate(1, 'i32', ALLOC_STATIC);
  STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);
  HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
  staticSealed = true;
  Module['wasmTableSize'] = 2595;
  Module['wasmMaxTableSize'] = 2595;
  function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiiii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiiij(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viiiij'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_vi(index, a1) {
    try {
      Module['dynCall_vi'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_vii(index, a1, a2) {
    try {
      Module['dynCall_vii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      return Module['dynCall_iiiiiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiiif(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiiif'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_ii(index, a1) {
    try {
      return Module['dynCall_ii'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiif(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viiif'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    try {
      return Module['dynCall_iiiiii'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_jii(index, a1, a2) {
    try {
      return Module['dynCall_jii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_iiii(index, a1, a2, a3) {
    try {
      return Module['dynCall_iiii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_fii(index, a1, a2) {
    try {
      return Module['dynCall_fii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_diiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_diiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_fiii(index, a1, a2, a3) {
    try {
      return Module['dynCall_fiii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiiid(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiiid'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viji(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viji'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_ji(index, a1) {
    try {
      return Module['dynCall_ji'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_fi(index, a1) {
    try {
      return Module['dynCall_fi'](index, a1);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_iii(index, a1, a2) {
    try {
      return Module['dynCall_iii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_diii(index, a1, a2, a3) {
    try {
      return Module['dynCall_diii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
      Module['dynCall_viiiiii'](index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_dii(index, a1, a2) {
    try {
      return Module['dynCall_dii'](index, a1, a2);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_i(index) {
    try {
      return Module['dynCall_i'](index);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_jiii(index, a1, a2, a3) {
    try {
      return Module['dynCall_jiii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_jiiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_jiiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_fiiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_fiiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_iiiii(index, a1, a2, a3, a4) {
    try {
      return Module['dynCall_iiiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiid(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viiid'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viii(index, a1, a2, a3) {
    try {
      Module['dynCall_viii'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viij(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viij'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_v(index) {
    try {
      Module['dynCall_v'](index);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viid(index, a1, a2, a3) {
    try {
      Module['dynCall_viid'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viif(index, a1, a2, a3) {
    try {
      Module['dynCall_viif'](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiij(index, a1, a2, a3, a4, a5) {
    try {
      Module['dynCall_viiij'](index, a1, a2, a3, a4, a5);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  function invoke_viiii(index, a1, a2, a3, a4) {
    try {
      Module['dynCall_viiii'](index, a1, a2, a3, a4);
    } catch (e) {
      if (typeof e !== 'number' && e !== 'longjmp') throw e;
      Module['setThrew'](1, 0);
    }
  }
  Module.asmGlobalArg = {
    Math: Math,
    Int8Array: Int8Array,
    Int16Array: Int16Array,
    Int32Array: Int32Array,
    Uint8Array: Uint8Array,
    Uint16Array: Uint16Array,
    Uint32Array: Uint32Array,
    Float32Array: Float32Array,
    Float64Array: Float64Array,
    NaN: NaN,
    Infinity: Infinity
  };
  Module.asmLibraryArg = {
    abort: abort,
    assert: assert,
    enlargeMemory: enlargeMemory,
    getTotalMemory: getTotalMemory,
    abortOnCannotGrowMemory: abortOnCannotGrowMemory,
    invoke_viiiii: invoke_viiiii,
    invoke_viiiij: invoke_viiiij,
    invoke_vi: invoke_vi,
    invoke_vii: invoke_vii,
    invoke_iiiiiii: invoke_iiiiiii,
    invoke_viiiif: invoke_viiiif,
    invoke_ii: invoke_ii,
    invoke_viiif: invoke_viiif,
    invoke_iiiiii: invoke_iiiiii,
    invoke_jii: invoke_jii,
    invoke_iiii: invoke_iiii,
    invoke_fii: invoke_fii,
    invoke_diiii: invoke_diiii,
    invoke_fiii: invoke_fiii,
    invoke_viiiid: invoke_viiiid,
    invoke_viji: invoke_viji,
    invoke_ji: invoke_ji,
    invoke_fi: invoke_fi,
    invoke_iii: invoke_iii,
    invoke_diii: invoke_diii,
    invoke_viiiiii: invoke_viiiiii,
    invoke_dii: invoke_dii,
    invoke_i: invoke_i,
    invoke_jiii: invoke_jiii,
    invoke_jiiii: invoke_jiiii,
    invoke_fiiii: invoke_fiiii,
    invoke_iiiii: invoke_iiiii,
    invoke_viiid: invoke_viiid,
    invoke_viii: invoke_viii,
    invoke_viij: invoke_viij,
    invoke_v: invoke_v,
    invoke_viid: invoke_viid,
    invoke_viif: invoke_viif,
    invoke_viiij: invoke_viiij,
    invoke_viiii: invoke_viiii,
    floatReadValueFromPointer: floatReadValueFromPointer,
    simpleReadValueFromPointer: simpleReadValueFromPointer,
    throwInternalError: throwInternalError,
    get_first_emval: get_first_emval,
    getLiveInheritedInstances: getLiveInheritedInstances,
    ___assert_fail: ___assert_fail,
    __ZSt18uncaught_exceptionv: __ZSt18uncaught_exceptionv,
    ClassHandle: ClassHandle,
    getShiftFromSize: getShiftFromSize,
    ___cxa_begin_catch: ___cxa_begin_catch,
    _emscripten_memcpy_big: _emscripten_memcpy_big,
    runDestructor: runDestructor,
    throwInstanceAlreadyDeleted: throwInstanceAlreadyDeleted,
    __embind_register_std_string: __embind_register_std_string,
    init_RegisteredPointer: init_RegisteredPointer,
    ClassHandle_isAliasOf: ClassHandle_isAliasOf,
    flushPendingDeletes: flushPendingDeletes,
    makeClassHandle: makeClassHandle,
    whenDependentTypesAreResolved: whenDependentTypesAreResolved,
    __embind_register_class_constructor: __embind_register_class_constructor,
    __exit: __exit,
    init_ClassHandle: init_ClassHandle,
    ___syscall140: ___syscall140,
    ClassHandle_clone: ClassHandle_clone,
    ___syscall146: ___syscall146,
    __embind_register_class_class_property: __embind_register_class_class_property,
    RegisteredClass: RegisteredClass,
    ___cxa_find_matching_catch: ___cxa_find_matching_catch,
    __embind_register_value_object_field: __embind_register_value_object_field,
    embind_init_charCodes: embind_init_charCodes,
    ___setErrNo: ___setErrNo,
    __embind_register_bool: __embind_register_bool,
    ___resumeException: ___resumeException,
    createNamedFunction: createNamedFunction,
    __embind_register_emval: __embind_register_emval,
    __embind_finalize_value_object: __embind_finalize_value_object,
    __emval_decref: __emval_decref,
    _pthread_once: _pthread_once,
    _llvm_trap: _llvm_trap,
    __embind_register_class: __embind_register_class,
    constNoSmartPtrRawPointerToWireType: constNoSmartPtrRawPointerToWireType,
    heap32VectorToArray: heap32VectorToArray,
    ClassHandle_delete: ClassHandle_delete,
    RegisteredPointer_destructor: RegisteredPointer_destructor,
    ___syscall6: ___syscall6,
    ensureOverloadTable: ensureOverloadTable,
    new_: new_,
    downcastPointer: downcastPointer,
    _exit: _exit,
    replacePublicSymbol: replacePublicSymbol,
    init_embind: init_embind,
    ClassHandle_deleteLater: ClassHandle_deleteLater,
    _sched_yield: _sched_yield,
    RegisteredPointer_deleteObject: RegisteredPointer_deleteObject,
    ClassHandle_isDeleted: ClassHandle_isDeleted,
    __embind_register_integer: __embind_register_integer,
    ___cxa_allocate_exception: ___cxa_allocate_exception,
    __emval_take_value: __emval_take_value,
    __embind_register_value_object: __embind_register_value_object,
    _embind_repr: _embind_repr,
    _pthread_getspecific: _pthread_getspecific,
    throwUnboundTypeError: throwUnboundTypeError,
    craftInvokerFunction: craftInvokerFunction,
    runDestructors: runDestructors,
    requireRegisteredType: requireRegisteredType,
    makeLegalFunctionName: makeLegalFunctionName,
    _pthread_key_create: _pthread_key_create,
    upcastPointer: upcastPointer,
    init_emval: init_emval,
    shallowCopyInternalPointer: shallowCopyInternalPointer,
    nonConstNoSmartPtrRawPointerToWireType: nonConstNoSmartPtrRawPointerToWireType,
    _abort: _abort,
    throwBindingError: throwBindingError,
    getTypeName: getTypeName,
    validateThis: validateThis,
    exposePublicSymbol: exposePublicSymbol,
    RegisteredPointer_fromWireType: RegisteredPointer_fromWireType,
    ___cxa_pure_virtual: ___cxa_pure_virtual,
    __embind_register_memory_view: __embind_register_memory_view,
    getInheritedInstance: getInheritedInstance,
    setDelayFunction: setDelayFunction,
    ___gxx_personality_v0: ___gxx_personality_v0,
    extendError: extendError,
    __embind_register_void: __embind_register_void,
    RegisteredPointer_getPointee: RegisteredPointer_getPointee,
    __emval_register: __emval_register,
    __embind_register_std_wstring: __embind_register_std_wstring,
    __embind_register_class_function: __embind_register_class_function,
    __emval_incref: __emval_incref,
    RegisteredPointer: RegisteredPointer,
    readLatin1String: readLatin1String,
    getBasestPointer: getBasestPointer,
    getInheritedInstanceCount: getInheritedInstanceCount,
    __embind_register_float: __embind_register_float,
    integerReadValueFromPointer: integerReadValueFromPointer,
    _pthread_setspecific: _pthread_setspecific,
    genericPointerToWireType: genericPointerToWireType,
    registerType: registerType,
    ___cxa_throw: ___cxa_throw,
    count_emval_handles: count_emval_handles,
    requireFunction: requireFunction,
    DYNAMICTOP_PTR: DYNAMICTOP_PTR,
    tempDoublePtr: tempDoublePtr,
    ABORT: ABORT,
    STACKTOP: STACKTOP,
    STACK_MAX: STACK_MAX
  };
  var asm = Module['asm'](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
  Module['asm'] = asm;
  var __GLOBAL__sub_I_api_pb_cc = (Module['__GLOBAL__sub_I_api_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_api_pb_cc'].apply(null, arguments);
  });
  var stackSave = (Module['stackSave'] = function() {
    return Module['asm']['stackSave'].apply(null, arguments);
  });
  var setThrew = (Module['setThrew'] = function() {
    return Module['asm']['setThrew'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_empty_pb_cc = (Module['__GLOBAL__sub_I_empty_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_empty_pb_cc'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_any_pb_cc = (Module['__GLOBAL__sub_I_any_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_any_pb_cc'].apply(null, arguments);
  });
  var ___cxa_is_pointer_type = (Module['___cxa_is_pointer_type'] = function() {
    return Module['asm']['___cxa_is_pointer_type'].apply(null, arguments);
  });
  var _llvm_ctlz_i64 = (Module['_llvm_ctlz_i64'] = function() {
    return Module['asm']['_llvm_ctlz_i64'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_field_mask_pb_cc = (Module['__GLOBAL__sub_I_field_mask_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_field_mask_pb_cc'].apply(null, arguments);
  });
  var _memset = (Module['_memset'] = function() {
    return Module['asm']['_memset'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_status_cc = (Module['__GLOBAL__sub_I_status_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_status_cc'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_timestamp_pb_cc = (Module['__GLOBAL__sub_I_timestamp_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_timestamp_pb_cc'].apply(null, arguments);
  });
  var _sbrk = (Module['_sbrk'] = function() {
    return Module['asm']['_sbrk'].apply(null, arguments);
  });
  var _memcpy = (Module['_memcpy'] = function() {
    return Module['asm']['_memcpy'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_wrappers_pb_cc = (Module['__GLOBAL__sub_I_wrappers_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_wrappers_pb_cc'].apply(null, arguments);
  });
  var _llvm_bswap_i32 = (Module['_llvm_bswap_i32'] = function() {
    return Module['asm']['_llvm_bswap_i32'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_struct_pb_cc = (Module['__GLOBAL__sub_I_struct_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_struct_pb_cc'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_duration_pb_cc = (Module['__GLOBAL__sub_I_duration_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_duration_pb_cc'].apply(null, arguments);
  });
  var stackAlloc = (Module['stackAlloc'] = function() {
    return Module['asm']['stackAlloc'].apply(null, arguments);
  });
  var getTempRet0 = (Module['getTempRet0'] = function() {
    return Module['asm']['getTempRet0'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_bind_cpp = (Module['__GLOBAL__sub_I_bind_cpp'] = function() {
    return Module['asm']['__GLOBAL__sub_I_bind_cpp'].apply(null, arguments);
  });
  var setTempRet0 = (Module['setTempRet0'] = function() {
    return Module['asm']['setTempRet0'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_type_pb_cc = (Module['__GLOBAL__sub_I_type_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_type_pb_cc'].apply(null, arguments);
  });
  var _emscripten_get_global_libc = (Module['_emscripten_get_global_libc'] = function() {
    return Module['asm']['_emscripten_get_global_libc'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_parser_cc = (Module['__GLOBAL__sub_I_parser_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_parser_cc'].apply(null, arguments);
  });
  var ___getTypeName = (Module['___getTypeName'] = function() {
    return Module['asm']['___getTypeName'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_descriptor_pb_cc = (Module['__GLOBAL__sub_I_descriptor_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_descriptor_pb_cc'].apply(null, arguments);
  });
  var ___errno_location = (Module['___errno_location'] = function() {
    return Module['asm']['___errno_location'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_message_cc = (Module['__GLOBAL__sub_I_message_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_message_cc'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_source_context_pb_cc = (Module['__GLOBAL__sub_I_source_context_pb_cc'] = function() {
    return Module['asm']['__GLOBAL__sub_I_source_context_pb_cc'].apply(null, arguments);
  });
  var ___cxa_can_catch = (Module['___cxa_can_catch'] = function() {
    return Module['asm']['___cxa_can_catch'].apply(null, arguments);
  });
  var _free = (Module['_free'] = function() {
    return Module['asm']['_free'].apply(null, arguments);
  });
  var runPostSets = (Module['runPostSets'] = function() {
    return Module['asm']['runPostSets'].apply(null, arguments);
  });
  var _dummy = (Module['_dummy'] = function() {
    return Module['asm']['_dummy'].apply(null, arguments);
  });
  var establishStackSpace = (Module['establishStackSpace'] = function() {
    return Module['asm']['establishStackSpace'].apply(null, arguments);
  });
  var _memmove = (Module['_memmove'] = function() {
    return Module['asm']['_memmove'].apply(null, arguments);
  });
  var stackRestore = (Module['stackRestore'] = function() {
    return Module['asm']['stackRestore'].apply(null, arguments);
  });
  var _malloc = (Module['_malloc'] = function() {
    return Module['asm']['_malloc'].apply(null, arguments);
  });
  var __GLOBAL__sub_I_nnet_language_identifier_cc = (Module[
    '__GLOBAL__sub_I_nnet_language_identifier_cc'
  ] = function() {
    return Module['asm']['__GLOBAL__sub_I_nnet_language_identifier_cc'].apply(null, arguments);
  });
  var dynCall_viiiii = (Module['dynCall_viiiii'] = function() {
    return Module['asm']['dynCall_viiiii'].apply(null, arguments);
  });
  var dynCall_viiiij = (Module['dynCall_viiiij'] = function() {
    return Module['asm']['dynCall_viiiij'].apply(null, arguments);
  });
  var dynCall_vi = (Module['dynCall_vi'] = function() {
    return Module['asm']['dynCall_vi'].apply(null, arguments);
  });
  var dynCall_vii = (Module['dynCall_vii'] = function() {
    return Module['asm']['dynCall_vii'].apply(null, arguments);
  });
  var dynCall_iiiiiii = (Module['dynCall_iiiiiii'] = function() {
    return Module['asm']['dynCall_iiiiiii'].apply(null, arguments);
  });
  var dynCall_viiiif = (Module['dynCall_viiiif'] = function() {
    return Module['asm']['dynCall_viiiif'].apply(null, arguments);
  });
  var dynCall_ii = (Module['dynCall_ii'] = function() {
    return Module['asm']['dynCall_ii'].apply(null, arguments);
  });
  var dynCall_viiif = (Module['dynCall_viiif'] = function() {
    return Module['asm']['dynCall_viiif'].apply(null, arguments);
  });
  var dynCall_iiiiii = (Module['dynCall_iiiiii'] = function() {
    return Module['asm']['dynCall_iiiiii'].apply(null, arguments);
  });
  var dynCall_jii = (Module['dynCall_jii'] = function() {
    return Module['asm']['dynCall_jii'].apply(null, arguments);
  });
  var dynCall_iiii = (Module['dynCall_iiii'] = function() {
    return Module['asm']['dynCall_iiii'].apply(null, arguments);
  });
  var dynCall_fii = (Module['dynCall_fii'] = function() {
    return Module['asm']['dynCall_fii'].apply(null, arguments);
  });
  var dynCall_diiii = (Module['dynCall_diiii'] = function() {
    return Module['asm']['dynCall_diiii'].apply(null, arguments);
  });
  var dynCall_fiii = (Module['dynCall_fiii'] = function() {
    return Module['asm']['dynCall_fiii'].apply(null, arguments);
  });
  var dynCall_viiiid = (Module['dynCall_viiiid'] = function() {
    return Module['asm']['dynCall_viiiid'].apply(null, arguments);
  });
  var dynCall_viji = (Module['dynCall_viji'] = function() {
    return Module['asm']['dynCall_viji'].apply(null, arguments);
  });
  var dynCall_ji = (Module['dynCall_ji'] = function() {
    return Module['asm']['dynCall_ji'].apply(null, arguments);
  });
  var dynCall_fi = (Module['dynCall_fi'] = function() {
    return Module['asm']['dynCall_fi'].apply(null, arguments);
  });
  var dynCall_iii = (Module['dynCall_iii'] = function() {
    return Module['asm']['dynCall_iii'].apply(null, arguments);
  });
  var dynCall_diii = (Module['dynCall_diii'] = function() {
    return Module['asm']['dynCall_diii'].apply(null, arguments);
  });
  var dynCall_viiiiii = (Module['dynCall_viiiiii'] = function() {
    return Module['asm']['dynCall_viiiiii'].apply(null, arguments);
  });
  var dynCall_dii = (Module['dynCall_dii'] = function() {
    return Module['asm']['dynCall_dii'].apply(null, arguments);
  });
  var dynCall_i = (Module['dynCall_i'] = function() {
    return Module['asm']['dynCall_i'].apply(null, arguments);
  });
  var dynCall_jiii = (Module['dynCall_jiii'] = function() {
    return Module['asm']['dynCall_jiii'].apply(null, arguments);
  });
  var dynCall_jiiii = (Module['dynCall_jiiii'] = function() {
    return Module['asm']['dynCall_jiiii'].apply(null, arguments);
  });
  var dynCall_fiiii = (Module['dynCall_fiiii'] = function() {
    return Module['asm']['dynCall_fiiii'].apply(null, arguments);
  });
  var dynCall_iiiii = (Module['dynCall_iiiii'] = function() {
    return Module['asm']['dynCall_iiiii'].apply(null, arguments);
  });
  var dynCall_viiid = (Module['dynCall_viiid'] = function() {
    return Module['asm']['dynCall_viiid'].apply(null, arguments);
  });
  var dynCall_viii = (Module['dynCall_viii'] = function() {
    return Module['asm']['dynCall_viii'].apply(null, arguments);
  });
  var dynCall_viij = (Module['dynCall_viij'] = function() {
    return Module['asm']['dynCall_viij'].apply(null, arguments);
  });
  var dynCall_v = (Module['dynCall_v'] = function() {
    return Module['asm']['dynCall_v'].apply(null, arguments);
  });
  var dynCall_viid = (Module['dynCall_viid'] = function() {
    return Module['asm']['dynCall_viid'].apply(null, arguments);
  });
  var dynCall_viif = (Module['dynCall_viif'] = function() {
    return Module['asm']['dynCall_viif'].apply(null, arguments);
  });
  var dynCall_viiij = (Module['dynCall_viiij'] = function() {
    return Module['asm']['dynCall_viiij'].apply(null, arguments);
  });
  var dynCall_viiii = (Module['dynCall_viiii'] = function() {
    return Module['asm']['dynCall_viiii'].apply(null, arguments);
  });
  Runtime.stackAlloc = Module['stackAlloc'];
  Runtime.stackSave = Module['stackSave'];
  Runtime.stackRestore = Module['stackRestore'];
  Runtime.establishStackSpace = Module['establishStackSpace'];
  Runtime.setTempRet0 = Module['setTempRet0'];
  Runtime.getTempRet0 = Module['getTempRet0'];
  Module['asm'] = asm;
  if (memoryInitializer) {
    if (typeof Module['locateFile'] === 'function') {
      memoryInitializer = Module['locateFile'](memoryInitializer);
    } else if (Module['memoryInitializerPrefixURL']) {
      memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
    }
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
      var data = Module['readBinary'](memoryInitializer);
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
    } else {
      addRunDependency('memory initializer');
      var applyMemoryInitializer = function(data) {
        if (data.byteLength) data = new Uint8Array(data);
        HEAPU8.set(data, Runtime.GLOBAL_BASE);
        if (Module['memoryInitializerRequest']) delete Module['memoryInitializerRequest'].response;
        removeRunDependency('memory initializer');
      };
      function doBrowserLoad() {
        Module['readAsync'](memoryInitializer, applyMemoryInitializer, function() {
          throw 'could not load memory initializer ' + memoryInitializer;
        });
      }
      if (Module['memoryInitializerRequest']) {
        function useRequest() {
          var request = Module['memoryInitializerRequest'];
          if (request.status !== 200 && request.status !== 0) {
            console.warn(
              'a problem seems to have happened with Module.memoryInitializerRequest, status: ' +
                request.status +
                ', retrying ' +
                memoryInitializer
            );
            doBrowserLoad();
            return;
          }
          applyMemoryInitializer(request.response);
        }
        if (Module['memoryInitializerRequest'].response) {
          setTimeout(useRequest, 0);
        } else {
          Module['memoryInitializerRequest'].addEventListener('load', useRequest);
        }
      } else {
        doBrowserLoad();
      }
    }
  }
  Module['then'] = function(func) {
    if (Module['calledRun']) {
      func(Module);
    } else {
      var old = Module['onRuntimeInitialized'];
      Module['onRuntimeInitialized'] = function() {
        if (old) old();
        func(Module);
      };
    }
    return Module;
  };
  function ExitStatus(status) {
    this.name = 'ExitStatus';
    this.message = 'Program terminated with exit(' + status + ')';
    this.status = status;
  }
  ExitStatus.prototype = new Error();
  ExitStatus.prototype.constructor = ExitStatus;
  var initialStackTop;
  var preloadStartTime = null;
  var calledMain = false;
  dependenciesFulfilled = function runCaller() {
    if (!Module['calledRun']) run();
    if (!Module['calledRun']) dependenciesFulfilled = runCaller;
  };
  Module['callMain'] = Module.callMain = function callMain(args) {
    args = args || [];
    ensureInitRuntime();
    var argc = args.length + 1;
    function pad() {
      for (var i = 0; i < 4 - 1; i++) {
        argv.push(0);
      }
    }
    var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL)];
    pad();
    for (var i = 0; i < argc - 1; i = i + 1) {
      argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
      pad();
    }
    argv.push(0);
    argv = allocate(argv, 'i32', ALLOC_NORMAL);
    try {
      var ret = Module['_main'](argc, argv, 0);
      exit(ret, true);
    } catch (e) {
      if (e instanceof ExitStatus) {
        return;
      } else if (e == 'SimulateInfiniteLoop') {
        Module['noExitRuntime'] = true;
        return;
      } else {
        var toLog = e;
        if (e && typeof e === 'object' && e.stack) {
          toLog = [e, e.stack];
        }
        Module.printErr('exception thrown: ' + toLog);
        Module['quit'](1, e);
      }
    } finally {
      calledMain = true;
    }
  };
  function run(args) {
    args = args || Module['arguments'];
    if (preloadStartTime === null) preloadStartTime = Date.now();
    if (runDependencies > 0) {
      return;
    }
    preRun();
    if (runDependencies > 0) return;
    if (Module['calledRun']) return;
    function doRun() {
      if (Module['calledRun']) return;
      Module['calledRun'] = true;
      if (ABORT) return;
      ensureInitRuntime();
      preMain();
      if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();
      if (Module['_main'] && shouldRunNow) Module['callMain'](args);
      postRun();
    }
    if (Module['setStatus']) {
      Module['setStatus']('Running...');
      setTimeout(function() {
        setTimeout(function() {
          Module['setStatus']('');
        }, 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }
  Module['run'] = Module.run = run;
  function exit(status, implicit) {
    if (implicit && Module['noExitRuntime']) {
      return;
    }
    if (Module['noExitRuntime']) {
    } else {
      ABORT = true;
      EXITSTATUS = status;
      STACKTOP = initialStackTop;
      exitRuntime();
      if (Module['onExit']) Module['onExit'](status);
    }
    if (ENVIRONMENT_IS_NODE) {
      process['exit'](status);
    }
    Module['quit'](status, new ExitStatus(status));
  }
  Module['exit'] = Module.exit = exit;
  var abortDecorators = [];
  function abort(what) {
    if (Module['onAbort']) {
      Module['onAbort'](what);
    }
    if (what !== undefined) {
      Module.print(what);
      Module.printErr(what);
      what = JSON.stringify(what);
    } else {
      what = '';
    }
    ABORT = true;
    EXITSTATUS = 1;
    var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';
    var output = 'abort(' + what + ') at ' + stackTrace() + extra;
    if (abortDecorators) {
      abortDecorators.forEach(function(decorator) {
        output = decorator(output, what);
      });
    }
    throw output;
  }
  Module['abort'] = Module.abort = abort;
  if (Module['preInit']) {
    if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
      Module['preInit'].pop()();
    }
  }
  var shouldRunNow = true;
  if (Module['noInitialRun']) {
    shouldRunNow = false;
  }
  Module['noExitRuntime'] = true;
  run();

  return Module;
};
if (typeof module === 'object' && module.exports) {
  module['exports'] = Module;
}
