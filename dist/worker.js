"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/pino-std-serializers/lib/err-helpers.js
var require_err_helpers = __commonJS({
  "node_modules/pino-std-serializers/lib/err-helpers.js"(exports2, module2) {
    "use strict";
    var isErrorLike = (err) => {
      return err && typeof err.message === "string";
    };
    var getErrorCause = (err) => {
      if (!err) return;
      const cause = err.cause;
      if (typeof cause === "function") {
        const causeResult = err.cause();
        return isErrorLike(causeResult) ? causeResult : void 0;
      } else {
        return isErrorLike(cause) ? cause : void 0;
      }
    };
    var _stackWithCauses = (err, seen) => {
      if (!isErrorLike(err)) return "";
      const stack = err.stack || "";
      if (seen.has(err)) {
        return stack + "\ncauses have become circular...";
      }
      const cause = getErrorCause(err);
      if (cause) {
        seen.add(err);
        return stack + "\ncaused by: " + _stackWithCauses(cause, seen);
      } else {
        return stack;
      }
    };
    var stackWithCauses = (err) => _stackWithCauses(err, /* @__PURE__ */ new Set());
    var _messageWithCauses = (err, seen, skip) => {
      if (!isErrorLike(err)) return "";
      const message = skip ? "" : err.message || "";
      if (seen.has(err)) {
        return message + ": ...";
      }
      const cause = getErrorCause(err);
      if (cause) {
        seen.add(err);
        const skipIfVErrorStyleCause = typeof err.cause === "function";
        return message + (skipIfVErrorStyleCause ? "" : ": ") + _messageWithCauses(cause, seen, skipIfVErrorStyleCause);
      } else {
        return message;
      }
    };
    var messageWithCauses = (err) => _messageWithCauses(err, /* @__PURE__ */ new Set());
    module2.exports = {
      isErrorLike,
      getErrorCause,
      stackWithCauses,
      messageWithCauses
    };
  }
});

// node_modules/pino-std-serializers/lib/err-proto.js
var require_err_proto = __commonJS({
  "node_modules/pino-std-serializers/lib/err-proto.js"(exports2, module2) {
    "use strict";
    var seen = /* @__PURE__ */ Symbol("circular-ref-tag");
    var rawSymbol = /* @__PURE__ */ Symbol("pino-raw-err-ref");
    var pinoErrProto = Object.create({}, {
      type: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      message: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      stack: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      aggregateErrors: {
        enumerable: true,
        writable: true,
        value: void 0
      },
      raw: {
        enumerable: false,
        get: function() {
          return this[rawSymbol];
        },
        set: function(val) {
          this[rawSymbol] = val;
        }
      }
    });
    Object.defineProperty(pinoErrProto, rawSymbol, {
      writable: true,
      value: {}
    });
    module2.exports = {
      pinoErrProto,
      pinoErrorSymbols: {
        seen,
        rawSymbol
      }
    };
  }
});

// node_modules/pino-std-serializers/lib/err.js
var require_err = __commonJS({
  "node_modules/pino-std-serializers/lib/err.js"(exports2, module2) {
    "use strict";
    module2.exports = errSerializer;
    var { messageWithCauses, stackWithCauses, isErrorLike } = require_err_helpers();
    var { pinoErrProto, pinoErrorSymbols } = require_err_proto();
    var { seen } = pinoErrorSymbols;
    var { toString } = Object.prototype;
    function errSerializer(err) {
      if (!isErrorLike(err)) {
        return err;
      }
      err[seen] = void 0;
      const _err = Object.create(pinoErrProto);
      _err.type = toString.call(err.constructor) === "[object Function]" ? err.constructor.name : err.name;
      _err.message = messageWithCauses(err);
      _err.stack = stackWithCauses(err);
      if (Array.isArray(err.errors)) {
        _err.aggregateErrors = err.errors.map((err2) => errSerializer(err2));
      }
      for (const key in err) {
        if (_err[key] === void 0) {
          const val = err[key];
          if (isErrorLike(val)) {
            if (key !== "cause" && !Object.prototype.hasOwnProperty.call(val, seen)) {
              _err[key] = errSerializer(val);
            }
          } else {
            _err[key] = val;
          }
        }
      }
      delete err[seen];
      _err.raw = err;
      return _err;
    }
  }
});

// node_modules/pino-std-serializers/lib/err-with-cause.js
var require_err_with_cause = __commonJS({
  "node_modules/pino-std-serializers/lib/err-with-cause.js"(exports2, module2) {
    "use strict";
    module2.exports = errWithCauseSerializer;
    var { isErrorLike } = require_err_helpers();
    var { pinoErrProto, pinoErrorSymbols } = require_err_proto();
    var { seen } = pinoErrorSymbols;
    var { toString } = Object.prototype;
    function errWithCauseSerializer(err) {
      if (!isErrorLike(err)) {
        return err;
      }
      err[seen] = void 0;
      const _err = Object.create(pinoErrProto);
      _err.type = toString.call(err.constructor) === "[object Function]" ? err.constructor.name : err.name;
      _err.message = err.message;
      _err.stack = err.stack;
      if (Array.isArray(err.errors)) {
        _err.aggregateErrors = err.errors.map((err2) => errWithCauseSerializer(err2));
      }
      if (isErrorLike(err.cause) && !Object.prototype.hasOwnProperty.call(err.cause, seen)) {
        _err.cause = errWithCauseSerializer(err.cause);
      }
      for (const key in err) {
        if (_err[key] === void 0) {
          const val = err[key];
          if (isErrorLike(val)) {
            if (!Object.prototype.hasOwnProperty.call(val, seen)) {
              _err[key] = errWithCauseSerializer(val);
            }
          } else {
            _err[key] = val;
          }
        }
      }
      delete err[seen];
      _err.raw = err;
      return _err;
    }
  }
});

// node_modules/pino-std-serializers/lib/req.js
var require_req = __commonJS({
  "node_modules/pino-std-serializers/lib/req.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      mapHttpRequest,
      reqSerializer
    };
    var rawSymbol = /* @__PURE__ */ Symbol("pino-raw-req-ref");
    var pinoReqProto = Object.create({}, {
      id: {
        enumerable: true,
        writable: true,
        value: ""
      },
      method: {
        enumerable: true,
        writable: true,
        value: ""
      },
      url: {
        enumerable: true,
        writable: true,
        value: ""
      },
      query: {
        enumerable: true,
        writable: true,
        value: ""
      },
      params: {
        enumerable: true,
        writable: true,
        value: ""
      },
      headers: {
        enumerable: true,
        writable: true,
        value: {}
      },
      remoteAddress: {
        enumerable: true,
        writable: true,
        value: ""
      },
      remotePort: {
        enumerable: true,
        writable: true,
        value: ""
      },
      raw: {
        enumerable: false,
        get: function() {
          return this[rawSymbol];
        },
        set: function(val) {
          this[rawSymbol] = val;
        }
      }
    });
    Object.defineProperty(pinoReqProto, rawSymbol, {
      writable: true,
      value: {}
    });
    function reqSerializer(req) {
      const connection = req.info || req.socket;
      const _req = Object.create(pinoReqProto);
      _req.id = typeof req.id === "function" ? req.id() : req.id || (req.info ? req.info.id : void 0);
      _req.method = req.method;
      if (req.originalUrl) {
        _req.url = req.originalUrl;
      } else {
        const path9 = req.path;
        _req.url = typeof path9 === "string" ? path9 : req.url ? req.url.path || req.url : void 0;
      }
      if (req.query) {
        _req.query = req.query;
      }
      if (req.params) {
        _req.params = req.params;
      }
      _req.headers = req.headers;
      _req.remoteAddress = connection && connection.remoteAddress;
      _req.remotePort = connection && connection.remotePort;
      _req.raw = req.raw || req;
      return _req;
    }
    function mapHttpRequest(req) {
      return {
        req: reqSerializer(req)
      };
    }
  }
});

// node_modules/pino-std-serializers/lib/res.js
var require_res = __commonJS({
  "node_modules/pino-std-serializers/lib/res.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      mapHttpResponse,
      resSerializer
    };
    var rawSymbol = /* @__PURE__ */ Symbol("pino-raw-res-ref");
    var pinoResProto = Object.create({}, {
      statusCode: {
        enumerable: true,
        writable: true,
        value: 0
      },
      headers: {
        enumerable: true,
        writable: true,
        value: ""
      },
      raw: {
        enumerable: false,
        get: function() {
          return this[rawSymbol];
        },
        set: function(val) {
          this[rawSymbol] = val;
        }
      }
    });
    Object.defineProperty(pinoResProto, rawSymbol, {
      writable: true,
      value: {}
    });
    function resSerializer(res) {
      const _res = Object.create(pinoResProto);
      _res.statusCode = res.headersSent ? res.statusCode : null;
      _res.headers = res.getHeaders ? res.getHeaders() : res._headers;
      _res.raw = res;
      return _res;
    }
    function mapHttpResponse(res) {
      return {
        res: resSerializer(res)
      };
    }
  }
});

// node_modules/pino-std-serializers/index.js
var require_pino_std_serializers = __commonJS({
  "node_modules/pino-std-serializers/index.js"(exports2, module2) {
    "use strict";
    var errSerializer = require_err();
    var errWithCauseSerializer = require_err_with_cause();
    var reqSerializers = require_req();
    var resSerializers = require_res();
    module2.exports = {
      err: errSerializer,
      errWithCause: errWithCauseSerializer,
      mapHttpRequest: reqSerializers.mapHttpRequest,
      mapHttpResponse: resSerializers.mapHttpResponse,
      req: reqSerializers.reqSerializer,
      res: resSerializers.resSerializer,
      wrapErrorSerializer: function wrapErrorSerializer(customSerializer) {
        if (customSerializer === errSerializer) return customSerializer;
        return function wrapErrSerializer(err) {
          return customSerializer(errSerializer(err));
        };
      },
      wrapRequestSerializer: function wrapRequestSerializer(customSerializer) {
        if (customSerializer === reqSerializers.reqSerializer) return customSerializer;
        return function wrappedReqSerializer(req) {
          return customSerializer(reqSerializers.reqSerializer(req));
        };
      },
      wrapResponseSerializer: function wrapResponseSerializer(customSerializer) {
        if (customSerializer === resSerializers.resSerializer) return customSerializer;
        return function wrappedResSerializer(res) {
          return customSerializer(resSerializers.resSerializer(res));
        };
      }
    };
  }
});

// node_modules/pino/lib/caller.js
var require_caller = __commonJS({
  "node_modules/pino/lib/caller.js"(exports2, module2) {
    "use strict";
    function noOpPrepareStackTrace(_, stack) {
      return stack;
    }
    module2.exports = function getCallers() {
      const originalPrepare = Error.prepareStackTrace;
      Error.prepareStackTrace = noOpPrepareStackTrace;
      const stack = new Error().stack;
      Error.prepareStackTrace = originalPrepare;
      if (!Array.isArray(stack)) {
        return void 0;
      }
      const entries = stack.slice(2);
      const fileNames = [];
      for (const entry of entries) {
        if (!entry) {
          continue;
        }
        fileNames.push(entry.getFileName());
      }
      return fileNames;
    };
  }
});

// node_modules/@pinojs/redact/index.js
var require_redact = __commonJS({
  "node_modules/@pinojs/redact/index.js"(exports2, module2) {
    "use strict";
    function deepClone(obj) {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      if (obj instanceof Date) {
        return new Date(obj.getTime());
      }
      if (obj instanceof Array) {
        const cloned = [];
        for (let i = 0; i < obj.length; i++) {
          cloned[i] = deepClone(obj[i]);
        }
        return cloned;
      }
      if (typeof obj === "object") {
        const cloned = Object.create(Object.getPrototypeOf(obj));
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
          }
        }
        return cloned;
      }
      return obj;
    }
    function parsePath(path9) {
      const parts = [];
      let current = "";
      let inBrackets = false;
      let inQuotes = false;
      let quoteChar = "";
      for (let i = 0; i < path9.length; i++) {
        const char = path9[i];
        if (!inBrackets && char === ".") {
          if (current) {
            parts.push(current);
            current = "";
          }
        } else if (char === "[") {
          if (current) {
            parts.push(current);
            current = "";
          }
          inBrackets = true;
        } else if (char === "]" && inBrackets) {
          parts.push(current);
          current = "";
          inBrackets = false;
          inQuotes = false;
        } else if ((char === '"' || char === "'") && inBrackets) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuotes = false;
            quoteChar = "";
          } else {
            current += char;
          }
        } else {
          current += char;
        }
      }
      if (current) {
        parts.push(current);
      }
      return parts;
    }
    function setValue(obj, parts, value) {
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (typeof current !== "object" || current === null || !(key in current)) {
          return false;
        }
        if (typeof current[key] !== "object" || current[key] === null) {
          return false;
        }
        current = current[key];
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey === "*") {
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            current[i] = value;
          }
        } else if (typeof current === "object" && current !== null) {
          for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
              current[key] = value;
            }
          }
        }
      } else {
        if (typeof current === "object" && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
          current[lastKey] = value;
        }
      }
      return true;
    }
    function removeKey(obj, parts) {
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (typeof current !== "object" || current === null || !(key in current)) {
          return false;
        }
        if (typeof current[key] !== "object" || current[key] === null) {
          return false;
        }
        current = current[key];
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey === "*") {
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            current[i] = void 0;
          }
        } else if (typeof current === "object" && current !== null) {
          for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
              delete current[key];
            }
          }
        }
      } else {
        if (typeof current === "object" && current !== null && lastKey in current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
          delete current[lastKey];
        }
      }
      return true;
    }
    var PATH_NOT_FOUND = /* @__PURE__ */ Symbol("PATH_NOT_FOUND");
    function getValueIfExists(obj, parts) {
      let current = obj;
      for (const part of parts) {
        if (current === null || current === void 0) {
          return PATH_NOT_FOUND;
        }
        if (typeof current !== "object" || current === null) {
          return PATH_NOT_FOUND;
        }
        if (!(part in current)) {
          return PATH_NOT_FOUND;
        }
        current = current[part];
      }
      return current;
    }
    function getValue(obj, parts) {
      let current = obj;
      for (const part of parts) {
        if (current === null || current === void 0) {
          return void 0;
        }
        if (typeof current !== "object" || current === null) {
          return void 0;
        }
        current = current[part];
      }
      return current;
    }
    function redactPaths(obj, paths, censor, remove = false) {
      for (const path9 of paths) {
        const parts = parsePath(path9);
        if (parts.includes("*")) {
          redactWildcardPath(obj, parts, censor, path9, remove);
        } else {
          if (remove) {
            removeKey(obj, parts);
          } else {
            const value = getValueIfExists(obj, parts);
            if (value === PATH_NOT_FOUND) {
              continue;
            }
            const actualCensor = typeof censor === "function" ? censor(value, parts) : censor;
            setValue(obj, parts, actualCensor);
          }
        }
      }
    }
    function redactWildcardPath(obj, parts, censor, originalPath, remove = false) {
      const wildcardIndex = parts.indexOf("*");
      if (wildcardIndex === parts.length - 1) {
        const parentParts = parts.slice(0, -1);
        let current = obj;
        for (const part of parentParts) {
          if (current === null || current === void 0) return;
          if (typeof current !== "object" || current === null) return;
          current = current[part];
        }
        if (Array.isArray(current)) {
          if (remove) {
            for (let i = 0; i < current.length; i++) {
              current[i] = void 0;
            }
          } else {
            for (let i = 0; i < current.length; i++) {
              const indexPath = [...parentParts, i.toString()];
              const actualCensor = typeof censor === "function" ? censor(current[i], indexPath) : censor;
              current[i] = actualCensor;
            }
          }
        } else if (typeof current === "object" && current !== null) {
          if (remove) {
            const keysToDelete = [];
            for (const key in current) {
              if (Object.prototype.hasOwnProperty.call(current, key)) {
                keysToDelete.push(key);
              }
            }
            for (const key of keysToDelete) {
              delete current[key];
            }
          } else {
            for (const key in current) {
              const keyPath = [...parentParts, key];
              const actualCensor = typeof censor === "function" ? censor(current[key], keyPath) : censor;
              current[key] = actualCensor;
            }
          }
        }
      } else {
        redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove);
      }
    }
    function redactIntermediateWildcard(obj, parts, censor, wildcardIndex, originalPath, remove = false) {
      const beforeWildcard = parts.slice(0, wildcardIndex);
      const afterWildcard = parts.slice(wildcardIndex + 1);
      const pathArray = [];
      function traverse(current, pathLength) {
        if (pathLength === beforeWildcard.length) {
          if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
              pathArray[pathLength] = i.toString();
              traverse(current[i], pathLength + 1);
            }
          } else if (typeof current === "object" && current !== null) {
            for (const key in current) {
              pathArray[pathLength] = key;
              traverse(current[key], pathLength + 1);
            }
          }
        } else if (pathLength < beforeWildcard.length) {
          const nextKey = beforeWildcard[pathLength];
          if (current && typeof current === "object" && current !== null && nextKey in current) {
            pathArray[pathLength] = nextKey;
            traverse(current[nextKey], pathLength + 1);
          }
        } else {
          if (afterWildcard.includes("*")) {
            const wrappedCensor = typeof censor === "function" ? (value, path9) => {
              const fullPath = [...pathArray.slice(0, pathLength), ...path9];
              return censor(value, fullPath);
            } : censor;
            redactWildcardPath(current, afterWildcard, wrappedCensor, originalPath, remove);
          } else {
            if (remove) {
              removeKey(current, afterWildcard);
            } else {
              const actualCensor = typeof censor === "function" ? censor(getValue(current, afterWildcard), [...pathArray.slice(0, pathLength), ...afterWildcard]) : censor;
              setValue(current, afterWildcard, actualCensor);
            }
          }
        }
      }
      if (beforeWildcard.length === 0) {
        traverse(obj, 0);
      } else {
        let current = obj;
        for (let i = 0; i < beforeWildcard.length; i++) {
          const part = beforeWildcard[i];
          if (current === null || current === void 0) return;
          if (typeof current !== "object" || current === null) return;
          current = current[part];
          pathArray[i] = part;
        }
        if (current !== null && current !== void 0) {
          traverse(current, beforeWildcard.length);
        }
      }
    }
    function buildPathStructure(pathsToClone) {
      if (pathsToClone.length === 0) {
        return null;
      }
      const pathStructure = /* @__PURE__ */ new Map();
      for (const path9 of pathsToClone) {
        const parts = parsePath(path9);
        let current = pathStructure;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!current.has(part)) {
            current.set(part, /* @__PURE__ */ new Map());
          }
          current = current.get(part);
        }
      }
      return pathStructure;
    }
    function selectiveClone(obj, pathStructure) {
      if (!pathStructure) {
        return obj;
      }
      function cloneSelectively(source, pathMap, depth = 0) {
        if (!pathMap || pathMap.size === 0) {
          return source;
        }
        if (source === null || typeof source !== "object") {
          return source;
        }
        if (source instanceof Date) {
          return new Date(source.getTime());
        }
        if (Array.isArray(source)) {
          const cloned2 = [];
          for (let i = 0; i < source.length; i++) {
            const indexStr = i.toString();
            if (pathMap.has(indexStr) || pathMap.has("*")) {
              cloned2[i] = cloneSelectively(source[i], pathMap.get(indexStr) || pathMap.get("*"));
            } else {
              cloned2[i] = source[i];
            }
          }
          return cloned2;
        }
        const cloned = Object.create(Object.getPrototypeOf(source));
        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (pathMap.has(key) || pathMap.has("*")) {
              cloned[key] = cloneSelectively(source[key], pathMap.get(key) || pathMap.get("*"));
            } else {
              cloned[key] = source[key];
            }
          }
        }
        return cloned;
      }
      return cloneSelectively(obj, pathStructure);
    }
    function validatePath(path9) {
      if (typeof path9 !== "string") {
        throw new Error("Paths must be (non-empty) strings");
      }
      if (path9 === "") {
        throw new Error("Invalid redaction path ()");
      }
      if (path9.includes("..")) {
        throw new Error(`Invalid redaction path (${path9})`);
      }
      if (path9.includes(",")) {
        throw new Error(`Invalid redaction path (${path9})`);
      }
      let bracketCount = 0;
      let inQuotes = false;
      let quoteChar = "";
      for (let i = 0; i < path9.length; i++) {
        const char = path9[i];
        if ((char === '"' || char === "'") && bracketCount > 0) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuotes = false;
            quoteChar = "";
          }
        } else if (char === "[" && !inQuotes) {
          bracketCount++;
        } else if (char === "]" && !inQuotes) {
          bracketCount--;
          if (bracketCount < 0) {
            throw new Error(`Invalid redaction path (${path9})`);
          }
        }
      }
      if (bracketCount !== 0) {
        throw new Error(`Invalid redaction path (${path9})`);
      }
    }
    function validatePaths(paths) {
      if (!Array.isArray(paths)) {
        throw new TypeError("paths must be an array");
      }
      for (const path9 of paths) {
        validatePath(path9);
      }
    }
    function slowRedact(options = {}) {
      const {
        paths = [],
        censor = "[REDACTED]",
        serialize = JSON.stringify,
        strict = true,
        remove = false
      } = options;
      validatePaths(paths);
      const pathStructure = buildPathStructure(paths);
      return function redact(obj) {
        if (strict && (obj === null || typeof obj !== "object")) {
          if (obj === null || obj === void 0) {
            return serialize ? serialize(obj) : obj;
          }
          if (typeof obj !== "object") {
            return serialize ? serialize(obj) : obj;
          }
        }
        const cloned = selectiveClone(obj, pathStructure);
        const original = obj;
        let actualCensor = censor;
        if (typeof censor === "function") {
          actualCensor = censor;
        }
        redactPaths(cloned, paths, actualCensor, remove);
        if (serialize === false) {
          cloned.restore = function() {
            return deepClone(original);
          };
          return cloned;
        }
        if (typeof serialize === "function") {
          return serialize(cloned);
        }
        return JSON.stringify(cloned);
      };
    }
    module2.exports = slowRedact;
  }
});

// node_modules/pino/lib/symbols.js
var require_symbols = __commonJS({
  "node_modules/pino/lib/symbols.js"(exports2, module2) {
    "use strict";
    var setLevelSym = /* @__PURE__ */ Symbol("pino.setLevel");
    var getLevelSym = /* @__PURE__ */ Symbol("pino.getLevel");
    var levelValSym = /* @__PURE__ */ Symbol("pino.levelVal");
    var levelCompSym = /* @__PURE__ */ Symbol("pino.levelComp");
    var useLevelLabelsSym = /* @__PURE__ */ Symbol("pino.useLevelLabels");
    var useOnlyCustomLevelsSym = /* @__PURE__ */ Symbol("pino.useOnlyCustomLevels");
    var mixinSym = /* @__PURE__ */ Symbol("pino.mixin");
    var lsCacheSym = /* @__PURE__ */ Symbol("pino.lsCache");
    var chindingsSym = /* @__PURE__ */ Symbol("pino.chindings");
    var asJsonSym = /* @__PURE__ */ Symbol("pino.asJson");
    var writeSym = /* @__PURE__ */ Symbol("pino.write");
    var redactFmtSym = /* @__PURE__ */ Symbol("pino.redactFmt");
    var timeSym = /* @__PURE__ */ Symbol("pino.time");
    var timeSliceIndexSym = /* @__PURE__ */ Symbol("pino.timeSliceIndex");
    var streamSym = /* @__PURE__ */ Symbol("pino.stream");
    var stringifySym = /* @__PURE__ */ Symbol("pino.stringify");
    var stringifySafeSym = /* @__PURE__ */ Symbol("pino.stringifySafe");
    var stringifiersSym = /* @__PURE__ */ Symbol("pino.stringifiers");
    var endSym = /* @__PURE__ */ Symbol("pino.end");
    var formatOptsSym = /* @__PURE__ */ Symbol("pino.formatOpts");
    var messageKeySym = /* @__PURE__ */ Symbol("pino.messageKey");
    var errorKeySym = /* @__PURE__ */ Symbol("pino.errorKey");
    var nestedKeySym = /* @__PURE__ */ Symbol("pino.nestedKey");
    var nestedKeyStrSym = /* @__PURE__ */ Symbol("pino.nestedKeyStr");
    var mixinMergeStrategySym = /* @__PURE__ */ Symbol("pino.mixinMergeStrategy");
    var msgPrefixSym = /* @__PURE__ */ Symbol("pino.msgPrefix");
    var wildcardFirstSym = /* @__PURE__ */ Symbol("pino.wildcardFirst");
    var serializersSym = /* @__PURE__ */ Symbol.for("pino.serializers");
    var formattersSym = /* @__PURE__ */ Symbol.for("pino.formatters");
    var hooksSym = /* @__PURE__ */ Symbol.for("pino.hooks");
    var needsMetadataGsym = /* @__PURE__ */ Symbol.for("pino.metadata");
    module2.exports = {
      setLevelSym,
      getLevelSym,
      levelValSym,
      levelCompSym,
      useLevelLabelsSym,
      mixinSym,
      lsCacheSym,
      chindingsSym,
      asJsonSym,
      writeSym,
      serializersSym,
      redactFmtSym,
      timeSym,
      timeSliceIndexSym,
      streamSym,
      stringifySym,
      stringifySafeSym,
      stringifiersSym,
      endSym,
      formatOptsSym,
      messageKeySym,
      errorKeySym,
      nestedKeySym,
      wildcardFirstSym,
      needsMetadataGsym,
      useOnlyCustomLevelsSym,
      formattersSym,
      hooksSym,
      nestedKeyStrSym,
      mixinMergeStrategySym,
      msgPrefixSym
    };
  }
});

