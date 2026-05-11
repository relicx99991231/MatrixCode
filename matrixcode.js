/**
 * MatrixCode
 * Version: 1.0.0
 * License: MIT
 * Idea by: relicx
 * Full Development & Optimization by: Gemini
 */

class Logger {
    constructor(enabled) { this.enabled = !!enabled; }
    info(msg, ...data) { if (this.enabled) console.log(`[MatrixCode] I: ${msg}`, ...data); }
    success(msg, ...data) { if (this.enabled) console.log(`[MatrixCode] S: ${msg}`, ...data); }
    warn(msg, ...data) { if (this.enabled) console.warn(`[MatrixCode] W: ${msg}`, ...data); }
    error(msg, ...data) { if (this.enabled) console.error(`[MatrixCode] E: ${msg}`, ...data); }
}

class ECCEngine {
    constructor(redundancyRate) {
        this.redundancyRate = redundancyRate;
        this._GF256 = this._initGaloisField();
    }
    encode(dataBuffer, totalBytesPossible) { return this._rsEncode(dataBuffer, totalBytesPossible); }
    decode(bytes, maxDataBytes, totalBytesPossible) { return this._rsDecode(bytes, maxDataBytes, totalBytesPossible); }
    
    _initGaloisField() {
        const exp = new Uint8Array(512), log = new Uint8Array(256); let x = 1;
        for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
        for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
        return { exp, log };
    }
    _gfMul(a, b) { return (a === 0 || b === 0) ? 0 : this._GF256.exp[this._GF256.log[a] + this._GF256.log[b]]; }
    _gfInv(a) { return this._GF256.exp[255 - this._GF256.log[a]]; }
    _gfPolyAddAscending(p, q) {
        const len = Math.max(p.length, q.length); const o = new Uint8Array(len);
        for (let i = 0; i < len; i++) o[i] = (p[i] || 0) ^ (q[i] || 0);
        let last = o.length - 1; while (last > 0 && o[last] === 0) last--; return o.slice(0, last + 1);
    }
    _gfPolyMulAscending(p, q) {
        const o = new Uint8Array(p.length + q.length - 1);
        for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) o[i + j] ^= this._gfMul(p[i], q[j]);
        return o;
    }
    _gfPolyMulDescending(p, q) {
        const o = new Uint8Array(p.length + q.length - 1);
        for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) o[i + j] ^= this._gfMul(p[i], q[j]);
        return o;
    }
    _gfPolyScale(p, scale) {
        if (scale === 0) return new Uint8Array([0]); const o = new Uint8Array(p.length);
        for (let i = 0; i < p.length; i++) o[i] = this._gfMul(p[i], scale);
        return o;
    }
    _gfPolyEvalAscending(poly, x) {
        let y = 0, power = 1;
        for (let i = 0; i < poly.length; i++) { if (poly[i] !== 0) y ^= this._gfMul(poly[i], power); power = this._gfMul(power, x); }
        return y;
    }
    _gfPolyEvalDescending(poly, x) {
        let y = poly[0]; for (let i = 1; i < poly.length; i++) y = this._gfMul(y, x) ^ poly[i];
        return y;
    }
    _gfGeneratorPoly(degree) {
        let g = new Uint8Array([1]);
        for (let i = 0; i < degree; i++) g = this._gfPolyMulDescending(g, new Uint8Array([1, this._GF256.exp[i]]));
        return g;
    }
    _getRSParams(dataLen, totalBytes) {
        const eccBytes = totalBytes - dataLen;
        if (eccBytes <= 0) return { blockCount: 1, perBlockData: dataLen, perBlockEcc: 0 };
        const blockCount = Math.ceil(totalBytes / 255);
        const perBlockData = Math.ceil(dataLen / blockCount);
        const perBlockEcc = Math.floor((totalBytes - blockCount * perBlockData) / blockCount);
        if (perBlockData + perBlockEcc > 255) throw new Error(`ECC block error: Exceeds 255 bytes limit.`);
        if (perBlockEcc < 0) throw new Error(`ECC capacity error: Data overflow.`);
        return { blockCount, perBlockData, perBlockEcc };
    }
    _rsEncode(data, totalBytes) {
        const { blockCount, perBlockData, perBlockEcc } = this._getRSParams(data.length, totalBytes);
        const blocks = []; let offset = 0;
        for (let b = 0; b < blockCount; b++) {
            const slice = data.slice(offset, offset + perBlockData); offset += perBlockData;
            const padded = new Uint8Array(perBlockData); padded.set(slice);
            const gen = this._gfGeneratorPoly(perBlockEcc);
            const msgPoly = new Uint8Array(perBlockData + perBlockEcc); msgPoly.set(padded);
            for (let i = 0; i < perBlockData; i++) {
                const factor = msgPoly[i];
                if (factor !== 0) for (let j = 0; j < gen.length; j++) msgPoly[i + j] ^= this._gfMul(gen[j], factor);
            }
            blocks.push({ data: padded, ecc: msgPoly.slice(perBlockData, perBlockData + perBlockEcc) });
        }
        const result = new Uint8Array(totalBytes); let pos = 0;
        for (let i = 0; i < perBlockData; i++) for (let b = 0; b < blockCount; b++) if (pos < totalBytes) result[pos++] = blocks[b].data[i];
        for (let i = 0; i < perBlockEcc; i++) for (let b = 0; b < blockCount; b++) if (pos < totalBytes) result[pos++] = blocks[b].ecc[i];
        return result;
    }
    _rsDecode(received, dataLen, totalBytes) {
        const { blockCount, perBlockData, perBlockEcc } = this._getRSParams(dataLen, totalBytes);
        const blockDataArrays = Array.from({ length: blockCount }, () => []), blockEccArrays = Array.from({ length: blockCount }, () => []);
        let pos = 0;
        for (let i = 0; i < perBlockData; i++) for (let b = 0; b < blockCount; b++) if (pos < received.length) blockDataArrays[b].push(received[pos++]);
        for (let i = 0; i < perBlockEcc; i++) for (let b = 0; b < blockCount; b++) if (pos < received.length) blockEccArrays[b].push(received[pos++]);
        const correctedBlocks = [];
        
        for (let b = 0; b < blockCount; b++) {
            const raw = new Uint8Array([...blockDataArrays[b], ...blockEccArrays[b]]);
            const synd = this._rsComputeSyndromes(raw, perBlockEcc);
            
            const hasError = !synd.every(s => s === 0);
            if (!hasError) { correctedBlocks.push(blockDataArrays[b]); continue; }
            
            const errLocPoly = this._rsFindErrorLocator(synd, perBlockEcc);
            if (!errLocPoly) throw new Error('RS correction failed: Image too corrupted.');
            
            const errPos = this._rsFindErrorPositions(errLocPoly, raw.length);
            if (!errPos) throw new Error('RS correction failed: Cannot locate error positions.');
            
            const corrected = this._rsCorrectErrors(raw, synd, errPos, errLocPoly, perBlockEcc);
            correctedBlocks.push(Array.from(corrected.slice(0, perBlockData)));
        }

        const finalData = new Uint8Array(dataLen); let off = 0;
        for (let b = 0; b < blockCount; b++) {
            const len = Math.min(perBlockData, dataLen - off);
            finalData.set(correctedBlocks[b].slice(0, len), off); off += len;
        }
        return finalData;
    }

    _rsComputeSyndromes(data, eccCount) {
        const synd = new Uint8Array(eccCount);
        for (let i = 0; i < eccCount; i++) synd[i] = this._gfPolyEvalDescending(data, this._GF256.exp[i]);
        return synd;
    }

    _rsFindErrorLocator(synd, eccCount) {
        let lambda = new Uint8Array([1]);
        let B = new Uint8Array([1]);
        let L = 0, m = 1, b = 1;

        for (let k = 0; k < eccCount; k++) {
            let d = synd[k];
            for (let i = 1; i <= L && i < lambda.length; i++) if (k - i >= 0) d ^= this._gfMul(lambda[i], synd[k - i]);
            if (d === 0) { m++; } else {
                const T = lambda.slice(); const scale = this._gfMul(d, this._gfInv(b));
                const shiftedB = new Uint8Array(m + B.length); shiftedB.set(B, m);
                lambda = this._gfPolyAddAscending(lambda, this._gfPolyScale(shiftedB, scale));
                if (2 * L <= k) { L = k + 1 - L; B = T; b = d; m = 1; } else { m++; }
            }
        }
        while (lambda.length > 1 && lambda[lambda.length - 1] === 0) lambda.pop();
        return lambda;
    }

    _rsFindErrorPositions(lambda, msgLen) {
        const positions = [];
        for (let i = 0; i < msgLen; i++) {
            const xInv = this._GF256.exp[(255 - i) % 255];
            if (this._gfPolyEvalAscending(lambda, xInv) === 0) positions.push(i);
        }
        if (positions.length !== lambda.length - 1) return null;
        return positions;
    }

    _rsCorrectErrors(data, synd, errPos, lambda) {
        const corrected = new Uint8Array(data);
        const t = lambda.length - 1; if (t === 0) return corrected;
        const product = this._gfPolyMulAscending(synd, lambda);
        const omega = product.slice(0, synd.length);
        const lambdaDeriv = []; for (let i = 1; i < lambda.length; i += 2) lambdaDeriv.push(lambda[i]);
        
        for (const pos of errPos) {
            const xInv = this._GF256.exp[(255 - pos) % 255];
            const xInv2 = this._gfMul(xInv, xInv);
            const omegaEval = this._gfPolyEvalAscending(omega, xInv);
            const lambdaDerivEval = this._gfPolyEvalAscending(lambdaDeriv, xInv2); 
            let errVal = this._gfMul(omegaEval, this._gfInv(lambdaDerivEval));
            errVal = this._gfMul(errVal, this._GF256.exp[pos]); 
            const actualPos = data.length - 1 - pos;
            corrected[actualPos] ^= errVal;
        }
        return corrected;
    }
}

