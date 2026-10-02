/* ════════════════════════════════════════════════════════════════════
   Prism · Statue
   Refracted light flowing over a transparent cutout, on the GPU.
   Mark an image:  data-prism="liberty"          (statue + sparkle, from the "liberty" preset)
                   data-prism-statue="liberty"   (statue light only)
   Modes: "replace" (default) draws the whole picture on the GPU, with tint and
          clarity, and hides the original once the first frame is ready.
          "overlay" keeps the real image showing and only adds light on top.
   Either way the effect follows the image's position, size and opacity, so
   Webflow Interactions that move or fade the image still work.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var P = window.Prism;
  if (!P || !P.core) { console.warn('Prism: load prism-core before prism-statue'); return; }
  var U = P.util;

var createShader=(function(){
  var VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS=[
  "precision highp float;",
  "uniform vec2 uRes;uniform vec4 uFit;uniform vec2 uTexel;uniform sampler2D uImg;uniform sampler2D uRamp;",
  "uniform float uTime,uDpr,uLight,uTint,uClarity,uSpeed,uFlow,uFlowScale,uAngle,uScale,uSharp,uFollow,uDisp,uHue,uThresh,uSoft,uEdge,uGlitter,uGSize,uTwinkle,uGrain,uOverlay;",
  "vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}",
  "float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}",
  "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}",
  "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
  "float L(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}",
  "float box(vec2 u){return step(0.,u.x)*step(u.x,1.)*step(0.,u.y)*step(u.y,1.);}",
  "vec4 tA(vec2 px){vec2 u=(px-uFit.xy)/uFit.zw;return texture2D(uImg,clamp(u,0.,1.))*box(u);}",
  "vec4 T(vec2 px){return tA(px);}",
  "vec3 ramp(float x){return texture2D(uRamp,vec2(fract(x),.5)).rgb;}",
  "float band(float x){return pow(.5+.5*cos(6.2831853*x),uSharp);}",
  "void main(){",
  " vec2 pix=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
  " float inside=1.;",
  " vec4 c0=T(pix);float A=c0.a;vec3 base=c0.rgb;",
  " vec3 light=vec3(0.),tinted=vec3(0.);float lum=0.,warp=0.,t=uTime;",
  " if(A>.003){",   
  " vec2 o=vec2(uFit.z*uTexel.x,uFit.w*uTexel.y)*1.25;",
  " vec3 n1=T(pix+vec2(o.x,0.)).rgb,n2=T(pix-vec2(o.x,0.)).rgb,n3=T(pix+vec2(0.,o.y)).rgb,n4=T(pix-vec2(0.,o.y)).rgb;",
  " vec3 blur=(n1+n2+n3+n4)*.25;",
  " base=max(base+(base-blur)*uClarity*1.6*inside,0.)*inside;",
  "  lum=L(base);",
  " float gx=L(n1)-L(n2),gy=L(n3)-L(n4);",
  " float edge=clamp(length(vec2(gx,gy))*3.5,0.,1.);",
    " vec2 p=pix/uRes.y;",
  " vec2 dir=vec2(cos(uAngle),sin(uAngle));",
  " vec2 q=p*uFlowScale;",
  " vec2 w=vec2(fbm(q+vec2(0.,t*.13)),fbm(q+vec2(5.2,1.3)-vec2(t*.11,0.)));",
  "  warp=fbm(q+1.7*w+vec2(t*.08,-t*.06));",
  " float ph=dot(p,dir)*uScale+warp*uFlow+lum*uFollow-t*uSpeed;",
  " float d=uDisp*.06;",
  " float hue=ph*.31+warp*.35+t*.015+uHue;",
  " vec3 lt=vec3(ramp(hue-d*2.).r*band(ph-d),ramp(hue).g*band(ph),ramp(hue+d*2.).b*band(ph+d));",
  " float hl=smoothstep(uThresh,uThresh+uSoft,lum);",
  " float m=clamp(hl+edge*uEdge,0.,1.)*inside*A;",
  "  light=lt*m*uLight;",
  "  tinted=ramp(lum*.6+warp*.15+uHue)*lum*1.35;",
  " }",
  " vec3 col=mix(base,max(base,tinted*A),uTint*inside);",
  " col=1.-(1.-col)*(1.-clamp(light,0.,1.));",
  " col+=light*light*.35;",
  " vec3 gl=vec3(0.);",
  " if(uGlitter>0.001){",
  "  float cs=uGSize*uDpr;",
  "  vec2 g=floor(pix/cs);",
  "  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){",
  "   vec2 c=g+vec2(float(i),float(j));",
  "   float h=h21(c);",
  "   if(h>uGlitter*.4)continue;",
  "   vec2 ctr=(c+vec2(h21(c+3.1),h21(c+7.7)))*cs;",
  "   float gate=smoothstep(uThresh+.05,uThresh+.35,L(T(ctr).rgb));",
  "   float tw=.5+.5*sin(t*6.2831853*uTwinkle*(.55+.45*h21(c+1.3))+h21(c+9.1)*6.2831853);",
  "   tw=tw*tw*tw*tw*tw*tw;",
  "   vec2 dd=pix-ctr;float r=cs*(.45+.6*h21(c+4.4));",
  "   float st=exp(-abs(dd.x)/(r*.045))*exp(-abs(dd.y)/r)+exp(-abs(dd.y)/(r*.045))*exp(-abs(dd.x)/r);",
  "   float core=exp(-dot(dd,dd)/(r*r*.012));",
  "   vec3 tc=mix(vec3(1.,.97,.92),ramp(h21(c+2.)),.5);",
  "   gl+=tc*(st*.55+core)*tw*gate;",
  "  }",
  " }",
  " col+=gl*1.1;",
  " if(uOverlay>.5){",
  "  vec3 add=clamp(light+light*light*.35+gl*1.1+max(tinted*A-base,0.)*uTint*.6,0.,1.);",
  "  gl_FragColor=vec4(add,max(add.r,max(add.g,add.b)));return;",
  " }",
  " col+=(h21(pix+fract(t*7.)*91.)-.5)*uGrain*A;",
  " col=clamp(col/(1.+max(col-1.,0.)*.6),0.,1.);",
  " float oa=max(A,max(col.r,max(col.g,col.b)));",
  " gl_FragColor=vec4(col,oa);",
  "}"].join("\n");
  
  var PALETTES={
   prism:{name:"Prism",stops:["#FEFBF6","#FFD175","#F5A461","#FFD175","#FFF4E4","#B86DFD","#7363F8","#487EF7","#50E4FF","#F2FBFF"]},
   diamond:{name:"Diamond fire",stops:["#FFF7EC","#FFD27A","#FF9A4A","#FF6FAE","#9B6BFF","#4D7BFF","#6FE6FF","#EAF8FF"]},
   crystal:{name:"Crystal",stops:["#FFFFFF","#FFE7BF","#E9A84A","#FFD27A","#9AA6FF","#5A68E8","#DCE2FF"]},
   shard:{name:"Shard",stops:["#FFF1D8","#EAB84F","#C97632","#4A35B8","#1C4297","#6E8BFF","#FFF6EA"]},
   champagne:{name:"Champagne",stops:["#FFFFFF","#FFF0D2","#F2C98A","#F7B7A3","#D9C4FF","#FFFFFF"]},
   thermal:{name:"Thermal",stops:["#00166D","#00AAFF","#FFCB5C","#FF4400","#F384FF","#FFFFFF"]}
  };
  var DEFAULTS={palette:"prism",light:1.0,tint:.1,clarity:.45,speed:.22,flow:1.15,flowScale:1.5,angle:-35,scale:2.1,sharp:2.6,follow:.55,disp:.45,hue:0,thresh:.32,soft:.38,edge:.75,glitter:.45,gsize:20,twinkle:.7,grain:.02,quality:2};
  
  function hex(h){return[parseInt(h.substr(1,2),16)/255,parseInt(h.substr(3,2),16)/255,parseInt(h.substr(5,2),16)/255];}
  function lin(c){return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
  function gam(c){c=Math.max(0,Math.min(1,c));return c<=.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-.055;}
  function toLab(rgb){var r=lin(rgb[0]),g=lin(rgb[1]),b=lin(rgb[2]);
   var l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
   return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
  function fromLab(c){var l=c[0]+.3963377774*c[1]+.2158037573*c[2],m=c[0]-.1055613458*c[1]-.0638541728*c[2],s=c[0]-.0894841775*c[1]-1.291485548*c[2];l*=l*l;m*=m*m;s*=s*s;
   return[gam(4.0767416621*l-3.3077115913*m+.2309699292*s),gam(-1.2684380046*l+2.6097574011*m-.3413193965*s),gam(-.0041960863*l-.7034186147*m+1.707614701*s)];}
  function rampData(stops){var labs=stops.map(function(h){return toLab(hex(h));}),n=labs.length,out=new Uint8Array(256*4);
   for(var i=0;i<256;i++){var x=i/256*n,k=Math.floor(x),f=x-k,a=labs[k%n],b=labs[(k+1)%n];f=f*f*(3-2*f);
    var c=fromLab([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]);out[i*4]=c[0]*255;out[i*4+1]=c[1]*255;out[i*4+2]=c[2]*255;out[i*4+3]=255;}
   return out;}
  
  function create(canvas,image,settings,opts){
   opts=opts||{};
   var S={};for(var k in DEFAULTS)S[k]=DEFAULTS[k];for(k in settings)S[k]=settings[k];
   var gl=canvas.getContext("webgl",{antialias:false,premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:false,powerPreference:"high-performance"});
   if(!gl){if(opts.onError)opts.onError();return null;}
   canvas.addEventListener("webglcontextlost",function(e){e.preventDefault();if(opts.onLost)opts.onLost();});
   function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
   var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
   var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   var al=gl.getAttribLocation(pr,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
   var U={};["uRes","uFit","uTexel","uImg","uRamp","uTime","uDpr","uLight","uTint","uClarity","uSpeed","uFlow","uFlowScale","uAngle","uScale","uSharp","uFollow","uDisp","uHue","uThresh","uSoft","uEdge","uGlitter","uGSize","uTwinkle","uGrain","uOverlay"].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);});
   function tex(){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;}
   var tImg=tex();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   var tRamp=tex();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   var iw=1,ih=1;
   function upload(unit,t,im){gl.activeTexture(unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);}
   function setImage(im){iw=im.naturalWidth||im.width;ih=im.naturalHeight||im.height;upload(gl.TEXTURE0,tImg,im);still=0;}
   function contain(bx,by,bw,bh,tw,th){var s=Math.min(bw/tw,bh/th),w=tw*s,h=th*s;return[bx+(bw-w)/2,by+(bh-h)/2,w,h];}
   function setPalette(){var p=PALETTES[S.palette]||PALETTES.prism;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tRamp);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,1,0,gl.RGBA,gl.UNSIGNED_BYTE,rampData(p.stops));}
   var acc=0,still=0,paused=false;setImage(image);setPalette();gl.uniform1i(U.uImg,0);gl.uniform1i(U.uRamp,1);
   var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
   var W=0,H=0,dpr=1;
   function resize(){dpr=Math.min(window.devicePixelRatio||1,S.quality);var r=canvas.getBoundingClientRect();W=Math.max(1,Math.round(r.width*dpr));H=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}gl.viewport(0,0,W,H);}
   var ro=window.ResizeObserver?new ResizeObserver(resize):null;if(ro)ro.observe(canvas);else window.addEventListener("resize",resize);resize();
   var visible=true;
   if(opts.observe&&window.IntersectionObserver){new IntersectionObserver(function(e){visible=e[0].isIntersecting;},{rootMargin:"100px"}).observe(canvas);}
   var clock=0,last=performance.now(),raf=0,frames=0,fpsT=last;
   function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
   function frame(now){raf=requestAnimationFrame(frame);acc+=(now-last)/1000;last=now;if(!visible)return;if(S.fps&&acc<1/S.fps-.004)return;var dt=Math.min(.1,acc);acc=0;
    if(paused){if(still)return;still=1;}else{still=0;clock+=dt*(reduce?0.25:1);}
    var B;if(opts.fit){var F=opts.fit();if(!F)return;B=[F[0]*dpr,F[1]*dpr,F[2]*dpr,F[3]*dpr];}else{var pad=(opts.pad||0)*dpr;B=[pad,pad,W-2*pad,H-2*pad];}
    var FA=contain(B[0],B[1],B[2],B[3],iw,ih);
    gl.uniform2f(U.uRes,W,H);gl.uniform4f(U.uFit,FA[0],FA[1],FA[2],FA[3]);gl.uniform2f(U.uTexel,1/iw,1/ih);
    gl.uniform1f(U.uTime,clock);gl.uniform1f(U.uDpr,dpr);
    gl.uniform1f(U.uLight,S.light);gl.uniform1f(U.uTint,S.tint);gl.uniform1f(U.uClarity,S.clarity);
    gl.uniform1f(U.uSpeed,clamp(S.speed,0,1));gl.uniform1f(U.uFlow,S.flow);gl.uniform1f(U.uFlowScale,S.flowScale);
    gl.uniform1f(U.uAngle,S.angle*Math.PI/180);gl.uniform1f(U.uScale,S.scale);gl.uniform1f(U.uSharp,S.sharp);gl.uniform1f(U.uFollow,S.follow);
    gl.uniform1f(U.uDisp,S.disp);gl.uniform1f(U.uHue,S.hue);gl.uniform1f(U.uThresh,S.thresh);gl.uniform1f(U.uSoft,Math.max(.01,S.soft));gl.uniform1f(U.uEdge,S.edge);
    gl.uniform1f(U.uGlitter,S.glitter);gl.uniform1f(U.uGSize,S.gsize);gl.uniform1f(U.uTwinkle,reduce?0:clamp(S.twinkle,0,1.5));gl.uniform1f(U.uGrain,S.grain);gl.uniform1f(U.uOverlay,opts.overlay?1:0);
    gl.drawArrays(gl.TRIANGLES,0,3);if(opts.onFirstFrame&&!opts.__done){opts.__done=1;opts.onFirstFrame();}
    frames++;if(opts.onFps&&now-fpsT>1000){opts.onFps(Math.round(frames*1000/(now-fpsT)));frames=0;fpsT=now;}
   }
   raf=requestAnimationFrame(frame);
   return{
    destroy:function(){cancelAnimationFrame(raf);if(ro)ro.disconnect();var x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();},
    settings:S,
    set:function(k,v){S[k]=v;still=0;if(k==="palette")setPalette();if(k==="quality")resize();},
    setAll:function(o){for(var k in o)S[k]=o[k];setPalette();resize();},
    setImage:setImage,canvas:canvas,
    pause:function(p){paused=p;},
    isPaused:function(){return paused;}
   };
  }
  create.PALETTES=PALETTES;create.DEFAULTS=DEFAULTS;
  return create;
  })();
  
  P.STATUE_DEFAULTS = { mode: 'replace', palette: 'prism', light: 1, tint: .08, clarity: .4, speed: .22, flow: 1.15, flowScale: 1.5, scale: 2.1, sharp: 2.6,
    follow: .55, disp: .45, hue: 0, thresh: .32, soft: .38, edge: .75, glitter: .45, gsize: 20, twinkle: .7, grain: 0, quality: 2,
    fps: 30,             // light moves slowly; 30 frames a second looks the same as 60 at half the work
    maxPixels: 1200000   // per image: sharpness is capped so a large image never draws more than this
  };
  P.IMAGE_DEFAULTS = P.IMAGE_DEFAULTS || {};
  P.IMAGE_DEFAULTS.effects = P.IMAGE_DEFAULTS.effects || ['statue', 'sparkle'];
  P.IMAGE_DEFAULTS.pad = P.IMAGE_DEFAULTS.pad != null ? P.IMAGE_DEFAULTS.pad : .3;
  P.IMAGE_DEFAULTS.statue = P.STATUE_DEFAULTS;
  P.shader = createShader;
  P.STATUE_PALETTES = Object.keys(createShader.PALETTES);
  /* Browsers allow only a few GPU contexts. Images off screen pause (instant to resume);
     past the budget, the one seen longest ago gives its context back. */
  var BUDGET = 6, pool = [];
  function reclaim() {
    var live = pool.filter(function (r) { return r.fx; });
    if (live.length < BUDGET) return true;
    var idle = live.filter(function (r) { return !r.visible; }).sort(function (a, b) { return a.seen - b.seen; })[0];
    if (idle) { idle.release(); return true; }
    return false;
  }

  function mount(img, settings) {
    var preset = function () { return img.getAttribute('data-prism-statue') || img.getAttribute('data-prism'); };
    var manual = !!settings, cfg = settings || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
    if (!settings && !img.hasAttribute('data-prism-statue') && (cfg.effects || []).indexOf('statue') < 0) return null;
    var S = U.merge(U.clone(P.STATUE_DEFAULTS), cfg.statue || {});
    var ov = P.overlay(img, cfg);
    var canvas = document.createElement('canvas'), alive = true;
    var overlay = S.mode !== 'replace';
    canvas.className = 'prism-statue';
    /* the GPU canvas covers the picture only, never the sparkle margin around it */
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;z-index:1;display:block;opacity:0;transition:opacity .9s ease' + (overlay ? ';mix-blend-mode:screen' : '');
    var rec = { fx: null, visible: false, seen: 0 };
    /* hide the original with a filter, not visibility, so screen readers keep its alt text and taps still reach it */
    var origFilter = img.style.filter;
    var hideImg = function () { img.style.filter = 'opacity(0)'; };
    var showImg = function () { if (!overlay) img.style.filter = origFilter; };
    var q = function () { var budget = Math.sqrt(S.maxPixels / Math.max(1, ov.w * ov.h)); return Math.max(.5, Math.min(S.quality, P.perf.scale([S.quality, 1.5, 1]), budget)); };
    var lastQ = 0;
    function resize() {
      Object.assign(canvas.style, { left: ov.pad + 'px', top: ov.pad + 'px', width: ov.w + 'px', height: ov.h + 'px' });
      var nq = q(); if (rec.fx && Math.abs(nq - lastQ) > .05) { lastQ = nq; rec.fx.set('quality', nq); }
    }
    rec.release = function () { if (!rec.fx) return; rec.fx.destroy(); rec.fx = null; canvas.style.opacity = 0; showImg(); };
    function show() {
      rec.visible = true; rec.seen = performance.now();
      if (!alive) return;
      if (rec.fx) { rec.fx.pause(false); return; }
      if (!reclaim()) return;
      ov.load().then(function (tex) {
        if (rec.fx || !rec.visible || !alive) return;
        try {
          resize(); var opts = U.clone(S); opts.quality = lastQ = q();
          rec.fx = createShader(canvas, tex, opts, {
            overlay: overlay,
            fit: function () { return [0, 0, ov.w, ov.h]; },
            onFirstFrame: function () { canvas.style.opacity = 1; if (!overlay) hideImg(); },
            onLost: function () { rec.fx = null; canvas.style.opacity = 0; showImg(); },
            onError: showImg,
          });
        } catch (e) { U.warn('statue effect unavailable', e); showImg(); }
      }, showImg);
    }
    function hide() { rec.visible = false; rec.seen = performance.now(); if (rec.fx) rec.fx.pause(true); }
    pool.push(rec);
    var layer = { el: canvas, show: show, hide: hide, resize: resize };
    ov.add(layer);
    P.perf.on(function () { if (rec.fx) rec.fx.set('quality', lastQ = q()); });
    var api = {
      settings: S, overlay: ov, kind: 'statue', defaults: P.STATUE_DEFAULTS,
      set: function (k, v) {
        S[k] = v;
        if (k === 'mode') { overlay = v !== 'replace'; rec.release(); img.style.filter = origFilter; canvas.style.mixBlendMode = overlay ? 'screen' : ''; if (rec.visible) show(); return; }
        if (rec.fx) rec.fx.set(k, (k === 'quality' || k === 'maxPixels') ? (lastQ = q()) : v);
      },
      reconfigure: function (next) {
        if (manual && !next) return;
        next = next || P.resolve('image', preset(), img, P.IMAGE_DEFAULTS);
        var st = U.merge(U.clone(P.STATUE_DEFAULTS), next.statue || {});
        for (var k in st) if (st[k] !== S[k]) api.set(k, st[k]);
      },
      destroy: function () { alive = false; rec.release(); ov.remove(layer); pool.splice(pool.indexOf(rec), 1); if (img.__prism) img.__prism.statue = undefined; },
    };
    return api;
  }

  P.statue = { mount: mount, defaults: P.STATUE_DEFAULTS };
  P.register('statue', { selector: 'img[data-prism], img[data-prism-statue]', mount: function (el, s) { return mount(el, s); } });
})();