// node_modules/pino/lib/redaction.js
var require_redaction = __commonJS({
  "node_modules/pino/lib/redaction.js"(exports2, module2) {
    "use strict";
    var Redact = require_redact();
    var { redactFmtSym, wildcardFirstSym } = require_symbols();
    var rx = /[^.[\]]+|\[([^[\]]*?)\]/g;
    var CENSOR = "[Redacted]";
    var strict = false;
    function redaction(opts, serialize) {
      const { paths, censor, remove } = handle(opts);
      const shape = paths.reduce((o, str) => {
        rx.lastIndex = 0;
        const first = rx.exec(str);
        const next = rx.exec(str);
        let ns = first[1] !== void 0 ? first[1].replace(/^(?:"|'|`)(.*)(?:"|'|`)$/, "$1") : first[0];
        if (ns === "*") {
          ns = wildcardFirstSym;
        }
        if (next === null) {
          o[ns] = null;
          return o;
        }
        if (o[ns] === null) {
          return o;
        }
        const { index } = next;
        const nextPath = `${str.substr(index, str.length - 1)}`;
        o[ns] = o[ns] || [];
        if (ns !== wildcardFirstSym && o[ns].length === 0) {
          o[ns].push(...o[wildcardFirstSym] || []);
        }
        if (ns === wildcardFirstSym) {
          Object.keys(o).forEach(function(k) {
            if (o[k]) {
              o[k].push(nextPath);
            }
          });
        }
        o[ns].push(nextPath);
        return o;
      }, {});
      const result = {
        [redactFmtSym]: Redact({ paths, censor, serialize, strict, remove })
      };
      const topCensor = (...args) => {
        return typeof censor === "function" ? serialize(censor(...args)) : serialize(censor);
      };
      return [...Object.keys(shape), ...Object.getOwnPropertySymbols(shape)].reduce((o, k) => {
        if (shape[k] === null) {
          o[k] = (value) => topCensor(value, [k]);
        } else {
          const wrappedCensor = typeof censor === "function" ? (value, path9) => {
            return censor(value, [k, ...path9]);
          } : censor;
          o[k] = Redact({
            paths: shape[k],
            censor: wrappedCensor,
            serialize,
            strict,
            remove
          });
        }
        return o;
      }, result);
    }
    function handle(opts) {
      if (Array.isArray(opts)) {
        opts = { paths: opts, censor: CENSOR };
        return opts;
      }
      let { paths, censor = CENSOR, remove } = opts;
      if (Array.isArray(paths) === false) {
        throw Error("pino \u2013 redact must contain an array of strings");
      }
      if (remove === true) censor = void 0;
      return { paths, censor, remove };
    }
    module2.exports = redaction;
  }
});

// node_modules/pino/lib/time.js
var require_time = __commonJS({
  "node_modules/pino/lib/time.js"(exports2, module2) {
    "use strict";
    var nullTime = () => "";
    var epochTime = () => `,"time":${Date.now()}`;
    var unixTime = () => `,"time":${Math.round(Date.now() / 1e3)}`;
    var isoTime = () => `,"time":"${new Date(Date.now()).toISOString()}"`;
    var NS_PER_MS = 1000000n;
    var NS_PER_SEC = 1000000000n;
    var startWallTimeNs = BigInt(Date.now()) * NS_PER_MS;
    var startHrTime = process.hrtime.bigint();
    var isoTimeNano = () => {
      const elapsedNs = process.hrtime.bigint() - startHrTime;
      const currentTimeNs = startWallTimeNs + elapsedNs;
      const secondsSinceEpoch = currentTimeNs / NS_PER_SEC;
      const nanosWithinSecond = currentTimeNs % NS_PER_SEC;
      const msSinceEpoch = Number(secondsSinceEpoch * 1000n + nanosWithinSecond / 1000000n);
      const date = new Date(msSinceEpoch);
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
      const day = date.getUTCDate().toString().padStart(2, "0");
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      const seconds = date.getUTCSeconds().toString().padStart(2, "0");
      return `,"time":"${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanosWithinSecond.toString().padStart(9, "0")}Z"`;
    };
    module2.exports = { nullTime, epochTime, unixTime, isoTime, isoTimeNano };
  }
});

// node_modules/quick-format-unescaped/index.js
var require_quick_format_unescaped = __commonJS({
  "node_modules/quick-format-unescaped/index.js"(exports2, module2) {
    "use strict";
    function tryStringify(o) {
      try {
        return JSON.stringify(o);
      } catch (e) {
        return '"[Circular]"';
      }
    }
    module2.exports = format;
    function format(f, args, opts) {
      var ss = opts && opts.stringify || tryStringify;
      var offset = 1;
      if (typeof f === "object" && f !== null) {
        var len = args.length + offset;
        if (len === 1) return f;
        var objects = new Array(len);
        objects[0] = ss(f);
        for (var index = 1; index < len; index++) {
          objects[index] = ss(args[index]);
        }
        return objects.join(" ");
      }
      if (typeof f !== "string") {
        return f;
      }
      var argLen = args.length;
      if (argLen === 0) return f;
      var str = "";
      var a = 1 - offset;
      var lastPos = -1;
      var flen = f && f.length || 0;
      for (var i = 0; i < flen; ) {
        if (f.charCodeAt(i) === 37 && i + 1 < flen) {
          lastPos = lastPos > -1 ? lastPos : 0;
          switch (f.charCodeAt(i + 1)) {
            case 100:
            // 'd'
            case 102:
              if (a >= argLen)
                break;
              if (args[a] == null) break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += Number(args[a]);
              lastPos = i + 2;
              i++;
              break;
            case 105:
              if (a >= argLen)
                break;
              if (args[a] == null) break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += Math.floor(Number(args[a]));
              lastPos = i + 2;
              i++;
              break;
            case 79:
            // 'O'
            case 111:
            // 'o'
            case 106:
              if (a >= argLen)
                break;
              if (args[a] === void 0) break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              var type = typeof args[a];
              if (type === "string") {
                str += "'" + args[a] + "'";
                lastPos = i + 2;
                i++;
                break;
              }
              if (type === "function") {
                str += args[a].name || "<anonymous>";
                lastPos = i + 2;
                i++;
                break;
              }
              str += ss(args[a]);
              lastPos = i + 2;
              i++;
              break;
            case 115:
              if (a >= argLen)
                break;
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += String(args[a]);
              lastPos = i + 2;
              i++;
              break;
            case 37:
              if (lastPos < i)
                str += f.slice(lastPos, i);
              str += "%";
              lastPos = i + 2;
              i++;
              a--;
              break;
          }
          ++a;
        }
        ++i;
      }
      if (lastPos === -1)
        return f;
      else if (lastPos < flen) {
        str += f.slice(lastPos);
      }
      return str;
    }
  }
});

// node_modules/atomic-sleep/index.js
var require_atomic_sleep = __commonJS({
  "node_modules/atomic-sleep/index.js"(exports2, module2) {
    "use strict";
    if (typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined") {
      let sleep = function(ms) {
        const valid = ms > 0 && ms < Infinity;
        if (valid === false) {
          if (typeof ms !== "number" && typeof ms !== "bigint") {
            throw TypeError("sleep: ms must be a number");
          }
          throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
        }
        Atomics.wait(nil, 0, 0, Number(ms));
      };
      const nil = new Int32Array(new SharedArrayBuffer(4));
      module2.exports = sleep;
    } else {
      let sleep = function(ms) {
        const valid = ms > 0 && ms < Infinity;
        if (valid === false) {
          if (typeof ms !== "number" && typeof ms !== "bigint") {
            throw TypeError("sleep: ms must be a number");
          }
          throw RangeError("sleep: ms must be a number that is greater than 0 but less than Infinity");
        }
        const target = Date.now() + Number(ms);
        while (target > Date.now()) {
        }
      };
      module2.exports = sleep;
    }
  }
});

// node_modules/sonic-boom/index.js
var require_sonic_boom = __commonJS({
  "node_modules/sonic-boom/index.js"(exports2, module2) {
    "use strict";
    var fs10 = require("fs");
    var EventEmitter2 = require("events");
    var inherits = require("util").inherits;
    var path9 = require("path");
    var sleep = require_atomic_sleep();
    var assert = require("assert");
    var BUSY_WRITE_TIMEOUT = 100;
    var kEmptyBuffer = Buffer.allocUnsafe(0);
    var MAX_WRITE = 16 * 1024;
    var kContentModeBuffer = "buffer";
    var kContentModeUtf8 = "utf8";
    var [major, minor] = (process.versions.node || "0.0").split(".").map(Number);
    var kCopyBuffer = major >= 22 && minor >= 7;
    function openFile(file, sonic) {
      sonic._opening = true;
      sonic._writing = true;
      sonic._asyncDrainScheduled = false;
      function fileOpened(err, fd) {
        if (err) {
          sonic._reopening = false;
          sonic._writing = false;
          sonic._opening = false;
          if (sonic.sync) {
            process.nextTick(() => {
              if (sonic.listenerCount("error") > 0) {
                sonic.emit("error", err);
              }
            });
          } else {
            sonic.emit("error", err);
          }
          return;
        }
        const reopening = sonic._reopening;
        sonic.fd = fd;
        sonic.file = file;
        sonic._reopening = false;
        sonic._opening = false;
        sonic._writing = false;
        if (sonic.sync) {
          process.nextTick(() => sonic.emit("ready"));
        } else {
          sonic.emit("ready");
        }
        if (sonic.destroyed) {
          return;
        }
        if (!sonic._writing && sonic._len > sonic.minLength || sonic._flushPending) {
          sonic._actualWrite();
        } else if (reopening) {
          process.nextTick(() => sonic.emit("drain"));
        }
      }
      const flags = sonic.append ? "a" : "w";
      const mode = sonic.mode;
      if (sonic.sync) {
        try {
          if (sonic.mkdir) fs10.mkdirSync(path9.dirname(file), { recursive: true });
          const fd = fs10.openSync(file, flags, mode);
          fileOpened(null, fd);
        } catch (err) {
          fileOpened(err);
          throw err;
        }
      } else if (sonic.mkdir) {
        fs10.mkdir(path9.dirname(file), { recursive: true }, (err) => {
          if (err) return fileOpened(err);
          fs10.open(file, flags, mode, fileOpened);
        });
      } else {
        fs10.open(file, flags, mode, fileOpened);
      }
    }
    function SonicBoom(opts) {
      if (!(this instanceof SonicBoom)) {
        return new SonicBoom(opts);
      }
      let { fd, dest, minLength, maxLength, maxWrite, periodicFlush, sync, append = true, mkdir, retryEAGAIN, fsync, contentMode, mode } = opts || {};
      fd = fd || dest;
      this._len = 0;
      this.fd = -1;
      this._bufs = [];
      this._lens = [];
      this._writing = false;
      this._ending = false;
      this._reopening = false;
      this._asyncDrainScheduled = false;
      this._flushPending = false;
      this._hwm = Math.max(minLength || 0, 16387);
      this.file = null;
      this.destroyed = false;
      this.minLength = minLength || 0;
      this.maxLength = maxLength || 0;
      this.maxWrite = maxWrite || MAX_WRITE;
      this._periodicFlush = periodicFlush || 0;
      this._periodicFlushTimer = void 0;
      this.sync = sync || false;
      this.writable = true;
      this._fsync = fsync || false;
      this.append = append || false;
      this.mode = mode;
      this.retryEAGAIN = retryEAGAIN || (() => true);
      this.mkdir = mkdir || false;
      let fsWriteSync;
      let fsWrite;
      if (contentMode === kContentModeBuffer) {
        this._writingBuf = kEmptyBuffer;
        this.write = writeBuffer;
        this.flush = flushBuffer;
        this.flushSync = flushBufferSync;
        this._actualWrite = actualWriteBuffer;
        fsWriteSync = () => fs10.writeSync(this.fd, this._writingBuf);
        fsWrite = () => fs10.write(this.fd, this._writingBuf, this.release);
      } else if (contentMode === void 0 || contentMode === kContentModeUtf8) {
        this._writingBuf = "";
        this.write = write;
        this.flush = flush;
        this.flushSync = flushSync;
        this._actualWrite = actualWrite;
        fsWriteSync = () => {
          if (Buffer.isBuffer(this._writingBuf)) {
            return fs10.writeSync(this.fd, this._writingBuf);
          }
          return fs10.writeSync(this.fd, this._writingBuf, "utf8");
        };
        fsWrite = () => {
          if (Buffer.isBuffer(this._writingBuf)) {
            return fs10.write(this.fd, this._writingBuf, this.release);
          }
          return fs10.write(this.fd, this._writingBuf, "utf8", this.release);
        };
      } else {
        throw new Error(`SonicBoom supports "${kContentModeUtf8}" and "${kContentModeBuffer}", but passed ${contentMode}`);
      }
      if (typeof fd === "number") {
        this.fd = fd;
        process.nextTick(() => this.emit("ready"));
      } else if (typeof fd === "string") {
        openFile(fd, this);
      } else {
        throw new Error("SonicBoom supports only file descriptors and files");
      }
      if (this.minLength >= this.maxWrite) {
        throw new Error(`minLength should be smaller than maxWrite (${this.maxWrite})`);
      }
      this.release = (err, n) => {
        if (err) {
          if ((err.code === "EAGAIN" || err.code === "EBUSY") && this.retryEAGAIN(err, this._writingBuf.length, this._len - this._writingBuf.length)) {
            if (this.sync) {
              try {
                sleep(BUSY_WRITE_TIMEOUT);
                this.release(void 0, 0);
              } catch (err2) {
                this.release(err2);
              }
            } else {
              setTimeout(fsWrite, BUSY_WRITE_TIMEOUT);
            }
          } else {
            this._writing = false;
            this.emit("error", err);
          }
          return;
        }
        this.emit("write", n);
        const releasedBufObj = releaseWritingBuf(this._writingBuf, this._len, n);
        this._len = releasedBufObj.len;
        this._writingBuf = releasedBufObj.writingBuf;
        if (this._writingBuf.length) {
          if (!this.sync) {
            fsWrite();
            return;
          }
          try {
            do {
              const n2 = fsWriteSync();
              const releasedBufObj2 = releaseWritingBuf(this._writingBuf, this._len, n2);
              this._len = releasedBufObj2.len;
              this._writingBuf = releasedBufObj2.writingBuf;
            } while (this._writingBuf.length);
          } catch (err2) {
            this.release(err2);
            return;
          }
        }
        if (this._fsync) {
          fs10.fsyncSync(this.fd);
        }
        const len = this._len;
        if (this._reopening) {
          this._writing = false;
          this._reopening = false;
          this.reopen();
        } else if (len > this.minLength) {
          this._actualWrite();
        } else if (this._ending) {
          if (len > 0) {
            this._actualWrite();
          } else {
            this._writing = false;
            actualClose(this);
          }
        } else {
          this._writing = false;
          if (this.sync) {
            if (!this._asyncDrainScheduled) {
              this._asyncDrainScheduled = true;
              process.nextTick(emitDrain, this);
            }
          } else {
            this.emit("drain");
          }
        }
      };
      this.on("newListener", function(name) {
        if (name === "drain") {
          this._asyncDrainScheduled = false;
        }
      });
      if (this._periodicFlush !== 0) {
        this._periodicFlushTimer = setInterval(() => this.flush(null), this._periodicFlush);
        this._periodicFlushTimer.unref();
      }
    }
    function releaseWritingBuf(writingBuf, len, n) {
      if (typeof writingBuf === "string") {
        writingBuf = Buffer.from(writingBuf);
      }
      len = Math.max(len - n, 0);
      writingBuf = writingBuf.subarray(n);
      return { writingBuf, len };
    }
    function emitDrain(sonic) {
      const hasListeners = sonic.listenerCount("drain") > 0;
      if (!hasListeners) return;
      sonic._asyncDrainScheduled = false;
      sonic.emit("drain");
    }
    inherits(SonicBoom, EventEmitter2);
    function mergeBuf(bufs, len) {
      if (bufs.length === 0) {
        return kEmptyBuffer;
      }
      if (bufs.length === 1) {
        return bufs[0];
      }
      return Buffer.concat(bufs, len);
    }
    function write(data) {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      data = "" + data;
      const dataLen = Buffer.byteLength(data);
      const len = this._len + dataLen;
      const bufs = this._bufs;
      if (this.maxLength && len > this.maxLength) {
        this.emit("drop", data);
        return this._len < this._hwm;
      }
      if (bufs.length === 0 || Buffer.byteLength(bufs[bufs.length - 1]) + dataLen > this.maxWrite) {
        bufs.push(data);
      } else {
        bufs[bufs.length - 1] += data;
      }
      this._len = len;
      if (!this._writing && this._len >= this.minLength) {
        this._actualWrite();
      }
      return this._len < this._hwm;
    }
    function writeBuffer(data) {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      const len = this._len + data.length;
      const bufs = this._bufs;
      const lens = this._lens;
      if (this.maxLength && len > this.maxLength) {
        this.emit("drop", data);
        return this._len < this._hwm;
      }
      if (bufs.length === 0 || lens[lens.length - 1] + data.length > this.maxWrite) {
        bufs.push([data]);
        lens.push(data.length);
      } else {
        bufs[bufs.length - 1].push(data);
        lens[lens.length - 1] += data.length;
      }
      this._len = len;
      if (!this._writing && this._len >= this.minLength) {
        this._actualWrite();
      }
      return this._len < this._hwm;
    }
    function callFlushCallbackOnDrain(cb) {
      this._flushPending = true;
      const onDrain = () => {
        if (!this._fsync) {
          try {
            fs10.fsync(this.fd, (err) => {
              this._flushPending = false;
              cb(err);
            });
          } catch (err) {
            cb(err);
          }
        } else {
          this._flushPending = false;
          cb();
        }
        this.off("error", onError);
      };
      const onError = (err) => {
        this._flushPending = false;
        cb(err);
        this.off("drain", onDrain);
      };
      this.once("drain", onDrain);
      this.once("error", onError);
    }
    function flush(cb) {
      if (cb != null && typeof cb !== "function") {
        throw new Error("flush cb must be a function");
      }
      if (this.destroyed) {
        const error = new Error("SonicBoom destroyed");
        if (cb) {
          cb(error);
          return;
        }
        throw error;
      }
      if (this.minLength <= 0) {
        cb?.();
        return;
      }
      if (cb) {
        callFlushCallbackOnDrain.call(this, cb);
      }
      if (this._writing) {
        return;
      }
      if (this._bufs.length === 0) {
        this._bufs.push("");
      }
      this._actualWrite();
    }
    function flushBuffer(cb) {
      if (cb != null && typeof cb !== "function") {
        throw new Error("flush cb must be a function");
      }
      if (this.destroyed) {
        const error = new Error("SonicBoom destroyed");
        if (cb) {
          cb(error);
          return;
        }
        throw error;
      }
      if (this.minLength <= 0) {
        cb?.();
        return;
      }
      if (cb) {
        callFlushCallbackOnDrain.call(this, cb);
      }
      if (this._writing) {
        return;
      }
      if (this._bufs.length === 0) {
        this._bufs.push([]);
        this._lens.push(0);
      }
      this._actualWrite();
    }
    SonicBoom.prototype.reopen = function(file) {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this._opening) {
        this.once("ready", () => {
          this.reopen(file);
        });
        return;
      }
      if (this._ending) {
        return;
      }
      if (!this.file) {
        throw new Error("Unable to reopen a file descriptor, you must pass a file to SonicBoom");
      }
      if (file) {
        this.file = file;
      }
      this._reopening = true;
      if (this._writing) {
        return;
      }
      const fd = this.fd;
      this.once("ready", () => {
        if (fd !== this.fd) {
          fs10.close(fd, (err) => {
            if (err) {
              return this.emit("error", err);
            }
          });
        }
      });
      openFile(this.file, this);
    };
    SonicBoom.prototype.end = function() {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this._opening) {
        this.once("ready", () => {
          this.end();
        });
        return;
      }
      if (this._ending) {
        return;
      }
      this._ending = true;
      if (this._writing) {
        return;
      }
      if (this._len > 0 && this.fd >= 0) {
        this._actualWrite();
      } else {
        actualClose(this);
      }
    };
    function flushSync() {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this.fd < 0) {
        throw new Error("sonic boom is not ready yet");
      }
      if (!this._writing && this._writingBuf.length > 0) {
        this._bufs.unshift(this._writingBuf);
        this._writingBuf = "";
      }
      let buf = "";
      while (this._bufs.length || buf.length) {
        if (buf.length <= 0) {
          buf = this._bufs[0];
        }
        try {
          const n = Buffer.isBuffer(buf) ? fs10.writeSync(this.fd, buf) : fs10.writeSync(this.fd, buf, "utf8");
          const releasedBufObj = releaseWritingBuf(buf, this._len, n);
          buf = releasedBufObj.writingBuf;
          this._len = releasedBufObj.len;
          if (buf.length <= 0) {
            this._bufs.shift();
          }
        } catch (err) {
          const shouldRetry = err.code === "EAGAIN" || err.code === "EBUSY";
          if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
            throw err;
          }
          sleep(BUSY_WRITE_TIMEOUT);
        }
      }
      try {
        fs10.fsyncSync(this.fd);
      } catch {
      }
    }
    function flushBufferSync() {
      if (this.destroyed) {
        throw new Error("SonicBoom destroyed");
      }
      if (this.fd < 0) {
        throw new Error("sonic boom is not ready yet");
      }
      if (!this._writing && this._writingBuf.length > 0) {
        this._bufs.unshift([this._writingBuf]);
        this._writingBuf = kEmptyBuffer;
      }
      let buf = kEmptyBuffer;
      while (this._bufs.length || buf.length) {
        if (buf.length <= 0) {
          buf = mergeBuf(this._bufs[0], this._lens[0]);
        }
        try {
          const n = fs10.writeSync(this.fd, buf);
          buf = buf.subarray(n);
          this._len = Math.max(this._len - n, 0);
          if (buf.length <= 0) {
            this._bufs.shift();
            this._lens.shift();
          }
        } catch (err) {
          const shouldRetry = err.code === "EAGAIN" || err.code === "EBUSY";
          if (shouldRetry && !this.retryEAGAIN(err, buf.length, this._len - buf.length)) {
            throw err;
          }
          sleep(BUSY_WRITE_TIMEOUT);
        }
      }
    }
    SonicBoom.prototype.destroy = function() {
      if (this.destroyed) {
        return;
      }
      actualClose(this);
    };
    function actualWrite() {
      const release = this.release;
      this._writing = true;
      this._writingBuf = this._writingBuf.length ? this._writingBuf : this._bufs.shift() || "";
      if (this.sync) {
        try {
          const written = Buffer.isBuffer(this._writingBuf) ? fs10.writeSync(this.fd, this._writingBuf) : fs10.writeSync(this.fd, this._writingBuf, "utf8");
          release(null, written);
        } catch (err) {
          release(err);
        }
      } else {
        fs10.write(this.fd, this._writingBuf, release);
      }
    }
    function actualWriteBuffer() {
      const release = this.release;
      this._writing = true;
      this._writingBuf = this._writingBuf.length ? this._writingBuf : mergeBuf(this._bufs.shift(), this._lens.shift());
      if (this.sync) {
        try {
          const written = fs10.writeSync(this.fd, this._writingBuf);
          release(null, written);
        } catch (err) {
          release(err);
        }
      } else {
        if (kCopyBuffer) {
          this._writingBuf = Buffer.from(this._writingBuf);
        }
        fs10.write(this.fd, this._writingBuf, release);
      }
    }
    function actualClose(sonic) {
      if (sonic.fd === -1) {
        sonic.once("ready", actualClose.bind(null, sonic));
        return;
      }
      if (sonic._periodicFlushTimer !== void 0) {
        clearInterval(sonic._periodicFlushTimer);
      }
      sonic.destroyed = true;
      sonic._bufs = [];
      sonic._lens = [];
      assert(typeof sonic.fd === "number", `sonic.fd must be a number, got ${typeof sonic.fd}`);
      try {
        fs10.fsync(sonic.fd, closeWrapped);
      } catch {
      }
      function closeWrapped() {
        if (sonic.fd !== 1 && sonic.fd !== 2) {
          fs10.close(sonic.fd, done);
        } else {
          done();
        }
      }
      function done(err) {
        if (err) {
          sonic.emit("error", err);
          return;
        }
        if (sonic._ending && !sonic._writing) {
          sonic.emit("finish");
        }
        sonic.emit("close");
      }
    }
    SonicBoom.SonicBoom = SonicBoom;
    SonicBoom.default = SonicBoom;
    module2.exports = SonicBoom;
  }
});