class VisionEngine {
    constructor(config, logger) {
        this.finderSize = 5; 
        this.logger = logger;
    }

    extractData(imageData) {
        this.logger.info("Starting Phase 1: Binarization...");
        const binarizedMatrix = this._phase1_binarize(imageData);
        
        this.logger.info("Starting Phase 2: Anchor detection and grid inference...");
        const result = this._phase2_detectAnchors(imageData, binarizedMatrix); 
        if (!result) throw new Error('Localization failed: Could not lock anchor structures.');
        
        const { anchors, detectedGridSize } = result;
        this.logger.info(`Auto-detected grid size: ${detectedGridSize}x${detectedGridSize}`);

        this.logger.info("Starting Phase 3: Computing perspective transform...");
        const transform = this._phase3_computePerspectiveTransform(anchors, detectedGridSize);

        this.logger.info("Starting Phase 4: Grid sampling...");
        return this._phase4_gridSampling(imageData, binarizedMatrix, transform, detectedGridSize);
    }

    _phase1_binarize(imageData) {
        const { data, width: w, height: h } = imageData;
        const total = w * h;
        const valueChannel = new Uint8Array(total);
        const hist = new Int32Array(256);

        for (let i = 0; i < total; i++) {
            const v = Math.max(data[i*4], data[i*4+1], data[i*4+2]);
            valueChannel[i] = v; hist[v]++;
        }

        let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
        let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 0;
        for (let t = 0; t < 256; t++) {
            wB += hist[t]; if (wB === 0) continue;
            wF = total - wB; if (wF === 0) break;
            sumB += t * hist[t];
            const mB = sumB / wB, mF = (sum - sumB) / wF;
            const varBetween = wB * wF * (mB - mF) * (mB - mF);
            if (varBetween > varMax) { varMax = varBetween; threshold = t; }
        }

        const binMatrix = { width: w, height: h, pixels: new Uint8Array(total) };
        for (let i = 0; i < total; i++) binMatrix.pixels[i] = valueChannel[i] <= threshold ? 1 : 0;
        return binMatrix;
    }

