/* ============================================================
   QR ENCODER  —  byte mode, versions 1-40, ECC levels L/M/Q/H.
   ------------------------------------------------------------
   Written out in full rather than pulled from a CDN so that
   qr-code.html keeps working with no internet — which matters,
   because you may well be making the sign the night before in a
   church hall with no wifi.

   Usage:
     var matrix = QR.encode('https://example.com', 'H');
     matrix[y][x] === true  ->  dark module
     matrix.length          ->  size in modules

   Implements ISO/IEC 18004. Verified by decoding the rendered
   output with OpenCV across every ECC level and a range of URL
   lengths — see test/qr.verify.js.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- Tables (ISO/IEC 18004 annex) ------------------ */

  var ECC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 };
  var FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  /* The spec's minimum quiet zone is 4 modules. Testing against a real
     decoder showed small symbols failing to be *found* at 4 even though
     the data was perfect — the margin, not the encoding, was the limit.
     6 costs a few millimetres of paper and scans far more reliably. */
  var QUIET_ZONE = 6;

  // Error-correction codewords per block, indexed [ecc][version].
  var ECC_CODEWORDS_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
      28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26,
      26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26,
      30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26,
      28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];

  // Number of error-correction blocks, indexed [ecc][version].
  var NUM_ECC_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7,
      8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14,
      16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21,
      20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25,
      25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];


  /* ---------- Galois field arithmetic (GF(256), poly 0x11D) -- */

  function gfMultiply(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }

  function rsDivisor(degree) {
    var result = new Uint8Array(degree);
    result[degree - 1] = 1;
    var root = 1;
    for (var i = 0; i < degree; i++) {
      for (var j = 0; j < degree; j++) {
        result[j] = gfMultiply(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMultiply(root, 0x02);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    var result = new Uint8Array(divisor.length);
    for (var k = 0; k < data.length; k++) {
      var factor = data[k] ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (var i = 0; i < divisor.length; i++) {
        result[i] ^= gfMultiply(divisor[i], factor);
      }
    }
    return result;
  }


  /* ---------- Capacity maths -------------------------------- */

  /** Total data + ECC bits available in the symbol, before function patterns. */
  function numRawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  /** Data codewords available to us once ECC is subtracted. */
  function numDataCodewords(ver, ecc) {
    return Math.floor(numRawDataModules(ver) / 8) -
           ECC_CODEWORDS_PER_BLOCK[ecc][ver] * NUM_ECC_BLOCKS[ecc][ver];
  }

  function alignmentPositions(ver) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = (ver === 32) ? 26
             : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 17 - 7; result.length < numAlign; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  function toUtf8(str) {
    var out = [];
    var encoded = encodeURIComponent(str);
    for (var i = 0; i < encoded.length; i++) {
      if (encoded[i] === '%') {
        out.push(parseInt(encoded.substr(i + 1, 2), 16));
        i += 2;
      } else {
        out.push(encoded.charCodeAt(i));
      }
    }
    return out;
  }


  /* ---------- Symbol construction --------------------------- */

  function QrSymbol(version, eccKey) {
    this.version = version;
    this.ecc = ECC_LEVELS[eccKey];
    this.eccKey = eccKey;
    this.size = version * 4 + 17;

    this.modules = [];
    this.isFunction = [];
    for (var i = 0; i < this.size; i++) {
      this.modules.push(new Array(this.size).fill(false));
      this.isFunction.push(new Array(this.size).fill(false));
    }
  }

  QrSymbol.prototype.setFunctionModule = function (x, y, isDark) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  };

  QrSymbol.prototype.drawFinderPattern = function (x, y) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy));
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  };

  QrSymbol.prototype.drawAlignmentPattern = function (x, y) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  QrSymbol.prototype.drawFormatBits = function (mask) {
    var data = FORMAT_BITS[this.eccKey] << 3 | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10 | rem) ^ 0x5412) & 0x7FFF;

    // Copy 1 (around the top-left finder)
    for (var i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (var i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));

    // Copy 2 (split between the other two finders)
    for (var i = 0; i < 8; i++) {
      this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    }
    for (var i = 8; i < 15; i++) {
      this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    }
    this.setFunctionModule(8, this.size - 8, true);   // always-dark module
  };

  QrSymbol.prototype.drawFunctionPatterns = function () {
    var size = this.size;

    // Timing patterns
    for (var i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    // Finder patterns, with their separators
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);

    // Alignment patterns, skipping the three finder corners
    var pos = alignmentPositions(this.version);
    var n = pos.length;
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) ||
            (i === n - 1 && j === 0)) continue;
        this.drawAlignmentPattern(pos[i], pos[j]);
      }
    }

    this.drawFormatBits(0);   // placeholder; rewritten once the mask is chosen

    // Version information, versions 7 and up
    if (this.version >= 7) {
      var rem = this.version;
      for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = this.version << 12 | rem;
      for (var i = 0; i < 18; i++) {
        var bit = getBit(bits, i);
        var a = size - 11 + i % 3;
        var b = Math.floor(i / 3);
        this.setFunctionModule(a, b, bit);
        this.setFunctionModule(b, a, bit);
      }
    }
  };

  QrSymbol.prototype.drawCodewords = function (data) {
    var size = this.size;
    var i = 0;   // bit index

    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;               // skip the vertical timing column
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  };

  QrSymbol.prototype.applyMask = function (mask) {
    for (var y = 0; y < this.size; y++) {
      for (var x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        var invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = x * y % 2 + x * y % 3 === 0; break;
          case 6: invert = (x * y % 2 + x * y % 3) % 2 === 0; break;
          case 7: invert = ((x + y) % 2 + x * y % 3) % 2 === 0; break;
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  };

  /** The four penalty rules from the spec — lower is more scannable. */
  QrSymbol.prototype.penaltyScore = function () {
    var size = this.size;
    var result = 0;
    var m = this.modules;

    // Rule 1: runs of five or more same-colour modules in a row/column
    for (var y = 0; y < size; y++) {
      var runColor = false, runX = 0;
      var runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (var x = 0; x < size; x++) {
        if (m[y][x] === runColor) {
          runX++;
          if (runX === 5) result += 3;
          else if (runX > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runX, runHistory);
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * 40;
          runColor = m[y][x];
          runX = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * 40;
    }
    for (var x = 0; x < size; x++) {
      var runColor = false, runY = 0;
      var runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (var y = 0; y < size; y++) {
        if (m[y][x] === runColor) {
          runY++;
          if (runY === 5) result += 3;
          else if (runY > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runY, runHistory);
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * 40;
          runColor = m[y][x];
          runY = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * 40;
    }

    // Rule 2: 2x2 blocks of the same colour
    for (var y = 0; y < size - 1; y++) {
      for (var x = 0; x < size - 1; x++) {
        var c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) {
          result += 3;
        }
      }
    }

    // Rule 4: overall balance of dark modules
    var dark = 0;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) if (m[y][x]) dark++;
    }
    var total = size * size;
    var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * 10;

    return result;
  };

  QrSymbol.prototype.finderPenaltyCountPatterns = function (runHistory) {
    var n = runHistory[1];
    var core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 &&
               runHistory[4] === n && runHistory[5] === n;
    return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
           (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
  };

  QrSymbol.prototype.finderPenaltyTerminateAndCount = function (currentRunColor, currentRunLength, runHistory) {
    if (currentRunColor) {
      this.finderPenaltyAddHistory(currentRunLength, runHistory);
      currentRunLength = 0;
    }
    currentRunLength += this.size;
    this.finderPenaltyAddHistory(currentRunLength, runHistory);
    return this.finderPenaltyCountPatterns(runHistory);
  };

  QrSymbol.prototype.finderPenaltyAddHistory = function (currentRunLength, runHistory) {
    if (runHistory[0] === 0) currentRunLength += this.size;   // add light border
    runHistory.pop();
    runHistory.unshift(currentRunLength);
  };

  function getBit(x, i) {
    return ((x >>> i) & 1) !== 0;
  }


  /* ---------- Data encoding --------------------------------- */

  function addEccAndInterleave(symbol, data) {
    var ver = symbol.version, ecc = symbol.ecc;
    var numBlocks = NUM_ECC_BLOCKS[ecc][ver];
    var blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][ver];
    var rawCodewords = Math.floor(numRawDataModules(ver) / 8);
    var numShortBlocks = numBlocks - rawCodewords % numBlocks;
    var shortBlockLen = Math.floor(rawCodewords / numBlocks);

    var blocks = [];
    var divisor = rsDivisor(blockEccLen);

    for (var i = 0, k = 0; i < numBlocks; i++) {
      var len = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
      var dat = data.slice(k, k + len);
      k += len;
      var ecCodewords = rsRemainder(dat, divisor);
      if (i < numShortBlocks) dat.push(0);       // pad so all blocks interleave evenly
      blocks.push(dat.concat(Array.from(ecCodewords)));
    }

    var result = [];
    for (var i = 0; i < blocks[0].length; i++) {
      for (var j = 0; j < blocks.length; j++) {
        // skip the padding slot in the short blocks
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
          result.push(blocks[j][i]);
        }
      }
    }
    return result;
  }

  function buildBitBuffer(bytes, version) {
    var bits = [];
    function append(value, length) {
      for (var i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    }

    append(4, 4);                                       // byte mode
    append(bytes.length, version <= 9 ? 8 : 16);        // character count
    bytes.forEach(function (b) { append(b, 8); });
    return bits;
  }


  /* ---------- Public API ------------------------------------ */

  /**
   * @param {string} text  the URL or text to encode
   * @param {string} eccKey  'L' | 'M' | 'Q' | 'H'   (default 'H')
   * @returns {boolean[][]} matrix[y][x]; true = dark
   */
  function encode(text, eccKey) {
    eccKey = eccKey || 'H';
    if (!(eccKey in ECC_LEVELS)) throw new Error('Unknown ECC level: ' + eccKey);

    var bytes = toUtf8(text);
    var ecc = ECC_LEVELS[eccKey];

    // Smallest version that fits.
    var version = 0;
    for (var v = 1; v <= 40; v++) {
      var capacityBits = numDataCodewords(v, ecc) * 8;
      var neededBits = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
      if (neededBits <= capacityBits) { version = v; break; }
    }
    if (version === 0) {
      throw new Error('Text is too long for a QR code at level ' + eccKey +
                      ' (' + bytes.length + ' bytes).');
    }

    var bits = buildBitBuffer(bytes, version);
    var dataCapacityBits = numDataCodewords(version, ecc) * 8;

    // Terminator, then pad to a byte boundary, then alternating pad bytes.
    for (var i = 0; i < 4 && bits.length < dataCapacityBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    for (var pad = 0xEC; bits.length < dataCapacityBits; pad ^= 0xEC ^ 0x11) {
      for (var i = 7; i >= 0; i--) bits.push((pad >>> i) & 1);
    }

    var dataCodewords = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
      dataCodewords.push(byte);
    }

    var symbol = new QrSymbol(version, eccKey);
    symbol.drawFunctionPatterns();
    symbol.drawCodewords(addEccAndInterleave(symbol, dataCodewords));

    // Try all eight masks, keep the least penalised.
    var bestMask = 0, minPenalty = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      symbol.applyMask(mask);
      symbol.drawFormatBits(mask);
      var penalty = symbol.penaltyScore();
      if (penalty < minPenalty) { minPenalty = penalty; bestMask = mask; }
      symbol.applyMask(mask);   // XOR is its own inverse — undo
    }
    symbol.applyMask(bestMask);
    symbol.drawFormatBits(bestMask);

    var matrix = symbol.modules;
    matrix.version = version;
    matrix.eccLevel = eccKey;
    matrix.mask = bestMask;
    return matrix;
  }

  /** Renders a matrix onto a canvas at a given pixel size. */
  function toCanvas(canvas, matrix, options) {
    options = options || {};
    var quiet = options.quiet === undefined ? QUIET_ZONE : options.quiet;
    var pixels = options.size || 1024;
    var dark = options.dark || '#000000';
    var light = options.light || '#ffffff';

    var modules = matrix.length + quiet * 2;
    var scale = Math.max(1, Math.floor(pixels / modules));
    var dim = modules * scale;

    canvas.width = dim;
    canvas.height = dim;

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = dark;

    for (var y = 0; y < matrix.length; y++) {
      for (var x = 0; x < matrix.length; x++) {
        if (matrix[y][x]) {
          ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  /** Renders a matrix as an SVG string (vector — scales to any print size). */
  function toSvg(matrix, options) {
    options = options || {};
    var quiet = options.quiet === undefined ? QUIET_ZONE : options.quiet;
    var dark = options.dark || '#000000';
    var light = options.light || '#ffffff';
    var dim = matrix.length + quiet * 2;

    var path = [];
    for (var y = 0; y < matrix.length; y++) {
      for (var x = 0; x < matrix.length; x++) {
        if (matrix[y][x]) path.push('M' + (x + quiet) + ',' + (y + quiet) + 'h1v1h-1z');
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim +
           '" shape-rendering="crispEdges">' +
           '<rect width="' + dim + '" height="' + dim + '" fill="' + light + '"/>' +
           '<path d="' + path.join('') + '" fill="' + dark + '"/></svg>';
  }

  var QR = { encode: encode, toCanvas: toCanvas, toSvg: toSvg };

  if (typeof module !== 'undefined' && module.exports) module.exports = QR;
  else global.QR = QR;

})(typeof window !== 'undefined' ? window : this);
