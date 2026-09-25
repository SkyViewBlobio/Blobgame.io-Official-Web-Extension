export function pageLiquidJellyBootstrap(initialSettings = {}, pageWindow = globalThis) {
  const win = pageWindow;
  if (win.location?.hostname !== 'custom.client.blobgame.io') {
    return false;
  }
  if (win.__blobioLiquidJellyInstalled) {
    win.__blobioLiquidJellyRefresh(initialSettings);
    return true;
  }

  const marker = 'BLOBIO_LIQUID_JELLY_V1';
  const motions = new WeakMap();
  const players = [];
  const rest = { x: 0, y: 0, contactX: 0, contactY: 0, offsetX: 0, offsetY: 0 };
  let lastTime = -1;
  let lastContactTime = -1;
  const state = {
    enabled: Boolean(initialSettings.enabled),
    version: initialSettings.version || '',
    bundlePatches: 0,
    vertexPatches: 0,
    fragmentPatches: 0,
    hookInstalled: false,
  };
  win.__blobioLiquidJellyInstalled = true;
  win.__blobioLiquidJellyStatus = state;
  win.__blobioLiquidJellyEnabled = state.enabled;
  win.__blobioLiquidJellyRefresh = (settings) => {
    const enabled = Boolean(settings.enabled);
    if (enabled !== state.enabled) lastTime = -1;
    state.enabled = enabled;
    win.__blobioLiquidJellyEnabled = state.enabled;
  };
  win.__BlobioLiquidJellyPatchBundle = patchBundle;
  win.__BlobioLiquidJellyMotion = cellMotion;
  win.__BlobioLiquidJellyFrame = advanceFrame;
  win.BlobioLiquidJellyDebug = () => ({
    ...state,
    extraDrawCalls: 0,
    extraTextureSamples: 0,
    passiveAmplitude: 0.003,
    maximumAmplitude: 0.065,
    maximumContactCompression: 0.065,
    reloadNeeded: state.enabled && (!state.bundlePatches || !state.fragmentPatches),
  });

  for (const Context of [win.WebGLRenderingContext, win.WebGL2RenderingContext]) {
    if (!Context?.prototype?.shaderSource) {
      continue;
    }
    const nativeShaderSource = Context.prototype.shaderSource;
    Context.prototype.shaderSource = function liquidJellyShaderSource(shader, source) {
      return nativeShaderSource.call(this, shader, patchShader(source));
    };
    state.hookInstalled = true;
  }
  if (win.__BLOBIO_LIQUID_JELLY_TEST__) {
    win.__BlobioLiquidJellyTest = { patchShader, patchBundle, cellMotion, advanceFrame };
  }
  return true;

  function cellMotion(cell) {
    return motions.get(cell) || rest;
  }

  function advanceFrame(cells, time) {
    if (!state.enabled) {
      lastTime = -1;
      players.length = 0;
      return;
    }
    const elapsed = lastTime < 0 ? 0 : time - lastTime;
    const reset = elapsed < 0 || elapsed > 0.25 || lastTime < 0;
    const dt = reset ? 0 : elapsed;
    let updateContacts = reset || time - lastContactTime >= 1 / 30 - 0.000001;
    lastTime = time;
    players.length = 0;
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      if (!cell?.c || cell.c.M !== 1 || cell.a || cell.M <= 0) continue;
      let motion = motions.get(cell);
      if (!motion) {
        updateContacts = true;
        const angle = cell.n * 2.399963;
        motion = { cell, x: 0, y: 0, vx: 0, vy: 0,
          axisX: Math.cos(angle), axisY: Math.sin(angle), radius: cell.w,
          cx: cell.R, cy: cell.S, forceX: 0, forceY: 0, pressure: 0, left: 0,
          contactX: 0, contactY: 0, contactVx: 0, contactVy: 0, offsetX: 0, offsetY: 0,
          bornAt: reset ? -1 : time, splitAt: -1 };
        motions.set(cell, motion);
      }
      if (reset) {
        motion.x = motion.y = motion.vx = motion.vy = 0;
        motion.radius = cell.w;
        motion.bornAt = motion.splitAt = -1;
        motion.contactX = motion.contactY = motion.contactVx = motion.contactVy = 0;
      }
      const change = motion.radius > 0 ? cell.w / motion.radius - 1 : 0;
      if (change > 0 || change < -0.12) {
        if (change < -0.12) {
          motion.splitAt = time;
          updateContacts = true;
        }
        const dx = cell.R - motion.cx;
        const dy = cell.S - motion.cy;
        const travel = dx * dx + dy * dy;
        if (travel > cell.M * cell.M * 0.0001) {
          motion.axisX = (dx * dx - dy * dy) / travel;
          motion.axisY = 2 * dx * dy / travel;
        }
        const impulse = Math.min(0.9, Math.abs(change) * 6);
        motion.vx += motion.axisX * impulse;
        motion.vy += motion.axisY * impulse;
        const speed = Math.hypot(motion.vx, motion.vy);
        if (speed > 0.9) {
          motion.vx *= 0.9 / speed;
          motion.vy *= 0.9 / speed;
        }
      }
      motion.radius = cell.w;
      motion.cx = cell.R;
      motion.cy = cell.S;
      motion.left = cell.R - cell.M * 1.035;
      players.push(motion);
    }
    if (updateContacts) updateContactForces(time);
    const damping = Math.exp(-4 * dt);
    const cosine = Math.cos(12.806248 * dt);
    const sine = Math.sin(12.806248 * dt) / 12.806248;
    const contactDecay = Math.exp(-6 * dt);
    for (let i = 0; i < players.length; i += 1) {
      const motion = players[i];
      const contactErrorX = motion.contactX - motion.forceX;
      const contactErrorY = motion.contactY - motion.forceY;
      const contactStepX = (motion.contactVx + 6 * contactErrorX) * dt;
      const contactStepY = (motion.contactVy + 6 * contactErrorY) * dt;
      motion.contactX = motion.forceX + (contactErrorX + contactStepX) * contactDecay;
      motion.contactY = motion.forceY + (contactErrorY + contactStepY) * contactDecay;
      motion.contactVx = (motion.contactVx - 6 * contactStepX) * contactDecay;
      motion.contactVy = (motion.contactVy - 6 * contactStepY) * contactDecay;
      if (motion.pressure === 0 && Math.abs(motion.contactX) + Math.abs(motion.contactY) < 0.00001
          && Math.abs(motion.contactVx) + Math.abs(motion.contactVy) < 0.0001) {
        motion.contactX = motion.contactY = motion.contactVx = motion.contactVy = 0;
      }
      motion.offsetX = motion.cell.p ? -motion.contactX * motion.cell.M * 4.5 : 0;
      motion.offsetY = motion.cell.p ? -motion.contactY * motion.cell.M * 4.5 : 0;
      const x = motion.x;
      const y = motion.y;
      motion.x = damping * ((cosine + 4 * sine) * x + sine * motion.vx);
      motion.y = damping * ((cosine + 4 * sine) * y + sine * motion.vy);
      motion.vx = damping * ((cosine - 4 * sine) * motion.vx - 180 * sine * x);
      motion.vy = damping * ((cosine - 4 * sine) * motion.vy - 180 * sine * y);
      const amplitude = Math.hypot(motion.x, motion.y);
      if (amplitude > 0.055) {
        motion.x *= 0.055 / amplitude;
        motion.y *= 0.055 / amplitude;
        const outward = (motion.vx * motion.x + motion.vy * motion.y) / (0.055 * 0.055);
        if (outward > 0) {
          motion.vx -= motion.x * outward;
          motion.vy -= motion.y * outward;
        }
      } else if (amplitude < 0.00001 && motion.vx * motion.vx + motion.vy * motion.vy < 0.00000001) {
        motion.x = motion.y = motion.vx = motion.vy = 0;
      }
    }
  }

  function updateContactForces(time) {
    lastContactTime = time;
    for (let i = 0; i < players.length; i += 1) {
      const motion = players[i];
      motion.forceX = motion.forceY = motion.pressure = 0;
    }
    players.sort((a, b) => a.left - b.left);
    // The neighbor limit bounds work even when hundreds of cells overlap.
    for (let i = 0; i < players.length; i += 1) {
      const first = players[i];
      const a = first.cell;
      const right = a.R + a.M * 1.035;
      for (let j = i + 1; j < players.length && j <= i + 32; j += 1) {
        const second = players[j];
        if (second.left > right) break;
        const b = second.cell;
        const dx = b.R - a.R;
        const dy = b.S - a.S;
        const sum = a.M + b.M;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= sum * sum * 1.071225) continue;
        if ((a.J > 0 && a.J === b.J) || (a.p && b.p)) {
          if (first.bornAt >= 0 && time - first.bornAt < 0.15 && second.splitAt >= first.bornAt - 0.08) {
            first.vx = second.axisX * 0.75;
            first.vy = second.axisY * 0.75;
            first.bornAt = -1;
          }
          if (second.bornAt >= 0 && time - second.bornAt < 0.15 && first.splitAt >= second.bornAt - 0.08) {
            second.vx = first.axisX * 0.75;
            second.vy = first.axisY * 0.75;
            second.bornAt = -1;
          }
        }
        if (distanceSquared < 1) continue;
        const distance = Math.sqrt(distanceSquared);
        if (distance < Math.abs(a.M - b.M)) continue;
        const compression = Math.min(0.012, Math.max(0, sum * 1.005 - distance) / (sum * 0.5) * 0.055)
          * Math.min(1, distance / Math.min(a.M, b.M));
        if (compression > first.pressure) {
          first.forceX = dx / distance * compression;
          first.forceY = dy / distance * compression;
          first.pressure = compression;
        }
        if (compression > second.pressure) {
          second.forceX = -dx / distance * compression;
          second.forceY = -dy / distance * compression;
          second.pressure = compression;
        }
      }
    }
  }

  function patchBundle(source) {
    if (typeof source !== 'string' || source.includes('__blobioLiquidJellyCell')) {
      return source;
    }
    const cellLoop = /if\(!a\.c\|\|!g\|\|!g\.K\|\|!g\.c\)\{continue\}(?:if\(\$wnd\.__BlobPerfSaver&&\$wnd\.__BlobPerfSaver\.skipParticleWork\(g\)\)\{continue;\})?([\w$]+)\(g\);/;
    const beforeNames = '}}else{rse(a,g)}';
    const regionUvs = 'l=b.w;n=b.C;m=b.A;o=b.B;';
    const frameStart = 'function ose(a){';
    const uvDraw = /function ([\w$]+)\(a,b,c,d,e,f,g,h,i,j\)\{var k,l,m,n,o;if\(!a\.j\)/;
    if (!cellLoop.test(source) || !source.includes(beforeNames)
        || !source.includes(regionUvs) || !source.includes(frameStart) || !uvDraw.test(source)) {
      return source;
    }
    const patched = source
      .replace(frameStart, frameStart + '$wnd.__BlobioLiquidJellyFrame(qxe.d.a,a.w);')
      .replace(cellLoop, '$&a.c.__blobioLiquidJellyCell=$wnd.__blobioLiquidJellyEnabled&&g.c.M==1?g:null;')
      .replace(beforeNames, beforeNames + 'a.c.__blobioLiquidJellyCell=null;')
      .replace(regionUvs, regionUvs + 'if(a.__blobioLiquidJellyCell){var liquidCell=a.__blobioLiquidJellyCell;var liquid=$wnd.__BlobioLiquidJellyMotion(liquidCell);var skinScale=liquidCell.O>0?2*liquidCell.M/liquidCell.O-1:1;skinScale=Math.max(0.6,Math.min(2,skinScale+Math.max(0,skinScale-1)*2));l=8.5+(skinScale-1)*0.4+(Math.round(liquid.contactX*4096)+64)*128+Math.round(liquid.x*1024)+64;m=l+16384;n=8.5+(Math.round(liquid.contactY*4096)+64)*128+Math.round(liquid.y*1024)+64;o=n+16384;c+=liquid.offsetX-e*0.05;d+=liquid.offsetY-f*0.05;h+=liquid.offsetX+e*0.05;i+=liquid.offsetY+f*0.05;}')
      .replace(uvDraw, (match) => match.replace('if(!a.j)',
        'if(a.__blobioLiquidJellyCell){var liquidCell=a.__blobioLiquidJellyCell;var liquid=$wnd.__BlobioLiquidJellyMotion(liquidCell);var skinScale=liquidCell.O>0?2*liquidCell.M/liquidCell.O-1:1;skinScale=Math.max(0.6,Math.min(2,skinScale+Math.max(0,skinScale-1)*2));g=8.5+(skinScale-1)*0.4+(Math.round(liquid.contactX*4096)+64)*128+Math.round(liquid.x*1024)+64;i=g+16384;h=8.5+(Math.round(liquid.contactY*4096)+64)*128+Math.round(liquid.y*1024)+64;j=h+16384;c+=liquid.offsetX-e*0.05;d+=liquid.offsetY-f*0.05;e*=1.1;f*=1.1;}if(!a.j)'));
    state.bundlePatches += 1;
    return patched;
  }

  function patchShader(source) {
    if (typeof source !== 'string' || source.includes(marker)) {
      return source;
    }
    if (source.includes('attribute vec2 a_texCoord0;')
        && source.includes('varying float v_scale;')
        && source.includes('void main()')
        && source.includes('gl_Position = u_projTrans * a_position;')) {
      state.vertexPatches += 1;
      return source.replace('void main()', [
        `// ${marker}`,
        'uniform mediump float u_time;',
        'varying mediump vec4 v_blobioLiquid;',
        'varying mediump vec3 v_blobioContact;',
        'varying mediump float v_blobioSkinScale;',
        'void main()',
      ].join('\n')).replace('gl_Position = u_projTrans * a_position;', [
        'v_blobioLiquid = vec4(0.0);',
        'v_blobioContact = vec3(0.0);',
        'v_blobioSkinScale = 0.0;',
        'bool liquidCell = false;',
        'vec2 motion = vec2(0.0);',
        'if (a_texCoord0.x >= 8.0 && a_texCoord0.y >= 8.0) {',
        '    float side = step(16384.0, a_texCoord0.x);',
        '    float verticalSide = step(16384.0, a_texCoord0.y);',
        '    highp vec2 code = floor(a_texCoord0 - 8.0 - vec2(side, verticalSide) * 16384.0);',
        '    motion = (mod(code, 128.0) - 64.0) / 1024.0;',
        '    v_blobioContact.xy = (floor(code / 128.0) - 64.0) / 4096.0;',
        '    v_blobioSkinScale = clamp(1.0 + (fract(a_texCoord0.x) - 0.5) / 0.4, 0.6, 2.0);',
        '    liquidCell = true;',
        '    v_texCoords = (vec2(side, verticalSide) - 0.5) * 1.1 + 0.5;',
        '}',
        ...(source.includes('varying mediump float v_blobioGlowRadius;') ? [
          'if (abs(a_texCoord0.x) >= 8.0 && a_texCoord0.y <= -8.0) {',
          '    highp float glowCode = abs(a_texCoord0.x) - 8.0;',
          '    highp float borderCode = -a_texCoord0.y - 8.0;',
          '    float verticalSide = step(16384.0, borderCode);',
          '    v_blobioGlowRadius = fract(glowCode);',
          '    v_blobioBorderWidth = fract(borderCode);',
          '    highp vec2 code = floor(vec2(glowCode, borderCode - verticalSide * 16384.0));',
          '    motion = (mod(code, 128.0) - 64.0) / 1024.0;',
          '    v_blobioContact.xy = (floor(code / 128.0) - 64.0) / 4096.0;',
          '    liquidCell = true;',
          '    vec2 corner = vec2(a_texCoord0.x < 0.0 ? 0.0 : 1.0, verticalSide);',
          '    v_texCoords = (corner - 0.5) * 1.1 + 0.5;',
          '}',
        ] : []),
        'if (liquidCell) {',
        '    v_scale = 0.0;',
        '    v_blobioContact.z = length(v_blobioContact.xy);',
        '    v_blobioContact.xy /= max(v_blobioContact.z, 0.0001);',
        '    vec3 wave = vec3(motion + vec2(1.0, 0.6) * sin(u_time * 0.55) * 0.001,',
        '        sin(u_time * 0.61) * 0.0015 + motion.y * 0.1);',
        '    v_blobioLiquid = vec4(wave, inversesqrt(1.0 + 0.5 * dot(wave, wave)));',
        '}',
        'gl_Position = u_projTrans * a_position;',
      ].join('\n'));
    }
    const scale = /float\s+scale\s*=\s*([^;]+);\s*RADIUS\s*-=\s*scale\s*;/;
    const main = /void main\s*\(\s*\)\s*\{/;
    if (!source.includes('varying float v_scale;') || !source.includes('uniform float u_time;')
        || !source.includes('const vec2 CENTER_COORD = vec2(0.5, 0.5);')
        || !source.includes('texture2D(u_texture, v_texCoords)')
        || !scale.test(source) || !main.test(source)) {
      return source;
    }
    const start = source.search(main);
    let header = source.slice(0, start);
    let body = source.slice(start);
    header = header.replace('uniform float u_time;', 'uniform mediump float u_time;')
      .replace('const vec2 CENTER_COORD = vec2(0.5, 0.5);', [
        'const vec2 CENTER_COORD = vec2(0.5, 0.5);',
        `// ${marker}`,
        'varying mediump vec4 v_blobioLiquid;',
        'varying mediump vec3 v_blobioContact;',
        'varying mediump float v_blobioSkinScale;',
        'vec2 blobioLiquidSkinUv(vec2 uv) {',
        '    if (v_blobioSkinScale == 0.0 || v_blobioSkinScale == 1.0) return uv;',
        '    vec2 p = (uv - CENTER_COORD) * v_blobioSkinScale;',
        '    p *= min(1.0, 0.49 * inversesqrt(max(dot(p, p), 0.000001)));',
        '    return CENTER_COORD + p;',
        '}',
        'vec2 blobioLiquidUv(vec2 uv) {',
        '    if (v_blobioLiquid.w == 0.0) return uv;',
        '    vec2 p = (uv - CENTER_COORD) * 2.0;',
        '    float radiusSquared = dot(p, p);',
        '    vec2 direction = p * inversesqrt(max(radiusSquared, 0.0001));',
        '    vec2 second = vec2(direction.x * direction.x - direction.y * direction.y,',
        '        2.0 * direction.x * direction.y);',
        '    float third = second.x * direction.x - second.y * direction.y;',
        '    float wave = dot(second, v_blobioLiquid.xy) + third * v_blobioLiquid.z;',
        '    if (v_blobioContact.z > 0.0001) {',
        '        float facing = max(dot(direction, v_blobioContact.xy), 0.0);',
        '        float envelope = facing * facing;',
        '        float dent = envelope * envelope;',
        '        wave += v_blobioContact.z * 1.3 * (1.8 * envelope - 5.8 * dent * dent);',
        '    }',
        '    wave = clamp(wave, -0.063, 0.063);',
        '    float scale = (1.0 + wave * min(radiusSquared * 2.0, 1.0)) * v_blobioLiquid.w;',
        '    return CENTER_COORD + (uv - CENTER_COORD) / scale;',
        '}',
      ].join('\n'));
    body = body.replace('float d = length(v_texCoords * 2.0 - 1.0);', [
      'float d = length(v_texCoords * 2.0 - 1.0);',
      'if (v_blobioLiquid.w > 0.0) {',
      '    vec2 cellUv = (v_texCoords - CENTER_COORD) / v_blobioGlowRadius + CENTER_COORD;',
      '    d = length((blobioLiquidUv(cellUv) - CENTER_COORD) * 2.0) * v_blobioGlowRadius;',
      '}',
    ].join('\n'));
    // Special overlays return before the skin path; names have no UV tag.
    body = body.replace(scale, (_match, nativeScale) => [
      'vec2 liquidUv = v_blobioLiquid.w > 0.0 ? blobioLiquidUv(v_texCoords) : v_texCoords;',
      'vec2 skinUv = blobioLiquidSkinUv(liquidUv);',
      `float scale = v_blobioLiquid.w > 0.0 ? 0.0 : ${nativeScale};`,
      'RADIUS -= scale;',
    ].join('\n'))
      .replaceAll('texture2D(u_texture, v_texCoords)', 'texture2D(u_texture, skinUv)')
      .replaceAll('texture2D(u_texture, relCoords)', 'texture2D(u_texture, v_blobioSkinScale > 0.0 && v_blobioSkinScale != 1.0 ? skinUv : relCoords)')
      .replaceAll('length(CENTER_COORD - v_texCoords)', 'length(CENTER_COORD - liquidUv)')
      .replaceAll('vec2 relCoords = v_texCoords - CENTER_COORD;', 'vec2 relCoords = liquidUv - CENTER_COORD;');
    const emptyStart = header.indexOf('void drawEmptyCell()');
    if (emptyStart >= 0) {
      header = header.slice(0, emptyStart) + header.slice(emptyStart)
        .replace('length(CENTER_COORD - v_texCoords)', 'length(CENTER_COORD - blobioLiquidUv(v_texCoords))')
        .replace('blobioJellyEmptyRadius(v_scale, v_texCoords)',
          '(v_blobioLiquid.w > 0.0 ? 0.5 : blobioJellyEmptyRadius(v_scale, v_texCoords))');
    }
    state.fragmentPatches += 1;
    return header + body;
  }
}