// node_modules/on-exit-leak-free/index.js
var require_on_exit_leak_free = __commonJS({
  "node_modules/on-exit-leak-free/index.js"(exports2, module2) {
    "use strict";
    var refs = {
      exit: [],
      beforeExit: []
    };
    var functions = {
      exit: onExit,
      beforeExit: onBeforeExit
    };
    var registry;
    function ensureRegistry() {
      if (registry === void 0) {
        registry = new FinalizationRegistry(clear);
      }
    }
    function install(event) {
      if (refs[event].length > 0) {
        return;
      }
      process.on(event, functions[event]);
    }
    function uninstall(event) {
      if (refs[event].length > 0) {
        return;
      }
      process.removeListener(event, functions[event]);
      if (refs.exit.length === 0 && refs.beforeExit.length === 0) {
        registry = void 0;
      }
    }
    function onExit() {
      callRefs("exit");
    }
    function onBeforeExit() {
      callRefs("beforeExit");
    }
    function callRefs(event) {
      for (const ref of refs[event]) {
        const obj = ref.deref();
        const fn = ref.fn;
        if (obj !== void 0) {
          fn(obj, event);
        }
      }
      refs[event] = [];
    }
    function clear(ref) {
      for (const event of ["exit", "beforeExit"]) {
        const index = refs[event].indexOf(ref);
        refs[event].splice(index, index + 1);
        uninstall(event);
      }
    }
    function _register(event, obj, fn) {
      if (obj === void 0) {
        throw new Error("the object can't be undefined");
      }
      install(event);
      const ref = new WeakRef(obj);
      ref.fn = fn;
      ensureRegistry();
      registry.register(obj, ref);
      refs[event].push(ref);
    }
    function register(obj, fn) {
      _register("exit", obj, fn);
    }
    function registerBeforeExit(obj, fn) {
      _register("beforeExit", obj, fn);
    }
    function unregister(obj) {
      if (registry === void 0) {
        return;
      }
      registry.unregister(obj);
      for (const event of ["exit", "beforeExit"]) {
        refs[event] = refs[event].filter((ref) => {
          const _obj = ref.deref();
          return _obj && _obj !== obj;
        });
        uninstall(event);
      }
    }
    module2.exports = {
      register,
      registerBeforeExit,
      unregister
    };
  }
});

// node_modules/thread-stream/package.json
var require_package = __commonJS({
  "node_modules/thread-stream/package.json"(exports2, module2) {
    module2.exports = {
      name: "thread-stream",
      version: "3.2.0",
      description: "A streaming way to send data to a Node.js Worker Thread",
      main: "index.js",
      types: "index.d.ts",
      dependencies: {
        "real-require": "^0.2.0"
      },
      devDependencies: {
        "@types/node": "^20.1.0",
        "@types/tap": "^15.0.0",
        "@yao-pkg/pkg": "^5.11.5",
        desm: "^1.3.0",
        fastbench: "^1.0.1",
        husky: "^9.0.6",
        "pino-elasticsearch": "^8.0.0",
        "sonic-boom": "^4.0.1",
        standard: "^17.0.0",
        tap: "^16.2.0",
        "ts-node": "^10.8.0",
        typescript: "^5.3.2",
        "why-is-node-running": "^2.2.2"
      },
      scripts: {
        build: "tsc --noEmit",
        test: 'standard && npm run build && npm run transpile && tap "test/**/*.test.*js" && tap --ts test/*.test.*ts',
        "test:ci": "standard && npm run transpile && npm run test:ci:js && npm run test:ci:ts",
        "test:ci:js": 'tap --no-check-coverage --timeout=120 --coverage-report=lcovonly "test/**/*.test.*js"',
        "test:ci:ts": 'tap --ts --no-check-coverage --coverage-report=lcovonly "test/**/*.test.*ts"',
        "test:yarn": 'npm run transpile && tap "test/**/*.test.js" --no-check-coverage',
        transpile: "sh ./test/ts/transpile.sh",
        prepare: "husky install"
      },
      standard: {
        ignore: [
          "test/ts/**/*",
          "test/syntax-error.mjs"
        ]
      },
      repository: {
        type: "git",
        url: "git+https://github.com/mcollina/thread-stream.git"
      },
      keywords: [
        "worker",
        "thread",
        "threads",
        "stream"
      ],
      author: "Matteo Collina <hello@matteocollina.com>",
      license: "MIT",
      bugs: {
        url: "https://github.com/mcollina/thread-stream/issues"
      },
      homepage: "https://github.com/mcollina/thread-stream#readme"
    };
  }
});

// node_modules/thread-stream/lib/wait.js
var require_wait = __commonJS({
  "node_modules/thread-stream/lib/wait.js"(exports2, module2) {
    "use strict";
    var MAX_TIMEOUT = 1e3;
    function wait(state, index, expected, timeout, done) {
      const max = Date.now() + timeout;
      let current = Atomics.load(state, index);
      if (current === expected) {
        done(null, "ok");
        return;
      }
      let prior = current;
      const check = (backoff) => {
        if (Date.now() > max) {
          done(null, "timed-out");
        } else {
          setTimeout(() => {
            prior = current;
            current = Atomics.load(state, index);
            if (current === prior) {
              check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2);
            } else {
              if (current === expected) done(null, "ok");
              else done(null, "not-equal");
            }
          }, backoff);
        }
      };
      check(1);
    }
    function waitDiff(state, index, expected, timeout, done) {
      const max = Date.now() + timeout;
      let current = Atomics.load(state, index);
      if (current !== expected) {
        done(null, "ok");
        return;
      }
      const check = (backoff) => {
        if (Date.now() > max) {
          done(null, "timed-out");
        } else {
          setTimeout(() => {
            current = Atomics.load(state, index);
            if (current !== expected) {
              done(null, "ok");
            } else {
              check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2);
            }
          }, backoff);
        }
      };
      check(1);
    }
    module2.exports = { wait, waitDiff };
  }
});

// node_modules/thread-stream/lib/indexes.js
var require_indexes = __commonJS({
  "node_modules/thread-stream/lib/indexes.js"(exports2, module2) {
    "use strict";
    var SEQ_INDEX = 2;
    var WRITE_INDEX = 4;
    var READ_INDEX = 8;
    module2.exports = {
      WRITE_INDEX,
      READ_INDEX,
      SEQ_INDEX
    };
  }
});

// node_modules/thread-stream/index.js
var require_thread_stream = __commonJS({
  "node_modules/thread-stream/index.js"(exports2, module2) {
    "use strict";
    var { version } = require_package();
    var { EventEmitter: EventEmitter2 } = require("events");
    var { Worker } = require("worker_threads");
    var { join } = require("path");
    var { pathToFileURL } = require("url");
    var { wait } = require_wait();
    var {
      WRITE_INDEX,
      READ_INDEX,
      SEQ_INDEX
    } = require_indexes();
    var buffer = require("buffer");
    var assert = require("assert");
    var kImpl = /* @__PURE__ */ Symbol("kImpl");
    var MAX_STRING = buffer.constants.MAX_STRING_LENGTH;
    function updateState(stream, fn) {
      Atomics.add(stream[kImpl].state, SEQ_INDEX, 1);
      fn();
      Atomics.add(stream[kImpl].state, SEQ_INDEX, 1);
      Atomics.notify(stream[kImpl].state, SEQ_INDEX);
    }
    var FakeWeakRef = class {
      constructor(value) {
        this._value = value;
      }
      deref() {
        return this._value;
      }
    };
    var FakeFinalizationRegistry = class {
      register() {
      }
      unregister() {
      }
    };
    var FinalizationRegistry2 = process.env.NODE_V8_COVERAGE ? FakeFinalizationRegistry : global.FinalizationRegistry || FakeFinalizationRegistry;
    var WeakRef2 = process.env.NODE_V8_COVERAGE ? FakeWeakRef : global.WeakRef || FakeWeakRef;
    var registry = new FinalizationRegistry2((worker) => {
      if (worker.exited) {
        return;
      }
      worker.terminate();
    });
    function createWorker(stream, opts) {
      const { filename, workerData } = opts;
      const bundlerOverrides = "__bundlerPathsOverrides" in globalThis ? globalThis.__bundlerPathsOverrides : {};
      const toExecute = bundlerOverrides["thread-stream-worker"] || join(__dirname, "lib", "worker.js");
      const worker = new Worker(toExecute, {
        ...opts.workerOpts,
        trackUnmanagedFds: false,
        workerData: {
          filename: filename.indexOf("file://") === 0 ? filename : pathToFileURL(filename).href,
          dataBuf: stream[kImpl].dataBuf,
          stateBuf: stream[kImpl].stateBuf,
          workerData: {
            $context: {
              threadStreamVersion: version
            },
            ...workerData
          }
        }
      });
      worker.stream = new FakeWeakRef(stream);
      worker.on("message", onWorkerMessage);
      worker.on("exit", onWorkerExit);
      registry.register(stream, worker);
      return worker;
    }
    function drain(stream) {
      assert(!stream[kImpl].sync);
      if (stream[kImpl].needDrain) {
        stream[kImpl].needDrain = false;
        stream.emit("drain");
      }
    }
    function nextFlush(stream) {
      const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      let leftover = stream[kImpl].data.length - writeIndex;
      if (leftover > 0) {
        if (stream[kImpl].buf.length === 0) {
          stream[kImpl].flushing = false;
          if (stream[kImpl].ending) {
            end(stream);
          } else if (stream[kImpl].needDrain) {
            process.nextTick(drain, stream);
          }
          return;
        }
        let toWrite = stream[kImpl].buf.slice(0, leftover);
        let toWriteBytes = Buffer.byteLength(toWrite);
        if (toWriteBytes <= leftover) {
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, nextFlush.bind(null, stream));
        } else {
          stream.flush(() => {
            if (stream.destroyed) {
              return;
            }
            updateState(stream, () => {
              Atomics.store(stream[kImpl].state, READ_INDEX, 0);
              Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
            });
            Atomics.notify(stream[kImpl].state, READ_INDEX);
            while (toWriteBytes > stream[kImpl].data.length) {
              leftover = leftover / 2;
              toWrite = stream[kImpl].buf.slice(0, leftover);
              toWriteBytes = Buffer.byteLength(toWrite);
            }
            stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
            write(stream, toWrite, nextFlush.bind(null, stream));
          });
        }
      } else if (leftover === 0) {
        if (writeIndex === 0 && stream[kImpl].buf.length === 0) {
          return;
        }
        stream.flush(() => {
          updateState(stream, () => {
            Atomics.store(stream[kImpl].state, READ_INDEX, 0);
            Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          });
          Atomics.notify(stream[kImpl].state, READ_INDEX);
          nextFlush(stream);
        });
      } else {
        destroy(stream, new Error("overwritten"));
      }
    }
    function onWorkerMessage(msg) {
      const stream = this.stream.deref();
      if (stream === void 0) {
        this.exited = true;
        this.terminate();
        return;
      }
      if (msg?.code == null) {
        return;
      }
      switch (msg.code) {
        case "READY":
          this.stream = new WeakRef2(stream);
          stream.flush(() => {
            stream[kImpl].ready = true;
            stream.emit("ready");
          });
          break;
        case "ERROR":
          destroy(stream, msg.err);
          break;
        case "EVENT":
          if (Array.isArray(msg.args)) {
            stream.emit(msg.name, ...msg.args);
          } else {
            stream.emit(msg.name, msg.args);
          }
          break;
        case "WARNING":
          process.emitWarning(msg.err);
          break;
        default:
          destroy(stream, new Error("this should not happen: " + msg.code));
      }
    }
    function onWorkerExit(code) {
      const stream = this.stream.deref();
      if (stream === void 0) {
        return;
      }
      registry.unregister(stream);
      stream.worker.exited = true;
      stream.worker.off("exit", onWorkerExit);
      destroy(stream, code !== 0 ? new Error("the worker thread exited") : null);
    }
    var ThreadStream = class extends EventEmitter2 {
      constructor(opts = {}) {
        super();
        if (opts.bufferSize < 4) {
          throw new Error("bufferSize must at least fit a 4-byte utf-8 char");
        }
        this[kImpl] = {};
        this[kImpl].stateBuf = new SharedArrayBuffer(128);
        this[kImpl].state = new Int32Array(this[kImpl].stateBuf);
        this[kImpl].dataBuf = new SharedArrayBuffer(opts.bufferSize || 4 * 1024 * 1024);
        this[kImpl].data = Buffer.from(this[kImpl].dataBuf);
        this[kImpl].sync = opts.sync || false;
        this[kImpl].ending = false;
        this[kImpl].ended = false;
        this[kImpl].needDrain = false;
        this[kImpl].destroyed = false;
        this[kImpl].flushing = false;
        this[kImpl].ready = false;
        this[kImpl].finished = false;
        this[kImpl].errored = null;
        this[kImpl].closed = false;
        this[kImpl].buf = "";
        this.worker = createWorker(this, opts);
        this.on("message", (message, transferList) => {
          this.worker.postMessage(message, transferList);
        });
      }
      write(data) {
        if (this[kImpl].destroyed) {
          error(this, new Error("the worker has exited"));
          return false;
        }
        if (this[kImpl].ending) {
          error(this, new Error("the worker is ending"));
          return false;
        }
        if (this[kImpl].flushing && this[kImpl].buf.length + data.length >= MAX_STRING) {
          try {
            writeSync(this);
            this[kImpl].flushing = true;
          } catch (err) {
            destroy(this, err);
            return false;
          }
        }
        this[kImpl].buf += data;
        if (this[kImpl].sync) {
          try {
            writeSync(this);
            return true;
          } catch (err) {
            destroy(this, err);
            return false;
          }
        }
        if (!this[kImpl].flushing) {
          this[kImpl].flushing = true;
          setImmediate(nextFlush, this);
        }
        this[kImpl].needDrain = this[kImpl].data.length - this[kImpl].buf.length - Atomics.load(this[kImpl].state, WRITE_INDEX) <= 0;
        return !this[kImpl].needDrain;
      }
      end() {
        if (this[kImpl].destroyed) {
          return;
        }
        this[kImpl].ending = true;
        end(this);
      }
      flush(cb) {
        if (this[kImpl].destroyed) {
          if (typeof cb === "function") {
            process.nextTick(cb, new Error("the worker has exited"));
          }
          return;
        }
        const writeIndex = Atomics.load(this[kImpl].state, WRITE_INDEX);
        wait(this[kImpl].state, READ_INDEX, writeIndex, Infinity, (err, res) => {
          if (err) {
            destroy(this, err);
            process.nextTick(cb, err);
            return;
          }
          if (res === "not-equal") {
            this.flush(cb);
            return;
          }
          process.nextTick(cb);
        });
      }
      flushSync() {
        if (this[kImpl].destroyed) {
          return;
        }
        writeSync(this);
        flushSync(this);
      }
      unref() {
        this.worker.unref();
      }
      ref() {
        this.worker.ref();
      }
      get ready() {
        return this[kImpl].ready;
      }
      get destroyed() {
        return this[kImpl].destroyed;
      }
      get closed() {
        return this[kImpl].closed;
      }
      get writable() {
        return !this[kImpl].destroyed && !this[kImpl].ending;
      }
      get writableEnded() {
        return this[kImpl].ending;
      }
      get writableFinished() {
        return this[kImpl].finished;
      }
      get writableNeedDrain() {
        return this[kImpl].needDrain;
      }
      get writableObjectMode() {
        return false;
      }
      get writableErrored() {
        return this[kImpl].errored;
      }
    };
    function error(stream, err) {
      setImmediate(() => {
        stream.emit("error", err);
      });
    }
    function destroy(stream, err) {
      if (stream[kImpl].destroyed) {
        return;
      }
      stream[kImpl].destroyed = true;
      if (err) {
        stream[kImpl].errored = err;
        error(stream, err);
      }
      if (!stream.worker.exited) {
        stream.worker.terminate().catch(() => {
        }).then(() => {
          stream[kImpl].closed = true;
          stream.emit("close");
        });
      } else {
        setImmediate(() => {
          stream[kImpl].closed = true;
          stream.emit("close");
        });
      }
    }
    function write(stream, data, cb) {
      const current = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      const length = Buffer.byteLength(data);
      stream[kImpl].data.write(data, current);
      updateState(stream, () => {
        Atomics.store(stream[kImpl].state, WRITE_INDEX, current + length);
      });
      cb();
      return true;
    }
    function end(stream) {
      if (stream[kImpl].ended || !stream[kImpl].ending || stream[kImpl].flushing) {
        return;
      }
      stream[kImpl].ended = true;
      try {
        stream.flushSync();
        let readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
        updateState(stream, () => {
          Atomics.store(stream[kImpl].state, WRITE_INDEX, -1);
        });
        let spins = 0;
        while (readIndex !== -1) {
          Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1e3);
          readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
          if (readIndex === -2) {
            destroy(stream, new Error("end() failed"));
            return;
          }
          if (++spins === 10) {
            destroy(stream, new Error("end() took too long (10s)"));
            return;
          }
        }
        process.nextTick(() => {
          stream[kImpl].finished = true;
          stream.emit("finish");
        });
      } catch (err) {
        destroy(stream, err);
      }
    }
    function writeSync(stream) {
      const cb = () => {
        if (stream[kImpl].ending) {
          end(stream);
        } else if (stream[kImpl].needDrain) {
          process.nextTick(drain, stream);
        }
      };
      stream[kImpl].flushing = false;
      while (stream[kImpl].buf.length !== 0) {
        const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
        let leftover = stream[kImpl].data.length - writeIndex;
        if (leftover === 0) {
          flushSync(stream);
          updateState(stream, () => {
            Atomics.store(stream[kImpl].state, READ_INDEX, 0);
            Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          });
          Atomics.notify(stream[kImpl].state, READ_INDEX);
          continue;
        } else if (leftover < 0) {
          throw new Error("overwritten");
        }
        let toWrite = stream[kImpl].buf.slice(0, leftover);
        let toWriteBytes = Buffer.byteLength(toWrite);
        if (toWriteBytes <= leftover) {
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, cb);
        } else {
          flushSync(stream);
          updateState(stream, () => {
            Atomics.store(stream[kImpl].state, READ_INDEX, 0);
            Atomics.store(stream[kImpl].state, WRITE_INDEX, 0);
          });
          Atomics.notify(stream[kImpl].state, READ_INDEX);
          while (toWriteBytes > stream[kImpl].buf.length) {
            leftover = leftover / 2;
            toWrite = stream[kImpl].buf.slice(0, leftover);
            toWriteBytes = Buffer.byteLength(toWrite);
          }
          stream[kImpl].buf = stream[kImpl].buf.slice(leftover);
          write(stream, toWrite, cb);
        }
      }
    }
    function flushSync(stream) {
      if (stream[kImpl].flushing) {
        throw new Error("unable to flush while flushing");
      }
      const writeIndex = Atomics.load(stream[kImpl].state, WRITE_INDEX);
      let spins = 0;
      while (true) {
        const readIndex = Atomics.load(stream[kImpl].state, READ_INDEX);
        if (readIndex === -2) {
          throw Error("_flushSync failed");
        }
        if (readIndex !== writeIndex) {
          Atomics.wait(stream[kImpl].state, READ_INDEX, readIndex, 1e3);
        } else {
          break;
        }
        if (++spins === 10) {
          throw new Error("_flushSync took too long (10s)");
        }
      }
    }
    module2.exports = ThreadStream;
  }
});

// node_modules/pino/lib/transport.js
var require_transport = __commonJS({
  "node_modules/pino/lib/transport.js"(exports2, module2) {
    "use strict";
    var { createRequire } = require("module");
    var getCallers = require_caller();
    var { join, isAbsolute, sep } = require("node:path");
    var sleep = require_atomic_sleep();
    var onExit = require_on_exit_leak_free();
    var ThreadStream = require_thread_stream();
    function setupOnExit(stream) {
      onExit.register(stream, autoEnd);
      onExit.registerBeforeExit(stream, flush);
      stream.on("close", function() {
        onExit.unregister(stream);
      });
    }
    function buildStream(filename, workerData, workerOpts, sync) {
      const stream = new ThreadStream({
        filename,
        workerData,
        workerOpts,
        sync
      });
      stream.on("ready", onReady);
      stream.on("close", function() {
        process.removeListener("exit", onExit2);
      });
      process.on("exit", onExit2);
      function onReady() {
        process.removeListener("exit", onExit2);
        stream.unref();
        if (workerOpts.autoEnd !== false) {
          setupOnExit(stream);
        }
      }
      function onExit2() {
        if (stream.closed) {
          return;
        }
        stream.flushSync();
        sleep(100);
        stream.end();
      }
      return stream;
    }
    function autoEnd(stream) {
      stream.ref();
      stream.flushSync();
      stream.end();
      stream.once("close", function() {
        stream.unref();
      });
    }
    function flush(stream) {
      stream.flushSync();
    }
    function transport(fullOptions) {
      const { pipeline: pipeline2, targets, levels, dedupe, worker = {}, caller = getCallers(), sync = false } = fullOptions;
      const options = {
        ...fullOptions.options
      };
      const callers = typeof caller === "string" ? [caller] : caller;
      const bundlerOverrides = "__bundlerPathsOverrides" in globalThis ? globalThis.__bundlerPathsOverrides : {};
      let target = fullOptions.target;
      if (target && targets) {
        throw new Error("only one of target or targets can be specified");
      }
      if (targets) {
        target = bundlerOverrides["pino-worker"] || join(__dirname, "worker.js");
        options.targets = targets.filter((dest) => dest.target).map((dest) => {
          return {
            ...dest,
            target: fixTarget(dest.target)
          };
        });
        options.pipelines = targets.filter((dest) => dest.pipeline).map((dest) => {
          return dest.pipeline.map((t) => {
            return {
              ...t,
              level: dest.level,
              // duplicate the pipeline `level` property defined in the upper level
              target: fixTarget(t.target)
            };
          });
        });
      } else if (pipeline2) {
        target = bundlerOverrides["pino-worker"] || join(__dirname, "worker.js");
        options.pipelines = [pipeline2.map((dest) => {
          return {
            ...dest,
            target: fixTarget(dest.target)
          };
        })];
      }
      if (levels) {
        options.levels = levels;
      }
      if (dedupe) {
        options.dedupe = dedupe;
      }
      options.pinoWillSendConfig = true;
      return buildStream(fixTarget(target), options, worker, sync);
      function fixTarget(origin) {
        origin = bundlerOverrides[origin] || origin;
        if (isAbsolute(origin) || origin.indexOf("file://") === 0) {
          return origin;
        }
        if (origin === "pino/file") {
          return join(__dirname, "..", "file.js");
        }
        let fixTarget2;
        for (const filePath of callers) {
          try {
            const context = filePath === "node:repl" ? process.cwd() + sep : filePath;
            fixTarget2 = createRequire(context).resolve(origin);
            break;
          } catch (err) {
            continue;
          }
        }
        if (!fixTarget2) {
          throw new Error(`unable to determine transport target for "${origin}"`);
        }
        return fixTarget2;
      }
    }
    module2.exports = transport;
  }
});