    _phase2_detectAnchors(imageData, binMatrix) {
        const { width: w, height: h, pixels } = binMatrix; 
        const candidates = [];
        const step = 3; 

        const castRay = (startX, startY, dx, dy) => {
            let state = 0; let centerRad = 0, gapWidth = 0, ringWidth = 0;
            let x = startX, y = startY;
            const maxDist = Math.max(w, h); 

            for (let i = 0; i < maxDist; i++) {
                x += dx; y += dy;
                const px = Math.floor(x), py = Math.floor(y);
                if (px < 0 || px >= w || py < 0 || py >= h) break;
                
                const isDark = pixels[py * w + px] === 1;

                if (state === 0) {
                    if (isDark) centerRad++; else { state = 1; gapWidth++; }
                } else if (state === 1) {
                    if (!isDark) gapWidth++; else { state = 2; ringWidth++; }
                } else if (state === 2) {
                    if (isDark) ringWidth++; else break; 
                }
            }

            if (centerRad === 0 || gapWidth === 0 || ringWidth === 0) return { valid: false };

            const centerDiameter = centerRad * 2;
            const expectedModule = (centerDiameter + gapWidth) / 2.0;

            const isValid = Math.abs(centerDiameter - expectedModule) < expectedModule * 0.5 &&
                            Math.abs(gapWidth - expectedModule) < expectedModule * 0.5;

            return { valid: isValid, centerRad, gapWidth };
        };

        for (let y = step; y < h - step; y += step) {
            for (let x = step; x < w - step; x += step) {
                if (pixels[y * w + x] === 0) continue;

                const right = castRay(x, y, 1, 0); if (!right.valid) continue;
                const left = castRay(x, y, -1, 0); if (!left.valid) continue;
                const down = castRay(x, y, 0, 1); if (!down.valid) continue;
                const up = castRay(x, y, 0, -1); if (!up.valid) continue;

                const refinedX = x + (right.centerRad - left.centerRad) / 2.0;
                const refinedY = y + (down.centerRad - up.centerRad) / 2.0;

                const sizeX = (left.gapWidth + left.centerRad + 1 + right.centerRad + right.gapWidth) / 3.0;
                const sizeY = (up.gapWidth + up.centerRad + 1 + down.centerRad + down.gapWidth) / 3.0;

                if (Math.abs(sizeX - sizeY) / sizeX < 0.4) {
                    const moduleSize = (sizeX + sizeY) / 2;
                    let isDuplicate = false;
                    for (const cand of candidates) {
                        if (Math.hypot(cand.x - refinedX, cand.y - refinedY) < moduleSize * 2) {
                            isDuplicate = true; break;
                        }
                    }
                    if (!isDuplicate) {
                        candidates.push({ x: refinedX, y: refinedY, moduleSize });
                    }
                }
            }
        }

        if (candidates.length < 3) return null;
        
        let bestTriplet = null, bestScore = Infinity, detectedGridSize = 0; 
        const topCands = candidates.sort((a, b) => b.moduleSize - a.moduleSize).slice(0, 50);

        for (let i = 0; i < topCands.length; i++) {
            for (let j = i + 1; j < topCands.length; j++) {
                for (let k = j + 1; k < topCands.length; k++) {
                    const c1 = topCands[i], c2 = topCands[j], c3 = topCands[k];
                    const avgS = (c1.moduleSize + c2.moduleSize + c3.moduleSize) / 3;
                    const sizeErr = Math.max(Math.abs(c1.moduleSize-avgS), Math.abs(c2.moduleSize-avgS), Math.abs(c3.moduleSize-avgS)) / avgS;
                    if (sizeErr > 0.3) continue; 
                    
                    const d1 = Math.hypot(c1.x-c2.x, c1.y-c2.y), d2 = Math.hypot(c2.x-c3.x, c2.y-c3.y), d3 = Math.hypot(c3.x-c1.x, c3.y-c1.y);
                    let a, b, c; if (d1>=d2 && d1>=d3) { c=d1; a=d2; b=d3; } else if (d2>=d1 && d2>=d3) { c=d2; a=d1; b=d3; } else { c=d3; a=d1; b=d2; }
                    
                    if (Math.abs(a*a + b*b - c*c) < c*c * 0.4 && Math.abs(a - b) < Math.max(a, b) * 0.4) {
                        const estGridA = Math.round(a / avgS) + 5;
                        const estGridB = Math.round(b / avgS) + 5;
                        
                        if (Math.abs(estGridA - estGridB) > 2 || estGridA < 15 || estGridA > 150) continue; 
                        
                        const expectedDist = (estGridA - this.finderSize) * avgS;
                        const distErrA = Math.abs(a - expectedDist) / expectedDist;
                        const distErrB = Math.abs(b - expectedDist) / expectedDist;
                        if (distErrA > 0.25 || distErrB > 0.25) continue; 
                        
                        const score = sizeErr + distErrA + distErrB;
                        if (score < bestScore) { 
                            bestScore = score; bestTriplet = [c1, c2, c3]; detectedGridSize = estGridA; 
                        }
                    }
                }
            }
        }
        
        if (!bestTriplet) return null;
        bestTriplet.sort((a,b) => (a.x + a.y) - (b.x + b.y));
        const tl = bestTriplet[0]; let tr, bl;
        if (bestTriplet[1].x > bestTriplet[2].x) { tr = bestTriplet[1]; bl = bestTriplet[2]; } else { tr = bestTriplet[2]; bl = bestTriplet[1]; }

        const finalAvgS = (tl.moduleSize + tr.moduleSize + bl.moduleSize) / 3;
        const cx_log = Math.floor((detectedGridSize - this.finderSize) / 2);
        const u = cx_log / (detectedGridSize - this.finderSize); 
        const center_est = { x: tl.x + u * (tr.x - tl.x) + u * (bl.x - tl.x), y: tl.y + u * (tr.y - tl.y) + u * (bl.y - tl.y) };

        const searchRadius = Math.max(2, Math.round(finalAvgS * 1.5));
        
        let sumX = 0, sumY = 0, blackCount = 0;
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const px = Math.round(center_est.x + dx), py = Math.round(center_est.y + dy);
                if (px >= 0 && px < w && py >= 0 && py < h) {
                    if (binMatrix.pixels[py * w + px] === 1) { sumX += px; sumY += py; blackCount++; }
                }
            }
        }
        const finalCenter = blackCount > 0 ? { x: sumX / blackCount, y: sumY / blackCount } : center_est;
        return { anchors: [ tl, tr, bl, finalCenter ], detectedGridSize }; 
    }

    _phase3_computePerspectiveTransform(anchors, gridSize) {
        const fs = this.finderSize, c = fs / 2.0;
        const cx_log = Math.floor((gridSize - fs) / 2);
        const src = [ 
            [c, c], [gridSize - fs + c, c], [c, gridSize - fs + c], [cx_log + c, cx_log + c] 
        ];
        const dst = anchors.map(p => [p.x, p.y]);
        const A = [], B = [];
        for (let i = 0; i < 4; i++) {
            const x = src[i][0], y = src[i][1], X = dst[i][0], Y = dst[i][1];
            A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); B.push(X);
            A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); B.push(Y);
        }
        const n = 8, M = A.map((row, i) => [...row, B[i]]);
        for (let i = 0; i < n; i++) {
            let pivot = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[pivot][i])) pivot = j;
            [M[i], M[pivot]] = [M[pivot], M[i]];
            const div = M[i][i]; if (Math.abs(div) < 1e-10) throw new Error('Matrix singular');
            for (let j = i; j <= n; j++) M[i][j] /= div;
            for (let j = 0; j < n; j++) if (j !== i) { const f = M[j][i]; for (let k = i; k <= n; k++) M[j][k] -= f * M[i][k]; }
        }
        const coeff = M.map(row => row[n]);
        return { a: coeff[0], b: coeff[1], c: coeff[2], d: coeff[3], e: coeff[4], f: coeff[5], g: coeff[6], h: coeff[7] };
    }

    _phase4_gridSampling(imageData, binMatrix, transform, gridSize) {
        const p0 = this._mapLogicalToPhysical(0, 0, transform), p1 = this._mapLogicalToPhysical(1, 0, transform);
        const moduleScale = Math.hypot(p1.px - p0.px, p1.py - p0.py);
        const probeRadius = Math.max(1, Math.floor(moduleScale * 0.15));
        const anchorProbe = Math.max(1, Math.floor(probeRadius * 0.8)); 

        const pLogCoords = [ {x: 1.5, y: 1.5}, {x: 2.5, y: 2.5}, {x: 2.5, y: 1.5}, {x: 3.5, y: 1.5}, {x: 1.5, y: 2.5}, {x: 3.5, y: 2.5}, {x: 1.5, y: 3.5}, {x: 2.5, y: 3.5}, {x: 3.5, y: 3.5} ];
        const pal = [];
        for (let i=0; i<9; i++) {
            const phys = this._mapLogicalToPhysical(pLogCoords[i].x, pLogCoords[i].y, transform);
            pal.push(this._getAverageRGB(imageData, phys.px, phys.py, anchorProbe));
        }

        const diffColor = Math.abs(pal[2][0] - pal[0][0]) + Math.abs(pal[2][1] - pal[0][1]) + Math.abs(pal[2][2] - pal[0][2]);
        const isColorMode = diffColor > 40;

        const classifyColor = (r, g, b) => {
            let minDist = Infinity, bestClass = 0;
            for (let i = 0; i <= 8; i++) {
                const c = pal[i], dist = (r-c[0])**2 + (g-c[1])**2 + (b-c[2])**2;
                if (dist < minDist) { minDist = dist; bestClass = i; }
            }
            return bestClass;
        };

        const probeColorVote = (px, py, radius) => {
            const cx = Math.round(px), cy = Math.round(py), w = imageData.width, h = imageData.height, d = imageData.data;
            const votes = new Array(9).fill(0);
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const idx = (ny * w + nx) * 4;
                        votes[classifyColor(d[idx], d[idx+1], d[idx+2])]++;
                    }
                }
            }
            let bestColorCls = 0, colorVotes = 0;
            for (let i = 1; i <= 8; i++) { if (votes[i] > colorVotes) { colorVotes = votes[i]; bestColorCls = i; } }
            if (colorVotes >= ((radius * 2 + 1) ** 2) * 0.15) return bestColorCls;
            return 0; 
        };

        const getModeVote = (arr) => {
            const counts = {}; let maxObj = null, maxCount = 0;
            for(const v of arr) { counts[v] = (counts[v] || 0) + 1; if(counts[v] > maxCount) { maxCount = counts[v]; maxObj = v; } }
            return maxObj;
        };

        const cellValues = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (this._isReservedBlock(x, y, gridSize)) continue;

                const tp = this._mapLogicalToPhysical(x + 0.5, y + 0.15, transform);
                const rp = this._mapLogicalToPhysical(x + 0.85, y + 0.5, transform);
                const bp = this._mapLogicalToPhysical(x + 0.5, y + 0.85, transform);
                const lp = this._mapLogicalToPhysical(x + 0.15, y + 0.5, transform);

                if (isColorMode) {
                    const clsT = probeColorVote(tp.px, tp.py, probeRadius);
                    const clsR = probeColorVote(rp.px, rp.py, probeRadius);
                    const clsB = probeColorVote(bp.px, bp.py, probeRadius);
                    const clsL = probeColorVote(lp.px, lp.py, probeRadius);

                    let shape = 0; const activeColors = [];
                    if (clsT !== 0) { shape |= 8; activeColors.push(clsT); }
                    if (clsR !== 0) { shape |= 4; activeColors.push(clsR); }
                    if (clsB !== 0) { shape |= 2; activeColors.push(clsB); }
                    if (clsL !== 0) { shape |= 1; activeColors.push(clsL); }

                    if (shape === 0) { cellValues.push(0); } else {
                        const domColorIdx = getModeVote(activeColors) - 1; 
                        cellValues.push(domColorIdx * 15 + shape);
                    }
                } else {
                    let val = 0;
                    if (this._sampleBinary(binMatrix, tp.px, tp.py, probeRadius)) val |= 8;
                    if (this._sampleBinary(binMatrix, rp.px, rp.py, probeRadius)) val |= 4;
                    if (this._sampleBinary(binMatrix, bp.px, bp.py, probeRadius)) val |= 2;
                    if (this._sampleBinary(binMatrix, lp.px, lp.py, probeRadius)) val |= 1;
                    cellValues.push(val);
                }
            }
        }
        return { isColorMode, cellValues, detectedGridSize: gridSize }; 
    }

    _mapLogicalToPhysical(logX, logY, transform) {
        const {a,b,c,d,e,f,g,h} = transform, denom = g * logX + h * logY + 1;
        return { px: (a*logX + b*logY + c)/denom, py: (d*logX + e*logY + f)/denom };
    }

    _getAverageRGB(imageData, px, py, radius) {
        const cx = Math.round(px), cy = Math.round(py), w = imageData.width, h = imageData.height, d = imageData.data;
        let r=0, g=0, b=0, count=0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const idx = (ny * w + nx) * 4;
                    r+=d[idx]; g+=d[idx+1]; b+=d[idx+2]; count++;
                }
            }
        }
        return count === 0 ? [0,0,0] : [r/count, g/count, b/count];
    }

    _sampleBinary(binMatrix, px, py, radius) {
        const cx = Math.round(px), cy = Math.round(py); let blackHits = 0, total = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < binMatrix.width && ny >= 0 && ny < binMatrix.height) {
                    if (binMatrix.pixels[ny * binMatrix.width + nx] === 1) blackHits++; total++;
                }
            }
        }
        return (total > 0 && (blackHits / total) >= 0.15);
    }

    _isReservedBlock(x, y, gridSize) {
        const fs = 5, cx = Math.floor((gridSize - fs) / 2);
        return (x < fs && y < fs) || (x >= gridSize - fs && y < fs) || (x < fs && y >= gridSize - fs) || 
               (x >= cx && x < cx + fs && y >= cx && y < cx + fs);
    }
}

