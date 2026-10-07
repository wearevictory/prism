/* ════════════════════════════════════════════════════════════════════
   Prism · Statue
   Liquid metal light on a transparent cutout, on the GPU.
   Mark an image:  data-prism="liberty"          (statue + sparkle, from the "liberty" preset)
                   data-prism-statue="liberty"   (statue only)

   Where the cursor rests (or a finger taps), the glass comes alive: the
   picture bends through a rounded glass surface, splits into colour, and
   catches spectral highlights. At rest it draws one still frame and stops,
   apart from an occasional faint hint that the image is interactive.

   The glass surface is built from the cutout's own outline and shading,
   so no depth map is needed.

   Modes: "replace" (default) draws the whole picture on the GPU and hides the
          original once the first frame is ready. "overlay" keeps the real
          image showing and only adds light on top (no refraction).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-statue'); return; }
  var U = P.util;

  /* ════ The renderer: one canvas, one GPU context, one shader pass ════ */
  var createShader = (function () {
    var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var FS = [
'precision highp float;',
'uniform vec2 uRes;uniform vec4 uFit;uniform vec2 uTexel;uniform sampler2D uImg;uniform sampler2D uRamp;uniform sampler2D uSurf;',
'uniform float uTime,uDpr,uLight,uTint,uClarity,uSpeed,uFlow,uFlowScale,uAngle,uScale,uSharp,uFollow,uDisp,uHue,uThresh,uSoft,uEdge,uGlitter,uGSize,uTwinkle,uGrain,uDebug,uOverlay;',
'uniform vec4 uPtr;   /* xy: light over the image, canvas px. z: height, px. w: strength 0-1 */',
'uniform vec4 uPool;  /* radius px, shimmer outside the pool, wrap, rainbow boost */',
'uniform vec4 uGlass; /* rounded edges, folds, liquid, ripple size */',
'uniform vec4 uRefr;  /* thickness px, colour split, highlights, polish */',
'uniform vec4 uRefl;  /* edge sheen, iridescence */',
'vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}',
'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}',
'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}',
'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
/* gradient noise with its analytic slope: liquid normals without derivative extensions or extra noise calls */
'vec2 h22(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}',
'vec3 noised(vec2 x){vec2 i=floor(x),f=fract(x);vec2 u=f*f*f*(f*(f*6.-15.)+10.);vec2 du=30.*f*f*(f*(f-2.)+1.);',
' vec2 ga=h22(i),gb=h22(i+vec2(1.,0.)),gc=h22(i+vec2(0.,1.)),gd=h22(i+vec2(1.,1.));',
' float va=dot(ga,f),vb=dot(gb,f-vec2(1.,0.)),vc=dot(gc,f-vec2(0.,1.)),vd=dot(gd,f-vec2(1.,1.));',
' return vec3(va+u.x*(vb-va)+u.y*(vc-va)+u.x*u.y*(va-vb-vc+vd),ga+u.x*(gb-ga)+u.y*(gc-ga)+u.x*u.y*(ga-gb-gc+gd)+du*(u.yx*(va-vb-vc+vd)+vec2(vb,vc)-va));}',
'float L(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}',
'float box(vec2 u){return step(0.,u.x)*step(u.x,1.)*step(0.,u.y)*step(u.y,1.);}',
'vec4 T(vec2 px){vec2 u=(px-uFit.xy)/uFit.zw;return texture2D(uImg,clamp(u,0.,1.))*box(u);}',
'vec3 ramp(float x){return texture2D(uRamp,vec2(fract(x),.5)).rgb;}',
'float band(float x){return pow(.5+.5*cos(6.2831853*x),uSharp);}',
'void main(){',
' vec2 pix=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);',
' vec4 c0=T(pix);float A=c0.a;vec3 base=c0.rgb;',
' vec3 light=vec3(0.),tinted=vec3(0.),refl=vec3(0.),N=vec3(0.,0.,1.);float lum=0.,warp=0.,t=uTime;',
/* the light pool: everywhere, so glitter can use it too */
' vec2 dp=uPtr.xy-pix;float pk=clamp(1.-length(dp)/max(uPool.x,1.),0.,1.);',
' float fall=uPtr.w*pk*pk*(3.-2.*pk);',
' float g=mix(uPool.y,1.,fall);',
' if(A>.003){',
'  vec4 sf=texture2D(uSurf,(pix-uFit.xy)/uFit.zw)*2.-1.;',
'  vec2 o=vec2(uFit.z*uTexel.x,uFit.w*uTexel.y)*1.25;',
'  vec3 n1=T(pix+vec2(o.x,0.)).rgb,n2=T(pix-vec2(o.x,0.)).rgb,n3=T(pix+vec2(0.,o.y)).rgb,n4=T(pix-vec2(0.,o.y)).rgb;',
'  vec3 detail=(base-(n1+n2+n3+n4)*.25)*uClarity*1.6;',
'  float gx=L(n1)-L(n2),gy=L(n3)-L(n4);',
'  float edge=clamp(length(vec2(gx,gy))*3.5,0.,1.);',
'  vec2 p=pix/uRes.y;vec2 dir=vec2(cos(uAngle),sin(uAngle));vec2 q=p*uFlowScale;',
'  vec2 w=vec2(fbm(q+vec2(0.,t*.13)),fbm(q+vec2(5.2,1.3)-vec2(t*.11,0.)));',
'  warp=fbm(q+1.7*w+vec2(t*.08,-t*.06));',
/* surface: rounded outline + the picture's own shading + liquid ripple */
'  vec2 tilt=sf.rg*uGlass.x+(sf.ba+vec2(gx,gy)*.6)*uGlass.y;',
'  if(uGlass.z>.001){vec2 lq=q*uGlass.w+warp*.9+vec2(t*.05,-t*.04);tilt+=(noised(lq).yz+noised(lq*2.07+vec2(3.1,7.7)).yz*.5)*uGlass.z*.35;}',
'  N=normalize(vec3(-tilt,1.));',
/* refraction bends through the smooth surface only (outline + ripple), so fine detail like the eyes never ghosts */
'  vec3 Nr=normalize(vec3(-(sf.rg*uGlass.x+sf.ba*uGlass.y*.2+(tilt-sf.rg*uGlass.x-(sf.ba+vec2(gx,gy)*.6)*uGlass.y)),1.));',
/* refraction: sample through the tilted glass, red and blue bent by different amounts */
'  vec3 refr=c0.rgb;',
'  if(fall>.002&&uRefr.x>0.){',
'   vec2 off=Nr.xy*uRefr.x*fall;float ia=1./max(A,.01);',
'   vec4 sr=T(pix+off*(1.-uRefr.y)),sg=T(pix+off),sb=T(pix+off*(1.+uRefr.y));',
'   refr=vec3(sr.a>.02?sr.r/sr.a:c0.r*ia,sg.a>.02?sg.g/sg.a:c0.g*ia,sb.a>.02?sb.b/sb.a:c0.b*ia)*A;',
'  }',
'  base=max(refr+detail,0.);',
'  lum=L(base);',
'  vec3 Ld=normalize(vec3(dp,uPtr.z));float ndl=max(dot(N,Ld),0.);',
'  float ph=dot(p,dir)*uScale+warp*uFlow+lum*uFollow+dot(N.xy,dir)*uPool.z-t*uSpeed;',
'  float d=uDisp*.06*(1.+fall*uPool.w);',
'  float hue=ph*.31+warp*.35+t*.015+uHue;',
'  vec3 lt=vec3(ramp(hue-d*2.).r*band(ph-d),ramp(hue).g*band(ph),ramp(hue+d*2.).b*band(ph+d));',
'  float hl=smoothstep(uThresh,uThresh+uSoft,lum);',
'  float m=clamp(hl+edge*uEdge,0.,1.)*A;',
'  light=lt*m*uLight*g*mix(1.,.55+.6*ndl,fall);',
'  tinted=ramp(lum*.6+warp*.15+uHue)*lum*1.35;',
/* reflections: spectral highlight + soft coloured sheen on curved edges, only in the pool */
'  vec3 H=normalize(Ld+vec3(0.,0.,1.));',
'  float sp=pow(max(dot(N,H),0.),uRefr.w)*(.2+.8*smoothstep(.06,.35,length(N.xy)));',  /* highlights live on curves and folds, not flat areas */
'  vec3 irid=ramp(dot(N,Ld)*uRefl.y+dot(N.xy,dir)*.5+uHue+t*.01);',
'  float rim=smoothstep(.12,.8,length(N.xy));',
'  vec3 sheen=ramp(N.x*.35-N.y*.25+.15+uHue+warp*.1);',
'  refl=(irid*sp*uRefr.z*(.35+.65*hl)+sheen*rim*uRefl.x*.6)*fall*A;',
' }',
' if(uDebug>.5){',
'  if(uDebug<1.5)gl_FragColor=vec4((N*.5+.5)*A,A);',
'  else gl_FragColor=vec4(mix(base*.35,vec3(1.,.78,.32)*A,fall*.85),A);',
'  return;',
' }',
' vec3 col=mix(base,max(base,tinted*A),uTint);',
' col=1.-(1.-col)*(1.-clamp(light,0.,1.));',
' col+=light*light*.35+refl;',
' vec3 gl=vec3(0.);',
' if(uGlitter>0.001&&g>.002){',
'  float cs=uGSize*uDpr;vec2 gc=floor(pix/cs);',
'  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){',
'   vec2 c=gc+vec2(float(i),float(j));float h=h21(c);',
'   if(h>uGlitter*.4)continue;',
'   vec2 ctr=(c+vec2(h21(c+3.1),h21(c+7.7)))*cs;',
'   float gate=smoothstep(uThresh+.05,uThresh+.35,L(T(ctr).rgb));',
'   float tw=.5+.5*sin(t*6.2831853*uTwinkle*(.55+.45*h21(c+1.3))+h21(c+9.1)*6.2831853);tw=tw*tw*tw*tw*tw*tw;',
'   vec2 dd=pix-ctr;float r=cs*(.45+.6*h21(c+4.4));',
'   float st=exp(-abs(dd.x)/(r*.045))*exp(-abs(dd.y)/r)+exp(-abs(dd.y)/(r*.045))*exp(-abs(dd.x)/r);',
'   float core=exp(-dot(dd,dd)/(r*r*.012));',
'   gl+=mix(vec3(1.,.97,.92),ramp(h21(c+2.)),.5)*(st*.55+core)*tw*gate;',
'  }',
' }',
' col+=gl*1.1*g;',
' if(uOverlay>.5){',
'  vec3 add=clamp(light+light*light*.35+refl+gl*1.1*g+max(tinted*A-base,0.)*uTint*.6,0.,1.);',
'  gl_FragColor=vec4(add,max(add.r,max(add.g,add.b)));return;',
' }',
' col+=(h21(pix+fract(t*7.)*91.)-.5)*uGrain*A;',
' col=clamp(col/(1.+max(col-1.,0.)*.6),0.,1.);',
' gl_FragColor=vec4(col,max(A,max(col.r,max(col.g,col.b))));',
'}'].join('\n');


    var PALETTES = {
      prism: { name: 'Prism', stops: ['#FEFBF6', '#FFD175', '#F5A461', '#FFD175', '#FFF4E4', '#B86DFD', '#7363F8', '#487EF7', '#50E4FF', '#F2FBFF'] },
      diamond: { name: 'Diamond fire', stops: ['#FFF7EC', '#FFD27A', '#FF9A4A', '#FF6FAE', '#9B6BFF', '#4D7BFF', '#6FE6FF', '#EAF8FF'] },
      crystal: { name: 'Crystal', stops: ['#FFFFFF', '#FFE7BF', '#E9A84A', '#FFD27A', '#9AA6FF', '#5A68E8', '#DCE2FF'] },
      shard: { name: 'Shard', stops: ['#FFF1D8', '#EAB84F', '#C97632', '#4A35B8', '#1C4297', '#6E8BFF', '#FFF6EA'] },
      champagne: { name: 'Champagne', stops: ['#FFFFFF', '#FFF0D2', '#F2C98A', '#F7B7A3', '#D9C4FF', '#FFFFFF'] },
      thermal: { name: 'Thermal', stops: ['#00166D', '#00AAFF', '#FFCB5C', '#FF4400', '#F384FF', '#FFFFFF'] }
    };
    function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
    function lin(c) { return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
    function gam(c) { c = Math.max(0, Math.min(1, c)); return c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055; }
    function toLab(rgb) { var r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
      var l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
      return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; }
    function fromLab(c) { var l = c[0] + .3963377774 * c[1] + .2158037573 * c[2], m = c[0] - .1055613458 * c[1] - .0638541728 * c[2], s = c[0] - .0894841775 * c[1] - 1.291485548 * c[2]; l *= l * l; m *= m * m; s *= s * s;
      return [gam(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), gam(-.0041960863 * l - .7034186147 * m + 1.707614701 * s)]; }
    function rampData(stops) { var labs = stops.map(function (h) { return toLab(hex(h)); }), n = labs.length, out = new Uint8Array(256 * 4);
      for (var i = 0; i < 256; i++) { var x = i / 256 * n, k = Math.floor(x), f = x - k, a = labs[k % n], b = labs[(k + 1) % n]; f = f * f * (3 - 2 * f);
        var c = fromLab([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); out[i * 4] = c[0] * 255; out[i * 4 + 1] = c[1] * 255; out[i * 4 + 2] = c[2] * 255; out[i * 4 + 3] = 255; }
      return out; }
    var UNIFORMS = ['uRes', 'uFit', 'uTexel', 'uImg', 'uRamp', 'uSurf', 'uTime', 'uDpr', 'uLight', 'uTint', 'uClarity', 'uSpeed', 'uFlow', 'uFlowScale', 'uAngle', 'uScale', 'uSharp', 'uFollow', 'uDisp', 'uHue', 'uThresh', 'uSoft', 'uEdge', 'uGlitter', 'uGSize', 'uTwinkle', 'uGrain', 'uDebug', 'uOverlay', 'uPtr', 'uPool', 'uGlass', 'uRefr', 'uRefl'];
    var NOPTR = { x: .5, y: .4, s: 0, hint: false, amb: 1 };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    /* opts: overlay, fit(), ptr (live object), step(dt, now), moving(), fpsCap(), onIdle(now),
             onFirstFrame, onLost, onError, reduce */
    function create(canvas, image, settings, opts) {
      opts = opts || {};
      var S = {}, k; for (k in settings) S[k] = settings[k];
      var gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl || gl.isContextLost()) { if (opts.onError) opts.onError(); return null; }
      var dead = false;
      var onLost = function (e) { e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0; var was = dead; dead = true; if (ro) ro.disconnect(); if (!was && opts.onLost) opts.onLost(); };
      canvas.addEventListener('webglcontextlost', onLost);
      function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
      var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
      var u = {}; UNIFORMS.forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
      function tex(unit, wrapS) { gl.activeTexture(unit); var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
      var tImg = tex(gl.TEXTURE0, gl.CLAMP_TO_EDGE), tRamp = tex(gl.TEXTURE1, gl.REPEAT), tSurf = tex(gl.TEXTURE2, gl.CLAMP_TO_EDGE);
      gl.uniform1i(u.uImg, 0); gl.uniform1i(u.uRamp, 1); gl.uniform1i(u.uSurf, 2);
      /* a flat surface until the real one is built in idle time */
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 128]));
      var iw = 1, ih = 1;
      function setImage(im) { iw = im.naturalWidth || im.width; ih = im.naturalHeight || im.height; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); }
      function setSurface(sf) { if (!sf) return; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tSurf); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sf.w, sf.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, sf.data); }
      function setPalette() { var p = PALETTES[S.palette] || PALETTES.champagne; gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tRamp); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rampData(p.stops)); }
      function contain(bx, by, bw, bh, tw, th) { var s = Math.min(bw / tw, bh / th), w = tw * s, h = th * s; return [bx + (bw - w) / 2, by + (bh - h) / 2, w, h]; }
      setImage(image); setPalette();

      var W = 1, H = 1, dpr = 1;
      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, S.quality);
        var w = canvas.clientWidth, h = canvas.clientHeight;   // layout size: ignores CSS transforms on ancestors
        W = Math.max(1, Math.round(w * dpr)); H = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
        wake();                                                 // resizing clears the canvas: always redraw
      }
      var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);

      /* drawing on demand: frames only while something moves, then one still frame and stop */
      var clock = 0, last = performance.now(), acc = 0, raf = 0, dirty = true, paused = false, frames = 0, fpsT = last;
      function frame(now) {
        raf = 0; if (dead) return;
        var dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; acc += dt;
        var cap = opts.fpsCap ? opts.fpsCap() : S.fps;
        if (!dirty && cap && acc < 1 / cap - .004) { raf = requestAnimationFrame(frame); return; }
        var step = acc; acc = 0;
        if (!paused && opts.step) opts.step(step, now);
        var moving = !paused && (opts.moving ? opts.moving() : true);
        if (moving && !opts.reduce) clock += step;
        draw(); dirty = false;
        frames++; if (opts.onFps && now - fpsT > 1000) { opts.onFps(Math.round(frames * 1000 / (now - fpsT))); frames = 0; fpsT = now; }
        if (moving) raf = requestAnimationFrame(frame); else if (opts.onIdle) opts.onIdle(now);
      }
      function draw() {
        if (gl.isContextLost()) return;
        var B; if (opts.fit) { var F = opts.fit(); if (!F) return; B = [F[0] * dpr, F[1] * dpr, F[2] * dpr, F[3] * dpr]; } else B = [0, 0, W, H];
        var FA = contain(B[0], B[1], B[2], B[3], iw, ih), L = opts.ptr || NOPTR, c = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
        gl.viewport(0, 0, W, H);
        gl.uniform2f(u.uRes, W, H); gl.uniform4f(u.uFit, FA[0], FA[1], FA[2], FA[3]); gl.uniform2f(u.uTexel, 1 / iw, 1 / ih);
        gl.uniform1f(u.uTime, clock); gl.uniform1f(u.uDpr, dpr);
        gl.uniform1f(u.uLight, S.light); gl.uniform1f(u.uTint, S.tint); gl.uniform1f(u.uClarity, S.clarity);
        gl.uniform1f(u.uSpeed, c(S.speed, 0, 1)); gl.uniform1f(u.uFlow, S.flow); gl.uniform1f(u.uFlowScale, S.flowScale);
        gl.uniform1f(u.uAngle, S.angle * Math.PI / 180); gl.uniform1f(u.uScale, S.scale); gl.uniform1f(u.uSharp, S.sharp); gl.uniform1f(u.uFollow, S.follow);
        gl.uniform1f(u.uDisp, S.disp); gl.uniform1f(u.uHue, S.hue); gl.uniform1f(u.uThresh, S.thresh); gl.uniform1f(u.uSoft, Math.max(.01, S.soft)); gl.uniform1f(u.uEdge, S.edge);
        gl.uniform1f(u.uGlitter, S.glitter); gl.uniform1f(u.uGSize, S.gsize); gl.uniform1f(u.uTwinkle, opts.reduce ? 0 : c(S.twinkle, 0, 1.5)); gl.uniform1f(u.uGrain, S.grain);
        gl.uniform1f(u.uOverlay, opts.overlay ? 1 : 0); gl.uniform1f(u.uDebug, S.view === 'surface' ? 1 : S.view === 'pool' ? 2 : 0);
        var R = S.radius * Math.max(FA[2], FA[3]) * (L.hint ? 1 : .35 + .65 * easeOut(Math.min(1, L.s)));
        gl.uniform4f(u.uPtr, FA[0] + L.x * FA[2], FA[1] + L.y * FA[3], S.elevation * FA[3], L.s);
        gl.uniform4f(u.uPool, R, L.amb == null ? 1 : L.amb, S.wrap, S.poolDisp);
        gl.uniform4f(u.uGlass, S.shape, S.folds, S.liquid, S.liquidScale);
        gl.uniform4f(u.uRefr, opts.overlay ? 0 : S.thickness * FA[3], S.spread, S.spec, S.shine);
        gl.uniform4f(u.uRefl, S.sheen, S.irid, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (opts.onFirstFrame && !opts.__done) { opts.__done = 1; opts.onFirstFrame(); }
      }
      function wake() { dirty = true; if (!raf && !dead) { last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); } }
      resize();
      return {
        destroy: function () { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); canvas.removeEventListener('webglcontextlost', onLost); var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); },
        settings: S,
        set: function (k, v) { S[k] = v; if (k === 'palette') setPalette(); if (k === 'quality') resize(); wake(); },
        setImage: function (im) { setImage(im); wake(); },
        setSurface: function (sf) { setSurface(sf); wake(); },
        canvas: canvas,
        pause: function (p) { paused = p; wake(); },
        isPaused: function () { return paused; },
        wake: wake,
        drawing: function () { return !!raf; }
      };
    }
    create.PALETTES = PALETTES;
    return create;
  })();

  /* ════ Glass surface, built once per image on the CPU from the cutout itself ════
     rg: slope of the blurred outline (the rounded glass edge)
     ba: slope of the picture's own shading (folds, hair, facets)
     Slopes are computed in floats, then stored, so there is no 8-bit stepping. */
  function blur3(src, w, h, r) {
    r = Math.max(1, Math.round(r)); var a = src, b = new Float32Array(w * h), n = 2 * r + 1, x, y, i, row, acc;
    for (var pass = 0; pass < 3; pass++) {
      for (y = 0; y < h; y++) { row = y * w; acc = 0; for (i = -r; i <= r; i++) acc += a[row + Math.min(w - 1, Math.max(0, i))];
        for (x = 0; x < w; x++) { b[row + x] = acc / n; acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      for (x = 0; x < w; x++) { acc = 0; for (i = -r; i <= r; i++) acc += b[Math.min(h - 1, Math.max(0, i)) * w + x];
        for (y = 0; y < h; y++) { a[y * w + x] = acc / n; acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
    }
    return a;
  }
  function buildSurface(im, bevel) {
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, k = Math.min(1, 512 / Math.max(iw, ih));
    var w = Math.max(8, Math.round(iw * k)), h = Math.max(8, Math.round(ih * k)), c = U.cv(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
    var px = x.getImageData(0, 0, w, h).data, N = w * h, alpha = new Float32Array(N), lum = new Float32Array(N), i;
    for (i = 0; i < N; i++) { var a = px[i * 4 + 3] / 255; alpha[i] = a; lum[i] = ((.2126 * px[i * 4] + .7152 * px[i * 4 + 1] + .0722 * px[i * 4 + 2]) / 255) * a + .5 * (1 - a); }
    var rb = Math.max(1, bevel * Math.max(w, h)), hgt = blur3(alpha, w, h, rb), sh = blur3(lum, w, h, 1.5);
    var out = new Uint8Array(N * 4), cl = function (v) { return Math.max(-1, Math.min(1, v)); };
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      i = yy * w + xx; var l = yy * w + Math.max(0, xx - 1), r = yy * w + Math.min(w - 1, xx + 1), up = Math.max(0, yy - 1) * w + xx, dn = Math.min(h - 1, yy + 1) * w + xx;
      out[i * 4] = 127.5 + 127.5 * cl((hgt[r] - hgt[l]) * rb); out[i * 4 + 1] = 127.5 + 127.5 * cl((hgt[dn] - hgt[up]) * rb);
      out[i * 4 + 2] = 127.5 + 127.5 * cl((sh[r] - sh[l]) * 3); out[i * 4 + 3] = 127.5 + 127.5 * cl((sh[dn] - sh[up]) * 3);
    }
    return { data: out, w: w, h: h };
  }

  /* ════ Settings ════ */
  P.STATUE_DEFAULTS = {
    mode: 'replace',
    /* the look: Liquid metal */
    palette: 'champagne', light: 1, tint: .25, clarity: .4, speed: .14, flow: 1.6, flowScale: 1.5, angle: -35, scale: 2.1, sharp: 2.6,
    follow: .55, disp: .45, hue: 0, thresh: .32, soft: .38, edge: .75, glitter: .15, gsize: 20, twinkle: .7, grain: 0,
    /* the light pool under the pointer */
    radius: .5, elevation: .75, idleLight: 0, wrap: .8, poolDisp: 1.5,
    /* the glass surface */
    shape: 1.3, bevel: .04, folds: .5, liquid: .75, liquidScale: 1.2,
    /* refraction and reflections */
    thickness: .004, spread: .25, spec: .8, shine: 30, irid: .6, sheen: .6,
    /* interaction */
    pointer: true,        // the light follows the cursor, or lands where a finger taps
    lag: 140,             // ms the light trails the pointer
    easeIn: .75, easeOut: .5,   // s to come alive and to settle; never faster than 0.15
    idle: 'hint',         // nobody interacting: 'still' | 'hint' | 'drift' | 'live'
    touchHold: 3.5,       // s the light stays after a tap
    touchDrag: true,      // a sideways finger drag moves the light (vertical scroll still works)
    hintStyle: 'sweep', hintEvery: 3, hintDur: 2, hintStrength: .6, hintRepeat: 'once',
    /* drawing */
    quality: 1.5,
    fps: 30,              // cap for hints, drift and live shimmer
    pointerFps: 60,       // cap while someone is interacting
    maxPixels: 1200000,   // per image: sharpness is capped so a large image never draws more than this
    view: 'final'         // 'final' | 'surface' | 'pool': diagnostic views for tuning
  };
  /* the Lab exports interaction under "reveal"; those values are read too (statue wins) */
  var FROM_REVEAL = { pointer: 'pointer', lag: 'lag', easeIn: 'easeIn', easeOut: 'easeOut', idle: 'idle', touchHold: 'touchHold', touchDrag: 'touchDrag',
    pointerFps: 'fps', hintStyle: 'hintStyle', hintEvery: 'hintEvery', hintDur: 'hintDur', hintStrength: 'hintStrength', hintRepeat: 'hintRepeat' };
  function resolveStatue(cfg) {
    var S = U.clone(P.STATUE_DEFAULTS), rv = cfg.reveal || {};
    for (var k in FROM_REVEAL) if (rv[FROM_REVEAL[k]] !== undefined) S[k] = rv[FROM_REVEAL[k]];
    U.merge(S, cfg.statue || {});
    return S;
  }
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.effects = P.IMAGE_DEFAULTS.effects || ['statue', 'sparkle'];
  P.IMAGE_DEFAULTS.pad = P.IMAGE_DEFAULTS.pad != null ? P.IMAGE_DEFAULTS.pad : .3;
  P.IMAGE_DEFAULTS.statue = P.STATUE_DEFAULTS;
  P.shader = createShader;
  P.STATUE_PALETTES = Object.keys(createShader.PALETTES);

  /* ════ Shared page state ════ */
  /* Browsers allow only a few GPU contexts. Off-screen or paused images keep theirs
     (instant to resume); past the budget, the one seen longest ago gives it back,
     and any image waiting for one gets it. */
  var BUDGET = 6, pool = [], lastScroll = -1e9;
  function reclaim() {
    var live = pool.filter(function (r) { return r.fx || r.loading; });   // count images still loading, or they all slip in at once
    if (live.length < BUDGET) return true;
    var idle = live.filter(function (r) { return r.fx && (!r.visible || r.held); }).sort(function (a, b) { return a.seen - b.seen; })[0];
    if (idle) { idle.release(); return true; }
    return false;
  }
  function retryWaiting() { pool.forEach(function (r) { if (!r.fx && r.visible && !r.held && r.retry) r.retry(); }); }
  addEventListener('scroll', function () { lastScroll = performance.now(); pool.forEach(function (r) { if (r.onScroll) r.onScroll(); }); }, { passive: true });
  document.addEventListener('visibilitychange', function () { pool.forEach(function (r) { if (r.onVisibility) r.onVisibility(); }); });
  var lastPointer = 'mouse';
  document.addEventListener('pointerdown', function (e) {
    lastPointer = e.pointerType || 'mouse';
    if (lastPointer === 'touch') pool.forEach(function (r) { if (r.onTouchAway && !r.box.contains(e.target)) r.onTouchAway(); });
  }, { capture: true, passive: true });

  /* ════ One image ════ */
  function mount(img, settings) {
    var preset = function () { return img.getAttribute('data-prism-statue') || img.getAttribute('data-prism') || img.getAttribute('data-prism-reveal'); };
    /* v2's data-prism-reveal (the wash) was removed: it now means the same as data-prism */
    if (img.hasAttribute('data-prism-reveal') && !mount.noted) { mount.noted = 1; U.warn('data-prism-reveal is now the same as data-prism: the wash was replaced by the pointer light in v3. You can rename the attribute.'); }
    var manual = !!settings, cfg = settings || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-statue') && (cfg.effects || []).indexOf('statue') < 0) return null;
    var S = resolveStatue(cfg);
    var ov = P.overlay(img, cfg);
    var box = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement.parentElement : img.parentElement;
    var canvas, alive = true, overlay = S.mode !== 'replace';
    function makeCanvas() {
      var c = document.createElement('canvas'); c.className = 'prism-statue';
      /* the GPU canvas covers the picture only, never the sparkle margin around it */
      c.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;z-index:1;display:block;opacity:0;transition:opacity .9s ease' + (overlay ? ';mix-blend-mode:screen' : '');
      return c;
    }
    canvas = makeCanvas();
    var rec = { fx: null, visible: false, seen: 0, held: false, box: box };
    /* hide the original with a filter, not visibility, so screen readers keep its alt text and taps still reach it */
    var origFilter = img.style.filter;
    var hideImg = function () { if (!overlay) img.style.filter = 'opacity(0)'; };
    var showImg = function () { img.style.filter = origFilter; };
    var q = function () { var budget = Math.sqrt(S.maxPixels / Math.max(1, ov.w * ov.h)); return Math.max(.5, Math.min(S.quality, P.perf.scale([S.quality, 1.5, 1]), budget)); };
    var lastQ = 0;
    function resize() {
      Object.assign(canvas.style, { left: ov.pad + 'px', top: ov.pad + 'px', width: ov.w + 'px', height: ov.h + 'px' });
      var nq = q(); if (rec.fx && Math.abs(nq - lastQ) > .05) { lastQ = nq; rec.fx.set('quality', nq); }
    }

    /* ── The light: positions are 0–1 over the image, eased each frame.
       Handlers only store numbers; the frame reads the canvas position once. ── */
    var L = { x: .5, y: .4, tx: .5, ty: .4, s: 0, target: 0, src: '', cx: 0, cy: 0, has: false, jump: false,
      tapU: .5, tapV: .4, holdUntil: 0, orbit: 0, drift: 0, hint: false, amb: 0, glow: 0, engaged: false };
    var HN = { t: -1, next: performance.now() + 1500, used: false, force: false, timer: 0 };
    var reduce = U.reduced;
    var idleMode = function () { return reduce && S.idle !== 'still' ? 'still' : S.idle; };
    var active = function () { return L.s > .001 || L.target > 0; };
    function moving() { var m = idleMode(); return active() || HN.t >= 0 || m === 'drift' || m === 'live'; }
    var hintsDone = function () { return S.hintRepeat === 'once' && HN.used && !HN.force; };
    function hintAllowed(now) {
      return S.pointer && idleMode() === 'hint' && !L.src && L.s < .001 && rec.visible && !rec.held && !document.hidden && now - lastScroll > 1000 && !hintsDone();
    }
    function armHint(now) {
      clearTimeout(HN.timer);
      if (!S.pointer || idleMode() !== 'hint' || hintsDone() || !rec.visible || rec.held) return;
      HN.timer = setTimeout(function () { var n = performance.now(); if (n >= HN.next - 5 && hintAllowed(n)) wake(); else { if (n >= HN.next) HN.next = n + 1000; armHint(n); } }, Math.max(50, HN.next - now) + 10);
    }
    function stopHint() { if (HN.t < 0) return; HN.t = -1; L.glow = 0; L.hint = false; L.s = 0; L.target = 0; wake(); }
    function previewHint() { HN.force = true; HN.t = -1; HN.next = performance.now() + 250; armHint(performance.now()); }
    function wake() { if (rec.fx) rec.fx.wake(); }
    function announce(on) {
      if (on === L.engaged) return; L.engaged = on;
      box.dispatchEvent(new CustomEvent('prism:light', { bubbles: true, detail: { active: on, image: img } }));
    }
    function step(dt, now) {
      var mode = idleMode();
      if (L.src) { if (L.s > .6) { HN.used = true; HN.force = false; } HN.next = now + S.hintEvery * 1000; if (HN.t >= 0) { HN.t = -1; L.glow = 0; L.hint = false; } }
      if (HN.t < 0 && now >= HN.next - 5 && !L.src && hintAllowed(now)) HN.t = 0;
      if (HN.t >= 0) {
        HN.t += dt; var hp = Math.min(1, HN.t / Math.max(.3, S.hintDur)), env = Math.sin(Math.PI * hp); env *= env;
        L.hint = true; var hs = Math.min(.6, S.hintStrength);
        if (S.hintStyle === 'sweep') { L.x = L.tx = -.1 + 1.2 * hp; L.y = L.ty = .28 + .3 * hp; L.s = hs * env; L.glow = 0; }
        else { L.s = 0; L.glow = hs * .6 * env; }
        if (hp >= 1) { HN.t = -1; L.glow = 0; L.hint = false; L.s = 0; HN.force = false; HN.next = now + S.hintEvery * 1000; }
        L.amb = (mode === 'live' ? 1 : S.idleLight) + L.glow;
        return;
      }
      if ((L.src === 'mouse' || L.src === 'touch') && L.has) {
        var r = canvas.getBoundingClientRect();
        if (r.width && r.height) { L.tx = U.clamp((L.cx - r.left) / r.width, 0, 1); L.ty = U.clamp((L.cy - r.top) / r.height, 0, 1); if (L.src === 'touch') { L.tapU = L.tx; L.tapV = L.ty; } }
      }
      if (L.jump) { L.x = L.tx; L.y = L.ty; L.jump = false; }
      /* touch: a slow orbit around the tap, then it settles */
      if (L.src === 'touch') {
        L.orbit += dt * (reduce ? 0 : .55);
        L.tx = L.tapU + Math.cos(L.orbit) * .035; L.ty = L.tapV + Math.sin(L.orbit) * .025;
        if (now > L.holdUntil) { L.target = 0; L.src = ''; }
      }
      /* drift: the light wanders on its own when nobody is interacting */
      if (!L.src && mode === 'drift') {
        L.drift += dt; var a = L.drift;
        L.tx = .5 + .3 * Math.sin(a * .19) * Math.cos(a * .07); L.ty = .42 + .22 * Math.sin(a * .13 + 1.3);
        L.target = .8; if (L.s < .01) { L.x = L.tx; L.y = L.ty; }
      } else if (!L.src && L.target > 0) L.target = 0;
      var follow = 1 - Math.exp(-dt / Math.max(.001, (reduce ? Math.max(S.lag, 300) : S.lag) / 1000));
      L.x += (L.tx - L.x) * follow; L.y += (L.ty - L.y) * follow;
      /* strength eases in and out, never faster than 0.15 s, for light-sensitive viewers */
      var tau = Math.max(.15, L.target > L.s ? S.easeIn : S.easeOut) / 3;
      L.s += (L.target - L.s) * (1 - Math.exp(-dt / tau));
      if (L.target === 0 && L.s < .001) L.s = 0;
      L.amb = (mode === 'live' ? 1 : S.idleLight) + L.glow;
      announce(!!L.src && L.target > 0);
    }

    /* pointer input, on the image's own wrapper (the effect layer never takes events) */
    function onEnter(e) { if (!S.pointer || e.pointerType === 'touch') return; L.src = 'mouse'; L.cx = e.clientX; L.cy = e.clientY; L.has = true; L.jump = L.s < .05; L.target = 1; wake(); }
    function onMove(e) {
      if (!S.pointer) return;
      if (e.pointerType === 'touch') { if (L.src !== 'touch' || !S.touchDrag) return; L.holdUntil = performance.now() + S.touchHold * 1000; }
      else if (L.src !== 'mouse') { L.src = 'mouse'; L.jump = L.s < .05; L.target = 1; }
      L.cx = e.clientX; L.cy = e.clientY; L.has = true; wake();
    }
    function onLeave(e) { if (e.pointerType === 'touch') return; if (L.src === 'mouse') { L.target = 0; L.src = ''; wake(); } }
    function onDown(e) {
      if (!S.pointer || e.pointerType !== 'touch') return;
      L.src = 'touch'; L.cx = e.clientX; L.cy = e.clientY; L.has = true; L.jump = L.s < .05; L.target = 1;
      L.holdUntil = performance.now() + S.touchHold * 1000; wake();
    }
    rec.onTouchAway = function () { if (L.src === 'touch') { L.target = 0; L.src = ''; wake(); } };
    rec.onScroll = function () { if (HN.t >= 0) { stopHint(); HN.next = lastScroll + 1200; } };
    rec.onVisibility = function () {
      if (document.hidden) { stopHint(); return; }
      HN.next = performance.now() + 1500; armHint(performance.now());
      if (!rec.fx && rec.visible && !rec.held) show();      // a context lost while away comes back
    };
    box.addEventListener('pointerenter', onEnter);
    box.addEventListener('pointermove', onMove, { passive: true });
    box.addEventListener('pointerleave', onLeave);
    box.addEventListener('pointerdown', onDown, { passive: true });
    var origTouch = box.style.touchAction;
    function touchStyle() { box.style.touchAction = S.pointer && S.touchDrag ? 'pan-y' : origTouch; }
    touchStyle();

    /* ── The glass surface: built in idle time, cached per edge width ── */
    var surfT = 0;
    function surface(tex) {
      ov.surfaces = ov.surfaces || {};
      var key = String(S.bevel);
      if (ov.surfaces[key]) { if (rec.fx) rec.fx.setSurface(ov.surfaces[key]); return; }
      U.idle(function () {
        if (!rec.fx) return;
        try { ov.surfaces[key] = buildSurface(tex, S.bevel); if (rec.fx) rec.fx.setSurface(ov.surfaces[key]); }
        catch (e) { U.warn('could not build the glass surface; the light still works without it', e); }
      });
    }

    rec.release = function () {
      if (!rec.fx) return;
      rec.fx.destroy(); rec.fx = null; showImg();
      /* a context given back can't be reused: swap in a fresh canvas for next time */
      var fresh = makeCanvas(); canvas.parentNode && canvas.parentNode.replaceChild(fresh, canvas); canvas = fresh; layer.el = fresh; resize();
      retryWaiting();
    };
    rec.retry = function () { show(); };
    function show() {
      rec.visible = true; rec.seen = performance.now();
      if (!alive || rec.held) return;
      if (rec.fx) { rec.fx.pause(false); canvas.style.opacity = 1; hideImg(); armHint(performance.now()); return; }
      if (rec.loading || !reclaim()) return;
      rec.loading = true;
      ov.load().then(function (tex) {
        rec.loading = false;
        if (rec.fx || !rec.visible || !alive || rec.held) return;
        try {
          resize(); var o = U.clone(S); o.quality = lastQ = q();
          var c = canvas;
          rec.fx = createShader(c, tex, o, {
            overlay: overlay, reduce: reduce, ptr: L,
            fit: function () { return [0, 0, ov.w, ov.h]; },
            step: step, moving: moving,
            fpsCap: function () { return active() && !L.hint ? S.pointerFps : S.fps; },
            onIdle: function (now) { armHint(now); },
            onFirstFrame: function () { c.style.opacity = 1; hideImg(); },
            onLost: function () {
              rec.fx = null; c.style.opacity = 0; showImg();
              c.addEventListener('webglcontextrestored', function () { if (alive && rec.visible && !rec.held && !rec.fx) show(); }, { once: true });
            },
            onError: showImg,
          });
          if (rec.fx) { surface(tex); armHint(performance.now()); }
        } catch (e) { U.warn('statue effect unavailable', e); rec.fx = null; showImg(); }
      }, function () { rec.loading = false; showImg(); });
    }
    function hide() { rec.visible = false; rec.seen = performance.now(); stopHint(); clearTimeout(HN.timer); L.target = 0; L.src = ''; L.s = 0; if (rec.fx) rec.fx.pause(true); retryWaiting(); }
    pool.push(rec);
    var layer = { el: canvas, show: show, hide: hide, resize: resize };
    ov.add(layer);
    P.perf.on(function () { if (rec.fx) rec.fx.set('quality', lastQ = q()); });

    var api = {
      settings: S, overlay: ov, kind: 'statue', defaults: P.STATUE_DEFAULTS,
      set: function (k, v) {
        S[k] = v;
        if (k === 'mode') { overlay = v !== 'replace'; rec.release(); showImg(); canvas.style.mixBlendMode = overlay ? 'screen' : ''; if (rec.visible) show(); return; }
        if (k === 'pointer' || k === 'touchDrag') touchStyle();
        if (k === 'bevel') { clearTimeout(surfT); surfT = setTimeout(function () { ov.load().then(surface, function () {}); }, 80); }
        if (/^hint/.test(k) || k === 'idle') previewHint();
        if (rec.fx) rec.fx.set(k, (k === 'quality' || k === 'maxPixels') ? (lastQ = q()) : v);
      },
      reconfigure: function (next) {
        if (manual && !next) return;
        next = next || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
        var st = resolveStatue(next);
        for (var k in st) if (st[k] !== S[k]) api.set(k, st[k]);
      },
      /* play one hint now (also after first use) */
      hint: function () { previewHint(); },
      /* pause(): stop drawing and show the plain image, but keep the GPU context so resume() is instant.
         Paused images are the first to give their context back when the budget is full. */
      pause: function () {
        if (rec.held) return;
        rec.held = true; rec.seen = performance.now(); layer.idle = true;
        stopHint(); clearTimeout(HN.timer); L.target = 0; L.src = ''; L.s = 0;
        if (rec.fx) rec.fx.pause(true);
        canvas.style.opacity = 0; showImg(); ov.sync(); retryWaiting();
      },
      resume: function () {
        if (!rec.held) return;
        rec.held = false; layer.idle = false; ov.sync();
        if (rec.visible) show();
      },
      isPaused: function () { return rec.held; },
      running: function () { return !!rec.fx && !rec.held; },
      drawing: function () { return !!rec.fx && rec.fx.drawing(); },
      destroy: function () {
        alive = false; clearTimeout(HN.timer); rec.release(); ov.remove(layer); pool.splice(pool.indexOf(rec), 1);
        box.removeEventListener('pointerenter', onEnter); box.removeEventListener('pointermove', onMove);
        box.removeEventListener('pointerleave', onLeave); box.removeEventListener('pointerdown', onDown);
        box.style.touchAction = origTouch;
        if (img.__prism) img.__prism.statue = undefined;
      },
    };
    return api;
  }

  P.statue = { mount: mount, defaults: P.STATUE_DEFAULTS };
  /* v2's prism-reveal.js exits when it finds this, so an old script tag left in Webflow can't add the wash back on top */
  P.reveal = P.reveal || { removed: 'v3.0.0' };
  P.register('statue', { selector: 'img[data-prism], img[data-prism-statue], img[data-prism-reveal]', mount: function (el, s) { return mount(el, s); } });
})();