// node_modules/pino/lib/tools.js
var require_tools = __commonJS({
  "node_modules/pino/lib/tools.js"(exports2, module2) {
    "use strict";
    var diagChan = require("node:diagnostics_channel");
    var format = require_quick_format_unescaped();
    var { mapHttpRequest, mapHttpResponse } = require_pino_std_serializers();
    var SonicBoom = require_sonic_boom();
    var onExit = require_on_exit_leak_free();
    var {
      lsCacheSym,
      chindingsSym,
      writeSym,
      serializersSym,
      formatOptsSym,
      endSym,
      stringifiersSym,
      stringifySym,
      stringifySafeSym,
      wildcardFirstSym,
      nestedKeySym,
      formattersSym,
      messageKeySym,
      errorKeySym,
      nestedKeyStrSym,
      msgPrefixSym
    } = require_symbols();
    var { isMainThread } = require("worker_threads");
    var transport = require_transport();
    var asJsonChan;
    if (typeof diagChan.tracingChannel === "function") {
      asJsonChan = diagChan.tracingChannel("pino_asJson");
    } else {
      asJsonChan = {
        hasSubscribers: false,
        traceSync(fn, store, thisArg, ...args) {
          return fn.call(thisArg, ...args);
        }
      };
    }
    function noop() {
    }
    function genLog(level, hook) {
      if (!hook) return LOG;
      return function hookWrappedLog(...args) {
        hook.call(this, args, LOG, level);
      };
      function LOG(o, ...n) {
        if (typeof o === "object") {
          let msg = o;
          if (o !== null) {
            if (o.method && o.headers && o.socket) {
              o = mapHttpRequest(o);
            } else if (typeof o.setHeader === "function") {
              o = mapHttpResponse(o);
            }
          }
          let formatParams;
          if (msg === null && n.length === 0) {
            formatParams = [null];
          } else {
            msg = n.shift();
            formatParams = n;
          }
          if (typeof this[msgPrefixSym] === "string" && msg !== void 0 && msg !== null) {
            msg = this[msgPrefixSym] + msg;
          }
          this[writeSym](o, format(msg, formatParams, this[formatOptsSym]), level);
        } else {
          let msg = o === void 0 ? n.shift() : o;
          if (typeof this[msgPrefixSym] === "string" && msg !== void 0 && msg !== null) {
            msg = this[msgPrefixSym] + msg;
          }
          this[writeSym](null, format(msg, n, this[formatOptsSym]), level);
        }
      }
    }
    function asString(str) {
      let result = "";
      let last = 0;
      let found = false;
      let point = 255;
      const l = str.length;
      if (l > 100) {
        return JSON.stringify(str);
      }
      for (var i = 0; i < l && point >= 32; i++) {
        point = str.charCodeAt(i);
        if (point === 34 || point === 92) {
          result += str.slice(last, i) + "\\";
          last = i;
          found = true;
        }
      }
      if (!found) {
        result = str;
      } else {
        result += str.slice(last);
      }
      return point < 32 ? JSON.stringify(str) : '"' + result + '"';
    }
    function asJson(obj, msg, num, time) {
      if (asJsonChan.hasSubscribers === false) {
        return _asJson.call(this, obj, msg, num, time);
      }
      const store = { instance: this, arguments };
      return asJsonChan.traceSync(_asJson, store, this, obj, msg, num, time);
    }
    function _asJson(obj, msg, num, time) {
      const stringify2 = this[stringifySym];
      const stringifySafe = this[stringifySafeSym];
      const stringifiers = this[stringifiersSym];
      const end = this[endSym];
      const chindings = this[chindingsSym];
      const serializers = this[serializersSym];
      const formatters = this[formattersSym];
      const messageKey = this[messageKeySym];
      const errorKey = this[errorKeySym];
      let data = this[lsCacheSym][num] + time;
      data = data + chindings;
      let value;
      if (formatters.log) {
        obj = formatters.log(obj);
      }
      const wildcardStringifier = stringifiers[wildcardFirstSym];
      let propStr = "";
      for (const key in obj) {
        value = obj[key];
        if (Object.prototype.hasOwnProperty.call(obj, key) && value !== void 0) {
          if (serializers[key]) {
            value = serializers[key](value);
          } else if (key === errorKey && serializers.err) {
            value = serializers.err(value);
          }
          const stringifier = stringifiers[key] || wildcardStringifier;
          switch (typeof value) {
            case "undefined":
            case "function":
              continue;
            case "number":
              if (Number.isFinite(value) === false) {
                value = null;
              }
            // this case explicitly falls through to the next one
            case "boolean":
              if (stringifier) value = stringifier(value);
              break;
            case "string":
              value = (stringifier || asString)(value);
              break;
            default:
              value = (stringifier || stringify2)(value, stringifySafe);
          }
          if (value === void 0) continue;
          const strKey = asString(key);
          propStr += "," + strKey + ":" + value;
        }
      }
      let msgStr = "";
      if (msg !== void 0) {
        value = serializers[messageKey] ? serializers[messageKey](msg) : msg;
        const stringifier = stringifiers[messageKey] || wildcardStringifier;
        switch (typeof value) {
          case "function":
            break;
          case "number":
            if (Number.isFinite(value) === false) {
              value = null;
            }
          // this case explicitly falls through to the next one
          case "boolean":
            if (stringifier) value = stringifier(value);
            msgStr = ',"' + messageKey + '":' + value;
            break;
          case "string":
            value = (stringifier || asString)(value);
            msgStr = ',"' + messageKey + '":' + value;
            break;
          default:
            value = (stringifier || stringify2)(value, stringifySafe);
            msgStr = ',"' + messageKey + '":' + value;
        }
      }
      if (this[nestedKeySym] && propStr) {
        return data + this[nestedKeyStrSym] + propStr.slice(1) + "}" + msgStr + end;
      } else {
        return data + propStr + msgStr + end;
      }
    }
    function asChindings(instance, bindings) {
      let value;
      let data = instance[chindingsSym];
      const stringify2 = instance[stringifySym];
      const stringifySafe = instance[stringifySafeSym];
      const stringifiers = instance[stringifiersSym];
      const wildcardStringifier = stringifiers[wildcardFirstSym];
      const serializers = instance[serializersSym];
      const formatter = instance[formattersSym].bindings;
      bindings = formatter(bindings);
      for (const key in bindings) {
        value = bindings[key];
        const valid = (key.length < 5 || key !== "level" && key !== "serializers" && key !== "formatters" && key !== "customLevels") && bindings.hasOwnProperty(key) && value !== void 0;
        if (valid === true) {
          value = serializers[key] ? serializers[key](value) : value;
          value = (stringifiers[key] || wildcardStringifier || stringify2)(value, stringifySafe);
          if (value === void 0) continue;
          data += ',"' + key + '":' + value;
        }
      }
      return data;
    }
    function hasBeenTampered(stream) {
      return stream.write !== stream.constructor.prototype.write;
    }
    function buildSafeSonicBoom(opts) {
      const stream = new SonicBoom(opts);
      stream.on("error", filterBrokenPipe);
      if (!opts.sync && isMainThread) {
        onExit.register(stream, autoEnd);
        stream.on("close", function() {
          onExit.unregister(stream);
        });
      }
      return stream;
      function filterBrokenPipe(err) {
        if (err.code === "EPIPE") {
          stream.write = noop;
          stream.end = noop;
          stream.flushSync = noop;
          stream.destroy = noop;
          return;
        }
        stream.removeListener("error", filterBrokenPipe);
        stream.emit("error", err);
      }
    }
    function autoEnd(stream, eventName) {
      if (stream.destroyed) {
        return;
      }
      if (eventName === "beforeExit") {
        stream.flush();
        stream.on("drain", function() {
          stream.end();
        });
      } else {
        stream.flushSync();
      }
    }
    function createArgsNormalizer(defaultOptions) {
      return function normalizeArgs(instance, caller, opts = {}, stream) {
        if (typeof opts === "string") {
          stream = buildSafeSonicBoom({ dest: opts });
          opts = {};
        } else if (typeof stream === "string") {
          if (opts && opts.transport) {
            throw Error("only one of option.transport or stream can be specified");
          }
          stream = buildSafeSonicBoom({ dest: stream });
        } else if (opts instanceof SonicBoom || opts.writable || opts._writableState) {
          stream = opts;
          opts = {};
        } else if (opts.transport) {
          if (opts.transport instanceof SonicBoom || opts.transport.writable || opts.transport._writableState) {
            throw Error("option.transport do not allow stream, please pass to option directly. e.g. pino(transport)");
          }
          if (opts.transport.targets && opts.transport.targets.length && opts.formatters && typeof opts.formatters.level === "function") {
            throw Error("option.transport.targets do not allow custom level formatters");
          }
          let customLevels;
          if (opts.customLevels) {
            customLevels = opts.useOnlyCustomLevels ? opts.customLevels : Object.assign({}, opts.levels, opts.customLevels);
          }
          stream = transport({ caller, ...opts.transport, levels: customLevels });
        }
        opts = Object.assign({}, defaultOptions, opts);
        opts.serializers = Object.assign({}, defaultOptions.serializers, opts.serializers);
        opts.formatters = Object.assign({}, defaultOptions.formatters, opts.formatters);
        if (opts.prettyPrint) {
          throw new Error("prettyPrint option is no longer supported, see the pino-pretty package (https://github.com/pinojs/pino-pretty)");
        }
        const { enabled, onChild } = opts;
        if (enabled === false) opts.level = "silent";
        if (!onChild) opts.onChild = noop;
        if (!stream) {
          if (!hasBeenTampered(process.stdout)) {
            stream = buildSafeSonicBoom({ fd: process.stdout.fd || 1 });
          } else {
            stream = process.stdout;
          }
        }
        return { opts, stream };
      };
    }
    function stringify(obj, stringifySafeFn) {
      try {
        return JSON.stringify(obj);
      } catch (_) {
        try {
          const stringify2 = stringifySafeFn || this[stringifySafeSym];
          return stringify2(obj);
        } catch (_2) {
          return '"[unable to serialize, circular reference is too complex to analyze]"';
        }
      }
    }
    function buildFormatters(level, bindings, log) {
      return {
        level,
        bindings,
        log
      };
    }
    function normalizeDestFileDescriptor(destination) {
      const fd = Number(destination);
      if (typeof destination === "string" && Number.isFinite(fd)) {
        return fd;
      }
      if (destination === void 0) {
        return 1;
      }
      return destination;
    }
    module2.exports = {
      noop,
      buildSafeSonicBoom,
      asChindings,
      asJson,
      genLog,
      createArgsNormalizer,
      stringify,
      buildFormatters,
      normalizeDestFileDescriptor
    };
  }
});

// node_modules/pino/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pino/lib/constants.js"(exports2, module2) {
    var DEFAULT_LEVELS = {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60
    };
    var SORTING_ORDER = {
      ASC: "ASC",
      DESC: "DESC"
    };
    module2.exports = {
      DEFAULT_LEVELS,
      SORTING_ORDER
    };
  }
});

// node_modules/pino/lib/levels.js
var require_levels = __commonJS({
  "node_modules/pino/lib/levels.js"(exports2, module2) {
    "use strict";
    var {
      lsCacheSym,
      levelValSym,
      useOnlyCustomLevelsSym,
      streamSym,
      formattersSym,
      hooksSym,
      levelCompSym
    } = require_symbols();
    var { noop, genLog } = require_tools();
    var { DEFAULT_LEVELS, SORTING_ORDER } = require_constants();
    var levelMethods = {
      fatal: (hook) => {
        const logFatal = genLog(DEFAULT_LEVELS.fatal, hook);
        return function(...args) {
          const stream = this[streamSym];
          logFatal.call(this, ...args);
          if (typeof stream.flushSync === "function") {
            try {
              stream.flushSync();
            } catch (e) {
            }
          }
        };
      },
      error: (hook) => genLog(DEFAULT_LEVELS.error, hook),
      warn: (hook) => genLog(DEFAULT_LEVELS.warn, hook),
      info: (hook) => genLog(DEFAULT_LEVELS.info, hook),
      debug: (hook) => genLog(DEFAULT_LEVELS.debug, hook),
      trace: (hook) => genLog(DEFAULT_LEVELS.trace, hook)
    };
    var nums = Object.keys(DEFAULT_LEVELS).reduce((o, k) => {
      o[DEFAULT_LEVELS[k]] = k;
      return o;
    }, {});
    var initialLsCache = Object.keys(nums).reduce((o, k) => {
      o[k] = '{"level":' + Number(k);
      return o;
    }, {});
    function genLsCache(instance) {
      const formatter = instance[formattersSym].level;
      const { labels } = instance.levels;
      const cache = {};
      for (const label in labels) {
        const level = formatter(labels[label], Number(label));
        cache[label] = JSON.stringify(level).slice(0, -1);
      }
      instance[lsCacheSym] = cache;
      return instance;
    }
    function isStandardLevel(level, useOnlyCustomLevels) {
      if (useOnlyCustomLevels) {
        return false;
      }
      switch (level) {
        case "fatal":
        case "error":
        case "warn":
        case "info":
        case "debug":
        case "trace":
          return true;
        default:
          return false;
      }
    }
    function setLevel(level) {
      const { labels, values } = this.levels;
      if (typeof level === "number") {
        if (labels[level] === void 0) throw Error("unknown level value" + level);
        level = labels[level];
      }
      if (values[level] === void 0) throw Error("unknown level " + level);
      const preLevelVal = this[levelValSym];
      const levelVal = this[levelValSym] = values[level];
      const useOnlyCustomLevelsVal = this[useOnlyCustomLevelsSym];
      const levelComparison = this[levelCompSym];
      const hook = this[hooksSym].logMethod;
      for (const key in values) {
        if (levelComparison(values[key], levelVal) === false) {
          this[key] = noop;
          continue;
        }
        this[key] = isStandardLevel(key, useOnlyCustomLevelsVal) ? levelMethods[key](hook) : genLog(values[key], hook);
      }
      this.emit(
        "level-change",
        level,
        levelVal,
        labels[preLevelVal],
        preLevelVal,
        this
      );
    }
    function getLevel(level) {
      const { levels, levelVal } = this;
      return levels && levels.labels ? levels.labels[levelVal] : "";
    }
    function isLevelEnabled(logLevel) {
      const { values } = this.levels;
      const logLevelVal = values[logLevel];
      return logLevelVal !== void 0 && this[levelCompSym](logLevelVal, this[levelValSym]);
    }
    function compareLevel(direction, current, expected) {
      if (direction === SORTING_ORDER.DESC) {
        return current <= expected;
      }
      return current >= expected;
    }
    function genLevelComparison(levelComparison) {
      if (typeof levelComparison === "string") {
        return compareLevel.bind(null, levelComparison);
      }
      return levelComparison;
    }
    function mappings(customLevels = null, useOnlyCustomLevels = false) {
      const customNums = customLevels ? Object.keys(customLevels).reduce((o, k) => {
        o[customLevels[k]] = k;
        return o;
      }, {}) : null;
      const labels = Object.assign(
        Object.create(Object.prototype, { Infinity: { value: "silent" } }),
        useOnlyCustomLevels ? null : nums,
        customNums
      );
      const values = Object.assign(
        Object.create(Object.prototype, { silent: { value: Infinity } }),
        useOnlyCustomLevels ? null : DEFAULT_LEVELS,
        customLevels
      );
      return { labels, values };
    }
    function assertDefaultLevelFound(defaultLevel, customLevels, useOnlyCustomLevels) {
      if (typeof defaultLevel === "number") {
        const values = [].concat(
          Object.keys(customLevels || {}).map((key) => customLevels[key]),
          useOnlyCustomLevels ? [] : Object.keys(nums).map((level) => +level),
          Infinity
        );
        if (!values.includes(defaultLevel)) {
          throw Error(`default level:${defaultLevel} must be included in custom levels`);
        }
        return;
      }
      const labels = Object.assign(
        Object.create(Object.prototype, { silent: { value: Infinity } }),
        useOnlyCustomLevels ? null : DEFAULT_LEVELS,
        customLevels
      );
      if (!(defaultLevel in labels)) {
        throw Error(`default level:${defaultLevel} must be included in custom levels`);
      }
    }
    function assertNoLevelCollisions(levels, customLevels) {
      const { labels, values } = levels;
      for (const k in customLevels) {
        if (k in values) {
          throw Error("levels cannot be overridden");
        }
        if (customLevels[k] in labels) {
          throw Error("pre-existing level values cannot be used for new levels");
        }
      }
    }
    function assertLevelComparison(levelComparison) {
      if (typeof levelComparison === "function") {
        return;
      }
      if (typeof levelComparison === "string" && Object.values(SORTING_ORDER).includes(levelComparison)) {
        return;
      }
      throw new Error('Levels comparison should be one of "ASC", "DESC" or "function" type');
    }
    module2.exports = {
      initialLsCache,
      genLsCache,
      levelMethods,
      getLevel,
      setLevel,
      isLevelEnabled,
      mappings,
      assertNoLevelCollisions,
      assertDefaultLevelFound,
      genLevelComparison,
      assertLevelComparison
    };
  }
});

// node_modules/pino/lib/meta.js
var require_meta = __commonJS({
  "node_modules/pino/lib/meta.js"(exports2, module2) {
    "use strict";
    module2.exports = { version: "9.14.0" };
  }
});

// node_modules/pino/lib/proto.js
var require_proto = __commonJS({
  "node_modules/pino/lib/proto.js"(exports2, module2) {
    "use strict";
    var { EventEmitter: EventEmitter2 } = require("node:events");
    var {
      lsCacheSym,
      levelValSym,
      setLevelSym,
      getLevelSym,
      chindingsSym,
      parsedChindingsSym,
      mixinSym,
      asJsonSym,
      writeSym,
      mixinMergeStrategySym,
      timeSym,
      timeSliceIndexSym,
      streamSym,
      serializersSym,
      formattersSym,
      errorKeySym,
      messageKeySym,
      useOnlyCustomLevelsSym,
      needsMetadataGsym,
      redactFmtSym,
      stringifySym,
      formatOptsSym,
      stringifiersSym,
      msgPrefixSym,
      hooksSym
    } = require_symbols();
    var {
      getLevel,
      setLevel,
      isLevelEnabled,
      mappings,
      initialLsCache,
      genLsCache,
      assertNoLevelCollisions
    } = require_levels();
    var {
      asChindings,
      asJson,
      buildFormatters,
      stringify,
      noop
    } = require_tools();
    var {
      version
    } = require_meta();
    var redaction = require_redaction();
    var constructor = class Pino {
    };
    var prototype = {
      constructor,
      child,
      bindings,
      setBindings,
      flush,
      isLevelEnabled,
      version,
      get level() {
        return this[getLevelSym]();
      },
      set level(lvl) {
        this[setLevelSym](lvl);
      },
      get levelVal() {
        return this[levelValSym];
      },
      set levelVal(n) {
        throw Error("levelVal is read-only");
      },
      get msgPrefix() {
        return this[msgPrefixSym];
      },
      get [Symbol.toStringTag]() {
        return "Pino";
      },
      [lsCacheSym]: initialLsCache,
      [writeSym]: write,
      [asJsonSym]: asJson,
      [getLevelSym]: getLevel,
      [setLevelSym]: setLevel
    };
    Object.setPrototypeOf(prototype, EventEmitter2.prototype);
    module2.exports = function() {
      return Object.create(prototype);
    };
    var resetChildingsFormatter = (bindings2) => bindings2;
    function child(bindings2, options) {
      if (!bindings2) {
        throw Error("missing bindings for child Pino");
      }
      const serializers = this[serializersSym];
      const formatters = this[formattersSym];
      const instance = Object.create(this);
      if (options == null) {
        if (instance[formattersSym].bindings !== resetChildingsFormatter) {
          instance[formattersSym] = buildFormatters(
            formatters.level,
            resetChildingsFormatter,
            formatters.log
          );
        }
        instance[chindingsSym] = asChindings(instance, bindings2);
        instance[setLevelSym](this.level);
        if (this.onChild !== noop) {
          this.onChild(instance);
        }
        return instance;
      }
      if (options.hasOwnProperty("serializers") === true) {
        instance[serializersSym] = /* @__PURE__ */ Object.create(null);
        for (const k in serializers) {
          instance[serializersSym][k] = serializers[k];
        }
        const parentSymbols = Object.getOwnPropertySymbols(serializers);
        for (var i = 0; i < parentSymbols.length; i++) {
          const ks = parentSymbols[i];
          instance[serializersSym][ks] = serializers[ks];
        }
        for (const bk in options.serializers) {
          instance[serializersSym][bk] = options.serializers[bk];
        }
        const bindingsSymbols = Object.getOwnPropertySymbols(options.serializers);
        for (var bi = 0; bi < bindingsSymbols.length; bi++) {
          const bks = bindingsSymbols[bi];
          instance[serializersSym][bks] = options.serializers[bks];
        }
      } else instance[serializersSym] = serializers;
      if (options.hasOwnProperty("formatters")) {
        const { level, bindings: chindings, log } = options.formatters;
        instance[formattersSym] = buildFormatters(
          level || formatters.level,
          chindings || resetChildingsFormatter,
          log || formatters.log
        );
      } else {
        instance[formattersSym] = buildFormatters(
          formatters.level,
          resetChildingsFormatter,
          formatters.log
        );
      }
      if (options.hasOwnProperty("customLevels") === true) {
        assertNoLevelCollisions(this.levels, options.customLevels);
        instance.levels = mappings(options.customLevels, instance[useOnlyCustomLevelsSym]);
        genLsCache(instance);
      }
      if (typeof options.redact === "object" && options.redact !== null || Array.isArray(options.redact)) {
        instance.redact = options.redact;
        const stringifiers = redaction(instance.redact, stringify);
        const formatOpts = { stringify: stringifiers[redactFmtSym] };
        instance[stringifySym] = stringify;
        instance[stringifiersSym] = stringifiers;
        instance[formatOptsSym] = formatOpts;
      }
      if (typeof options.msgPrefix === "string") {
        instance[msgPrefixSym] = (this[msgPrefixSym] || "") + options.msgPrefix;
      }
      instance[chindingsSym] = asChindings(instance, bindings2);
      const childLevel = options.level || this.level;
      instance[setLevelSym](childLevel);
      this.onChild(instance);
      return instance;
    }
    function bindings() {
      const chindings = this[chindingsSym];
      const chindingsJson = `{${chindings.substr(1)}}`;
      const bindingsFromJson = JSON.parse(chindingsJson);
      delete bindingsFromJson.pid;
      delete bindingsFromJson.hostname;
      return bindingsFromJson;
    }
    function setBindings(newBindings) {
      const chindings = asChindings(this, newBindings);
      this[chindingsSym] = chindings;
      delete this[parsedChindingsSym];
    }
    function defaultMixinMergeStrategy(mergeObject, mixinObject) {
      return Object.assign(mixinObject, mergeObject);
    }
    function write(_obj, msg, num) {
      const t = this[timeSym]();
      const mixin = this[mixinSym];
      const errorKey = this[errorKeySym];
      const messageKey = this[messageKeySym];
      const mixinMergeStrategy = this[mixinMergeStrategySym] || defaultMixinMergeStrategy;
      let obj;
      const streamWriteHook = this[hooksSym].streamWrite;
      if (_obj === void 0 || _obj === null) {
        obj = {};
      } else if (_obj instanceof Error) {
        obj = { [errorKey]: _obj };
        if (msg === void 0) {
          msg = _obj.message;
        }
      } else {
        obj = _obj;
        if (msg === void 0 && _obj[messageKey] === void 0 && _obj[errorKey]) {
          msg = _obj[errorKey].message;
        }
      }
      if (mixin) {
        obj = mixinMergeStrategy(obj, mixin(obj, num, this));
      }
      const s = this[asJsonSym](obj, msg, num, t);
      const stream = this[streamSym];
      if (stream[needsMetadataGsym] === true) {
        stream.lastLevel = num;
        stream.lastObj = obj;
        stream.lastMsg = msg;
        stream.lastTime = t.slice(this[timeSliceIndexSym]);
        stream.lastLogger = this;
      }
      stream.write(streamWriteHook ? streamWriteHook(s) : s);
    }
    function flush(cb) {
      if (cb != null && typeof cb !== "function") {
        throw Error("callback must be a function");
      }
      const stream = this[streamSym];
      if (typeof stream.flush === "function") {
        stream.flush(cb || noop);
      } else if (cb) cb();
    }
  }
});