class RenderEngine {
    constructor(config) {
        this.gridSize = config.gridSize; this.cellSize = config.cellSize;
        this.margin = config.margin; this.thickness = config.thickness; 
        this.useColor = config.useColor;
        
        const def = {
            bg: [255,255,255], struct: [0,0,0], p1: [255,0,0], p2: [0,255,0],
            p3: [0,0,255], p4: [0,255,255], p5: [255,0,255], p6: [255,255,0], p7: [255,128,0]
        };
        const uc = config.palette || {};
        this.palArray = [
            uc.bg || def.bg, uc.struct || def.struct,
            uc.p1 || def.p1, uc.p2 || def.p2, uc.p3 || def.p3, uc.p4 || def.p4,
            uc.p5 || def.p5, uc.p6 || def.p6, uc.p7 || def.p7
        ];
    }
    
    render(cellValues) {
        const width = this.gridSize * this.cellSize, height = this.gridSize * this.cellSize;
        const buffer = new Uint8Array(width * height * 4); 
        
        const bgC = this.palArray[0];
        for (let i = 0; i < buffer.length; i += 4) {
            buffer[i] = bgC[0]; buffer[i+1] = bgC[1]; buffer[i+2] = bgC[2]; buffer[i+3] = 255;
        }
        
        const setPixel = (x, y, r, g, b) => {
            const idx = (y * width + x) * 4;
            buffer[idx] = r; buffer[idx + 1] = g; buffer[idx + 2] = b; buffer[idx + 3] = 255;
        };

        const fillRect = (startX, startY, w, h, colorArray) => {
            if (!colorArray) return; 
            for (let y = Math.floor(startY); y < startY + h; y++) {
                for (let x = Math.floor(startX); x < startX + w; x++) {
                    setPixel(x, y, colorArray[0], colorArray[1], colorArray[2]);
                }
            }
        };

        const pal = this.palArray;
        
        const drawFinder = (startX, startY) => {
            const px = startX * this.cellSize, py = startY * this.cellSize;
            for(let fy=0; fy<5; fy++) {
                for(let fx=0; fx<5; fx++) {
                    let c = pal[1]; 
                    if (fx!==0 && fx!==4 && fy!==0 && fy!==4 && !(fx===2 && fy===2)) {
                        if (!this.useColor) {
                            c = pal[0]; 
                        } else {
                            if (fx===1 && fy===1) c = pal[0]; 
                            else if (fx===2 && fy===1) c = pal[2]; 
                            else if (fx===3 && fy===1) c = pal[3]; 
                            else if (fx===1 && fy===2) c = pal[4]; 
                            else if (fx===3 && fy===2) c = pal[5]; 
                            else if (fx===1 && fy===3) c = pal[6]; 
                            else if (fx===2 && fy===3) c = pal[7]; 
                            else if (fx===3 && fy===3) c = pal[8]; 
                        }
                    }
                    fillRect(px + fx*this.cellSize, py + fy*this.cellSize, this.cellSize, this.cellSize, c);
                }
            }
        };

        const drawCenterAnchor = (startX, startY) => {
            const px = startX * this.cellSize, py = startY * this.cellSize;
            fillRect(px, py, this.cellSize * 5, this.cellSize * 5, pal[0]);
            fillRect(px + this.cellSize, py + this.cellSize, this.cellSize * 3, this.cellSize * 3, pal[1]);
        };

        let dataIndex = 0;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this._isReservedBlock(x, y)) continue;

                const v = cellValues[dataIndex++];
                const ppx = x * this.cellSize + this.margin, ppy = y * this.cellSize + this.margin;
                const innerSize = this.cellSize - this.margin * 2, t = this.thickness;

                if (!this.useColor) {
                    const cT = (v & 8) ? pal[1] : null; const cR = (v & 4) ? pal[1] : null;
                    const cB = (v & 2) ? pal[1] : null; const cL = (v & 1) ? pal[1] : null;
                    fillRect(ppx, ppy, innerSize, t, cT); fillRect(ppx + innerSize - t, ppy, t, innerSize, cR);
                    fillRect(ppx, ppy + innerSize - t, innerSize, t, cB); fillRect(ppx, ppy, t, innerSize, cL);
                } else {
                    if (v === 0) {
                        fillRect(ppx + innerSize/2 - 1, ppy + innerSize/2 - 1, 2, 2, pal[1]);
                    } else {
                        const adjusted = v - 1;
                        const colorIdx = Math.floor(adjusted / 15) + 1; 
                        const shapeIdx = (adjusted % 15) + 1;           
                        
                        const renderColor = pal[colorIdx];
                        
                        if (shapeIdx & 8) fillRect(ppx, ppy, innerSize, t, renderColor);
                        if (shapeIdx & 4) fillRect(ppx + innerSize - t, ppy, t, innerSize, renderColor);
                        if (shapeIdx & 2) fillRect(ppx, ppy + innerSize - t, innerSize, t, renderColor);
                        if (shapeIdx & 1) fillRect(ppx, ppy, t, innerSize, renderColor);
                    }
                }
            }
        }
        
        const cx = Math.floor((this.gridSize - 5) / 2);
        
        drawFinder(0, 0); 
        drawFinder(this.gridSize - 5, 0); 
        drawFinder(0, this.gridSize - 5); 
        
        drawCenterAnchor(cx, cx);
        
        return { width, height, data: buffer };
    }

    _isReservedBlock(x, y) {
        const fs = 5, gs = this.gridSize;
        const cx = Math.floor((gs - fs) / 2);
        return (x < fs && y < fs) || 
               (x >= gs - fs && y < fs) || 
               (x < fs && y >= gs - fs) || 
               (x >= cx && x < cx + fs && y >= cx && y < cx + fs);
    }
}