// node_modules/safe-stable-stringify/index.js
var require_safe_stable_stringify = __commonJS({
  "node_modules/safe-stable-stringify/index.js"(exports2, module2) {
    "use strict";
    var { hasOwnProperty } = Object.prototype;
    var stringify = configure();
    stringify.configure = configure;
    stringify.stringify = stringify;
    stringify.default = stringify;
    exports2.stringify = stringify;
    exports2.configure = configure;
    module2.exports = stringify;
    var strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
    function strEscape(str) {
      if (str.length < 5e3 && !strEscapeSequencesRegExp.test(str)) {
        return `"${str}"`;
      }
      return JSON.stringify(str);
    }
    function sort(array, comparator) {
      if (array.length > 200 || comparator) {
        return array.sort(comparator);
      }
      for (let i = 1; i < array.length; i++) {
        const currentValue = array[i];
        let position = i;
        while (position !== 0 && array[position - 1] > currentValue) {
          array[position] = array[position - 1];
          position--;
        }
        array[position] = currentValue;
      }
      return array;
    }
    var typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(
        Object.getPrototypeOf(
          new Int8Array()
        )
      ),
      Symbol.toStringTag
    ).get;
    function isTypedArrayWithEntries(value) {
      return typedArrayPrototypeGetSymbolToStringTag.call(value) !== void 0 && value.length !== 0;
    }
    function stringifyTypedArray(array, separator, maximumBreadth) {
      if (array.length < maximumBreadth) {
        maximumBreadth = array.length;
      }
      const whitespace = separator === "," ? "" : " ";
      let res = `"0":${whitespace}${array[0]}`;
      for (let i = 1; i < maximumBreadth; i++) {
        res += `${separator}"${i}":${whitespace}${array[i]}`;
      }
      return res;
    }
    function getCircularValueOption(options) {
      if (hasOwnProperty.call(options, "circularValue")) {
        const circularValue = options.circularValue;
        if (typeof circularValue === "string") {
          return `"${circularValue}"`;
        }
        if (circularValue == null) {
          return circularValue;
        }
        if (circularValue === Error || circularValue === TypeError) {
          return {
            toString() {
              throw new TypeError("Converting circular structure to JSON");
            }
          };
        }
        throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
      }
      return '"[Circular]"';
    }
    function getDeterministicOption(options) {
      let value;
      if (hasOwnProperty.call(options, "deterministic")) {
        value = options.deterministic;
        if (typeof value !== "boolean" && typeof value !== "function") {
          throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
        }
      }
      return value === void 0 ? true : value;
    }
    function getBooleanOption(options, key) {
      let value;
      if (hasOwnProperty.call(options, key)) {
        value = options[key];
        if (typeof value !== "boolean") {
          throw new TypeError(`The "${key}" argument must be of type boolean`);
        }
      }
      return value === void 0 ? true : value;
    }
    function getPositiveIntegerOption(options, key) {
      let value;
      if (hasOwnProperty.call(options, key)) {
        value = options[key];
        if (typeof value !== "number") {
          throw new TypeError(`The "${key}" argument must be of type number`);
        }
        if (!Number.isInteger(value)) {
          throw new TypeError(`The "${key}" argument must be an integer`);
        }
        if (value < 1) {
          throw new RangeError(`The "${key}" argument must be >= 1`);
        }
      }
      return value === void 0 ? Infinity : value;
    }
    function getItemCount(number) {
      if (number === 1) {
        return "1 item";
      }
      return `${number} items`;
    }
    function getUniqueReplacerSet(replacerArray) {
      const replacerSet = /* @__PURE__ */ new Set();
      for (const value of replacerArray) {
        if (typeof value === "string" || typeof value === "number") {
          replacerSet.add(String(value));
        }
      }
      return replacerSet;
    }
    function getStrictOption(options) {
      if (hasOwnProperty.call(options, "strict")) {
        const value = options.strict;
        if (typeof value !== "boolean") {
          throw new TypeError('The "strict" argument must be of type boolean');
        }
        if (value) {
          return (value2) => {
            let message = `Object can not safely be stringified. Received type ${typeof value2}`;
            if (typeof value2 !== "function") message += ` (${value2.toString()})`;
            throw new Error(message);
          };
        }
      }
    }
    function configure(options) {
      options = { ...options };
      const fail = getStrictOption(options);
      if (fail) {
        if (options.bigint === void 0) {
          options.bigint = false;
        }
        if (!("circularValue" in options)) {
          options.circularValue = Error;
        }
      }
      const circularValue = getCircularValueOption(options);
      const bigint = getBooleanOption(options, "bigint");
      const deterministic = getDeterministicOption(options);
      const comparator = typeof deterministic === "function" ? deterministic : void 0;
      const maximumDepth = getPositiveIntegerOption(options, "maximumDepth");
      const maximumBreadth = getPositiveIntegerOption(options, "maximumBreadth");
      function stringifyFnReplacer(key, parent, stack, replacer, spacer, indentation) {
        let value = parent[key];
        if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
          value = value.toJSON(key);
        }
        value = replacer.call(parent, key, value);
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            let res = "";
            let join = ",";
            const originalIndentation = indentation;
            if (Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              if (spacer !== "") {
                indentation += spacer;
                res += `
${indentation}`;
                join = `,
${indentation}`;
              }
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
                res += tmp2 !== void 0 ? tmp2 : "null";
                res += join;
              }
              const tmp = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
              res += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              if (spacer !== "") {
                res += `
${originalIndentation}`;
              }
              stack.pop();
              return `[${res}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0) {
              return "{}";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Object]"';
            }
            let whitespace = "";
            let separator = "";
            if (spacer !== "") {
              indentation += spacer;
              join = `,
${indentation}`;
              whitespace = " ";
            }
            const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            if (deterministic && !isTypedArrayWithEntries(value)) {
              keys = sort(keys, comparator);
            }
            stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i];
              const tmp = stringifyFnReplacer(key2, value, stack, replacer, spacer, indentation);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
                separator = join;
              }
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`;
              separator = join;
            }
            if (spacer !== "" && separator.length > 1) {
              res = `
${indentation}${res}
${originalIndentation}`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifyArrayReplacer(key, value, stack, replacer, spacer, indentation) {
        if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
          value = value.toJSON(key);
        }
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            const originalIndentation = indentation;
            let res = "";
            let join = ",";
            if (Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              if (spacer !== "") {
                indentation += spacer;
                res += `
${indentation}`;
                join = `,
${indentation}`;
              }
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
                res += tmp2 !== void 0 ? tmp2 : "null";
                res += join;
              }
              const tmp = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
              res += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              if (spacer !== "") {
                res += `
${originalIndentation}`;
              }
              stack.pop();
              return `[${res}]`;
            }
            stack.push(value);
            let whitespace = "";
            if (spacer !== "") {
              indentation += spacer;
              join = `,
${indentation}`;
              whitespace = " ";
            }
            let separator = "";
            for (const key2 of replacer) {
              const tmp = stringifyArrayReplacer(key2, value[key2], stack, replacer, spacer, indentation);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
                separator = join;
              }
            }
            if (spacer !== "" && separator.length > 1) {
              res = `
${indentation}${res}
${originalIndentation}`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifyIndent(key, value, stack, spacer, indentation) {
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (typeof value.toJSON === "function") {
              value = value.toJSON(key);
              if (typeof value !== "object") {
                return stringifyIndent(key, value, stack, spacer, indentation);
              }
              if (value === null) {
                return "null";
              }
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            const originalIndentation = indentation;
            if (Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              indentation += spacer;
              let res2 = `
${indentation}`;
              const join2 = `,
${indentation}`;
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyIndent(String(i), value[i], stack, spacer, indentation);
                res2 += tmp2 !== void 0 ? tmp2 : "null";
                res2 += join2;
              }
              const tmp = stringifyIndent(String(i), value[i], stack, spacer, indentation);
              res2 += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res2 += `${join2}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              res2 += `
${originalIndentation}`;
              stack.pop();
              return `[${res2}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0) {
              return "{}";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Object]"';
            }
            indentation += spacer;
            const join = `,
${indentation}`;
            let res = "";
            let separator = "";
            let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            if (isTypedArrayWithEntries(value)) {
              res += stringifyTypedArray(value, join, maximumBreadth);
              keys = keys.slice(value.length);
              maximumPropertiesToStringify -= value.length;
              separator = join;
            }
            if (deterministic) {
              keys = sort(keys, comparator);
            }
            stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i];
              const tmp = stringifyIndent(key2, value[key2], stack, spacer, indentation);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}: ${tmp}`;
                separator = join;
              }
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`;
              separator = join;
            }
            if (separator !== "") {
              res = `
${indentation}${res}
${originalIndentation}`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifySimple(key, value, stack) {
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null) {
              return "null";
            }
            if (typeof value.toJSON === "function") {
              value = value.toJSON(key);
              if (typeof value !== "object") {
                return stringifySimple(key, value, stack);
              }
              if (value === null) {
                return "null";
              }
            }
            if (stack.indexOf(value) !== -1) {
              return circularValue;
            }
            let res = "";
            const hasLength = value.length !== void 0;
            if (hasLength && Array.isArray(value)) {
              if (value.length === 0) {
                return "[]";
              }
              if (maximumDepth < stack.length + 1) {
                return '"[Array]"';
              }
              stack.push(value);
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifySimple(String(i), value[i], stack);
                res += tmp2 !== void 0 ? tmp2 : "null";
                res += ",";
              }
              const tmp = stringifySimple(String(i), value[i], stack);
              res += tmp !== void 0 ? tmp : "null";
              if (value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `,"... ${getItemCount(removedKeys)} not stringified"`;
              }
              stack.pop();
              return `[${res}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0) {
              return "{}";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Object]"';
            }
            let separator = "";
            let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            if (hasLength && isTypedArrayWithEntries(value)) {
              res += stringifyTypedArray(value, ",", maximumBreadth);
              keys = keys.slice(value.length);
              maximumPropertiesToStringify -= value.length;
              separator = ",";
            }
            if (deterministic) {
              keys = sort(keys, comparator);
            }
            stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i];
              const tmp = stringifySimple(key2, value[key2], stack);
              if (tmp !== void 0) {
                res += `${separator}${strEscape(key2)}:${tmp}`;
                separator = ",";
              }
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`;
            }
            stack.pop();
            return `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return void 0;
          case "bigint":
            if (bigint) {
              return String(value);
            }
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringify2(value, replacer, space) {
        if (arguments.length > 1) {
          let spacer = "";
          if (typeof space === "number") {
            spacer = " ".repeat(Math.min(space, 10));
          } else if (typeof space === "string") {
            spacer = space.slice(0, 10);
          }
          if (replacer != null) {
            if (typeof replacer === "function") {
              return stringifyFnReplacer("", { "": value }, [], replacer, spacer, "");
            }
            if (Array.isArray(replacer)) {
              return stringifyArrayReplacer("", value, [], getUniqueReplacerSet(replacer), spacer, "");
            }
          }
          if (spacer.length !== 0) {
            return stringifyIndent("", value, [], spacer, "");
          }
        }
        return stringifySimple("", value, []);
      }
      return stringify2;
    }
  }
});

// node_modules/pino/lib/multistream.js
var require_multistream = __commonJS({
  "node_modules/pino/lib/multistream.js"(exports2, module2) {
    "use strict";
    var metadata = /* @__PURE__ */ Symbol.for("pino.metadata");
    var { DEFAULT_LEVELS } = require_constants();
    var DEFAULT_INFO_LEVEL = DEFAULT_LEVELS.info;
    function multistream(streamsArray, opts) {
      streamsArray = streamsArray || [];
      opts = opts || { dedupe: false };
      const streamLevels = Object.create(DEFAULT_LEVELS);
      streamLevels.silent = Infinity;
      if (opts.levels && typeof opts.levels === "object") {
        Object.keys(opts.levels).forEach((i) => {
          streamLevels[i] = opts.levels[i];
        });
      }
      const res = {
        write,
        add,
        remove,
        emit,
        flushSync,
        end,
        minLevel: 0,
        lastId: 0,
        streams: [],
        clone,
        [metadata]: true,
        streamLevels
      };
      if (Array.isArray(streamsArray)) {
        streamsArray.forEach(add, res);
      } else {
        add.call(res, streamsArray);
      }
      streamsArray = null;
      return res;
      function write(data) {
        let dest;
        const level = this.lastLevel;
        const { streams } = this;
        let recordedLevel = 0;
        let stream;
        for (let i = initLoopVar(streams.length, opts.dedupe); checkLoopVar(i, streams.length, opts.dedupe); i = adjustLoopVar(i, opts.dedupe)) {
          dest = streams[i];
          if (dest.level <= level) {
            if (recordedLevel !== 0 && recordedLevel !== dest.level) {
              break;
            }
            stream = dest.stream;
            if (stream[metadata]) {
              const { lastTime, lastMsg, lastObj, lastLogger } = this;
              stream.lastLevel = level;
              stream.lastTime = lastTime;
              stream.lastMsg = lastMsg;
              stream.lastObj = lastObj;
              stream.lastLogger = lastLogger;
            }
            stream.write(data);
            if (opts.dedupe) {
              recordedLevel = dest.level;
            }
          } else if (!opts.dedupe) {
            break;
          }
        }
      }
      function emit(...args) {
        for (const { stream } of this.streams) {
          if (typeof stream.emit === "function") {
            stream.emit(...args);
          }
        }
      }
      function flushSync() {
        for (const { stream } of this.streams) {
          if (typeof stream.flushSync === "function") {
            stream.flushSync();
          }
        }
      }
      function add(dest) {
        if (!dest) {
          return res;
        }
        const isStream = typeof dest.write === "function" || dest.stream;
        const stream_ = dest.write ? dest : dest.stream;
        if (!isStream) {
          throw Error("stream object needs to implement either StreamEntry or DestinationStream interface");
        }
        const { streams, streamLevels: streamLevels2 } = this;
        let level;
        if (typeof dest.levelVal === "number") {
          level = dest.levelVal;
        } else if (typeof dest.level === "string") {
          level = streamLevels2[dest.level];
        } else if (typeof dest.level === "number") {
          level = dest.level;
        } else {
          level = DEFAULT_INFO_LEVEL;
        }
        const dest_ = {
          stream: stream_,
          level,
          levelVal: void 0,
          id: ++res.lastId
        };
        streams.unshift(dest_);
        streams.sort(compareByLevel);
        this.minLevel = streams[0].level;
        return res;
      }
      function remove(id) {
        const { streams } = this;
        const index = streams.findIndex((s) => s.id === id);
        if (index >= 0) {
          streams.splice(index, 1);
          streams.sort(compareByLevel);
          this.minLevel = streams.length > 0 ? streams[0].level : -1;
        }
        return res;
      }
      function end() {
        for (const { stream } of this.streams) {
          if (typeof stream.flushSync === "function") {
            stream.flushSync();
          }
          stream.end();
        }
      }
      function clone(level) {
        const streams = new Array(this.streams.length);
        for (let i = 0; i < streams.length; i++) {
          streams[i] = {
            level,
            stream: this.streams[i].stream
          };
        }
        return {
          write,
          add,
          remove,
          minLevel: level,
          streams,
          clone,
          emit,
          flushSync,
          [metadata]: true
        };
      }
    }
    function compareByLevel(a, b) {
      return a.level - b.level;
    }
    function initLoopVar(length, dedupe) {
      return dedupe ? length - 1 : 0;
    }
    function adjustLoopVar(i, dedupe) {
      return dedupe ? i - 1 : i + 1;
    }
    function checkLoopVar(i, length, dedupe) {
      return dedupe ? i >= 0 : i < length;
    }
    module2.exports = multistream;
  }
});

// node_modules/pino/pino.js
var require_pino = __commonJS({
  "node_modules/pino/pino.js"(exports2, module2) {
    "use strict";
    var os5 = require("node:os");
    var stdSerializers = require_pino_std_serializers();
    var caller = require_caller();
    var redaction = require_redaction();
    var time = require_time();
    var proto = require_proto();
    var symbols = require_symbols();
    var { configure } = require_safe_stable_stringify();
    var { assertDefaultLevelFound, mappings, genLsCache, genLevelComparison, assertLevelComparison } = require_levels();
    var { DEFAULT_LEVELS, SORTING_ORDER } = require_constants();
    var {
      createArgsNormalizer,
      asChindings,
      buildSafeSonicBoom,
      buildFormatters,
      stringify,
      normalizeDestFileDescriptor,
      noop
    } = require_tools();
    var { version } = require_meta();
    var {
      chindingsSym,
      redactFmtSym,
      serializersSym,
      timeSym,
      timeSliceIndexSym,
      streamSym,
      stringifySym,
      stringifySafeSym,
      stringifiersSym,
      setLevelSym,
      endSym,
      formatOptsSym,
      messageKeySym,
      errorKeySym,
      nestedKeySym,
      mixinSym,
      levelCompSym,
      useOnlyCustomLevelsSym,
      formattersSym,
      hooksSym,
      nestedKeyStrSym,
      mixinMergeStrategySym,
      msgPrefixSym
    } = symbols;
    var { epochTime, nullTime } = time;
    var { pid } = process;
    var hostname = os5.hostname();
    var defaultErrorSerializer = stdSerializers.err;
    var defaultOptions = {
      level: "info",
      levelComparison: SORTING_ORDER.ASC,
      levels: DEFAULT_LEVELS,
      messageKey: "msg",
      errorKey: "err",
      nestedKey: null,
      enabled: true,
      base: { pid, hostname },
      serializers: Object.assign(/* @__PURE__ */ Object.create(null), {
        err: defaultErrorSerializer
      }),
      formatters: Object.assign(/* @__PURE__ */ Object.create(null), {
        bindings(bindings) {
          return bindings;
        },
        level(label, number) {
          return { level: number };
        }
      }),
      hooks: {
        logMethod: void 0,
        streamWrite: void 0
      },
      timestamp: epochTime,
      name: void 0,
      redact: null,
      customLevels: null,
      useOnlyCustomLevels: false,
      depthLimit: 5,
      edgeLimit: 100
    };
    var normalize = createArgsNormalizer(defaultOptions);
    var serializers = Object.assign(/* @__PURE__ */ Object.create(null), stdSerializers);
    function pino2(...args) {
      const instance = {};
      const { opts, stream } = normalize(instance, caller(), ...args);
      if (opts.level && typeof opts.level === "string" && DEFAULT_LEVELS[opts.level.toLowerCase()] !== void 0) opts.level = opts.level.toLowerCase();
      const {
        redact,
        crlf,
        serializers: serializers2,
        timestamp,
        messageKey,
        errorKey,
        nestedKey,
        base,
        name,
        level,
        customLevels,
        levelComparison,
        mixin,
        mixinMergeStrategy,
        useOnlyCustomLevels,
        formatters,
        hooks,
        depthLimit,
        edgeLimit,
        onChild,
        msgPrefix
      } = opts;
      const stringifySafe = configure({
        maximumDepth: depthLimit,
        maximumBreadth: edgeLimit
      });
      const allFormatters = buildFormatters(
        formatters.level,
        formatters.bindings,
        formatters.log
      );
      const stringifyFn = stringify.bind({
        [stringifySafeSym]: stringifySafe
      });
      const stringifiers = redact ? redaction(redact, stringifyFn) : {};
      const formatOpts = redact ? { stringify: stringifiers[redactFmtSym] } : { stringify: stringifyFn };
      const end = "}" + (crlf ? "\r\n" : "\n");
      const coreChindings = asChindings.bind(null, {
        [chindingsSym]: "",
        [serializersSym]: serializers2,
        [stringifiersSym]: stringifiers,
        [stringifySym]: stringify,
        [stringifySafeSym]: stringifySafe,
        [formattersSym]: allFormatters
      });
      let chindings = "";
      if (base !== null) {
        if (name === void 0) {
          chindings = coreChindings(base);
        } else {
          chindings = coreChindings(Object.assign({}, base, { name }));
        }
      }
      const time2 = timestamp instanceof Function ? timestamp : timestamp ? epochTime : nullTime;
      const timeSliceIndex = time2().indexOf(":") + 1;
      if (useOnlyCustomLevels && !customLevels) throw Error("customLevels is required if useOnlyCustomLevels is set true");
      if (mixin && typeof mixin !== "function") throw Error(`Unknown mixin type "${typeof mixin}" - expected "function"`);
      if (msgPrefix && typeof msgPrefix !== "string") throw Error(`Unknown msgPrefix type "${typeof msgPrefix}" - expected "string"`);
      assertDefaultLevelFound(level, customLevels, useOnlyCustomLevels);
      const levels = mappings(customLevels, useOnlyCustomLevels);
      if (typeof stream.emit === "function") {
        stream.emit("message", { code: "PINO_CONFIG", config: { levels, messageKey, errorKey } });
      }
      assertLevelComparison(levelComparison);
      const levelCompFunc = genLevelComparison(levelComparison);
      Object.assign(instance, {
        levels,
        [levelCompSym]: levelCompFunc,
        [useOnlyCustomLevelsSym]: useOnlyCustomLevels,
        [streamSym]: stream,
        [timeSym]: time2,
        [timeSliceIndexSym]: timeSliceIndex,
        [stringifySym]: stringify,
        [stringifySafeSym]: stringifySafe,
        [stringifiersSym]: stringifiers,
        [endSym]: end,
        [formatOptsSym]: formatOpts,
        [messageKeySym]: messageKey,
        [errorKeySym]: errorKey,
        [nestedKeySym]: nestedKey,
        // protect against injection
        [nestedKeyStrSym]: nestedKey ? `,${JSON.stringify(nestedKey)}:{` : "",
        [serializersSym]: serializers2,
        [mixinSym]: mixin,
        [mixinMergeStrategySym]: mixinMergeStrategy,
        [chindingsSym]: chindings,
        [formattersSym]: allFormatters,
        [hooksSym]: hooks,
        silent: noop,
        onChild,
        [msgPrefixSym]: msgPrefix
      });
      Object.setPrototypeOf(instance, proto());
      genLsCache(instance);
      instance[setLevelSym](level);
      return instance;
    }
    module2.exports = pino2;
    module2.exports.destination = (dest = process.stdout.fd) => {
      if (typeof dest === "object") {
        dest.dest = normalizeDestFileDescriptor(dest.dest || process.stdout.fd);
        return buildSafeSonicBoom(dest);
      } else {
        return buildSafeSonicBoom({ dest: normalizeDestFileDescriptor(dest), minLength: 0 });
      }
    };
    module2.exports.transport = require_transport();
    module2.exports.multistream = require_multistream();
    module2.exports.levels = mappings();
    module2.exports.stdSerializers = serializers;
    module2.exports.stdTimeFunctions = Object.assign({}, time);
    module2.exports.symbols = symbols;
    module2.exports.version = version;
    module2.exports.default = pino2;
    module2.exports.pino = pino2;
  }
});

// src/worker/worker-server.ts
var import_http = __toESM(require("http"));
var import_url4 = require("url");
var import_fs9 = __toESM(require("fs"));

// src/lib/providers/ytdlp.ts
var import_child_process = require("child_process");
var import_path2 = __toESM(require("path"));
var import_os2 = __toESM(require("os"));
var import_fs2 = __toESM(require("fs"));

// src/lib/providers/base.ts
var BaseProvider = class {
  parseProgressLine(line) {
    const trimmed = line.trim();
    if (trimmed.includes("[Merger]") || trimmed.includes("[ffmpeg] Merging")) {
      return { phase: "merging", speed: "Merging with FFmpeg", eta: "" };
    }
    if (trimmed.includes("[ExtractAudio]")) {
      return { phase: "finalizing", speed: "Extracting Audio (FFmpeg)", eta: "" };
    }
    if (trimmed.includes("Deleting original file") || trimmed.includes("Fixing container") || trimmed.includes("[Fixup")) {
      return { phase: "finalizing", speed: "Finalizing", eta: "" };
    }
    if (trimmed.startsWith("[download] Destination:")) {
      return { phase: "downloading_video" };
    }
    const match = trimmed.match(
      /\[download\]\s+([\d.]+)%(?:\s+of\s+(?:~\s*)?(\S+))?(?:\s+at\s+([\d.]+\s*\S+\/s|Unknown\s*B\/s))?(?:\s+ETA\s+(\S+))?/i
    );
    if (match && match[1]) {
      const rawPct = parseFloat(match[1]);
      const speed = match[3] && !match[3].toLowerCase().includes("unknown") ? match[3] : "";
      const eta = match[4] && !match[4].toLowerCase().includes("unknown") ? match[4] : "";
      return {
        progress: Math.min(100, Math.max(0, rawPct)),
        speed,
        eta,
        phase: "downloading_video"
      };
    }
    return {};
  }
  sanitizeErrorMessage(stderr) {
    const cleanLines = stderr.split("\n").map((l) => l.trim()).filter((l) => l && !l.includes("Deprecated Feature: Support for Python version"));
    const text = cleanLines.join("\n").trim();
    if (!text) return "Download failed with unknown error";
    if (text.toLowerCase().includes("facebook") && (text.includes("login") || text.includes("log in") || text.includes("checkpoint") || text.includes("private") || text.includes("permission"))) {
      return "Facebook requires authentication or this content is not publicly accessible.";
    }
    if (text.toLowerCase().includes("instagram") && (text.includes("login") || text.includes("log in") || text.includes("checkpoint") || text.includes("private") || text.includes("Login required"))) {
      return "Instagram requires authentication or this post/reel is not publicly accessible.";
    }
    if (text.includes("Private video") || text.includes("This video is private")) {
      return "This video is private and cannot be accessed.";
    }
    if (text.includes("Sign in if you have been granted access") || text.includes("Private content") || text.includes("Authentication required") || text.includes("Sign in to confirm")) {
      return "This content requires authentication or login credentials.";
    }
    if (text.includes("Age-restricted") || text.includes("confirm your age") || text.includes("age gate")) {
      return "This video is age-restricted and requires account verification.";
    }
    if (text.includes("Geo-restricted") || text.includes("not available in your country") || text.includes("Your country")) {
      return "This video is geo-restricted and not available in your region.";
    }
    if (text.includes("Video unavailable") || text.includes("DoesNotExistException") || text.includes("not found") || text.includes("is not a valid URL")) {
      return "The requested media is unavailable, deleted, or the URL is invalid.";
    }
    if (text.includes("HTTP Error 404") || text.includes("404 Not Found")) {
      return "Media not found (HTTP 404). Please verify the URL.";
    }
    if (text.includes("HTTP Error 403") || text.includes("403 Forbidden")) {
      return "Access forbidden (HTTP 403) by provider server.";
    }
    if (text.includes("HTTP Error 429") || text.includes("429 Too Many Requests")) {
      return "Rate limited by provider. Please wait and try again later.";
    }
    if (text.includes("HTTP Error 503") || text.includes("503 Service Unavailable")) {
      return "Provider service temporarily unavailable. Please try again later.";
    }
    if (text.includes("Network timeout") || text.includes("Connection timed out") || text.includes("Timeout")) {
      return "Network timeout. Please check your internet connection and try again.";
    }
    if (text.includes("Connection refused") || text.includes("ECONNREFUSED")) {
      return "Connection refused. Please check your internet connection.";
    }
    if (text.includes("DNS") || text.includes("ENOTFOUND")) {
      return "DNS resolution failed. Please check your internet connection.";
    }
    if (text.includes("SSL") || text.includes("TLS") || text.includes("certificate")) {
      return "SSL/TLS certificate error. Please check your system clock and network.";
    }
    if (text.includes("ffmpeg") && (text.includes("not found") || text.includes("ENOENT") || text.includes("is not recognized"))) {
      return "FFmpeg binary not found. Please install FFmpeg or set its path in Settings.";
    }
    if (text.includes("yt-dlp") && (text.includes("not found") || text.includes("ENOENT") || text.includes("is not recognized"))) {
      return "yt-dlp binary not found. Please install yt-dlp or set its path in Settings.";
    }
    if (text.includes("spotdl") && (text.includes("not found") || text.includes("ENOENT") || text.includes("is not recognized"))) {
      return "spotdl binary not found. Please install spotdl or set its path in Settings.";
    }
    if (text.includes("No space left") || text.includes("disk full") || text.includes("ENOSPC")) {
      return "Disk full. Please free up space and try again.";
    }
    if (text.includes("Permission denied") || text.includes("EACCES") || text.includes("Access is denied")) {
      return "Permission denied. Please check download directory permissions.";
    }
    if (text.includes("Unsupported URL") || text.includes("Unsupported")) {
      return "This URL format is not supported by the provider.";
    }
    if (text.includes("format not available") || text.includes("no suitable format")) {
      return "Requested format not available for this media.";
    }
    if (text.includes("Spotify") && (text.includes("not found") || text.includes("unavailable"))) {
      return "Spotify content unavailable or region-locked.";
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const lastLine = lines.find((l) => l.startsWith("ERROR:")) || lines[lines.length - 1];
    const cleanError = lastLine ? lastLine.replace(/^ERROR:\s*/i, "") : text;
    if (cleanError.length > 200) {
      return cleanError.substring(0, 200) + "...";
    }
    return cleanError;
  }
};

// src/lib/utils/url.ts
var PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  // Link-local & AWS/GCP metadata
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
  /metadata\.google\.internal$/i,
  /instance-data$/i
];
function isValidUrl(input) {
  try {
    const url = new URL(input.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function validateSafeUrl(input) {
  if (!input || typeof input !== "string") {
    return { safe: false, reason: "Invalid or missing URL." };
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { safe: false, reason: "Malformed URL structure." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }
  const hostname = parsed.hostname.toLowerCase();
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: "Access to private network addresses and cloud metadata is restricted." };
    }
  }
  return { safe: true };
}
function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function urlMatchesDomains(url, domains) {
  const hostname = getHostname(url);
  if (!hostname) return false;
  return domains.some(
    (d) => hostname === d || hostname.endsWith("." + d)
  );
}

// src/lib/logger.ts
var import_pino = __toESM(require_pino());
var isDev = process.env.NODE_ENV === "development";
var logger = (0, import_pino.default)({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname"
      }
    }
  }
});
var downloadLogger = logger.child({ module: "download-queue" });
var apiLogger = logger.child({ module: "api" });
var providerLogger = logger.child({ module: "provider" });

// src/lib/utils/filename.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
function sanitizeFilename(filename) {
  if (!filename) return "media_download";
  let name = filename.normalize("NFC");
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  name = name.trim().replace(/[.\s]+$/, "");
  const parsed = import_path.default.parse(name);
  if (WINDOWS_RESERVED_NAMES.test(parsed.name)) {
    parsed.name = `_${parsed.name}`;
    name = parsed.ext ? `${parsed.name}${parsed.ext}` : parsed.name;
  }
  const maxLen = 200;
  if (name.length > maxLen) {
    const ext = parsed.ext || "";
    const base = parsed.name.slice(0, maxLen - ext.length - 1);
    name = `${base}${ext}`;
  }
  return name || "media_download";
}
function getUniqueOutputPath(desiredPath, behavior = "rename") {
  if (!import_fs.default.existsSync(desiredPath)) return desiredPath;
  if (behavior === "overwrite" || behavior === "skip") return desiredPath;
  const parsed = import_path.default.parse(desiredPath);
  let counter = 1;
  let candidate = desiredPath;
  while (import_fs.default.existsSync(candidate)) {
    candidate = import_path.default.join(
      parsed.dir,
      `${parsed.name} (${counter})${parsed.ext}`
    );
    counter++;
  }
  return candidate;
}
function validateDownloadFolder(dirPath) {
  try {
    let resolved = dirPath.trim();
    if (resolved.startsWith("~/") || resolved.startsWith("~\\")) {
      resolved = import_path.default.join(import_os.default.homedir(), resolved.slice(2));
    } else if (resolved === "~") {
      resolved = import_os.default.homedir();
    } else {
      resolved = import_path.default.resolve(resolved);
    }
    if (!import_fs.default.existsSync(resolved)) {
      import_fs.default.mkdirSync(resolved, { recursive: true });
    }
    import_fs.default.accessSync(resolved, import_fs.default.constants.W_OK);
    return resolved;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Download directory '${dirPath}' is invalid or not writable: ${msg}`);
  }
}
function verifyFileExists(targetPath) {
  try {
    const resolved = import_path.default.resolve(targetPath);
    const variants = [
      resolved,
      resolved.normalize("NFC"),
      resolved.normalize("NFD")
    ];
    for (const v of variants) {
      if (import_fs.default.existsSync(v)) {
        const s = import_fs.default.statSync(v);
        if (s.isFile() && s.size > 0) return v;
      }
    }
  } catch {
  }
  return null;
}
function findMatchingFileInDir(dir, candidatePath, minMtimeMs) {
  try {
    if (!import_fs.default.existsSync(dir)) return null;
    const base = import_path.default.basename(candidatePath);
    const ext = import_path.default.extname(base).toLowerCase();
    const baseNoExt = import_path.default.basename(base, ext);
    const entries = import_fs.default.readdirSync(dir);
    for (const entry of entries) {
      if (entry.normalize("NFC") === base.normalize("NFC") || entry.normalize("NFD") === base.normalize("NFD")) {
        const full = import_path.default.join(dir, entry);
        const s = import_fs.default.statSync(full);
        if (s.isFile() && s.size > 0) return full;
      }
    }
    const cleanPattern = baseNoExt.replace(/[\uFFFD?]/g, "").trim();
    if (cleanPattern.length >= 3) {
      for (const entry of entries) {
        const entryExt = import_path.default.extname(entry).toLowerCase();
        if (ext && entryExt !== ext) continue;
        const entryNoExt = import_path.default.basename(entry, entryExt);
        if (entryNoExt.includes(cleanPattern) || cleanPattern.includes(entryNoExt)) {
          const full = import_path.default.join(dir, entry);
          const s = import_fs.default.statSync(full);
          if (s.isFile() && s.size > 0) return full;
        }
      }
    }
    if (minMtimeMs) {
      const validExts = /* @__PURE__ */ new Set([".mp4", ".mkv", ".webm", ".mp3", ".m4a", ".flac", ".wav", ".opus", ".zip"]);
      const candidates = entries.map((e) => import_path.default.join(dir, e)).filter((full) => {
        try {
          const s = import_fs.default.statSync(full);
          const fileExt = import_path.default.extname(full).toLowerCase();
          const extOk = ext ? fileExt === ext : validExts.has(fileExt);
          return s.isFile() && s.size > 0 && extOk && s.mtimeMs >= minMtimeMs - 5e3;
        } catch {
          return false;
        }
      }).sort((a, b) => import_fs.default.statSync(b).mtimeMs - import_fs.default.statSync(a).mtimeMs);
      if (candidates.length > 0) {
        return candidates[0];
      }
    }
  } catch {
  }
  return null;
}

// src/lib/providers/ytdlp.ts
var SUPPORTED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "instagr.am",
  "facebook.com",
  "fb.watch",
  "fb.com",
  "m.facebook.com",
  "web.facebook.com",
  "watch.facebook.com"
];
function resolveFfmpegLocation(configuredPath) {
  if (configuredPath && configuredPath !== "ffmpeg") {
    try {
      let resolved = configuredPath.trim();
      if (resolved.startsWith("~/") || resolved.startsWith("~\\")) {
        resolved = import_path2.default.join(import_os2.default.homedir(), resolved.slice(2));
      } else {
        resolved = import_path2.default.resolve(resolved);
      }
      if (import_fs2.default.existsSync(resolved)) {
        return import_fs2.default.statSync(resolved).isDirectory() ? resolved : import_path2.default.dirname(resolved);
      }
    } catch {
    }
  }
  try {
    if (process.platform === "win32") {
      const out = (0, import_child_process.execSync)("where.exe ffmpeg", { stdio: ["ignore", "pipe", "pipe"] }).toString().split("\r\n")[0].trim();
      if (out && import_fs2.default.existsSync(out)) return import_path2.default.dirname(out);
    } else {
      const out = (0, import_child_process.execSync)("which ffmpeg", { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
      if (out && import_fs2.default.existsSync(out)) return import_path2.default.dirname(out);
    }
  } catch {
  }
  return void 0;
}
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    try {
      const binary = process.env.YTDLP_PATH || "yt-dlp";
      const proc = (0, import_child_process.spawn)(binary, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        }
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const errorMsg = stderr || `yt-dlp exited with code ${code}`;
          reject(new Error(errorMsg));
        }
      });
      proc.on("error", (err) => {
        reject(new Error(`Failed to start yt-dlp: ${err.message}. Is yt-dlp installed and on PATH?`));
      });
    } catch (err) {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}. Is yt-dlp installed and on PATH?`));
    }
  });
}
var YtDlpProvider = class extends BaseProvider {
  constructor() {
    super(...arguments);
    this.name = "yt-dlp";
    this.capabilities = {
      supportsAudioOnly: true,
      supportsVideoFormats: true,
      supportsPause: false,
      supportsMetadata: true
    };
  }
  canHandle(url) {
    return urlMatchesDomains(url, SUPPORTED_DOMAINS);
  }
  async fetchMetadata(url) {
    providerLogger.info({ url }, "Fetching yt-dlp metadata");
    let json = "";
    try {
      json = await runYtDlp([
        "--dump-single-json",
        "--no-playlist",
        "--no-warnings",
        "--encoding",
        "utf-8",
        ...process.platform === "win32" ? ["--windows-filenames"] : [],
        url
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(this.sanitizeErrorMessage(msg));
    }
    let info;
    try {
      info = JSON.parse(json);
    } catch {
      throw new Error("Failed to parse metadata returned by yt-dlp");
    }
    const rawFormats = [];
    const formatsList = Array.isArray(info.formats) ? info.formats : [];
    const progressiveFormats = formatsList.filter(
      (f) => f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none" && f.ext !== "mhtml"
    );
    const hasVideoDASH = formatsList.some(
      (f) => f.vcodec && f.vcodec !== "none" && (!f.acodec || f.acodec === "none")
    );
    const hasAudioDASH = formatsList.some(
      (f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none"
    );
    if (progressiveFormats.length > 0) {
      const sortedProgressive = [...progressiveFormats].sort(
        (a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0)
      );
      const seenResolutions = /* @__PURE__ */ new Set();
      for (const f of sortedProgressive) {
        const height = f.height || 0;
        const res = height ? `${height}p` : f.resolution || "Standard";
        if (seenResolutions.has(res)) continue;
        seenResolutions.add(res);
        rawFormats.push({
          id: String(f.format_id),
          label: `${res} (${String(f.ext || "mp4").toUpperCase()}) \u2014 Progressive`,
          ext: String(f.ext || "mp4"),
          resolution: res,
          fps: typeof f.fps === "number" ? f.fps : void 0,
          vcodec: typeof f.vcodec === "string" ? f.vcodec : void 0,
          acodec: typeof f.acodec === "string" ? f.acodec : void 0,
          filesize: typeof f.filesize === "number" ? f.filesize : typeof f.filesize_approx === "number" ? f.filesize_approx : void 0,
          tbr: typeof f.tbr === "number" ? f.tbr : void 0,
          isAudioOnly: false,
          note: "Direct single stream (no merge needed)"
        });
      }
    }
    if (hasVideoDASH && hasAudioDASH) {
      rawFormats.push({
        id: "bestvideo+bestaudio/best",
        label: "Best Quality Video (Merged MP4)",
        ext: "mp4",
        isAudioOnly: false,
        note: "High definition video + audio (FFmpeg merge)"
      });
      const has1080p = formatsList.some((f) => (f.height || 0) >= 1080);
      if (has1080p) {
        rawFormats.push({
          id: "bestvideo[height<=1080]+bestaudio/best",
          label: "1080p Full HD (Merged MP4)",
          ext: "mp4",
          resolution: "1080p",
          isAudioOnly: false,
          note: "1080p max resolution (FFmpeg merge)"
        });
      }
    }
    const audioStreams = formatsList.filter(
      (f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none"
    );
    const bestAudio = audioStreams.sort(
      (a, b) => (b.abr || 0) - (a.abr || 0)
    )[0];
    rawFormats.push({
      id: "bestaudio/best",
      label: "Audio Only (MP3)",
      ext: "mp3",
      isAudioOnly: true,
      filesize: bestAudio && (bestAudio.filesize || bestAudio.filesize_approx) ? bestAudio.filesize || bestAudio.filesize_approx : void 0,
      note: bestAudio?.abr ? `~${Math.round(bestAudio.abr)} kbps MP3 extraction` : "High quality MP3 audio"
    });
    if (progressiveFormats.length === 0 && rawFormats.length > 0 && !rawFormats[0].id.includes("bestvideo")) {
      const bestMergedIdx = rawFormats.findIndex((f) => f.id === "bestvideo+bestaudio/best");
      if (bestMergedIdx > -1) {
        const [bestMerged] = rawFormats.splice(bestMergedIdx, 1);
        rawFormats.unshift(bestMerged);
      }
    }
    return {
      url,
      provider: this.name,
      title: info.title || "Media Download",
      author: info.uploader || info.channel || info.creator || void 0,
      thumbnail: info.thumbnail || void 0,
      duration: typeof info.duration === "number" ? info.duration : void 0,
      description: typeof info.description === "string" ? info.description : void 0,
      formats: rawFormats
    };
  }
  async download(jobId, url, formatId, outputDir, ffmpegPath, onProgress, onLog) {
    return new Promise((resolve, reject) => {
      const binary = process.env.YTDLP_PATH || "yt-dlp";
      const resolvedDir = import_path2.default.resolve(outputDir);
      import_fs2.default.mkdirSync(resolvedDir, { recursive: true });
      const outputTemplate = import_path2.default.join(resolvedDir, "%(title)s.%(ext)s");
      const isAudioExtraction = formatId === "bestaudio/best" || formatId.startsWith("bestaudio");
      const isProgressive = !formatId.includes("+") && !isAudioExtraction;
      const ffmpegLocation = resolveFfmpegLocation(ffmpegPath);
      let effectiveFormatId = formatId;
      if (!ffmpegLocation) {
        if (isAudioExtraction) {
          onLog("[MediaVault yt-dlp] Note: FFmpeg not detected in PATH or configuration. Extraction may rely on internal decoders.\n");
        } else if (!isProgressive) {
          onLog("[MediaVault yt-dlp] Notice: FFmpeg not found for stream merging. Falling back to best progressive format to ensure successful download.\n");
          effectiveFormatId = "best[ext=mp4]/best";
        }
      }
      const args = [
        "--format",
        effectiveFormatId,
        "--output",
        outputTemplate,
        "--no-playlist",
        "--progress",
        "--newline",
        "--no-warnings",
        "--encoding",
        "utf-8",
        ...process.platform === "win32" ? ["--windows-filenames"] : [],
        "--trim-filenames",
        "200",
        "--print",
        "after_move:filepath",
        "--print",
        "filename",
        "--print",
        "filepath"
      ];
      if (ffmpegLocation) {
        args.push("--ffmpeg-location", ffmpegLocation);
      }
      if (isAudioExtraction) {
        args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
      } else if (!isProgressive && ffmpegLocation) {
        args.push("--merge-output-format", "mp4");
      }
      args.push(url);
      providerLogger.info({ jobId, formatId: effectiveFormatId, url, resolvedDir, outputTemplate, ffmpegLocation }, "Starting yt-dlp download");
      onLog(`[MediaVault yt-dlp] Spawning: ${binary} ${args.join(" ")}
`);
      const downloadStartTime = Date.now();
      let proc;
      try {
        proc = (0, import_child_process.spawn)(binary, args, {
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            PYTHONUTF8: "1",
            PYTHONIOENCODING: "utf-8",
            ...ffmpegLocation ? { PATH: `${ffmpegLocation}${import_path2.default.delimiter}${process.env.PATH || ""}` } : {}
          }
        });
      } catch (spawnErr) {
        delete global[`__mv_proc_${jobId}`];
        const msg = `Failed to spawn yt-dlp process: ${spawnErr.message}. Ensure yt-dlp is installed.`;
        providerLogger.error({ jobId, err: spawnErr }, msg);
        reject(new Error(msg));
        return;
      }
      global[`__mv_proc_${jobId}`] = proc;
      let stderrBuffer = "";
      let maxProgressSeen = 0;
      let streamPass = 0;
      const rawPrintedPaths = [];
      onProgress(0, "", "", "preparing");
      proc.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        onLog(text);
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("[download] Destination:") && maxProgressSeen >= 70) {
            streamPass++;
          }
          const parsed = this.parseProgressLine(trimmed);
          if (parsed.progress !== void 0) {
            let overallPct = parsed.progress;
            let currentPhase = "downloading_video";
            if (isProgressive) {
              overallPct = Math.min(99, Math.round(parsed.progress));
              currentPhase = "downloading_video";
            } else if (isAudioExtraction) {
              overallPct = Math.min(88, Math.round(parsed.progress * 0.88));
              currentPhase = "downloading_audio";
            } else {
              if (streamPass === 0) {
                overallPct = Math.min(75, Math.round(parsed.progress * 0.75));
                currentPhase = "downloading_video";
              } else {
                overallPct = Math.min(92, Math.round(75 + parsed.progress * 0.17));
                currentPhase = "downloading_audio";
              }
            }
            if (overallPct > maxProgressSeen) {
              maxProgressSeen = overallPct;
            }
            onProgress(maxProgressSeen, parsed.speed || "", parsed.eta || "", currentPhase);
          } else if (parsed.phase) {
            if (parsed.phase === "merging") {
              maxProgressSeen = Math.max(maxProgressSeen, 93);
              onProgress(maxProgressSeen, "Merging with FFmpeg", "", "merging");
            } else if (parsed.phase === "finalizing") {
              maxProgressSeen = Math.max(maxProgressSeen, 97);
              onProgress(maxProgressSeen, parsed.speed || "Finalizing", "", "finalizing");
            }
          }
          if (!trimmed.startsWith("[") && (trimmed.includes(import_path2.default.sep) || trimmed.includes("/"))) {
            rawPrintedPaths.push(trimmed);
          }
        }
      });
      proc.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        stderrBuffer += text;
        onLog(text);
      });
      proc.on("close", (code) => {
        delete global[`__mv_proc_${jobId}`];
        const normalizedCandidates = Array.from(
          new Set(
            rawPrintedPaths.map((p) => p.trim().replace(/^["']|["']$/g, "")).filter(Boolean).map((p) => import_path2.default.resolve(p))
          )
        );
        providerLogger.info(
          { jobId, exitCode: code, printedCount: normalizedCandidates.length, normalizedCandidates },
          "yt-dlp process closed"
        );
        if (code === 0 || code === null) {
          let finalPath = "";
          for (let i = normalizedCandidates.length - 1; i >= 0; i--) {
            const candidate = normalizedCandidates[i];
            const verified = verifyFileExists(candidate) || findMatchingFileInDir(resolvedDir, candidate, downloadStartTime);
            if (verified) {
              finalPath = verified;
              break;
            }
          }
          if (!finalPath) {
            finalPath = findMatchingFileInDir(resolvedDir, outputTemplate, downloadStartTime) || "";
          }
          if (finalPath) {
            const stat = import_fs2.default.statSync(finalPath);
            onLog(`[MediaVault yt-dlp] Verified final media file: ${finalPath} (${stat.size} bytes)
`);
            try {
              const fileDir = import_path2.default.dirname(finalPath);
              const fileBase = import_path2.default.basename(finalPath, import_path2.default.extname(finalPath));
              const tempExtensions = [".part", ".ytdl", ".temp", ".tmp"];
              const dirEntries = import_fs2.default.readdirSync(fileDir);
              for (const entry of dirEntries) {
                if (entry.startsWith(fileBase) && tempExtensions.some((ext) => entry.endsWith(ext))) {
                  const tempFilePath = import_path2.default.join(fileDir, entry);
                  try {
                    import_fs2.default.unlinkSync(tempFilePath);
                    onLog(`[MediaVault yt-dlp] Cleaned temporary artifact: ${entry}