class MatrixCode {
    constructor(config = {}) {
        this.config = {
            gridSize: config.gridSize || 22, cellSize: config.cellSize || 10,
            margin: config.margin !== undefined ? config.margin : 1, thickness: config.thickness || 2, 
            redundancyRate: config.redundancyRate || 0.20, useColor: !!config.useColor, 
            debug: !!config.debug, palette: config.palette || null
        };
        this.logger = new Logger(this.config.debug);
        this.logger.info("Engine init", this.config);
        
        this.eccEngine = config.eccEngine || new ECCEngine(this.config.redundancyRate);
        this.visionEngine = config.visionEngine || new VisionEngine(this.config, this.logger);
        this.renderEngine = config.renderEngine || new RenderEngine(this.config);
    }

    _adler32(bytes) {
        let a = 1, b = 0;
        for (let i = 0; i < bytes.length; i++) {
            a = (a + bytes[i]) % 65521;
            b = (b + a) % 65521;
        }
        return ((b << 16) | a) >>> 0; 
    }

    _stringToHex(str) { return Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(''); }
    _hexToBytes(hex) { return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16))); }

    encodeToBuffer(text) {
        const dataHex = this._stringToHex(text), dataBytes = this._hexToBytes(dataHex);
        const lengthHeader = dataBytes.length.toString(16).padStart(4, '0').toUpperCase();
        
        const checksum = this._adler32(dataBytes).toString(16).padStart(8, '0').toUpperCase();
        const payloadBytes = new Uint8Array([
            ...this._hexToBytes(lengthHeader), 
            ...this._hexToBytes(checksum), 
            ...dataBytes
        ]);
        
        const totalCells = this.config.gridSize * this.config.gridSize - 4 * 25; 
        
        const totalBytesPossible = this.config.useColor ? Math.floor(totalCells / 5) * 4 : Math.floor(totalCells / 2);
        const maxDataBytes = Math.floor(totalBytesPossible * (1 - this.config.redundancyRate));

        if (payloadBytes.length > maxDataBytes) throw new Error(`Data capacity overflow.`);

        const dataBuffer = new Uint8Array(maxDataBytes); 
        dataBuffer.set(payloadBytes);

        for (let i = payloadBytes.length; i < maxDataBytes; i++) {
            dataBuffer[i] = Math.floor(Math.random() * 256);
        }

        const encodedBytes = this.eccEngine.encode(dataBuffer, totalBytesPossible);
        
        const cellValues = [];
        if (this.config.useColor) {
            for (let i = 0; i < encodedBytes.length; i += 4) {
                let val = 0;
                for (let j = 0; j < 4; j++) val = (val * 256) + (encodedBytes[i + j] || 0);
                
                const chunk = [];
                for (let k = 0; k < 5; k++) { chunk.push(val % 121); val = Math.floor(val / 121); }
                cellValues.push(...chunk.reverse());
            }
        } else {
            for (let i = 0; i < encodedBytes.length; i++) {
                cellValues.push(encodedBytes[i] >> 4); cellValues.push(encodedBytes[i] & 0x0F);
            }
        }
        
        while (cellValues.length < totalCells) {
            if (this.config.useColor) {
                cellValues.push(Math.floor(Math.random() * 120) + 1);
            } else {
                cellValues.push(Math.floor(Math.random() * 15) + 1);
            }
        }
        
        return this.renderEngine.render(cellValues);
    }

    decodeFromBuffer(imageData) {
        if (!imageData || !imageData.width || !imageData.height || !imageData.data) throw new Error('Invalid image data.');

        const { isColorMode, cellValues, detectedGridSize } = this.visionEngine.extractData(imageData);
        const totalCells = detectedGridSize * detectedGridSize - 4 * 25;
        const totalBytesPossible = isColorMode ? Math.floor(totalCells / 5) * 4 : Math.floor(totalCells / 2);

        this.logger.info(`==== Phase 4 Decoding Stats ====`);
        this.logger.info(`Detected Grid Size: ${detectedGridSize}x${detectedGridSize}`);
        this.logger.info(`Max Physical Capacity: ${totalBytesPossible} Bytes`);

        const writeBuffer = new Uint8Array(totalBytesPossible);
        let byteIdx = 0;

        if (isColorMode) {
            for (let i = 0; i < Math.floor(totalCells / 5) * 5; i += 5) {
                let val = 0;
                for (let k = 0; k < 5; k++) val = val * 121 + (cellValues[i + k] || 0);
                for (let j = 3; j >= 0; j--) if (byteIdx < totalBytesPossible) writeBuffer[byteIdx++] = (val >> (j * 8)) & 0xFF;
            }
        } else {
            for (let i = 0; i < Math.floor(totalCells / 2) * 2; i += 2) {
                if (byteIdx < totalBytesPossible) writeBuffer[byteIdx++] = ((cellValues[i] || 0) << 4) | (cellValues[i + 1] || 0);
            }
        }

        this.logger.info(`==== Phase 5 RS Inference & Correction ====`);
        
        const trialRates = [0.1, 0.15, 0.20, 0.25, 0.30];
        let lastError = null;

        for (const testRate of trialRates) {
            try {
                const maxDataBytes = Math.floor(totalBytesPossible * (1 - testRate));
                const decodedPayload = this.eccEngine.decode(writeBuffer, maxDataBytes, totalBytesPossible);
                
                const dataLen = (decodedPayload[0] << 8) | decodedPayload[1];
                
                if (dataLen > maxDataBytes - 6 || dataLen <= 0) {
                    throw new Error(`Invalid length header.`);
                }
                
                const expectedChecksumBytes = decodedPayload.slice(2, 6);
                const expectedChecksum = ((expectedChecksumBytes[0] << 24) | (expectedChecksumBytes[1] << 16) | (expectedChecksumBytes[2] << 8) | expectedChecksumBytes[3]) >>> 0;
                
                const extractedData = decodedPayload.slice(6, 6 + dataLen);
                const actualChecksum = this._adler32(extractedData);
                
                if (expectedChecksum !== actualChecksum) {
                    throw new Error(`Checksum mismatch.`);
                }

                const finalString = new TextDecoder().decode(extractedData);
                this.logger.success(`Inference and verification successful! Redundancy rate used: ${testRate * 100}%`);
                this.logger.success(`Decoded text length: ${finalString.length}`);
                
                return finalString; 
                
            } catch (e) {
                lastError = e;
                this.logger.info(`Testing redundancy rate ${testRate * 100}% failed, trying next...`);
            }
        }

        throw new Error(`Decode failed: All redundancy rate inferences failed. Image may be severely damaged. Last error: ${lastError.message}`);
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = MatrixCode;
else if (typeof window !== 'undefined') window.MatrixCode = MatrixCode;