`);
                  } catch {
                  }
                }
              }
            } catch {
            }
            resolve(finalPath);
          } else {
            const errDetails = `Download process finished with exit code 0, but the output file could not be verified on disk.
Resolved Directory: ${resolvedDir}
Printed Paths: [${normalizedCandidates.join(", ")}]
Working Directory: ${process.cwd()}`;
            providerLogger.error({ jobId, errDetails }, "Output verification failed");
            reject(new Error(errDetails));
          }
        } else {
          const errorMsg = this.sanitizeErrorMessage(stderrBuffer || `yt-dlp process failed with exit code ${code}`);
          providerLogger.error({ jobId, exitCode: code, errorMsg }, "yt-dlp execution error");
          reject(new Error(errorMsg));
        }
      });
      proc.on("error", (err) => {
        delete global[`__mv_proc_${jobId}`];
        providerLogger.error({ jobId, err }, "yt-dlp child process emitted error");
        reject(new Error(`Failed to execute yt-dlp: ${err.message}. Ensure yt-dlp is installed and executable.`));
      });
    });
  }
};

// src/lib/providers/spotdl.ts
var import_child_process2 = require("child_process");
var import_path3 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));
var SUPPORTED_DOMAINS2 = ["open.spotify.com", "spotify.com"];
var SPOTIFY_FORMATS = [
  {
    id: "mp3-320",
    label: "MP3 \u2014 320 kbps (High Quality)",
    ext: "mp3",
    isAudioOnly: true,
    note: "Best audio fidelity"
  },
  {
    id: "mp3-128",
    label: "MP3 \u2014 128 kbps (Standard)",
    ext: "mp3",
    isAudioOnly: true,
    note: "Smaller file size"
  },
  {
    id: "flac",
    label: "FLAC (Lossless)",
    ext: "flac",
    isAudioOnly: true,
    note: "Lossless audio"
  }
];
var SpotdlProvider = class extends BaseProvider {
  constructor() {
    super(...arguments);
    this.name = "spotdl";
    this.capabilities = {
      supportsAudioOnly: true,
      supportsVideoFormats: false,
      supportsPause: false,
      supportsMetadata: true
    };
  }
  canHandle(url) {
    return urlMatchesDomains(url, SUPPORTED_DOMAINS2);
  }
  async fetchMetadata(url) {
    providerLogger.info({ url }, "Fetching spotdl metadata");
    let type = "Track";
    if (url.includes("/album/")) type = "Album";
    else if (url.includes("/playlist/")) type = "Playlist";
    else if (url.includes("/artist/")) type = "Artist";
    const metadata = {
      url,
      provider: this.name,
      title: `Spotify ${type}`,
      formats: SPOTIFY_FORMATS
    };
    try {
      const binary = process.env.SPOTDL_PATH || "spotdl";
      const info = await new Promise((resolve) => {
        try {
          const proc = (0, import_child_process2.spawn)(binary, ["save", url, "--save-file", "-"], {
            stdio: ["ignore", "pipe", "pipe"],
            env: {
              ...process.env,
              PYTHONUTF8: "1",
              PYTHONIOENCODING: "utf-8"
            }
          });
          let out = "";
          proc.stdout?.on("data", (d) => {
            out += d.toString();
          });
          proc.on("close", () => resolve(out));
          proc.on("error", () => resolve(""));
        } catch {
          resolve("");
        }
      });
      if (info.trim()) {
        const data = JSON.parse(info);
        const songs = Array.isArray(data) ? data : [data];
        if (songs.length > 0) {
          metadata.title = songs.length === 1 ? `${songs[0].name} \u2014 ${songs[0].artist}` : `${songs[0].name || type} (${songs.length} tracks)`;
          metadata.thumbnail = songs[0].cover_url;
          metadata.author = songs[0].artist;
          metadata.duration = songs[0].duration;
        }
      }
    } catch {
    }
    return metadata;
  }
  async download(jobId, url, formatId, outputDir, ffmpegPath, onProgress, onLog) {
    return new Promise((resolve, reject) => {
      const binary = process.env.SPOTDL_PATH || "spotdl";
      const resolvedDir = import_path3.default.resolve(outputDir);
      import_fs3.default.mkdirSync(resolvedDir, { recursive: true });
      let audioFormat = "mp3";
      let bitrate = "320k";
      if (formatId === "mp3-128") {
        audioFormat = "mp3";
        bitrate = "128k";
      } else if (formatId === "flac") {
        audioFormat = "flac";
        bitrate = "flac";
      }
      const args = [
        "download",
        url,
        "--output",
        import_path3.default.join(resolvedDir, "{title} - {artist}.{output-ext}"),
        "--format",
        audioFormat,
        ...audioFormat !== "flac" ? ["--bitrate", bitrate] : [],
        "--print-errors"
      ];
      if (ffmpegPath) {
        args.push("--ffmpeg", ffmpegPath);
      }
      onProgress(0, "", "", "preparing");
      onLog(`[MediaVault SpotDL] Command: ${binary} ${args.join(" ")}
`);
      const ffmpegDir = ffmpegPath && ffmpegPath !== "ffmpeg" && import_fs3.default.existsSync(ffmpegPath) ? import_fs3.default.statSync(ffmpegPath).isDirectory() ? ffmpegPath : import_path3.default.dirname(ffmpegPath) : void 0;
      let proc;
      try {
        proc = (0, import_child_process2.spawn)(binary, args, {
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            PYTHONUTF8: "1",
            PYTHONIOENCODING: "utf-8",
            ...ffmpegDir ? { PATH: `${ffmpegDir}${import_path3.default.delimiter}${process.env.PATH || ""}` } : {}
          }
        });
      } catch (spawnErr) {
        delete global[`__mv_proc_${jobId}`];
        reject(new Error(`Failed to spawn spotdl: ${spawnErr.message}. Ensure spotdl is installed.`));
        return;
      }
      global[`__mv_proc_${jobId}`] = proc;
      let stderrBuffer = "";
      let totalTracks = 1;
      let completedTracks = 0;
      const downloadedFiles = [];
      proc.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        onLog(text);
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const playlistMatch = trimmed.match(/\[(\d+)\/(\d+)\]/);
          if (playlistMatch) {
            const current = parseInt(playlistMatch[1], 10);
            const total = parseInt(playlistMatch[2], 10);
            totalTracks = total;
            const pct = Math.min(99, Math.round(current / total * 100));
            onProgress(pct, `Track ${current} of ${total}`, "", "downloading_audio");
          }
          if (trimmed.includes('Downloaded "')) {
            completedTracks++;
            const pct = totalTracks > 1 ? Math.min(99, Math.round(completedTracks / totalTracks * 100)) : 95;
            onProgress(pct, `Downloaded ${completedTracks}/${totalTracks}`, "", "downloading_audio");
            const fileMatch = trimmed.match(/Downloaded "([^"]+)"/);
            if (fileMatch && fileMatch[1]) {
              const fullCandidate = import_path3.default.isAbsolute(fileMatch[1]) ? fileMatch[1] : import_path3.default.join(resolvedDir, fileMatch[1]);
              downloadedFiles.push(fullCandidate);
            }
          }
        }
      });
      proc.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        stderrBuffer += text;
        onLog(text);
      });
      proc.on("close", (code) => {
        delete global[`__mv_proc_${jobId}`];
        if (code === 0 || code === null) {
          let finalFile = "";
          for (const file of downloadedFiles) {
            const verified = verifyFileExists(file);
            if (verified) {
              finalFile = verified;
              break;
            }
          }
          if (finalFile) {
            onProgress(100, "", "", "completed");
            resolve(finalFile);
            return;
          }
          try {
            const entries = import_fs3.default.readdirSync(resolvedDir);
            const mediaFiles = entries.map((e) => import_path3.default.join(resolvedDir, e)).filter((p) => {
              try {
                const s = import_fs3.default.statSync(p);
                return s.isFile() && s.size > 0 && (p.endsWith(".mp3") || p.endsWith(".flac") || p.endsWith(".ogg"));
              } catch {
                return false;
              }
            }).sort((a, b) => import_fs3.default.statSync(b).mtimeMs - import_fs3.default.statSync(a).mtimeMs);
            if (mediaFiles.length > 0) {
              onProgress(100, "", "", "completed");
              resolve(mediaFiles[0]);
              return;
            }
          } catch {
          }
          reject(new Error("SpotDL completed but the downloaded media file could not be verified."));
        } else {
          const errorMsg = this.sanitizeErrorMessage(stderrBuffer || `spotdl process exited with code ${code}`);
          reject(new Error(errorMsg));
        }
      });
      proc.on("error", (err) => {
        delete global[`__mv_proc_${jobId}`];
        reject(new Error(`Failed to spawn spotdl: ${err.message}. Is spotdl installed?`));
      });
    });
  }
};

// src/lib/providers/direct.ts
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_promises = require("stream/promises");
var import_stream = require("stream");

// src/lib/utils/format.ts
function formatBytes(bytes) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// src/lib/providers/direct.ts
var DIRECT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".mp3",
  ".mp4",
  ".m4a",
  ".webm",
  ".wav",
  ".ogg",
  ".flac",
  ".mov",
  ".mkv",
  ".aac",
  ".opus",
  ".m4v"
]);
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".opus"
]);
var DirectMediaProvider = class extends BaseProvider {
  constructor() {
    super(...arguments);
    this.name = "direct";
    this.capabilities = {
      supportsAudioOnly: true,
      supportsVideoFormats: true,
      supportsPause: false,
      supportsMetadata: true
    };
  }
  canHandle(url) {
    if (!/^https?:\/\//i.test(url)) return false;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      const ext = import_path4.default.extname(pathname);
      if (DIRECT_EXTENSIONS.has(ext)) return true;
      return false;
    } catch {
      return false;
    }
  }
  extractFilenameFromHeaders(contentDisposition, url) {
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          return decodeURIComponent(utf8Match[1].trim());
        } catch {
        }
      }
      const regularMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (regularMatch && regularMatch[1]) {
        return regularMatch[1].trim();
      }
    }
    try {
      const parsed = new URL(url);
      const basename = import_path4.default.basename(parsed.pathname);
      if (basename && basename.includes(".")) {
        return decodeURIComponent(basename);
      }
    } catch {
    }
    return "direct_media_download";
  }
  async fetchMetadata(url) {
    providerLogger.info({ url }, "Fetching direct media metadata");
    let contentType = "";
    let contentLength = 0;
    let filename = "";
    try {
      let res = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": "MediaVault/1.0 (Direct Downloader)"
        }
      });
      if (!res.ok || res.status === 405) {
        res = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "MediaVault/1.0 (Direct Downloader)",
            Range: "bytes=0-0"
          }
        });
      }
      contentType = res.headers.get("content-type") || "";
      const cl = res.headers.get("content-length") || res.headers.get("content-range")?.split("/")[1] || "0";
      contentLength = parseInt(cl, 10) || 0;
      filename = this.extractFilenameFromHeaders(res.headers.get("content-disposition"), url);
    } catch (err) {
      providerLogger.warn({ url, err }, "Failed to probe HEAD, using URL path fallback");
      filename = this.extractFilenameFromHeaders(null, url);
    }
    let ext = import_path4.default.extname(filename).toLowerCase().replace(/^\./, "");
    if (!ext) {
      if (contentType.includes("audio/mpeg") || contentType.includes("audio/mp3")) ext = "mp3";
      else if (contentType.includes("video/mp4")) ext = "mp4";
      else if (contentType.includes("audio/mp4") || contentType.includes("audio/x-m4a")) ext = "m4a";
      else if (contentType.includes("video/webm")) ext = "webm";
      else if (contentType.includes("audio/ogg")) ext = "ogg";
      else if (contentType.includes("audio/wav")) ext = "wav";
      else if (contentType.includes("audio/flac")) ext = "flac";
      else ext = "mp4";
    }
    const isAudioOnly = AUDIO_EXTENSIONS.has(`.${ext}`) || contentType.startsWith("audio/");
    const cleanTitle = import_path4.default.basename(filename, import_path4.default.extname(filename)) || "Direct Media";
    const formats = [
      {
        id: "direct-original",
        label: `${ext.toUpperCase()} (${isAudioOnly ? "Audio" : "Video"}) \u2014 Direct Stream`,
        ext,
        filesize: contentLength > 0 ? contentLength : void 0,
        isAudioOnly,
        note: contentLength > 0 ? formatBytes(contentLength) : "Direct HTTP Stream"
      }
    ];
    return {
      url,
      provider: this.name,
      title: cleanTitle,
      formats
    };
  }
  async download(jobId, url, _formatId, outputDir, _ffmpegPath, onProgress, onLog) {
    const resolvedDir = import_path4.default.resolve(outputDir);
    await import_fs4.default.promises.mkdir(resolvedDir, { recursive: true });
    onProgress(0, "", "", "preparing");
    onLog(`[MediaVault Direct] Starting direct HTTP download for Job: ${jobId}
`);
    onLog(`[MediaVault Direct] URL: ${url}
`);
    onLog(`[MediaVault Direct] Output Directory: ${resolvedDir}
`);
    const abortController = new AbortController();
    global[`__mv_abort_${jobId}`] = abortController;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "MediaVault/1.0 (Direct Downloader)"
        },
        signal: abortController.signal
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const contentLengthHeader = res.headers.get("content-length");
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const contentDisposition = res.headers.get("content-disposition");
      const rawFilename = this.extractFilenameFromHeaders(contentDisposition, url);
      const safeFilename = sanitizeFilename(rawFilename);
      const desiredPath = import_path4.default.join(resolvedDir, safeFilename);
      const targetPath = getUniqueOutputPath(desiredPath, "rename");
      const tempPath = `${targetPath}.${jobId}.mvtmp`;
      onLog(`[MediaVault Direct] Target output file: ${targetPath}
`);
      onLog(`[MediaVault Direct] Total file size: ${totalBytes > 0 ? formatBytes(totalBytes) : "Unknown"}
`);
      onProgress(0, "Starting download...", "", "downloading");
      if (!res.body) {
        throw new Error("Response body is empty");
      }
      let downloadedBytes = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let speedStr = "";
      let etaStr = "";
      const nodeReadable = import_stream.Readable.fromWeb(res.body);
      nodeReadable.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        const deltaMs = now - lastTime;
        if (deltaMs >= 300) {
          const deltaBytes = downloadedBytes - lastBytes;
          const bytesPerSec = deltaBytes / deltaMs * 1e3;
          speedStr = `${formatBytes(bytesPerSec)}/s`;
          if (totalBytes > 0) {
            const remainingBytes = totalBytes - downloadedBytes;
            const remainingSec = bytesPerSec > 0 ? Math.round(remainingBytes / bytesPerSec) : 0;
            const etaMin = Math.floor(remainingSec / 60);
            const etaSec = remainingSec % 60;
            etaStr = `${String(etaMin).padStart(2, "0")}:${String(etaSec).padStart(2, "0")}`;
            const pct = Math.min(99, Math.round(downloadedBytes / totalBytes * 100));
            onProgress(pct, speedStr, etaStr, "downloading");
          } else {
            onProgress(-1, speedStr, "", "downloading");
          }
          lastTime = now;
          lastBytes = downloadedBytes;
        }
      });
      const writeStream = import_fs4.default.createWriteStream(tempPath);
      await (0, import_promises.pipeline)(nodeReadable, writeStream);
      onProgress(99, speedStr, "Finalizing...", "finalizing");
      onLog(`[MediaVault Direct] Download complete, moving temp file to: ${targetPath}
`);
      await import_fs4.default.promises.rename(tempPath, targetPath);
      const stat = await import_fs4.default.promises.stat(targetPath);
      if (!stat.isFile() || stat.size === 0) {
        throw new Error(`Direct download verification failed. Target file is invalid or empty: ${targetPath}`);
      }
      onProgress(100, "", "", "completed");
      onLog(`[MediaVault Direct] Verified final file: ${targetPath} (${formatBytes(stat.size)})
`);
      return targetPath;
    } finally {
      delete global[`__mv_abort_${jobId}`];
    }
  }
};

// src/lib/providers/registry.ts
var providers = [
  new SpotdlProvider(),
  // 1. Spotify
  new DirectMediaProvider(),
  // 2. Direct Media (.mp3, .mp4, etc.)
  new YtDlpProvider()
  // 3. YouTube, Instagram, Facebook
];
function getProvider(url) {
  if (!isValidUrl(url)) return null;
  return providers.find((p) => p.canHandle(url)) ?? null;
}
function getProviderByName(name) {
  return providers.find((p) => p.name === name) ?? null;
}

// src/lib/queue/download-queue.ts
var import_events = __toESM(require("events"));
var import_fs6 = __toESM(require("fs"));
var import_path7 = __toESM(require("path"));
var import_child_process3 = require("child_process");

// src/lib/db.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_path5 = __toESM(require("path"));
var import_os3 = __toESM(require("os"));
var import_fs5 = __toESM(require("fs"));
function resolveDataDir() {
  const custom = process.env.MEDIAVAULT_DATA_DIR?.trim();
  if (custom) {
    if (custom.startsWith("~/") || custom.startsWith("~\\")) {
      return import_path5.default.join(import_os3.default.homedir(), custom.slice(2));
    }
    if (custom === "~") return import_os3.default.homedir();
    return import_path5.default.resolve(custom);
  }
  return import_path5.default.join(import_os3.default.homedir(), ".mediavault");
}
var g = globalThis;
function getDb() {
  if (g.__mv_db) return g.__mv_db;
  const dbDir = resolveDataDir();
  const dbPath = import_path5.default.join(dbDir, "mediavault.db");
  try {
    if (!import_fs5.default.existsSync(dbDir)) {
      import_fs5.default.mkdirSync(dbDir, { recursive: true });
    }
  } catch (err) {
    console.error(`[MediaVault] Warning: Failed to create data directory at '${dbDir}':`, err);
  }
  let db;
  try {
    db = new import_better_sqlite3.default(dbPath);
  } catch (err) {
    console.error(`[MediaVault] Error opening SQLite database at '${dbPath}':`, err);
    throw new Error(`Failed to initialize SQLite database at '${dbPath}': ${err.message}`);
  }
  if (!g.__mv_db_initialized) {
    console.log("[MediaVault] Database initialization");
    console.log("[MediaVault] Executing PRAGMA statements (WAL, NORMAL, foreign_keys)");
    try {
      db.pragma("journal_mode = WAL");
    } catch (e) {
      console.warn("[MediaVault] Warning: WAL journal mode failed, falling back to DELETE mode:", e);
      try {
        db.pragma("journal_mode = DELETE");
      } catch {
      }
    }
    try {
      db.pragma("synchronous = NORMAL");
    } catch {
    }
    try {
      db.pragma("foreign_keys = ON");
    } catch {
    }
    try {
      runMigrations(db);
    } catch (migErr) {
      console.error("[MediaVault] Migration error:", migErr);
    }
    g.__mv_db_initialized = true;
  }
  g.__mv_db = db;
  return db;
}
function runMigrations(db) {
  console.log("[MediaVault] CREATE TABLE IF NOT EXISTS jobs & settings");
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id           TEXT    PRIMARY KEY,
      url          TEXT    NOT NULL,
      provider     TEXT    NOT NULL,
      title        TEXT    NOT NULL DEFAULT '',
      author       TEXT,
      thumbnail    TEXT,
      duration     INTEGER,
      format_id    TEXT    NOT NULL,
      format_label TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'queued',
      progress     REAL    NOT NULL DEFAULT 0,
      speed        TEXT,
      eta          TEXT,
      error        TEXT,
      log          TEXT,
      output_path  TEXT,
      file_size    INTEGER,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  console.log("[MediaVault] CREATE INDEX IF NOT EXISTS completed");
  const existingCols = db.prepare("PRAGMA table_info(jobs)").all();
  const colNames = new Set(existingCols.map((c) => c.name));
  const newCols = [
    ["phase", "TEXT DEFAULT 'queued'"],
    ["downloaded_bytes", "INTEGER DEFAULT 0"],
    ["avg_speed", "TEXT"],
    ["peak_speed", "TEXT"],
    ["download_duration", "REAL"],
    ["merge_duration", "REAL"],
    ["completed_at", "INTEGER"],
    ["retry_count", "INTEGER DEFAULT 0"]
  ];
  for (const [name, type] of newCols) {
    if (!colNames.has(name)) {
      try {
        db.exec(`ALTER TABLE jobs ADD COLUMN ${name} ${type}`);
      } catch {
      }
    }
  }
  console.log("[MediaVault] Crash recovery: UPDATE jobs SET status = failed");
  const crashResult = db.prepare(
    `UPDATE jobs
         SET status = 'failed',
             error  = 'Server restarted while download was in progress',
             updated_at = ?
       WHERE status IN ('active', 'pausing', 'retrying')`
  ).run(Date.now());
  if (crashResult.changes > 0) {
    console.log(`[MediaVault] Crash recovery: marked ${crashResult.changes} interrupted job(s) as failed`);
  }
  console.log("[MediaVault] Database initialization complete");
}

// src/types/settings.ts
var DEFAULT_SETTINGS = {
  downloadDir: "",
  // resolved at runtime to ~/Downloads/MediaVault
  maxConcurrentDownloads: 3,
  ffmpegPath: "ffmpeg",
  ytdlpPath: "yt-dlp",
  galleryDlPath: "gallery-dl",
  spotdlPath: "spotdl",
  theme: "dark",
  maxHistoryItems: 500,
  autoCleanTempFiles: true,
  duplicateBehavior: "rename",
  resumeDownloads: true,
  autoOpenFolder: false,
  processTimeoutSeconds: 900,
  // 15 minutes
  maxRetryCount: 3
};

// src/lib/storage/settings.ts
var import_os4 = __toESM(require("os"));
var import_path6 = __toESM(require("path"));
function resolveDefaultDownloadDir() {
  const custom = process.env.MEDIA_STORAGE_PATH?.trim();
  if (custom) {
    if (custom.startsWith("~/") || custom.startsWith("~\\")) {
      return import_path6.default.join(import_os4.default.homedir(), custom.slice(2));
    }
    if (custom === "~") return import_os4.default.homedir();
    return import_path6.default.resolve(custom);
  }
  return import_path6.default.join(import_os4.default.homedir(), "Downloads", "MediaVault");
}
function getSettings() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings").all();
    const stored = {};
    for (const row of rows) {
      try {
        stored[row.key] = JSON.parse(row.value);
      } catch {
        stored[row.key] = row.value;
      }
    }
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    if (!settings.downloadDir) {
      settings.downloadDir = resolveDefaultDownloadDir();
    } else if (settings.downloadDir.startsWith("~/") || settings.downloadDir.startsWith("~\\")) {
      settings.downloadDir = import_path6.default.join(import_os4.default.homedir(), settings.downloadDir.slice(2));
    }
    return settings;
  } catch (err) {
    console.warn("[MediaVault] Warning: Failed to load settings from DB, using defaults:", err);
    return {
      ...DEFAULT_SETTINGS,
      downloadDir: resolveDefaultDownloadDir()
    };
  }
}

// src/lib/queue/download-queue.ts
var g2 = globalThis;
if (!g2.__mv_queue_emitter) {
  g2.__mv_queue_emitter = new import_events.default();
  g2.__mv_queue_emitter.setMaxListeners(250);
  g2.__mv_queue_emitter.on("error", (err) => {
    downloadLogger.error({ err }, "Unhandled queueEmitter error");
  });
}
if (!g2.__mv_active_jobs) {
  g2.__mv_active_jobs = /* @__PURE__ */ new Map();
}
var queueEmitter = g2.__mv_queue_emitter;
var activeJobs = g2.__mv_active_jobs;
function dbToJob(row) {
  return {
    id: row.id,
    url: row.url,
    provider: row.provider,
    title: row.title || "",
    author: row.author,
    thumbnail: row.thumbnail,
    duration: row.duration,
    formatId: row.format_id,
    formatLabel: row.format_label,
    status: row.status,
    phase: row.phase || row.status || "queued",
    progress: typeof row.progress === "number" ? row.progress : 0,
    speed: row.speed,
    eta: row.eta,
    error: row.error,
    log: row.log,
    outputPath: row.output_path,
    fileSize: row.file_size,
    downloadedBytes: row.downloaded_bytes,
    avgSpeed: row.avg_speed,
    peakSpeed: row.peak_speed,
    downloadDuration: row.download_duration,
    mergeDuration: row.merge_duration,
    completedAt: row.completed_at,
    retryCount: row.retry_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function updateJobInDb(jobId, payload) {
  try {
    const db = getDb();
    const now = Date.now();
    const fields = [];
    const values = [];
    if (payload.status !== void 0) {
      fields.push("status = ?");
      values.push(payload.status);
    }
    if (payload.phase !== void 0) {
      fields.push("phase = ?");
      values.push(payload.phase);
    }
    if (payload.progress !== void 0) {
      fields.push("progress = ?");
      values.push(payload.progress);
    }
    if (payload.speed !== void 0) {
      fields.push("speed = ?");
      values.push(payload.speed);
    }
    if (payload.eta !== void 0) {
      fields.push("eta = ?");
      values.push(payload.eta);
    }
    if (payload.error !== void 0) {
      fields.push("error = ?");
      values.push(payload.error);
    }
    if (payload.log !== void 0) {
      fields.push("log = ?");
      values.push(payload.log);
    }
    if (payload.outputPath !== void 0) {
      fields.push("output_path = ?");
      values.push(payload.outputPath);
    }
    if (payload.fileSize !== void 0) {
      fields.push("file_size = ?");
      values.push(payload.fileSize);
    }
    if (payload.downloadedBytes !== void 0) {
      fields.push("downloaded_bytes = ?");
      values.push(payload.downloadedBytes);
    }
    if (payload.avgSpeed !== void 0) {
      fields.push("avg_speed = ?");
      values.push(payload.avgSpeed);
    }
    if (payload.peakSpeed !== void 0) {
      fields.push("peak_speed = ?");
      values.push(payload.peakSpeed);
    }
    if (payload.downloadDuration !== void 0) {
      fields.push("download_duration = ?");
      values.push(payload.downloadDuration);
    }
    if (payload.mergeDuration !== void 0) {
      fields.push("merge_duration = ?");
      values.push(payload.mergeDuration);
    }
    if (payload.completedAt !== void 0) {
      fields.push("completed_at = ?");
      values.push(payload.completedAt);
    }
    if (payload.retryCount !== void 0) {
      fields.push("retry_count = ?");
      values.push(payload.retryCount);
    }
    fields.push("updated_at = ?");
    values.push(now);
    values.push(jobId);
    db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  } catch (err) {
    downloadLogger.error({ jobId, err }, "Failed to update job in DB");
  }
}
function emitUpdate(jobId, payload) {
  queueEmitter.emit(`job:${jobId}`, payload);
  queueEmitter.emit("queue:updated", { jobId, ...payload });
}
function enqueueJob(params) {
  const db = getDb();
  const now = Date.now();
  const id = generateId();
  db.prepare(`
    INSERT INTO jobs (id, url, provider, title, author, thumbnail, duration,
                      format_id, format_label, status, phase, progress, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'queued', 0, ?, ?)
  `).run(
    id,
    params.url,
    params.provider,
    params.title,
    params.author ?? null,
    params.thumbnail ?? null,
    params.duration ?? null,
    params.formatId,
    params.formatLabel,
    now,
    now
  );
  downloadLogger.info({ id, url: params.url, provider: params.provider }, "Job enqueued");
  processQueue().catch((err) => downloadLogger.error(err, "Queue processor error"));
  return getJob(id);
}
function getJob(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  return row ? dbToJob(row) : null;
}
function listJobs(opts) {
  const db = getDb();
  const { status, limit = 100, offset = 0 } = opts ?? {};
  let query = "SELECT * FROM jobs";
  const params = [];
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    query += ` WHERE status IN (${statuses.map(() => "?").join(", ")})`;
    params.push(...statuses);
  }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const rows = db.prepare(query).all(...params);
  return rows.map(dbToJob);
}
function cancelJob(id) {
  const job = getJob(id);
  if (!job) return false;
  if (job.status === "completed" || job.status === "cancelled") return false;
  const active = activeJobs.get(id);
  if (active?.timeoutTimer) clearTimeout(active.timeoutTimer);
  const abortCtrl = global[`__mv_abort_${id}`];
  if (abortCtrl) {
    try {
      abortCtrl.abort();
    } catch {
    }
    delete global[`__mv_abort_${id}`];
  }
  const globalProc = global[`__mv_proc_${id}`];
  const proc = active?.process || globalProc;
  if (proc && proc.pid) {
    try {
      if (process.platform === "win32") {
        (0, import_child_process3.execSync)(`taskkill /pid ${proc.pid} /f /t`, { stdio: "ignore" });
      } else {
        proc.kill("SIGKILL");
      }
    } catch {
      try {
        proc.kill("SIGTERM");
      } catch {
      }
    }
  }
  activeJobs.delete(id);
  delete global[`__mv_proc_${id}`];
  updateJobInDb(id, { status: "cancelled", phase: "cancelled", updatedAt: Date.now() });
  emitUpdate(id, { status: "cancelled", phase: "cancelled" });
  downloadLogger.info({ id }, "Job cancelled");
  return true;
}
function retryJob(id) {
  const job = getJob(id);
  if (!job) return false;
  if (job.status !== "failed" && job.status !== "cancelled") return false;
  const currentRetry = (job.retryCount || 0) + 1;
  updateJobInDb(id, {
    status: "queued",
    phase: "queued",
    progress: 0,
    error: void 0,
    log: void 0,
    retryCount: currentRetry
  });
  emitUpdate(id, { status: "queued", phase: "queued", progress: 0, retryCount: currentRetry });
  downloadLogger.info({ id, retryCount: currentRetry }, "Job re-queued for retry");
  processQueue().catch((err) => downloadLogger.error(err, "Queue processor error"));
  return true;
}
function deleteJob(id) {
  cancelJob(id);
  const db = getDb();
  const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  return result.changes > 0;
}
function clearHistory() {
  const db = getDb();
  const result = db.prepare("DELETE FROM jobs WHERE status IN ('completed', 'failed', 'cancelled')").run();
  return result.changes;
}
async function processQueue() {
  if (g2.__mv_is_processing) return;
  g2.__mv_is_processing = true;
  try {
    while (true) {
      const settings = getSettings();
      const maxConcurrent = settings.maxConcurrentDownloads || 3;
      if (activeJobs.size >= maxConcurrent) break;
      const db = getDb();
      const nextRow = db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1").get();
      if (!nextRow) break;
      const job = dbToJob(nextRow);
      await startJob(job);
    }
  } finally {
    g2.__mv_is_processing = false;
  }
}
async function startJob(job) {
  const settings = getSettings();
  const provider = getProviderByName(job.provider);
  if (!provider) {
    const errorMsg = `Provider '${job.provider}' not available`;
    updateJobInDb(job.id, { status: "failed", phase: "failed", error: errorMsg });
    emitUpdate(job.id, { status: "failed", phase: "failed", error: errorMsg });
    return;
  }
  let resolvedDownloadDir;
  try {
    resolvedDownloadDir = validateDownloadFolder(settings.downloadDir);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateJobInDb(job.id, { status: "failed", phase: "failed", error: errorMsg });
    emitUpdate(job.id, { status: "failed", phase: "failed", error: errorMsg });
    return;
  }
  if (settings.duplicateBehavior === "skip") {
    const safeTitle = sanitizeFilename(job.title);
    const possibleExts = [".mp4", ".mkv", ".webm", ".mp3", ".m4a", ".flac", ".wav"];
    for (const ext of possibleExts) {
      const checkPath = import_path7.default.join(resolvedDownloadDir, `${safeTitle}${ext}`);
      if (import_fs6.default.existsSync(checkPath)) {
        const errorMsg = `Download skipped: file already exists (${checkPath})`;
        updateJobInDb(job.id, { status: "failed", phase: "failed", error: errorMsg });
        emitUpdate(job.id, { status: "failed", phase: "failed", error: errorMsg });
        return;
      }
    }
  }
  updateJobInDb(job.id, { status: "active", phase: "preparing", progress: 0 });
  emitUpdate(job.id, { status: "active", phase: "preparing", progress: 0 });
  downloadLogger.info({ id: job.id, provider: job.provider, dir: resolvedDownloadDir }, "Starting download job");
  let maxSpeedSeen = "";
  let logBuffer = `[MediaVault Log]
Provider: ${job.provider}
Job ID: ${job.id}
URL: ${job.url}
Format: ${job.formatId}
Directory: ${resolvedDownloadDir}
Started: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  const timeoutMs = (settings.processTimeoutSeconds || 900) * 1e3;
  const timeoutTimer = setTimeout(() => {
    downloadLogger.warn({ jobId: job.id }, "Job process timeout reached");
    cancelJob(job.id);
    const errorMsg = `Download timed out after ${settings.processTimeoutSeconds || 900}s`;
    updateJobInDb(job.id, { status: "failed", phase: "failed", error: errorMsg });
    emitUpdate(job.id, { status: "failed", phase: "failed", error: errorMsg });
  }, timeoutMs);
  activeJobs.set(job.id, { jobId: job.id, process: null, timeoutTimer });
  const downloadStartTime = Date.now();
  let exitCode = 0;
  try {
    const rawOutputPath = await provider.download(
      job.id,
      job.url,
      job.formatId,
      resolvedDownloadDir,
      settings.ffmpegPath,
      (progress, speed, eta, phase) => {
        const p = progress < 0 ? -1 : Math.round(progress);
        const currentPhase = phase || (p >= 92 ? "merging" : "downloading_video");
        if (speed) maxSpeedSeen = speed;
        updateJobInDb(job.id, {
          progress: p < 0 ? 0 : p,
          phase: currentPhase,
          speed,
          eta
        });
        emitUpdate(job.id, {
          progress: p < 0 ? 0 : p,
          phase: currentPhase,
          speed,
          eta
        });
      },
      (line) => {
        logBuffer += line;
      }
    );
    clearTimeout(timeoutTimer);
    if (!rawOutputPath || !import_fs6.default.existsSync(rawOutputPath)) {
      throw new Error(`Download finished but output file could not be verified on disk: '${rawOutputPath}'`);
    }
    const stat = await import_fs6.default.promises.stat(rawOutputPath);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Download produced an invalid or empty file (0 bytes): '${rawOutputPath}'`);
    }
    const fileSize = stat.size;
    const endTime = Date.now();
    const downloadDuration = Math.max(0.1, (endTime - downloadStartTime) / 1e3);
    logBuffer += `
[Execution Summary]
`;
    logBuffer += `Exit Code: 0
`;
    logBuffer += `Duration: ${downloadDuration.toFixed(2)}s
`;
    logBuffer += `Final Output: ${rawOutputPath}
`;
    logBuffer += `Verified File Size: ${formatBytes(fileSize)}
`;
    const avgSpeedStr = fileSize > 0 ? `${formatBytes(Math.round(fileSize / downloadDuration))}/s` : maxSpeedSeen || void 0;
    updateJobInDb(job.id, {
      status: "completed",
      phase: "completed",
      progress: 100,
      outputPath: rawOutputPath,
      fileSize,
      downloadedBytes: fileSize,
      avgSpeed: avgSpeedStr,
      peakSpeed: maxSpeedSeen || avgSpeedStr,
      downloadDuration,
      completedAt: endTime,
      speed: void 0,
      eta: void 0,
      log: logBuffer.slice(-1e4)
    });
    emitUpdate(job.id, {
      status: "completed",
      phase: "completed",
      progress: 100,
      outputPath: rawOutputPath,
      fileSize,
      downloadedBytes: fileSize,
      avgSpeed: avgSpeedStr,
      completedAt: endTime
    });
    downloadLogger.info({ id: job.id, outputPath: rawOutputPath, fileSize }, "Job completed successfully");
  } catch (err) {
    clearTimeout(timeoutTimer);
    exitCode = 1;
    const endTime = Date.now();
    const downloadDuration = Math.max(0.1, (endTime - downloadStartTime) / 1e3);
    const errorMsg = err instanceof Error ? err.message : String(err);
    logBuffer += `
[Execution Summary]
`;
    logBuffer += `Exit Code: ${exitCode}
`;
    logBuffer += `Duration: ${downloadDuration.toFixed(2)}s
`;
    logBuffer += `Error: ${errorMsg}
`;
    updateJobInDb(job.id, {
      status: "failed",
      phase: "failed",
      error: errorMsg,
      log: logBuffer.slice(-12e3)
    });
    emitUpdate(job.id, { status: "failed", phase: "failed", error: errorMsg });
    downloadLogger.error({ id: job.id, error: errorMsg, duration: downloadDuration }, "Job failed");
  } finally {
    const active = activeJobs.get(job.id);
    if (active?.timeoutTimer) clearTimeout(active.timeoutTimer);
    activeJobs.delete(job.id);
    processQueue().catch(() => {
    });
  }
}

// src/lib/utils/health.ts
var import_child_process4 = require("child_process");
var import_fs7 = __toESM(require("fs"));
function checkBinary(binaryPath, args = "--version") {
  try {
    const output = (0, import_child_process4.execSync)(`"${binaryPath}" ${args}`, {
      timeout: 5e3,
      stdio: ["ignore", "pipe", "pipe"]
    }).toString().trim();
    const version = output.split("\n")[0] || "Installed";
    return { available: true, version, path: binaryPath, status: "Installed" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { available: false, path: binaryPath, status: "Missing", error };
  }
}
function checkPython() {
  try {
    const output = (0, import_child_process4.execSync)("python --version", { timeout: 5e3, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    const version = output.replace(/^Python\s*/i, "");
    let warning;
    const parts = version.split(".").map((p) => parseInt(p, 10));
    if (parts[0] === 3 && parts[1] < 11) {
      warning = `Python ${version} is deprecated by yt-dlp. Downloads remain functional, but Python 3.11+ is recommended.`;
    }
    return { available: true, version, status: "Installed", warning };
  } catch {
    return { available: false, status: "Missing", warning: "Python not detected on system PATH" };
  }
}
function getSystemHealth(paths) {
  const settings = getSettings();
  const python = checkPython();
  const ytdlp = checkBinary(paths?.ytdlp || settings.ytdlpPath || process.env.YTDLP_PATH || "yt-dlp", "--version");
  const ffmpeg = checkBinary(paths?.ffmpeg || settings.ffmpegPath || process.env.FFMPEG_PATH || "ffmpeg", "-version");
  const spotdl = checkBinary(paths?.spotdl || settings.spotdlPath || process.env.SPOTDL_PATH || "spotdl", "--version");
  let sqliteStatus = "Connected";
  let sqliteError;
  let sqlitePath;
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    sqlitePath = db.name;
  } catch (err) {
    sqliteStatus = "Error";
    sqliteError = err instanceof Error ? err.message : String(err);
  }
  let downloadDirStatus = "OK";
  let downloadDirError;
  try {
    if (!import_fs7.default.existsSync(settings.downloadDir)) {
      import_fs7.default.mkdirSync(settings.downloadDir, { recursive: true });
    }
    import_fs7.default.accessSync(settings.downloadDir, import_fs7.default.constants.W_OK);
  } catch (err) {
    downloadDirStatus = "Error";
    downloadDirError = err instanceof Error ? err.message : String(err);
  }
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    sqlite: {
      status: sqliteStatus,
      path: sqlitePath,
      error: sqliteError
    },
    downloadDir: {
      path: settings.downloadDir,
      status: downloadDirStatus,
      error: downloadDirError
    },
    binaries: {
      python,
      ytdlp,
      ffmpeg,
      spotdl
    }
  };
}

// src/lib/services/download-service.ts
var import_path8 = __toESM(require("path"));
var import_fs8 = __toESM(require("fs"));
var LocalDownloadService = class {
  constructor() {
    this.isWorker = false;
  }
  async fetchMetadata(url) {
    const provider = getProvider(url);
    if (!provider) {
      throw new Error(
        "Unsupported platform. MediaVault officially supports YouTube, Instagram, Facebook, Spotify, and Direct Media URLs (.mp3, .mp4, etc.)."
      );
    }
    const meta = await provider.fetchMetadata(url);
    return {
      ...meta,
      capabilities: provider.capabilities
    };
  }
  async enqueueDownload(payload) {
    const provider = getProvider(payload.url);
    if (!provider) {
      throw new Error(
        "Unsupported platform. MediaVault officially supports YouTube, Instagram, Facebook, Spotify, and Direct Media URLs."
      );
    }
    const job = enqueueJob({
      url: payload.url,
      provider: provider.name,
      title: payload.title || "Media Download",
      author: payload.author,
      thumbnail: payload.thumbnail,
      duration: payload.duration,
      formatId: payload.formatId,
      formatLabel: payload.formatLabel || payload.formatId
    });
    return { job };
  }
  async getJob(id) {
    const job = getJob(id);
    return job || null;
  }
  async listJobs(options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    return listJobs({
      status,
      limit,
      offset
    });
  }
  async cancelJob(id) {
    const success = cancelJob(id);
    if (!success) {
      throw new Error("Job cannot be cancelled in its current state.");
    }
    const job = getJob(id);
    if (!job) throw new Error("Job not found after cancellation.");
    return job;
  }
  async retryJob(id) {
    const success = retryJob(id);
    if (!success) {
      throw new Error("Job cannot be retried in its current state.");
    }
    const job = getJob(id);
    if (!job) throw new Error("Job not found after retry.");
    return job;
  }
  async deleteJob(id) {
    const success = deleteJob(id);
    if (!success) {
      throw new Error("Job not found or could not be deleted.");
    }
  }
  async clearHistory() {
    clearHistory();
  }
  async getHealth() {
    const settings = getSettings();
    return getSystemHealth({
      ytdlp: settings.ytdlpPath,
      ffmpeg: settings.ffmpegPath,
      spotdl: settings.spotdlPath
    });
  }
  async getFile(id) {
    const job = await this.getJob(id);
    if (!job) {
      throw new Error("Download job not found.");
    }
    if (job.status !== "completed" || !job.outputPath) {
      throw new Error("Media file is not completed or output path is missing.");
    }
    const resolvedPath = import_path8.default.resolve(job.outputPath);
    if (!import_fs8.default.existsSync(resolvedPath)) {
      throw new Error("The downloaded media file could not be found on disk.");
    }
    const stat = import_fs8.default.statSync(resolvedPath);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error("The media file is empty or invalid.");
    }
    const ext = import_path8.default.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      ".mp4": "video/mp4",
      ".m4v": "video/mp4",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".mp3": "audio/mpeg",
      ".m4a": "audio/mp4",
      ".wav": "audio/wav",
      ".flac": "audio/flac",
      ".ogg": "audio/ogg",
      ".opus": "audio/opus"
    };
    return {
      type: "local",
      filePath: resolvedPath,
      fileName: import_path8.default.basename(resolvedPath),
      mimeType: mimeTypes[ext] || "application/octet-stream",
      fileSize: stat.size
    };
  }
};

// src/worker/worker-server.ts
var PORT = parseInt(process.env.PORT || process.env.WORKER_PORT || "4000", 10);
var WORKER_TOKEN = process.env.MEDIAVAULT_WORKER_TOKEN?.trim();
var downloadService = new LocalDownloadService();
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Range"
  });
  res.end(JSON.stringify(data));
}
function verifyAuth(req, res) {
  if (!WORKER_TOKEN) return true;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendJson(res, 401, { error: "Unauthorized: Missing Bearer token" });
    return false;
  }
  const token = authHeader.slice(7).trim();
  if (token !== WORKER_TOKEN) {
    sendJson(res, 401, { error: "Unauthorized: Invalid worker token" });
    return false;
  }
  return true;
}
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error(`Invalid JSON: ${err.message}`));
      }
    });
    req.on("error", reject);
  });
}
var server = import_http.default.createServer(async (req, res) => {
  const parsedUrl = (0, import_url4.parse)(req.url || "", true);
  const pathname = parsedUrl.pathname || "/";
  const method = req.method?.toUpperCase() || "GET";
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Range"
    });
    return res.end();
  }
  if (pathname === "/health" && method === "GET") {
    try {
      const health = await downloadService.getHealth();
      return sendJson(res, 200, {
        status: "ok",
        worker: true,
        uptime: process.uptime(),
        ...health
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }
  if (!verifyAuth(req, res)) return;
  try {
    if (pathname === "/metadata" && method === "POST") {
      const body = await readBody(req);
      if (!body.url) return sendJson(res, 400, { error: "URL is required" });
      const safeCheck = validateSafeUrl(body.url);
      if (!safeCheck.safe) {
        return sendJson(res, 400, { error: safeCheck.reason || "Invalid URL" });
      }
      const meta = await downloadService.fetchMetadata(body.url);
      return sendJson(res, 200, meta);
    }
    if (pathname === "/downloads" && method === "POST") {
      const body = await readBody(req);
      if (!body.url || !body.formatId) {
        return sendJson(res, 400, { error: "url and formatId are required" });
      }
      const safeCheck = validateSafeUrl(body.url);
      if (!safeCheck.safe) {
        return sendJson(res, 400, { error: safeCheck.reason || "Invalid URL" });
      }
      const result = await downloadService.enqueueDownload(body);
      return sendJson(res, 201, result);
    }
    if (pathname === "/downloads" && method === "GET") {
      const status = parsedUrl.query.status;
      const limit = parseInt(parsedUrl.query.limit || "50", 10);
      const offset = parseInt(parsedUrl.query.offset || "0", 10);
      const jobs = await downloadService.listJobs({ status, limit, offset });
      return sendJson(res, 200, { jobs });
    }
    if (pathname === "/downloads/clear" && method === "POST") {
      await downloadService.clearHistory();
      return sendJson(res, 200, { success: true });
    }
    const progressMatch = pathname.match(/^\/downloads\/([^/]+)\/progress$/);
    if (progressMatch && method === "GET") {
      const jobId = progressMatch[1];
      const job = await downloadService.getJob(jobId);
      if (!job) return sendJson(res, 404, { error: "Job not found" });
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      });
      res.write(`data: ${JSON.stringify(job)}

`);
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        return res.end();
      }
      const onUpdate = (payload) => {
        try {
          res.write(`data: ${JSON.stringify(payload)}

`);
          if (payload.status === "completed" || payload.status === "failed" || payload.status === "cancelled") {
            cleanup();
            res.end();
          }
        } catch {
          cleanup();
        }
      };
      const cleanup = () => {
        queueEmitter.off(`job:${jobId}`, onUpdate);
      };
      queueEmitter.on(`job:${jobId}`, onUpdate);
      req.on("close", cleanup);
      return;
    }
    const jobMatch = pathname.match(/^\/downloads\/([^/]+)$/);
    if (jobMatch && method === "GET") {
      const jobId = jobMatch[1];
      const job = await downloadService.getJob(jobId);
      if (!job) return sendJson(res, 404, { error: "Job not found" });
      return sendJson(res, 200, { job });
    }
    const cancelMatch = pathname.match(/^\/downloads\/([^/]+)\/cancel$/);
    if (cancelMatch && method === "POST") {
      const jobId = cancelMatch[1];
      const job = await downloadService.cancelJob(jobId);
      return sendJson(res, 200, { job });
    }
    const retryMatch = pathname.match(/^\/downloads\/([^/]+)\/retry$/);
    if (retryMatch && method === "POST") {
      const jobId = retryMatch[1];
      const job = await downloadService.retryJob(jobId);
      return sendJson(res, 200, { job });
    }
    if (jobMatch && method === "DELETE") {
      const jobId = jobMatch[1];
      await downloadService.deleteJob(jobId);
      return sendJson(res, 200, { success: true });
    }
    const fileMatch = pathname.match(/^\/files\/([^/]+)$/);
    if (fileMatch && method === "GET") {
      const jobId = fileMatch[1];
      const fileInfo = await downloadService.getFile(jobId);
      if (fileInfo.type === "local") {
        const { filePath, fileName, mimeType, fileSize } = fileInfo;
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          if (start >= fileSize || end >= fileSize) {
            res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
            return res.end();
          }
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
            "Access-Control-Allow-Origin": "*"
          });
          return import_fs9.default.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*"
          });
          return import_fs9.default.createReadStream(filePath).pipe(res);
        }
      }
    }
    return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
});
server.on("error", (err) => {
  console.error("[MediaVault Worker] Server HTTP error:", err);
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[MediaVault Worker] Running on http://0.0.0.0:${PORT}`);
  if (WORKER_TOKEN) {
    console.log(`[MediaVault Worker] Authentication enabled (Bearer token required)`);
  } else {
    console.log(`[MediaVault Worker] Running in open mode (No token configured)`);
  }
});
