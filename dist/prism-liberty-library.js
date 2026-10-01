((window.createPrism = (function () {
  var t = [
      "precision highp float;",
      "uniform vec2 uRes;uniform vec4 uFit;uniform vec2 uTexel;uniform sampler2D uImg;uniform sampler2D uRamp;",
      "uniform float uTime,uDpr,uLight,uTint,uClarity,uSpeed,uFlow,uFlowScale,uAngle,uScale,uSharp,uFollow,uDisp,uHue,uThresh,uSoft,uEdge,uGlitter,uGSize,uTwinkle,uGrain;",
      "vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}",
      "float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}",
      "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}",
      "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
      "float L(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}",
      "vec3 img(vec2 u){return texture2D(uImg,u).rgb;}",
      "float alp(vec2 u){return texture2D(uImg,u).a;}",
      "vec3 ramp(float x){return texture2D(uRamp,vec2(fract(x),.5)).rgb;}",
      "float band(float x){return pow(.5+.5*cos(6.2831853*x),uSharp);}",
      "void main(){",
      " vec2 pix=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
      " vec2 uv=(pix-uFit.xy)/uFit.zw;",
      " float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);",
      " uv=clamp(uv,0.,1.);",
      " float A=alp(uv)*inside;",
      " vec3 base=img(uv)*inside;",
      " vec2 o=uTexel*1.25;",
      " vec3 n1=img(uv+vec2(o.x,0.)),n2=img(uv-vec2(o.x,0.)),n3=img(uv+vec2(0.,o.y)),n4=img(uv-vec2(0.,o.y));",
      " vec3 blur=(n1+n2+n3+n4)*.25;",
      " base=max(base+(base-blur)*uClarity*1.6*inside,0.)*inside;",
      " float lum=L(base);",
      " float gx=L(n1)-L(n2),gy=L(n3)-L(n4);",
      " float edge=clamp(length(vec2(gx,gy))*3.5,0.,1.);",
      " float t=uTime;",
      " vec2 p=(pix-uFit.xy)/uFit.w;",
      " vec2 dir=vec2(cos(uAngle),sin(uAngle));",
      " vec2 q=p*uFlowScale;",
      " vec2 w=vec2(fbm(q+vec2(0.,t*.13)),fbm(q+vec2(5.2,1.3)-vec2(t*.11,0.)));",
      " float warp=fbm(q+1.7*w+vec2(t*.08,-t*.06));",
      " float ph=dot(p,dir)*uScale+warp*uFlow+lum*uFollow-t*uSpeed;",
      " float d=uDisp*.06;",
      " float hue=ph*.31+warp*.35+t*.015+uHue;",
      " vec3 lt=vec3(ramp(hue-d*2.).r*band(ph-d),ramp(hue).g*band(ph),ramp(hue+d*2.).b*band(ph+d));",
      " float hl=smoothstep(uThresh,uThresh+uSoft,lum);",
      " float m=clamp(hl+edge*uEdge,0.,1.)*inside*A;",
      " vec3 light=lt*m*uLight;",
      " vec3 tinted=ramp(lum*.6+warp*.15+uHue)*lum*1.35;",
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
      "   vec2 cu=(ctr-uFit.xy)/uFit.zw;",
      "   float gate=step(0.,cu.x)*step(cu.x,1.)*step(0.,cu.y)*step(cu.y,1.);",
      "   gate*=smoothstep(uThresh+.05,uThresh+.35,L(img(clamp(cu,0.,1.))));",
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
      " col+=(h21(pix+fract(t*7.)*91.)-.5)*uGrain*A;",
      " col=clamp(col/(1.+max(col-1.,0.)*.6),0.,1.);",
      " float oa=max(A,max(col.r,max(col.g,col.b)));",
      " gl_FragColor=vec4(col,oa);",
      "}",
    ].join("\n"),
    e = {
      prism: {
        name: "Prism",
        stops: [
          "#FEFBF6",
          "#FFD175",
          "#F5A461",
          "#FFD175",
          "#FFF4E4",
          "#B86DFD",
          "#7363F8",
          "#487EF7",
          "#50E4FF",
          "#F2FBFF",
        ],
      },
      diamond: {
        name: "Diamond fire",
        stops: [
          "#FFF7EC",
          "#FFD27A",
          "#FF9A4A",
          "#FF6FAE",
          "#9B6BFF",
          "#4D7BFF",
          "#6FE6FF",
          "#EAF8FF",
        ],
      },
      crystal: {
        name: "Crystal",
        stops: [
          "#FFFFFF",
          "#FFE7BF",
          "#E9A84A",
          "#FFD27A",
          "#9AA6FF",
          "#5A68E8",
          "#DCE2FF",
        ],
      },
      shard: {
        name: "Shard",
        stops: [
          "#FFF1D8",
          "#EAB84F",
          "#C97632",
          "#4A35B8",
          "#1C4297",
          "#6E8BFF",
          "#FFF6EA",
        ],
      },
      champagne: {
        name: "Champagne",
        stops: [
          "#FFFFFF",
          "#FFF0D2",
          "#F2C98A",
          "#F7B7A3",
          "#D9C4FF",
          "#FFFFFF",
        ],
      },
      thermal: {
        name: "Thermal",
        stops: [
          "#00166D",
          "#00AAFF",
          "#FFCB5C",
          "#FF4400",
          "#F384FF",
          "#FFFFFF",
        ],
      },
    },
    a = {
      palette: "prism",
      light: 1,
      tint: 0.1,
      clarity: 0.45,
      speed: 0.22,
      flow: 1.15,
      flowScale: 1.5,
      angle: -35,
      scale: 2.1,
      sharp: 2.6,
      follow: 0.55,
      disp: 0.45,
      hue: 0,
      thresh: 0.32,
      soft: 0.38,
      edge: 0.75,
      glitter: 0.45,
      gsize: 20,
      twinkle: 0.7,
      grain: 0.02,
      quality: 2,
    };
  function r(t) {
    return t <= 0.04045 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4);
  }
  function o(t) {
    return (t = Math.max(0, Math.min(1, t))) <= 0.0031308
      ? 12.92 * t
      : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
  }
  function n(t) {
    var e = t[0] + 0.3963377774 * t[1] + 0.2158037573 * t[2],
      a = t[0] - 0.1055613458 * t[1] - 0.0638541728 * t[2],
      r = t[0] - 0.0894841775 * t[1] - 1.291485548 * t[2];
    return [
      o(
        4.0767416621 * (e *= e * e) -
          3.3077115913 * (a *= a * a) +
          0.2309699292 * (r *= r * r),
      ),
      o(-1.2684380046 * e + 2.6097574011 * a - 0.3413193965 * r),
      o(-0.0041960863 * e - 0.7034186147 * a + 1.707614701 * r),
    ];
  }
  function i(o, i, s, l) {
    l = l || {};
    var c = {};
    for (var h in a) c[h] = a[h];
    for (h in s) c[h] = s[h];
    var u = o.getContext("webgl", {
      antialias: !1,
      premultipliedAlpha: !0,
      alpha: !0,
      preserveDrawingBuffer: !1,
      powerPreference: "high-performance",
    });
    if (!u) return (l.onError && l.onError(), null);
    function d(t, e) {
      var a = u.createShader(t);
      if (
        (u.shaderSource(a, e),
        u.compileShader(a),
        !u.getShaderParameter(a, u.COMPILE_STATUS))
      )
        throw new Error(u.getShaderInfoLog(a));
      return a;
    }
    o.addEventListener("webglcontextlost", function (t) {
      (t.preventDefault(), l.onLost && l.onLost());
    });
    var g = u.createProgram();
    (u.attachShader(
      g,
      d(
        u.VERTEX_SHADER,
        "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}",
      ),
    ),
      u.attachShader(g, d(u.FRAGMENT_SHADER, t)),
      u.linkProgram(g),
      u.useProgram(g));
    if (!u.getProgramParameter(g, u.LINK_STATUS))
      throw new Error(u.getProgramInfoLog(g));
    var f = u.createBuffer();
    (u.bindBuffer(u.ARRAY_BUFFER, f),
      u.bufferData(
        u.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        u.STATIC_DRAW,
      ));
    var m = u.getAttribLocation(g, "a");
    (u.enableVertexAttribArray(m),
      u.vertexAttribPointer(m, 2, u.FLOAT, !1, 0, 0));
    var p = {};
    function b() {
      var t = u.createTexture();
      return (
        u.bindTexture(u.TEXTURE_2D, t),
        u.texParameteri(u.TEXTURE_2D, u.TEXTURE_MIN_FILTER, u.LINEAR),
        u.texParameteri(u.TEXTURE_2D, u.TEXTURE_MAG_FILTER, u.LINEAR),
        t
      );
    }
    [
      "uRes",
      "uFit",
      "uTexel",
      "uImg",
      "uRamp",
      "uTime",
      "uDpr",
      "uLight",
      "uTint",
      "uClarity",
      "uSpeed",
      "uFlow",
      "uFlowScale",
      "uAngle",
      "uScale",
      "uSharp",
      "uFollow",
      "uDisp",
      "uHue",
      "uThresh",
      "uSoft",
      "uEdge",
      "uGlitter",
      "uGSize",
      "uTwinkle",
      "uGrain",
    ].forEach(function (t) {
      p[t] = u.getUniformLocation(g, t);
    });
    var x = b();
    (u.texParameteri(u.TEXTURE_2D, u.TEXTURE_WRAP_S, u.CLAMP_TO_EDGE),
      u.texParameteri(u.TEXTURE_2D, u.TEXTURE_WRAP_T, u.CLAMP_TO_EDGE));
    var w = b();
    (u.texParameteri(u.TEXTURE_2D, u.TEXTURE_WRAP_S, u.REPEAT),
      u.texParameteri(u.TEXTURE_2D, u.TEXTURE_WRAP_T, u.CLAMP_TO_EDGE));
    var v = 1,
      M = 1;
    function y(t) {
      ((v = t.naturalWidth || t.width),
        (M = t.naturalHeight || t.height),
        u.activeTexture(u.TEXTURE0),
        u.bindTexture(u.TEXTURE_2D, x),
        u.pixelStorei(u.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0),
        u.texImage2D(u.TEXTURE_2D, 0, u.RGBA, u.RGBA, u.UNSIGNED_BYTE, t),
        u.pixelStorei(u.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1));
    }
    function F() {
      var t = e[c.palette] || e.prism;
      (u.activeTexture(u.TEXTURE1),
        u.bindTexture(u.TEXTURE_2D, w),
        u.texImage2D(
          u.TEXTURE_2D,
          0,
          u.RGBA,
          256,
          1,
          0,
          u.RGBA,
          u.UNSIGNED_BYTE,
          (function (t) {
            for (
              var e = t.map(function (t) {
                  return (function (t) {
                    var e = r(t[0]),
                      a = r(t[1]),
                      o = r(t[2]),
                      n = Math.cbrt(
                        0.4122214708 * e + 0.5363325363 * a + 0.0514459929 * o,
                      ),
                      i = Math.cbrt(
                        0.2119034982 * e + 0.6806995451 * a + 0.1073969566 * o,
                      ),
                      s = Math.cbrt(
                        0.0883024619 * e + 0.2817188376 * a + 0.6299787005 * o,
                      );
                    return [
                      0.2104542553 * n + 0.793617785 * i - 0.0040720468 * s,
                      1.9779984951 * n - 2.428592205 * i + 0.4505937099 * s,
                      0.0259040371 * n + 0.7827717662 * i - 0.808675766 * s,
                    ];
                  })(
                    (function (t) {
                      return [
                        parseInt(t.substr(1, 2), 16) / 255,
                        parseInt(t.substr(3, 2), 16) / 255,
                        parseInt(t.substr(5, 2), 16) / 255,
                      ];
                    })(t),
                  );
                }),
                a = e.length,
                o = new Uint8Array(1024),
                i = 0;
              i < 256;
              i++
            ) {
              var s = (i / 256) * a,
                l = Math.floor(s),
                c = s - l,
                h = e[l % a],
                u = e[(l + 1) % a];
              c = c * c * (3 - 2 * c);
              var d = n([
                h[0] + (u[0] - h[0]) * c,
                h[1] + (u[1] - h[1]) * c,
                h[2] + (u[2] - h[2]) * c,
              ]);
              ((o[4 * i] = 255 * d[0]),
                (o[4 * i + 1] = 255 * d[1]),
                (o[4 * i + 2] = 255 * d[2]),
                (o[4 * i + 3] = 255));
            }
            return o;
          })(t.stops),
        ));
    }
    (y(i), F(), u.uniform1i(p.uImg, 0), u.uniform1i(p.uRamp, 1));
    var S =
        window.matchMedia &&
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      A = 0,
      E = 0,
      T = 1;
    function R() {
      T = Math.min(window.devicePixelRatio || 1, c.quality);
      var t = o.getBoundingClientRect();
      ((A = Math.max(1, Math.round(t.width * T))),
        (E = Math.max(1, Math.round(t.height * T))),
        (o.width === A && o.height === E) || ((o.width = A), (o.height = E)),
        u.viewport(0, 0, A, E));
    }
    var C = window.ResizeObserver ? new ResizeObserver(R) : null;
    (C ? C.observe(o) : window.addEventListener("resize", R), R());
    var I = !0;
    l.observe &&
      window.IntersectionObserver &&
      new IntersectionObserver(
        function (t) {
          I = t[0].isIntersecting;
        },
        { rootMargin: "100px" },
      ).observe(o);
    var D = !1,
      P = 0,
      L = performance.now(),
      B = 0,
      k = L;
    function _(t, e, a) {
      return Math.max(e, Math.min(a, t));
    }
    return (
      requestAnimationFrame(function t(e) {
        requestAnimationFrame(t);
        var a = Math.min(0.05, (e - L) / 1e3);
        if (((L = e), I)) {
          var r, o, n, i;
          if ((D || (P += a * (S ? 0.25 : 1)), l.fit)) {
            var s = l.fit();
            if (!s) return;
            ((r = s[0] * T), (o = s[1] * T), (n = s[2] * T), (i = s[3] * T));
          } else {
            var h = l.pad || 0,
              d = Math.min((A - 2 * h * T) / v, (E - 2 * h * T) / M);
            ((r = (A - (n = v * d)) / 2), (o = (E - (i = M * d)) / 2));
          }
          (u.uniform2f(p.uRes, A, E),
            u.uniform4f(p.uFit, r, o, n, i),
            u.uniform2f(p.uTexel, 1 / v, 1 / M),
            u.uniform1f(p.uTime, P),
            u.uniform1f(p.uDpr, T),
            u.uniform1f(p.uLight, c.light),
            u.uniform1f(p.uTint, c.tint),
            u.uniform1f(p.uClarity, c.clarity),
            u.uniform1f(p.uSpeed, _(c.speed, 0, 1)),
            u.uniform1f(p.uFlow, c.flow),
            u.uniform1f(p.uFlowScale, c.flowScale),
            u.uniform1f(p.uAngle, (c.angle * Math.PI) / 180),
            u.uniform1f(p.uScale, c.scale),
            u.uniform1f(p.uSharp, c.sharp),
            u.uniform1f(p.uFollow, c.follow),
            u.uniform1f(p.uDisp, c.disp),
            u.uniform1f(p.uHue, c.hue),
            u.uniform1f(p.uThresh, c.thresh),
            u.uniform1f(p.uSoft, Math.max(0.01, c.soft)),
            u.uniform1f(p.uEdge, c.edge),
            u.uniform1f(p.uGlitter, c.glitter),
            u.uniform1f(p.uGSize, c.gsize),
            u.uniform1f(p.uTwinkle, S ? 0 : _(c.twinkle, 0, 1.5)),
            u.uniform1f(p.uGrain, c.grain),
            u.drawArrays(u.TRIANGLES, 0, 3),
            l.onFirstFrame &&
              !l.__done &&
              (u.isContextLost() || u.getError() !== u.NO_ERROR
                ? ((I = !1), l.onError && l.onError())
                : ((l.__done = 1), l.onFirstFrame())),
            B++,
            l.onFps &&
              e - k > 1e3 &&
              (l.onFps(Math.round((1e3 * B) / (e - k))), (B = 0), (k = e)));
        }
      }),
      {
        settings: c,
        set: function (t, e) {
          ((c[t] = e), "palette" === t && F(), "quality" === t && R());
        },
        setAll: function (t) {
          for (var e in t) c[e] = t[e];
          (F(), R());
        },
        setImage: y,
        canvas: o,
        pause: function (t) {
          D = t;
        },
        isPaused: function () {
          return D;
        },
      }
    );
  }
  return ((i.PALETTES = e), (i.DEFAULTS = a), i);
})()),
  (window.createLightEngine = function (t) {
    const e = (t, e, a) => Math.min(a, Math.max(e, t)),
      a = (t, e, a) => t + (e - t) * a,
      r = (t, a, r) => {
        if (a === t) return r < t ? 0 : 1;
        const o = e((r - t) / (a - t), 0, 1);
        return o * o * (3 - 2 * o);
      },
      o = (t) => 1 - Math.pow(1 - t, 3),
      n = (t) => (t * Math.PI) / 180,
      i = (t, e) => Math.atan2(Math.sin(t - e), Math.cos(t - e)),
      s = (t, e) => {
        const a = document.createElement("canvas");
        return (
          (a.width = Math.max(1, Math.round(t))),
          (a.height = Math.max(1, Math.round(e))),
          a
        );
      },
      l = (t) => () => {
        t = (1831565813 + (t |= 0)) | 0;
        let e = Math.imul(t ^ (t >>> 15), 1 | t);
        return (
          (e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e),
          ((e ^ (e >>> 14)) >>> 0) / 4294967296
        );
      },
      c = (t, e, a) => {
        ((t = (((t % 360) + 360) % 360) / 30), (a /= 100));
        const r = (e /= 100) * Math.min(a, 1 - a),
          o = (e) => {
            const o = (e + t) % 12;
            return a - r * Math.max(-1, Math.min(o - 3, 9 - o, 1));
          };
        return [o(0), o(8), o(4)];
      },
      h = (t, a) =>
        `rgba(${Math.round(255 * t[0])},${Math.round(255 * t[1])},${Math.round(255 * t[2])},${e(a, 0, 1).toFixed(3)})`,
      u = (t, a, r) => {
        const o = a * Math.cos(n(r)),
          i = a * Math.sin(n(r)),
          s = (t + 0.3963377774 * o + 0.2158037573 * i) ** 3,
          l = (t - 0.1055613458 * o - 0.0638541728 * i) ** 3,
          c = (t - 0.0894841775 * o - 1.291485548 * i) ** 3,
          h = (t) =>
            (t = e(t, 0, 1)) <= 0.0031308
              ? 12.92 * t
              : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
        return [
          h(4.0767416621 * s - 3.3077115913 * l + 0.2309699292 * c),
          h(-1.2684380046 * s + 2.6097574011 * l - 0.3413193965 * c),
          h(-0.0041960863 * s - 0.7034186147 * l + 1.707614701 * c),
        ];
      },
      d = (t, e, a, r = 1) => h(u(t / 100, e, a), r),
      g = (t, a, r, o) => (n) => {
        if (n <= 0) return 0;
        if (n >= 1) return 1;
        let i = n;
        for (let a = 0; a < 6; a++) {
          const a =
              3 * (1 - i) ** 2 * i * t + 3 * (1 - i) * i * i * r + i ** 3 - n,
            o =
              3 * (1 - i) ** 2 * t +
              6 * (1 - i) * i * (r - t) +
              3 * i * i * (1 - r);
          if (Math.abs(o) < 1e-6) break;
          i = e(i - a / o, 0, 1);
        }
        return 3 * (1 - i) ** 2 * i * a + 3 * (1 - i) * i * i * o + i ** 3;
      },
      f = g(0.2, 0.05, 0.25, 1),
      m = g(0.2, 0.6, 0.3, 1),
      p = matchMedia("(prefers-reduced-motion: reduce)").matches,
      b = [
        "count",
        "length",
        "variance",
        "width",
        "bright",
        "glow",
        "order",
        "drift",
        "spread",
        "dir",
        "inner",
        "ring",
        "feather",
        "freq",
        "brk",
        "scale",
        "depth",
        "soft",
        "size",
        "edgeCount",
        "edgeReach",
        "letterGlow",
        "rimSplit",
        "echo",
        "bloom",
        "flareStr",
        "ghostStr",
        "glintStr",
        "refract",
        "refractSpin",
        "bgInt",
        "bgDrift",
        "ringA",
        "sBright",
        "grain",
      ],
      x = ["lBehind", "lEdges", "lGlow", "lFill", "lRim"],
      w = {
        look: "crystal",
        backdrop: "black",
        bg: "conic",
        bgPal: "crystal",
        bgInt: 55,
        bgSpread: 210,
        bgFeather: 34,
        bgCentre: 55,
        bgEdge: 15,
        bgRadius: 85,
        blobs: 7,
        blobSize: 75,
        shards: 14,
        bands: 14,
        glitchRate: 1.2,
        glitchAmt: 36,
        bgHue: 0,
        bgSat: 100,
        bgLight: 100,
        grain: 22,
        bgSweep: 18,
        bgDrift: 0.6,
        profile: "needle",
        count: 160,
        length: 70,
        variance: 70,
        width: 1.2,
        bright: 75,
        glow: 45,
        order: 0,
        drift: 3,
        seed: 8,
        flares: 6,
        flareStr: 42,
        ghosts: 3,
        ghostStr: 22,
        glints: 52,
        glintSize: 95,
        glintStr: 85,
        glintRate: 0.45,
        warmth: 72,
        dust: 90,
        dustStr: 55,
        form: "burst",
        spread: 360,
        dir: 0,
        inner: 0,
        ring: 0,
        feather: 40,
        x: 50,
        y: 30,
        pointer: "drag",
        pattern: "breathe",
        freq: 0.5,
        pulses: 2,
        brk: 1200,
        scale: 18,
        depth: 45,
        soft: 60,
        loop: "forever",
        safe: !0,
        reveal: !0,
        ringA: 30,
        ringW: 40,
        ringShift: 20,
        slices: 40,
        streaks: 36,
        sWidth: 18,
        sJitter: 60,
        sReach: 100,
        sReachJit: 40,
        sBright: 45,
        sBrightJit: 50,
        sCore: 85,
        sThick: 80,
        sMode: "crystal",
        sRandom: 70,
        sChroma: 16,
        sLight: 78,
        sSpan: 300,
        sHue: 15,
        bgIn: 1600,
        emitDelay: 200,
        emitRamp: 1200,
        dur: 2e3,
        stagger: 180,
        lag: 450,
        hold: 8e3,
        rest: 1400,
        seq: "loop",
        subject: "statue",
        word: "Light",
        font: "serif",
        size: 72,
        copy: !1,
        lBehind: !0,
        lEdges: !1,
        lGlow: !0,
        lFill: !0,
        lRim: !1,
        fill: "refract",
        refract: 50,
        refractRays: 9,
        refractSpin: 10,
        edgeCount: 500,
        edgeReach: 12,
        letterGlow: 50,
        rimSplit: 2,
        echo: 150,
        palette: "crystal",
        tone: "crystal",
        fringe: 60,
        hue: 0,
        variety: 14,
        bloom: 45,
        guides: !1,
      };
    Object.assign(
      w,
      { copy: !0, seq: "once", pointer: "fixed" },
      t.settings || {},
    );
    const v = {};
    (b.forEach((t) => (v[t] = w[t])),
      x.forEach((t) => (v[t] = w[t] ? 1 : 0)),
      (v.x = w.x),
      (v.y = w.y),
      (v.subjA = 0));
    const M = {
        freq: 2,
        bgInt: 90,
        bloom: 60,
        ringA: 55,
        glitchRate: 2,
        glintRate: 1,
      },
      y = { soft: 20, bgIn: 600, emitRamp: 600, rest: 800 },
      F = (t) => {
        let e = ((t) => (t in v && b.includes(t) ? v[t] : w[t]))(t);
        return (
          w.safe &&
            (t in M && (e = Math.min(e, M[t])),
            t in y && (e = Math.max(e, y[t]))),
          e
        );
      },
      S = {
        crystal: { core: [40, 70, 96], A: [34, 100, 60], B: [240, 88, 64] },
        prism: { core: [210, 40, 97], A: [6, 95, 60], B: [224, 95, 62] },
        ice: { core: [196, 80, 93], A: [182, 95, 62], B: [238, 90, 68] },
        gold: { core: [44, 100, 88], A: [22, 100, 58], B: [54, 100, 60] },
        neon: { core: [50, 100, 70], A: [338, 100, 60], B: [214, 100, 60] },
        mono: { core: [0, 0, 98], A: [220, 6, 78], B: [220, 6, 70] },
      },
      A = {
        crystal: [
          [14, 0.05, 262],
          [44, 0.15, 259],
          [36, 0.14, 290],
          [16, 0.05, 270],
          [34, 0.09, 55],
          [66, 0.12, 62],
        ],
        mock: [
          [72, 0.09, 200],
          [52, 0.22, 265],
          [46, 0.22, 292],
          [58, 0.18, 18],
          [72, 0.15, 55],
          [86, 0.05, 85],
        ],
        vishanti: [
          [34, 0.15, 265],
          [62, 0.18, 248],
          [52, 0.2, 296],
          [68, 0.17, 326],
          [78, 0.1, 350],
          [88, 0.06, 230],
        ],
        spectrum: [
          [62, 0.22, 25],
          [78, 0.17, 70],
          [84, 0.17, 130],
          [78, 0.13, 200],
          [58, 0.2, 262],
          [56, 0.22, 300],
        ],
        gold: [
          [40, 0.07, 60],
          [58, 0.1, 66],
          [74, 0.11, 76],
          [87, 0.08, 86],
          [66, 0.12, 56],
          [48, 0.08, 50],
        ],
      },
      E = {
        white: [97, 0.02, 80],
        gold: [88, 0.1, 85],
        amber: [76, 0.13, 60],
        deep: [64, 0.12, 50],
        blue: [58, 0.17, 259],
        violet: [60, 0.16, 291],
        cyan: [80, 0.11, 211],
      },
      T = (t, e = 1, a = 0) => {
        const [r, o, n] = E[t];
        return d(r, o, n + a, e);
      },
      R = (t, e = 1, a = 0, r = 1) => {
        const [o, n, i] = E[t];
        return N(o, n * r, i + a, e);
      },
      C = () => "crystal" === w.tone;
    let I, D;
    function P(t = 0) {
      const e = S[w.palette],
        a = "mono" === w.palette ? 0 : 1;
      return {
        core: c(e.core[0] + w.hue + 0.3 * t * a, e.core[1], e.core[2]),
        A: c(e.A[0] + w.hue + t * a, e.A[1], e.A[2]),
        B: c(e.B[0] + w.hue + t * a, e.B[1], e.B[2]),
      };
    }
    function L() {
      I = P(0);
      const t = (t) => h(t, 1);
      D =
        "crystal" === w.palette
          ? [
              T("amber"),
              T("white"),
              T("cyan"),
              T("blue"),
              T("violet"),
              T("white"),
              T("amber"),
            ]
          : "prism" === w.palette
            ? [350, 28, 55, 150, 200, 250, 305, 350].map((e) =>
                t(c(e + w.hue, 95, 67)),
              )
            : [t(I.A), t(I.core), t(I.B), t(I.core), t(I.A)];
    }
    const B = (t, e = 0) => {
        const a = A[w.bgPal],
          [r, o, n] = a[((t % a.length) + a.length) % a.length];
        return [
          Math.min(98, (r * w.bgLight) / 100),
          (o * w.bgSat) / 100,
          n + w.bgHue + e,
        ];
      },
      k = (t, e = 1) => d(t[0], t[1], t[2], e),
      _ = 256;
    let G = null,
      z = null,
      O = 1;
    function U() {
      const t = [],
        e = w.fringe / 100,
        a = w.profile;
      for (let o = 0; o < 8; o++) {
        const n = (((o / 7 - 0.5) * w.variety) / 100) * 140,
          { core: i, A: l, B: c } = P(n),
          h = s(_, 40),
          u = h.getContext("2d"),
          d = u.createImageData(_, 40),
          g = d.data;
        for (let t = 0; t < _; t++) {
          const o = (t + 0.5) / _;
          let n, s;
          "needle" === a
            ? ((n = 0.08 + 0.92 * Math.pow(1 - o, 1.1)),
              (s = r(0, 0.03, o) * Math.pow(1 - o, 0.35)))
            : "wedge" === a
              ? ((n = 0.1 + 0.9 * o),
                (s = r(0, 0.12, o) * Math.pow(1 - o, 1.25)))
              : ((n = 0.55), (s = r(0, 0.06, o) * Math.pow(1 - o, 0.9)));
          for (let a = 0; a < 40; a++) {
            const r = (2 * ((a + 0.5) / 40 - 0.5)) / n;
            if (Math.abs(r) > 1.3) continue;
            const o =
                (Math.exp(-r * r * 7) + 0.28 * Math.max(0, 1 - r * r)) *
                (1 - 0.35 * e),
              h = Math.exp(-((r + 0.66) ** 2) / 0.045) * e,
              u = Math.exp(-((r - 0.66) ** 2) / 0.045) * e,
              d = (i[0] * o + l[0] * h + c[0] * u) * s,
              f = (i[1] * o + l[1] * h + c[1] * u) * s,
              m = (i[2] * o + l[2] * h + c[2] * u) * s,
              p = Math.max(d, f, m);
            if (p < 0.003) continue;
            const b = 4 * (a * _ + t),
              x = 1 / p;
            ((g[b] = d * x * 255),
              (g[b + 1] = f * x * 255),
              (g[b + 2] = m * x * 255),
              (g[b + 3] = 255 * Math.min(1, p)));
          }
        }
        (u.putImageData(d, 0, 0), t.push(h));
      }
      return t;
    }
    let j = 0,
      q = !1;
    function H(t) {
      ((q = q || t),
        cancelAnimationFrame(j),
        (j = requestAnimationFrame(() => {
          const t = U();
          (q && G && ((z = G), (O = 0)), (G = t), (q = !1));
        })));
    }
    const W = (t, e) => {
        if (e <= t[0][0]) return t[0][1];
        for (let r = 1; r < t.length; r++)
          if (e <= t[r][0]) {
            const [o, n] = t[r - 1],
              [i, s] = t[r],
              l = (e - o) / Math.max(1e-6, i - o),
              c = n[3],
              h = s[3],
              u = a(c, h, l);
            return u < 1e-4
              ? [0, 0, 0, 0]
              : [
                  a(n[0] * c, s[0] * h, l) / u,
                  a(n[1] * c, s[1] * h, l) / u,
                  a(n[2] * c, s[2] * h, l) / u,
                  u,
                ];
          }
        return t[t.length - 1][1];
      },
      N = (t, e, a, r) => [...u(t / 100, e, a), r],
      X = (t, e = 1) => [
        parseInt(t.slice(1, 3), 16) / 255,
        parseInt(t.slice(3, 5), 16) / 255,
        parseInt(t.slice(5, 7), 16) / 255,
        t.length > 7 ? parseInt(t.slice(7, 9), 16) / 255 : e,
      ],
      J = [0, 0, 0, 0];
    function $(t, a, r, o, n) {
      const i = s(t, a),
        l = i.getContext("2d"),
        c = l.createImageData(t, a),
        h = c.data;
      for (let i = 0; i < t; i++) {
        const s = (i + 0.5) / t,
          l = Math.max(0.012, s) / 2,
          c = o(s);
        if (!(c <= 0.001))
          for (let o = 0; o < a; o++) {
            const u = (o + 0.5) / a,
              d = Math.abs(u - 0.5);
            if (d > l + 1 / a) continue;
            const g = e((l - d) * a + 0.5, 0, 1),
              f = r(u, s),
              m =
                f[3] *
                c *
                g *
                (n ? 1 - Math.min(1, d / Math.max(l, 0.001)) : 1);
            if (m < 0.003) continue;
            const p = 4 * (o * t + i);
            ((h[p] = 255 * f[0]),
              (h[p + 1] = 255 * f[1]),
              (h[p + 2] = 255 * f[2]),
              (h[p + 3] = 255 * m));
          }
      }
      return (l.putImageData(c, 0, 0), i);
    }
    let Y = [],
      K = [],
      Q = null,
      V = null;
    function Z() {
      const t = l(7 * w.seed + 13);
      ((Y = Array.from({ length: 160 }, () => ({
        e: t(),
        ph: t(),
        sp: 0.6 + 0.8 * t(),
        s: t(),
        rot: 0.5 * (t() - 0.5),
        warm: t(),
        a: t() * Math.PI * 2,
        d: 0.15 + 0.5 * t(),
      }))),
        (K = Array.from({ length: 400 }, () => ({
          a: t() * Math.PI * 2,
          d: Math.pow(t(), 0.6),
          ph: t(),
          sp: 0.4 + 0.9 * t(),
          s: 0.3 + 0.7 * t(),
          warm: t(),
        }))));
    }
    function tt(t, r) {
      const o = 160,
        n = s(o, o),
        i = n.getContext("2d"),
        l = i.createImageData(o, o),
        c = l.data;
      for (let n = 0; n < o; n++)
        for (let i = 0; i < o; i++) {
          const s = (i + 0.5 - 80) / 80,
            l = (n + 0.5 - 80) / 80,
            h = s * s + l * l,
            u = Math.sqrt(h),
            d = Math.exp(-h / 0.0035),
            g = 0.45 * Math.exp(-h / 0.06),
            f =
              0.9 *
              (Math.exp((-l * l) / 18e-5) *
                Math.pow(Math.max(0, 1 - Math.abs(s)), 2.4) +
                Math.exp((-s * s) / 18e-5) *
                  Math.pow(Math.max(0, 1 - Math.abs(l)), 2.4)),
            m = (s + l) / Math.SQRT2,
            p = (s - l) / Math.SQRT2,
            b =
              0.35 *
              (Math.exp((-p * p) / 12e-5) *
                Math.pow(Math.max(0, 1 - 1.8 * Math.abs(m)), 3) +
                Math.exp((-m * m) / 12e-5) *
                  Math.pow(Math.max(0, 1 - 1.8 * Math.abs(p)), 3)),
            x = Math.min(1, d + g + f + b);
          if (x < 0.004) continue;
          const w = e(1.2 * d + 0.35 * f, 0, 1),
            v = 4 * (n * o + i);
          ((c[v] = 255 * a(r[0], t[0], w)),
            (c[v + 1] = 255 * a(r[1], t[1], w)),
            (c[v + 2] = 255 * a(r[2], t[2], w)),
            (c[v + 3] = 255 * x),
            u > 1 && (c[v + 3] = 0));
        }
      return (i.putImageData(l, 0, 0), n);
    }
    let et = [],
      at = [],
      rt = [],
      ot = [],
      nt = [],
      it = [],
      st = [],
      lt = [],
      ct = [];
    function ht() {
      const t = l(131 * w.seed + 7);
      et = Array.from({ length: 400 }, () => ({
        a: t(),
        l: t(),
        w: t(),
        b: t(),
        v: Math.floor(8 * t()),
        p: t(),
        d: t(),
      }));
    }
    function ut() {
      const t = l(7 * w.seed + 3),
        e = l(7 * w.seed + 6),
        a = l(7 * w.seed + 4),
        r = l(7 * w.seed + 8),
        o = l(7 * w.seed + 9),
        i = l(7 * w.seed + 1),
        s = l(7 * w.seed + 10),
        c = w.slices;
      at = Array.from({ length: c }, (a, r) => ({
        a: n((360 * r) / c - 90),
        delay: t() * w.stagger,
        shift: (180 * (2 * e() - 1) * w.ringShift) / 100,
      }));
      const h = w.streaks,
        u = 360 / Math.max(1, h);
      ((rt = Array.from({ length: h }, (t, e) => ({
        a: n(e * u - 90 + (((a() - 0.5) * u * w.sJitter) / 100) * 1.6),
        rl: a(),
        bj: a(),
        delay: a() * w.stagger + w.lag,
      }))),
        (nt = Array.from({ length: w.flares }, () => ({
          a: r() * Math.PI * 2,
          len: 0.45 + 0.7 * r(),
          w: 5 + 12 * r(),
          s: 0.4 + 0.6 * r(),
          t: r(),
          end: 0.5 + 0.5 * r(),
          v: Math.floor(4 * r()),
        }))));
      const d = o() * Math.PI * 2;
      ((st = Array.from({ length: w.ghosts }, () => ({
        a: d,
        dist: 1.6 * o() - 0.5,
        size: 24 + 130 * o(),
        s: 0.35 + 0.65 * o(),
        t: o(),
        shift: 40 * (o() - 0.5),
      }))),
        (lt = Array.from({ length: w.blobs }, () => ({
          a: i(),
          dist: 0.15 + 0.75 * i(),
          size: 0.45 + 0.75 * i(),
          c1: Math.floor(6 * i()),
          c2: Math.floor(6 * i()),
          dx: 90 * (i() - 0.5),
          dy: 60 * (i() - 0.5),
          d: i(),
        }))),
        (ct = []));
      let g = 0;
      for (let t = 0; t < w.bands && g < 1; t++) {
        const e =
            t === w.bands - 1
              ? 1 - g
              : Math.max(0.006, (1 / w.bands) * (0.4 + 1.2 * s())),
          a = [],
          r = Math.round(12 * F("glitchRate"));
        for (let t = 0; t < r; t++)
          s() > 0.45
            ? (s(), s(), s())
            : a.push({
                at: 12 * s(),
                dur: 0.06 + 0.16 * s(),
                dx: 2 * (s() - 0.5) * w.glitchAmt,
              });
        (ct.push({ y: g, h: Math.min(e, 1 - g), alt: s() < 0.3, ev: a }),
          (g += e));
      }
      (gt(), ft());
    }
    const dt = [
      [0.12, J],
      [0.25, X("#ff375e99")],
      [0.32, X("#ff861bdd")],
      [0.39, X("#ffe86d")],
      [0.46, X("#ffffed")],
      [0.49, X("#d9fffc")],
      [0.54, X("#30ead5")],
      [0.61, X("#15baff")],
      [0.69, X("#3354ffcc")],
      [0.76, X("#9c36f080")],
      [0.87, J],
    ];
    function gt() {
      const t = l(7 * w.seed + 5),
        e = w.sLight,
        a = w.sChroma / 100,
        r = [1, 1, 1, w.sCore / 100],
        o = w.sRandom / 100,
        n = (t) =>
          t < 0.07
            ? t / 0.07
            : t < 0.35
              ? 1
              : Math.max(0, 1 - (t - 0.35) / 0.58);
      ot = rt.map(() => {
        let i;
        if ("original" === w.sMode) i = dt;
        else if ("crystal" === w.sMode) {
          const e = w.sChroma / 16,
            a = 20 * (t() - 0.5) * o,
            n = t() < 0.5,
            s = [
              [0.24, R("deep", 0.5, a, e)],
              [0.38, R("amber", 0.95, a, e)],
            ],
            l = [
              [0.62, R("cyan", 0.9, a, e)],
              [0.76, R(t() < 0.5 ? "blue" : "violet", 0.55, a, e)],
            ],
            c = n
              ? [
                  ...l.map(([t, e]) => [1 - t, e]).reverse(),
                  [0.5, r],
                  ...s.map(([t, e]) => [1 - t, e]).reverse(),
                ]
              : [...s, [0.5, r], ...l];
          i = [[0.1, J], ...c, [0.9, J]];
        } else if ("single" === w.sMode) {
          const n = w.sHue + t() * w.sSpan * o;
          i = [
            [0.1, J],
            [0.26, N(e, a, n, 0.55)],
            [0.4, N(e, a, n, 1)],
            [0.5, r],
            [0.6, N(e, a, n, 1)],
            [0.74, N(e, a, n, 0.55)],
            [0.9, J],
          ];
        } else {
          const n = w.sHue + 360 * t() * o,
            s = t() < 0.5 * o ? -1 : 1,
            l = (t) => n + (s * w.sSpan * t) / 5,
            c = [0.6, 0.85, 1, 1, 0.85, 0.5],
            h = [0.22, 0.3, 0.38, 0.62, 0.7, 0.78].map((t, r) => [
              t,
              N(e, a, l(r), c[r]),
            ]);
          i = [[0.1, J], ...h.slice(0, 3), [0.5, r], ...h.slice(3), [0.9, J]];
        }
        return $(192, 40, (t) => W(i, t), n, !1);
      });
    }
    function ft() {
      const t = l(7 * w.seed + 12),
        e = [
          ["blue", "violet", "blue"],
          ["cyan", "blue", "violet"],
          ["violet", "blue", "cyan"],
          ["amber", "gold", "amber"],
        ];
      it = Array.from({ length: 4 }, (a, r) => {
        const o = 360 * t(),
          n = t() < 0.5 ? 1 : -1,
          i = 0.18 + 0.12 * t(),
          s = C()
            ? [
                [i, J],
                [0.42, R(e[r][0], 0.85)],
                [0.58, R(e[r][1], 0.95)],
                [0.74, R(e[r][2], 0.7)],
                [0.94, J],
              ]
            : [
                [i, J],
                [0.4, N(72, 0.17, o, 0.9)],
                [0.52, N(72, 0.17, o + 60 * n, 0.9)],
                [0.64, N(72, 0.17, o + 120 * n, 0.9)],
                [0.76, N(72, 0.17, o + 180 * n, 0.9)],
                [0.94, J],
              ];
        return $(
          256,
          48,
          (t, e) => W(s, e),
          () => 1,
          !0,
        );
      });
    }
    const mt = t.stage,
      pt = t.back,
      bt = t.light,
      xt = t.glow,
      wt = document.createElement("canvas"),
      vt = t.front,
      Mt = pt.getContext("2d"),
      yt = bt.getContext("2d"),
      Ft = xt.getContext("2d"),
      St = (wt.getContext("2d"), vt.getContext("2d")),
      At = Math.min(2, window.devicePixelRatio || 1),
      Et = Math.min(1.25, At);
    let Tt = 1,
      Rt = 1;
    function Ct() {
      ((Tt = Math.max(1, mt.clientWidth)),
        (Rt = Math.max(1, mt.clientHeight)),
        [bt, vt].forEach((t) => {
          ((t.width = Math.round(Tt * At)), (t.height = Math.round(Rt * At)));
        }),
        (pt.width = Math.round(Tt * Et)),
        (pt.height = Math.round(Rt * Et)),
        (xt.width = Math.ceil(Tt / 4)),
        (xt.height = Math.ceil(Rt / 4)),
        clearTimeout(Ct.t),
        (Ct.t = setTimeout(() => {
          (qt(!1), Lt());
        }, 220)));
    }
    let It = null,
      Dt = null;
    function Pt(t) {
      const r = Math.hypot(Tt, Rt),
        o = Math.max(64, Math.round(r)),
        i = s(o, o),
        c = i.getContext("2d"),
        h = o / 2,
        u = A[w.bgPal].map((e, a) => B(a, t)),
        d = u.length,
        g = (t, e, r) => {
          const o = ((e[2] - t[2] + 540) % 360) - 180;
          return [a(t[0], e[0], r), a(t[1], e[1], r), t[2] + o * r];
        },
        f = (t, e) =>
          t.forEach(([r, o], n) => {
            if (n) {
              const [i, s] = t[n - 1];
              for (let t = 1; t < 4; t++) e(a(s, o, t / 4), g(i, r, t / 4));
            }
            e(o, r);
          });
      if (("conic" !== w.bg && "glitch" !== w.bg) || !c.createConicGradient)
        if (
          "radial" !== w.bg &&
          (("conic" !== w.bg && "glitch" !== w.bg) || c.createConicGradient)
        ) {
          if ("shards" === w.bg) {
            const t = l(7 * w.seed + 11),
              e = Math.min(w.bgSpread, 360),
              a = w.shards,
              r = [
                0,
                ...Array.from({ length: a - 1 }, () => t() * e).sort(
                  (t, e) => t - e,
                ),
                e,
              ];
            for (let o = 0; o < a; o++)
              ((c.fillStyle = k(u[Math.floor(t() * d)], 0.35 + 0.65 * t())),
                c.beginPath(),
                c.moveTo(h, h),
                c.arc(
                  h,
                  h,
                  1.5 * h,
                  n(r[o] - 90 - e / 2),
                  n(r[o + 1] - 90 - e / 2),
                ),
                c.closePath(),
                c.fill());
          }
        } else {
          const t = Math.max(2, (h * w.bgRadius) / 100),
            a = c.createRadialGradient(h, h, 0, h, h, t);
          (f(
            u.map((t, e) => [t, 0.9 * (0.08 + (0.92 * e) / (d - 1))]),
            (t, r) => a.addColorStop(e(t, 0, 1), k(r)),
          ),
            a.addColorStop(1, "#000"),
            (c.fillStyle = a),
            c.fillRect(0, 0, o, o));
        }
      else {
        const t = Math.min(w.bgSpread, 360),
          a = t >= 360 ? 0 : Math.min(w.bgFeather, (360 - t) / 2),
          r = c.createConicGradient(n(-t / 2 - a - 90), h, h),
          i = [];
        (t >= 360
          ? (u.forEach((t, e) => i.push([t, e / d])), i.push([u[0], 1]))
          : (i.push([[0, 0, u[0][2]], 0]),
            u.forEach((e, r) => i.push([e, (a + (t * r) / (d - 1)) / 360])),
            i.push([[0, 0, u[d - 1][2]], (t + 2 * a) / 360])),
          f(i, (t, a) => r.addColorStop(e(t, 0, 1), k(a))),
          t < 360 && r.addColorStop(1, "#000"),
          (c.fillStyle = r),
          c.fillRect(0, 0, o, o));
      }
      const m = w.bgCentre / 100,
        p = w.bgEdge / 100,
        b = c.createRadialGradient(h, h, 0, h, h, h);
      return (
        b.addColorStop(0, `rgba(0,0,0,${1 - m})`),
        b.addColorStop(e((18 + 30 * m) / 100, 0, 1), "#000"),
        b.addColorStop(e((100 - 55 * p) / 100, 0.5, 1), "#000"),
        b.addColorStop(1, `rgba(0,0,0,${1 - p})`),
        (c.globalCompositeOperation = "destination-in"),
        (c.fillStyle = b),
        c.fillRect(0, 0, o, o),
        i
      );
    }
    function Lt() {
      ((It = Dt = null),
        ["conic", "radial", "shards", "glitch"].includes(w.bg) &&
          ((It = Pt(0)), "glitch" === w.bg && (Dt = Pt(70))));
    }
    const Bt = t.img,
      kt = {
        display: (t) => `${t}px Anton, Impact, "Arial Narrow", sans-serif`,
        serif: (t) =>
          `${t}px "Instrument Serif", Georgia, "Times New Roman", serif`,
        sans: (t) =>
          `600 ${t}px Inter, -apple-system, "Helvetica Neue", Arial, sans-serif`,
      };
    let _t = null,
      Gt = [],
      zt = 0;
    function Ot(e, a) {
      if ("statue" === e.kind) {
        if (t.layout) return t.layout(Tt, Rt);
        const e = (Bt.naturalWidth || 443) / (Bt.naturalHeight || 663);
        let a = 0.58 * Rt,
          r = a * e;
        return (
          r > 0.8 * Tt && ((r = 0.8 * Tt), (a = r / e)),
          { x: Tt / 2 - r / 2, y: 0.37 * Rt - a / 2, w: r, h: a }
        );
      }
      let r = (Tt * a) / 100,
        o = r / e.ratio;
      return (
        o > 0.42 * Rt && ((o = 0.42 * Rt), (r = o * e.ratio)),
        {
          x: Tt / 2 - r / 2,
          y: Rt * (w.copy ? 0.34 : 0.5) - o / 2,
          w: r,
          h: o,
        }
      );
    }
    const Ut = (t, e) => {
      const a = s(t.width, t.height),
        r = a.getContext("2d");
      return (
        r.drawImage(t, 0, 0),
        (r.globalCompositeOperation = "source-in"),
        (r.fillStyle = e),
        r.fillRect(0, 0, a.width, a.height),
        a
      );
    };
    function jt() {
      _t &&
        ((_t.tCore = Ut(_t.mask, h(I.core, 1))),
        (_t.tA = Ut(_t.mask, h(I.A, 1))),
        (_t.tB = Ut(_t.mask, h(I.B, 1))));
    }
    async function qt(t) {
      const e = ++zt;
      if ("none" === w.subject || ("word" === w.subject && !w.word.trim()))
        return ((_t = null), void (Gt = []));
      if ("word" === w.subject)
        try {
          await document.fonts.load(kt[w.font](80), w.word);
        } catch {}
      else
        try {
          await Bt.decode();
        } catch {}
      if (e !== zt) return;
      const a = { kind: w.subject };
      let r;
      if ("word" === a.kind) {
        const t = s(4, 4).getContext("2d");
        t.font = kt[w.font](200);
        const e = t.measureText(w.word);
        if (
          ((r = {
            l: e.actualBoundingBoxLeft,
            as: e.actualBoundingBoxAscent,
            bw: e.actualBoundingBoxLeft + e.actualBoundingBoxRight,
            bh: e.actualBoundingBoxAscent + e.actualBoundingBoxDescent,
          }),
          !(r.bw > 0 && r.bh > 0))
        )
          return ((_t = null), void (Gt = []));
        a.ratio = r.bw / r.bh;
      }
      const o = Ot(a, w.size),
        n = 0.12 * o.h;
      ((a.R0 = o), (a.pad = n), (a.cw = o.w + 2 * n), (a.ch = o.h + 2 * n));
      const [i, c] = (() => {
        const t = s(a.cw * At, a.ch * At),
          e = t.getContext("2d");
        return (e.scale(t.width / a.cw, t.height / a.ch), [t, e]);
      })();
      if ("word" === a.kind) {
        const t = o.h / r.bh;
        ((c.font = kt[w.font](200 * t)),
          (c.fillStyle = "#fff"),
          (c.textBaseline = "alphabetic"),
          c.fillText(w.word, n + r.l * t, n + r.as * t));
      } else c.drawImage(Bt, n, n, o.w, o.h);
      ((a.mask = Ut(i, "#fff")),
        (a.base = "word" === a.kind ? Ut(a.mask, "#f4f4f6") : i),
        (a.dark = Ut(a.mask, "#060607")),
        (a.scratch = s(a.mask.width, a.mask.height)));
      const h = Math.min(1, 700 / Math.max(a.cw, a.ch)),
        u = Math.max(8, Math.round(a.cw * h)),
        d = Math.max(8, Math.round(a.ch * h)),
        g = s(u, d).getContext("2d", { willReadFrequently: !0 });
      g.drawImage(a.mask, 0, 0, u, d);
      const f = g.getImageData(0, 0, u, d).data,
        m = (t, e) =>
          t < 0 || e < 0 || t >= u || e >= d ? 0 : f[4 * (e * u + t) + 3],
        p = [],
        b = 120;
      for (let t = 1; t < d - 1; t++)
        for (let e = 1; e < u - 1; e++) {
          if (m(e, t) < b) continue;
          if (
            m(e - 1, t) >= b &&
            m(e + 1, t) >= b &&
            m(e, t - 1) >= b &&
            m(e, t + 1) >= b
          )
            continue;
          const a =
              m(e + 2, t) -
              m(e - 2, t) +
              0.5 *
                (m(e + 2, t - 1) -
                  m(e - 2, t - 1) +
                  m(e + 2, t + 1) -
                  m(e - 2, t + 1)),
            r =
              m(e, t + 2) -
              m(e, t - 2) +
              0.5 *
                (m(e - 1, t + 2) -
                  m(e - 1, t - 2) +
                  m(e + 1, t + 2) -
                  m(e + 1, t - 2));
          (a || r) &&
            p.push({
              u: (e / h - n) / o.w,
              v: (t / h - n) / o.h,
              ang: Math.atan2(-r, -a),
            });
        }
      const x = l(131 * w.seed + 9);
      for (let t = p.length - 1; t > 0; t--) {
        const e = Math.floor(x() * (t + 1));
        [p[t], p[e]] = [p[e], p[t]];
      }
      ((Gt = p.slice(0, 2e3).map((t) => ({
        ...t,
        l: x(),
        w: x(),
        b: x(),
        vv: Math.floor(8 * x()),
        p: x(),
        d: x(),
      }))),
        (_t = a),
        jt(),
        t && (v.subjA = 0));
    }
    let Ht = !p,
      Wt = 0,
      Nt = performance.now();
    const Xt = { forever: 1 / 0, once: 1, three: 3 },
      Jt = () => {
        const t = w.reveal ? w.dur + w.stagger + Math.max(0, w.lag) : 0,
          e = Math.max(t, F("bgIn"), w.emitDelay + F("emitRamp"), 900) / 1e3,
          a = e + w.hold / 1e3;
        return {
          intro: e,
          holdEnd: a,
          total: a + ("loop" === w.seq ? F("rest") / 1e3 : 0),
        };
      };
    let $t = Jt();
    const Yt = () => w.emitDelay / 1e3,
      Kt = () => Math.max(0.05, F("emitRamp") / 1e3),
      Qt = () =>
        Math.max(0, Wt - (Yt() + 0.9 * Kt())) * Math.max(0.05, F("freq"));
    function Vt(t) {
      if ("off" === w.pattern) return 1;
      if (t < 0) return 0;
      const e = Math.max(0.05, F("freq")),
        n = w.pulses,
        i = n + (v.brk / 1e3) * e,
        s = Xt[w.loop],
        l = Math.floor(t / i);
      if (l >= s) return r(0, 0.9, (t - s * i) / e);
      const c = t - l * i;
      if (c >= n) return 0;
      const h = c % 1,
        u = F("soft") / 100;
      if ("beat" === w.pattern) {
        const t = a(0.05, 0.4, u);
        return h < t
          ? o(h / t)
          : Math.exp(-(h - t) / a(0.07, 0.4, u)) * (1 - r(0.8, 1, h));
      }
      return Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * h), a(2.2, 0.7, u));
    }
    const Zt = (t) => {
        const a = (v.feather / 100) * e((360 - v.spread) / 30, 0, 1);
        return t > 1 ? 0 : a < 0.002 ? 1 : 1 - r(1 - a, 1, t);
      },
      te = (t, a = 0) =>
        o(e((Wt - Yt() - a * Kt() - 0.7 * t * Kt()) / Kt(), 0, 1));
    function ee(t, a, r, o, n, i, s, l, c) {
      const h = Math.cos(r),
        u = Math.sin(r),
        d = n / a.width,
        g = i / a.height;
      ((t.globalAlpha = e(s, 0, 1)),
        t.setTransform(
          At * h * d,
          At * u * d,
          -At * u * g,
          At * h * g,
          At * (l + h * o),
          At * (c + u * o),
        ),
        t.drawImage(a, 0, -a.height / 2));
    }
    function ae(t, e, a, r, o, n, i, s) {
      n < 0.004 ||
        r < 1 ||
        (O < 1 && z
          ? (ee(yt, z[t], e, a, r, o, n * (1 - O), i, s),
            ee(yt, G[t], e, a, r, o, n * O, i, s))
          : ee(yt, G[t], e, a, r, o, n, i, s));
    }
    const re = [
        [26.9, 0.15, 263.8, 24],
        [70.7, 0.168, 242, 28],
        [91.9, 0.039, 285.6, 30],
        [86.8, 0.14, 83.8, 33],
        [65.9, 0.23, 35.2, 36],
        [77.8, 0.201, 323.6, 39],
      ],
      oe = [
        [30, 0.12, 262, 24],
        [58, 0.17, 259, 28],
        [80, 0.11, 211, 30],
        [96, 0.02, 80, 32],
        [76, 0.13, 60, 35],
        [60, 0.16, 291, 39],
      ];
    let ne = -1;
    function ie() {
      const s = (v.x / 100) * Tt,
        l = (v.y / 100) * Rt,
        c = "loop" === w.seq ? 1 - r($t.holdEnd, $t.total, Wt) : 1,
        u = Vt(Qt()),
        g = Math.max(0.05, F("freq")),
        p = Vt(Qt() - (v.echo / 1e3) * g);
      !(function (t, a, i) {
        if (
          (Mt.setTransform(1, 0, 0, 1, 0, 0),
          (Mt.globalAlpha = 1),
          (Mt.globalCompositeOperation = "source-over"),
          Mt.clearRect(0, 0, pt.width, pt.height),
          "none" === w.bg)
        )
          return;
        const s = Math.max(0.01, F("bgIn") / 1e3),
          l = o(e(Wt / s, 0, 1)),
          c = (F("bgInt") / 100) * l * i;
        if (c < 0.003) return;
        const h = Math.hypot(Tt, Rt),
          u = n(v.dir) + n(-w.bgSweep) * (1 - l) + n(v.bgDrift) * Wt,
          d = 1.06 - 0.06 * l,
          g = (e, r) => {
            (Mt.setTransform(Et, 0, 0, Et, 0, 0),
              Mt.translate(t + r, a),
              Mt.rotate(u),
              Mt.scale(d, d),
              Mt.drawImage(e, -h, -h, 2 * h, 2 * h));
          };
        if ("splotch" === w.bg) {
          (Mt.setTransform(Et, 0, 0, Et, 0, 0),
            (Mt.globalCompositeOperation = "screen"));
          const i = 1.1 * Math.hypot(Math.max(t, Tt - t), Math.max(a, Rt - a)),
            h = r(0, $t.holdEnd, Wt);
          (lt.forEach((r) => {
            const u = n(-w.bgSpread / 2 + r.a * w.bgSpread - 90) + n(v.dir),
              d = r.dist * i * 0.7,
              g = ((i * w.blobSize) / 100) * r.size,
              f = t + Math.cos(u) * d + r.dx * h,
              m = a + Math.sin(u) * d + r.dy * h,
              p = c * o(e((Wt - r.d * s * 0.4) / s, 0, 1));
            if (p < 0.003) return;
            const b = (g / 2) * (0.85 + 0.15 * l + 0.06 * h),
              x = Mt.createRadialGradient(f, m, 0, f, m, b);
            (x.addColorStop(0, k(B(r.c1), 0.95)),
              x.addColorStop(0.45, k(B(r.c2), 0.45)),
              x.addColorStop(1, "rgba(0,0,0,0)"),
              (Mt.globalAlpha = p),
              (Mt.fillStyle = x),
              Mt.fillRect(f - b, m - b, 2 * b, 2 * b));
          }),
            (Mt.globalCompositeOperation = "source-over"),
            (Mt.globalAlpha = 1));
          const u = Mt.createRadialGradient(t, a, 0, t, a, 0.35 * i);
          return (
            u.addColorStop(0, `rgba(0,0,0,${w.bgCentre / 100})`),
            u.addColorStop(1, "rgba(0,0,0,0)"),
            (Mt.fillStyle = u),
            void Mt.fillRect(0, 0, Tt, Rt)
          );
        }
        if (It) {
          if (((Mt.globalAlpha = c), "glitch" === w.bg)) {
            const t = ((Wt % 12) + 12) % 12,
              e = Wt > 0.5 * s;
            return void ct.forEach((a) => {
              let r = 0;
              if (e)
                for (const e of a.ev)
                  if (t >= e.at && t < e.at + e.dur) {
                    r = e.dx;
                    break;
                  }
              (Mt.save(),
                Mt.setTransform(Et, 0, 0, Et, 0, 0),
                Mt.beginPath(),
                Mt.rect(0, a.y * Rt, Tt, a.h * Rt + 0.5),
                Mt.clip(),
                g(a.alt && Dt ? Dt : It, r),
                Mt.restore());
            });
          }
          g(It, 0);
        }
      })(s, l, c);
      const b = "none" === w.bg ? 0 : v.grain / 100;
      Math.abs(b - ne) > 0.002 &&
        (t.grain && (t.grain.style.opacity = b), (ne = b));
      const x = (function (t, s, l, c, u, g) {
        if (
          (yt.setTransform(1, 0, 0, 1, 0, 0),
          (yt.globalAlpha = 1),
          (yt.globalCompositeOperation = "source-over"),
          yt.clearRect(0, 0, bt.width, bt.height),
          !G)
        )
          return;
        const f = Math.min(Tt, Rt) / 2,
          m = n(v.spread),
          p = n(v.dir - 90) + n(v.drift) * Wt,
          b = (v.bright / 100) * l,
          x = v.depth / 100,
          M = v.scale / 100,
          y = v.variance / 100,
          S = w.fringe / 100,
          A = w.pattern,
          E = Qt(),
          R = Yt(),
          D = Kt(),
          P = 1.1 * Math.hypot(Math.max(t, Tt - t), Math.max(s, Rt - s));
        yt.globalCompositeOperation = "lighter";
        const L =
          (F("bloom") / 100) * r(R, R + 1.1 * D, Wt) * (0.55 + 0.45 * c) * l;
        if (L > 0.003) {
          const e =
            f * (0.25 + (0.9 * v.bloom) / 100) * (1 + 0.1 * M * (c - 0.5));
          (yt.setTransform(At, 0, 0, At, 0, 0), (yt.globalAlpha = 1));
          const a = yt.createRadialGradient(t, s, 0, t, s, e);
          (a.addColorStop(0, h(I.core, L)),
            a.addColorStop(0.16, h(I.core, 0.5 * L)));
          const r = "crystal" === w.palette ? I.A : I.B;
          (a.addColorStop(0.45, h(r, 0.16 * L)),
            a.addColorStop(1, h(r, 0)),
            (yt.fillStyle = a),
            yt.fillRect(t - e, s - e, 2 * e, 2 * e));
        }
        nt.forEach((i) => {
          const h = R + 0.8 * D + i.t * D,
            u = o(e((Wt - h) / D, 0, 1));
          if (u <= 0) return;
          const d =
              (v.flareStr / 100) *
              i.s *
              u *
              a(1, i.end, r(h + D, $t.holdEnd, Wt)) *
              (0.6 + 0.4 * c) *
              l,
            g = P * i.len * (0.6 + 0.4 * u),
            f = 2 * g * Math.tan(n(i.w) / 2);
          ee(yt, it[i.v], i.a + n(v.drift) * Wt * 0.3, 0, g, f, d, t, s);
        });
        const B = ((f * v.inner) / 100) * (1 - 0.35 * M * (1 - c)),
          k = (1.45 * f * v.length) / 100;
        if (v.lBehind > 0.002) {
          const r = Math.min(400, Math.ceil(v.count)),
            o = Math.max(1, v.count),
            i = v.order / 100;
          for (let l = 0; l < r; l++) {
            const r = et[l],
              h = e(v.count - l, 0, 1),
              u = a(r.a, (l + 0.5) / o, i),
              d = Zt(2 * Math.abs(u - 0.5));
            if (d < 0.003) continue;
            const g = te(r.d);
            if (g <= 0) continue;
            const f =
                "sweep" === A ? Vt(E - u) : "shimmer" === A ? Vt(E - r.p) : c,
              w =
                k *
                (1 - y * Math.pow(r.l, 1.3) * 0.9) *
                (1 - M * (1 - f)) *
                (0.25 + 0.75 * g),
              F = Math.max(
                1.1,
                2 * w * Math.tan(n(v.width * (0.45 + 1.1 * r.w)) / 2),
              );
            ae(
              r.v,
              p + (u - 0.5) * m,
              B,
              w,
              F,
              b * (0.3 + 0.7 * r.b) * d * h * (1 - x * (1 - f)) * g * v.lBehind,
              t,
              s,
            );
          }
        }
        const _ =
          (v.ring / 100) *
          r(0, 4, v.inner) *
          r(R + 0.2 * D, R + 1.2 * D, Wt) *
          (1 - x * (1 - c)) *
          v.lBehind *
          l;
        if (_ > 0.003 && B > 1) {
          (yt.setTransform(At, 0, 0, At, 0, 0),
            (yt.globalAlpha = 1),
            (yt.lineCap = "butt"));
          const e = Math.max(24, Math.round((160 * v.spread) / 360)),
            o = Math.max(1.5, 0.022 * f),
            n = B * a(0.8, 1, r(R + 0.2 * D, R + 1.2 * D, Wt));
          for (let a = 0; a < e; a++) {
            const r = (a + 0.5) / e,
              i = Zt(2 * Math.abs(r - 0.5));
            if (i < 0.01) continue;
            const l = p + (a / e - 0.5) * m - 0.006,
              c = p + ((a + 1) / e - 0.5) * m + 0.006,
              u = o * (0.2 + 0.8 * i),
              d = (e, a, r, o) => {
                (yt.beginPath(),
                  yt.arc(t, s, Math.max(0.5, e), l, c),
                  (yt.lineWidth = a),
                  (yt.strokeStyle = h(r, o)),
                  yt.stroke());
              };
            (d(n, 2.6 * u, I.core, _ * i * 0.12),
              d(n + 0.75 * u, 0.8 * u, I.A, _ * i * S),
              d(n, 0.55 * u, I.core, _ * i),
              d(n - 0.75 * u, 0.8 * u, I.B, _ * i * S));
          }
        }
        if (st.length) {
          yt.setTransform(At, 0, 0, At, 0, 0);
          const a = Math.min(Tt, Rt) / 800;
          st.forEach((n) => {
            const i = R + D + 0.6 * n.t,
              c = o(e((Wt - i) / D, 0, 1)),
              h = (v.ghostStr / 100) * n.s * c * l;
            if (h < 0.003) return;
            const u = n.shift * r(i + D, $t.holdEnd, Wt),
              g = n.dist * P * 0.55 + u,
              f = n.size * a,
              m = t + Math.cos(n.a) * g,
              p = s + Math.sin(n.a) * g,
              b = f / 2,
              x = yt.createRadialGradient(m, p, 0, m, p, b);
            (C()
              ? (x.addColorStop(0, T("blue", 0.1)),
                x.addColorStop(0.48, T("blue", 0.12)),
                x.addColorStop(0.6, T("amber", 0.7)),
                x.addColorStop(0.67, T("white", 0.6)),
                x.addColorStop(0.74, T("blue", 0.6)),
                x.addColorStop(0.81, T("violet", 0.5)),
                x.addColorStop(0.9, "rgba(0,0,0,0)"))
              : (x.addColorStop(0, d(80, 0.08, 230, 0.18)),
                x.addColorStop(0.48, d(80, 0.08, 230, 0.18)),
                x.addColorStop(0.6, d(70, 0.2, 20, 0.7)),
                x.addColorStop(0.67, d(85, 0.16, 90, 0.7)),
                x.addColorStop(0.74, d(80, 0.13, 190, 0.7)),
                x.addColorStop(0.81, d(62, 0.2, 290, 0.6)),
                x.addColorStop(0.9, "rgba(0,0,0,0)")),
              (yt.globalAlpha = h),
              (yt.fillStyle = x),
              yt.fillRect(m - b, p - b, 2 * b, 2 * b));
          });
        }
        let z = null;
        if ((_t && (z = Ot(_t, v.size)), _t && v.lEdges > 0.002 && Gt.length)) {
          const t = Math.min(Gt.length, Math.ceil(v.edgeCount)),
            a = m / 2,
            r = (f * v.edgeReach) / 100;
          for (let o = 0; o < t; o++) {
            const t = Gt[o],
              s = e(v.edgeCount - o, 0, 1),
              l = i(t.ang, p),
              c = v.spread >= 359.5 ? 1 : Zt(Math.abs(l) / a);
            if (c < 0.003) continue;
            const h = te(t.d, 0.3);
            if (h <= 0) continue;
            const d =
                "sweep" === A
                  ? Vt(
                      E -
                        (v.echo / 1e3) * g -
                        ((((l / (2 * Math.PI)) % 1) + 1) % 1),
                    )
                  : "shimmer" === A
                    ? Vt(E - (v.echo / 1e3) * g - t.p)
                    : u,
              f =
                r *
                (1 - y * Math.pow(t.l, 1.3) * 0.85) *
                (1 - M * (1 - d)) *
                (0.25 + 0.75 * h),
              m = Math.max(
                1,
                2 * f * Math.tan(n(1.6 * v.width * (0.45 + 1.1 * t.w)) / 2),
              );
            ae(
              t.vv,
              t.ang + 0.25 * (t.w - 0.5),
              0,
              f,
              m,
              b *
                (0.25 + 0.6 * t.b) *
                c *
                s *
                (1 - x * (1 - d)) *
                h *
                v.lEdges *
                v.subjA,
              z.x + t.u * z.w,
              z.y + t.v * z.h,
            );
          }
        }
        if (_t && v.subjA > 0.002 && v.lRim > 0.002 && _t.tA) {
          const t = z.w / _t.R0.w,
            a = z.x - _t.pad * t,
            r = z.y - _t.pad * t,
            o = _t.cw * t,
            n = _t.ch * t;
          (yt.setTransform(At, 0, 0, At, 0, 0),
            (yt.globalAlpha = e(v.lRim * v.subjA * (0.4 + 0.6 * u) * l, 0, 1)));
          const i = v.rimSplit * (0.6 + 0.4 * u);
          (yt.drawImage(_t.tA, a - i, r - 0.35 * i, o, n),
            yt.drawImage(_t.tB, a + i, r + 0.35 * i, o, n));
        }
        if (
          (Ft.setTransform(1, 0, 0, 1, 0, 0),
          (Ft.globalCompositeOperation = "source-over"),
          (Ft.globalAlpha = 1),
          Ft.clearRect(0, 0, xt.width, xt.height),
          v.glow > 0.5 &&
            ((Ft.globalAlpha = v.glow / 100),
            Ft.drawImage(bt, 0, 0, xt.width, xt.height)),
          _t && v.lGlow > 0.002 && _t.tCore)
        ) {
          const t = z.w / _t.R0.w,
            a = z.x - _t.pad * t,
            o = z.y - _t.pad * t,
            n = _t.cw * t,
            i = _t.ch * t,
            s = xt.width / Tt;
          ((Ft.globalCompositeOperation = "lighter"),
            (Ft.globalAlpha = e(
              (v.letterGlow / 100) *
                (0.35 + 0.65 * u) *
                v.lGlow *
                v.subjA *
                r(R + 0.2 * D, R + 1.4 * D, Wt) *
                l,
              0,
              1,
            )),
            Ft.drawImage(_t.tCore, a * s, o * s, n * s, i * s));
        }
        return (
          (yt.globalCompositeOperation = "source-over"),
          (yt.globalAlpha = 1),
          yt.setTransform(At, 0, 0, At, 0, 0),
          w.guides &&
            (yt.setLineDash([3, 6]),
            (yt.lineWidth = 1),
            (yt.strokeStyle = "rgba(255,255,255,.28)"),
            yt.beginPath(),
            yt.arc(t, s, Math.max(1, k), 0, 2 * Math.PI),
            yt.stroke(),
            B > 2 &&
              (yt.beginPath(), yt.arc(t, s, B, 0, 2 * Math.PI), yt.stroke()),
            v.spread < 359 &&
              [-1, 1].forEach((e) => {
                const a = p + (e * m) / 2;
                (yt.beginPath(),
                  yt.moveTo(t, s),
                  yt.lineTo(t + Math.cos(a) * k, s + Math.sin(a) * k),
                  yt.stroke());
              }),
            "none" !== w.bg &&
              w.bgSpread < 360 &&
              "radial" !== w.bg &&
              [-1, 1].forEach((e) => {
                const a = n(v.dir - 90 + (e * w.bgSpread) / 2);
                ((yt.strokeStyle = "rgba(157,220,255,.4)"),
                  yt.beginPath(),
                  yt.moveTo(t, s),
                  yt.lineTo(t + Math.cos(a) * P, s + Math.sin(a) * P),
                  yt.stroke());
              }),
            yt.setLineDash([]),
            yt.beginPath(),
            yt.moveTo(t, s),
            yt.lineTo(
              t + Math.cos(p) * Math.min(k, 0.5 * f),
              s + Math.sin(p) * Math.min(k, 0.5 * f),
            ),
            (yt.strokeStyle = "rgba(255,255,255,.55)"),
            yt.stroke()),
          (yt.globalAlpha = 1),
          z
        );
      })(s, l, c, u, p, g);
      !(function (t, a, r, i) {
        if (
          (St.setTransform(1, 0, 0, 1, 0, 0),
          (St.globalAlpha = 1),
          (St.globalCompositeOperation = "source-over"),
          St.clearRect(0, 0, vt.width, vt.height),
          (function (t, a, r, n) {
            if (!Q) return;
            const i = Math.min(Tt, Rt) / 800,
              s = F("glintRate"),
              l = Yt(),
              c = Kt(),
              h = Math.min(Tt, Rt) / 2;
            St.globalCompositeOperation = "lighter";
            const u = (t, a, r, o, n, i) => {
                if (i < 0.004 || o < 0.5) return;
                const s = Math.cos(n),
                  l = Math.sin(n),
                  c = o / t.width;
                ((St.globalAlpha = e(i, 0, 1)),
                  St.setTransform(
                    At * s * c,
                    At * l * c,
                    -At * l * c,
                    At * s * c,
                    At * a,
                    At * r,
                  ),
                  St.drawImage(t, -t.width / 2, -t.height / 2));
              },
              d = Math.min(Y.length, Math.round(w.glints)),
              g = (v.glintStr / 100) * r;
            for (let r = 0; r < d && g > 0.003; r++) {
              const d = Y[r],
                f = o(e((Wt - l - c * (0.4 + 0.8 * d.ph)) / c, 0, 1));
              if (f <= 0) continue;
              const m = Math.pow(
                0.5 - 0.5 * Math.cos(2 * Math.PI * (Wt * s * d.sp + d.ph)),
                3,
              );
              let p, b;
              if (_t && n && Gt.length) {
                const t = Gt[Math.floor(d.e * Gt.length)];
                ((p = n.x + t.u * n.w), (b = n.y + t.v * n.h));
              } else
                ((p = t + Math.cos(d.a) * d.d * h),
                  (b = a + Math.sin(d.a) * d.d * h));
              const x =
                w.glintSize * i * (0.45 + 0.9 * d.s) * (0.55 + 0.45 * m);
              u(
                d.warm < w.warmth / 100 ? Q : V,
                p,
                b,
                2 * x,
                d.rot,
                g * f * (0.15 + 0.85 * m),
              );
            }
            const f = Math.min(K.length, Math.round(w.dust)),
              m = (w.dustStr / 100) * r;
            for (let r = 0; r < f && m > 0.003; r++) {
              const n = K[r],
                d = o(e((Wt - l - c * (0.6 + n.ph)) / c, 0, 1));
              if (d <= 0) continue;
              const g =
                  0.5 -
                  0.5 * Math.cos(2 * Math.PI * (Wt * s * 0.7 * n.sp + n.ph)),
                f = n.d * h * 1.15 * (1 + 0.04 * Math.sin(0.2 * Wt + 6 * n.ph)),
                p = t + Math.cos(n.a) * f,
                b = a + Math.sin(n.a) * f;
              u(
                n.warm < w.warmth / 100 ? Q : V,
                p,
                b,
                (5 + 12 * n.s) * i * (0.6 + 0.4 * g),
                0,
                m * d * n.s * (0.25 + 0.75 * g),
              );
            }
          })(t, a, r, i),
          !w.reveal)
        )
          return;
        const s = 1e3 * Wt,
          l = 1.1 * Math.hypot(Math.max(t, Tt - t), Math.max(a, Rt - a));
        St.globalCompositeOperation = "lighter";
        const c = F("ringA") / 100;
        if (c > 0.003 && s < w.dur + w.stagger + 50) {
          (St.setTransform(At, 0, 0, At, 0, 0), (St.globalAlpha = 1));
          const r = w.ringW / 100,
            o = (t) => (32 + (t - 32) * r) / 100,
            n = at.length,
            i = Math.PI / n + 0.002;
          at.forEach((r) => {
            const n = f(e((s - r.delay) / w.dur, 0, 1));
            if (n <= 0) return;
            const u = -5 * l * (1 - n),
              d = (t) => 6 * l * o(t) + u,
              g = [
                [d(20), J],
                ...(C() ? oe : re).map(([t, e, a, o]) => [
                  d(o),
                  N(t, e, a + r.shift, c),
                ]),
                [d(45), J],
              ],
              m = g[0][0],
              p = g[g.length - 1][0];
            if (p <= 0 || m >= l) return;
            const b = Math.max(0, m);
            if (p - b < 1) return;
            const x = St.createRadialGradient(t, a, b, t, a, p);
            if (m < 0) {
              const t = W(
                g.map(([t, e]) => [t, e]),
                0,
              );
              x.addColorStop(0, h(t, t[3]));
            }
            (g.forEach(([t, a]) => {
              t < 0 || x.addColorStop(e((t - b) / (p - b), 0, 1), h(a, a[3]));
            }),
              (St.fillStyle = x),
              St.beginPath(),
              St.arc(t, a, p, r.a - i, r.a + i),
              St.arc(t, a, b, r.a + i, r.a - i, !0),
              St.closePath(),
              St.fill());
          });
        }
        const u = 360 / Math.max(1, rt.length),
          d = F("sBright") / 100;
        rt.forEach((r, o) => {
          const i = e((s - r.delay) / w.dur, 0, 1);
          if (i <= 0 || i >= 1 || !ot[o]) return;
          const c = m(i),
            h = d * (1 - (w.sBrightJit / 100) * r.bj),
            g =
              c < 0.18
                ? (h * c) / 0.18
                : c < 0.48
                  ? h
                  : h * (1 - (c - 0.48) / 0.52),
            f = ((l * w.sReach) / 100) * (1 - (w.sReachJit / 100) * r.rl),
            p = Math.max(1, 2 * f * Math.tan(n((u * w.sWidth) / 100 / 2)));
          ee(
            St,
            ot[o],
            r.a,
            0,
            f * (0.03 + 0.97 * c),
            p * (0.4 + (w.sThick / 100 - 0.4) * c),
            g,
            t,
            a,
          );
        });
      })(s, l, c, x);
    }
    let se = !0;
    function le(t) {
      requestAnimationFrame(le);
      const e = Math.min(0.05, Math.max(0, (t - Nt) / 1e3));
      if (((Nt = t), !se)) return;
      (($t = Jt()), Ht && (Wt += 1 * e));
      const a = 1 - Math.exp(11 * -e);
      for (const t of b)
        if ("dir" === t) {
          const t = ((((w.dir - v.dir) % 360) + 540) % 360) - 180;
          v.dir += t * a;
        } else v[t] += (w[t] - v[t]) * a;
      for (const t of x) v[t] += ((w[t] ? 1 : 0) - v[t]) * a;
      const r = 1 - Math.exp(8 * -e);
      ((v.x += (w.x - v.x) * r),
        (v.y += (w.y - v.y) * r),
        (v.subjA += (1 - v.subjA) * (1 - Math.exp(5 * -e))),
        (O = Math.min(1, O + e / 0.35)),
        ie());
    }
    window.IntersectionObserver &&
      new IntersectionObserver(
        (t) => {
          se = t[0].isIntersecting;
        },
        { rootMargin: "80px" },
      ).observe(mt);
    const ce = () => {
      const t = (function () {
        if ("statue" === w.subject) {
          const t = Ot({ kind: "statue" });
          return {
            x: Math.round(((t.x + t.w / 2) / Tt) * 100),
            y: Math.round(((t.y + 0.36 * t.h) / Rt) * 100),
          };
        }
        return { x: 50, y: w.copy ? 34 : 50 };
      })();
      ((w.x = t.x), (w.y = t.y));
    };
    return (
      L(),
      ht(),
      ut(),
      Z(),
      (Q = tt([1, 0.98, 0.93], u(0.76, 0.13, 60))),
      (V = tt([0.95, 0.97, 1], u(0.68, 0.13, 250))),
      (G = U()),
      new ResizeObserver(() => {
        (Ct(), clearTimeout(ce.t), (ce.t = setTimeout(ce, 260)));
      }).observe(mt),
      Ct(),
      ($t = Jt()),
      p && (Wt = $t.intro + 0.5),
      qt(!0).then(() => {
        (ce(), (v.x = w.x), (v.y = w.y), t.onReady && t.onReady());
      }),
      Lt(),
      requestAnimationFrame((t) => {
        ((Nt = t), requestAnimationFrame(le));
      }),
      {
        settings: w,
        rect: () => (_t ? Ot({ kind: "statue" }) : null),
        time: () => Wt,
        set(t, e) {
          ((w[t] = e),
            ("palette" !== t && "hue" !== t && "tone" !== t) ||
              (L(), jt(), H(!0), ft(), gt()),
            ("fringe" !== t && "variety" !== t && "profile" !== t) ||
              H("profile" === t),
            (/^bg(?!Int$|Drift$)/.test(t) ||
              "blobs" === t ||
              "blobSize" === t ||
              "shards" === t ||
              "bands" === t) &&
              (clearTimeout(this._tx), (this._tx = setTimeout(Lt, 120))),
            [
              "flares",
              "ghosts",
              "streaks",
              "slices",
              "stagger",
              "blobs",
              "shards",
              "bands",
              "sJitter",
              "sReachJit",
              "sBrightJit",
            ].includes(t) && ut(),
            ["glints", "dust"].includes(t) && Z(),
            "seed" === t && (ht(), ut(), Z()),
            [
              "sMode",
              "sChroma",
              "sLight",
              "sSpan",
              "sHue",
              "sWidth",
              "sCore",
              "sThick",
              "slices",
            ].includes(t) && gt());
        },
        setAll(t) {
          for (const e in t) this.set(e, t[e]);
        },
        replay() {
          ((Wt = 0), (v.subjA = 0));
        },
        relayout() {
          (clearTimeout(this._rl),
            (this._rl = setTimeout(() => {
              (qt(!1).then(ce), Lt());
            }, 60)),
            ce());
        },
      }
    );
  }),
  (() => {
    const t = {
        image: "",
        alt: "Lady Liberty in crystal glass, holding a basketball",
        layout: { size: 0.58, x: 0.5, y: 0.37, maxWidth: 0.8 },
        aurora: {
          bg: "conic",
          bgPal: "crystal",
          bgInt: 55,
          bgDrift: 0.6,
          bgSweep: 18,
          bgSpread: 210,
          bgFeather: 34,
          bgRadius: 85,
          blobs: 7,
          blobSize: 75,
          bgCentre: 55,
          bgEdge: 15,
          bgHue: 0,
          bgSat: 100,
          bgLight: 100,
          grain: 22,
          letterGlow: 50,
          bloom: 45,
        },
        sparkle: {
          glints: 52,
          glintSize: 95,
          glintStr: 85,
          glintRate: 0.45,
          warmth: 72,
          dust: 90,
          dustStr: 55,
          flares: 6,
          flareStr: 42,
          ghosts: 3,
          ghostStr: 22,
        },
        statue: {
          palette: "prism",
          light: 1,
          tint: 0.08,
          clarity: 0.4,
          speed: 0.22,
          flow: 1.15,
          flowScale: 1.5,
          scale: 2.1,
          sharp: 2.6,
          disp: 0.45,
          edge: 0.75,
          glitter: 0.45,
          gsize: 20,
          twinkle: 0.7,
          grain: 0.015,
          quality: 2,
        },
      },
      e = {
        count: 0,
        pattern: "off",
        reveal: !1,
        copy: !0,
        seq: "once",
        pointer: "fixed",
      };
    let a = !1;
    function r(r, o) {
      if (typeof r === "string") r = document.querySelector(r);
      if (!r || r.nodeType !== 1)
        throw new TypeError(
          "Prism Liberty: mount requires an image or container",
        );
      const existing =
        r.tagName === "IMG" ? r : r.querySelector("img[data-prism], img");
      if (existing && existing.__prism) return existing.__prism;
      if (r.__prism) return r.__prism;
      if (existing) {
        r = existing.parentElement;
        if (r && r.tagName === "PICTURE") r = r.parentElement;
        if (!r) throw new Error("Prism Liberty: image must have a parent");
        if (r.__prism)
          throw new Error(
            "Prism Liberty: use a separate parent for each image",
          );
      }
      if (!a) {
        const t = document.createElement("style");
        ((t.textContent =
          "\n[data-prism-liberty]:not([data-prism-existing]){position:relative;overflow:hidden;isolation:isolate;background:#020203}\n[data-prism-liberty] .pl-scene{position:absolute;inset:0}\n[data-prism-liberty] .pl-scene>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}\n[data-prism-liberty] .pl-light,[data-prism-liberty] .pl-front{mix-blend-mode:screen}\n[data-prism-liberty] .pl-glow{mix-blend-mode:screen;filter:blur(14px) saturate(1.15)}\n[data-prism-liberty] .pl-grain{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:0;background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")}\n[data-prism-liberty] .pl-img,[data-prism-liberty] canvas.pl-statue{position:absolute;inset:auto;pointer-events:none}\n[data-prism-liberty] .pl-img{display:block;object-fit:contain;animation:plRise 1.6s cubic-bezier(.3,.8,.25,1) .1s both}\n[data-prism-liberty] canvas.pl-statue{opacity:0}\n[data-prism-liberty].pl-gpu canvas.pl-statue{opacity:1;animation:plRise 1.6s cubic-bezier(.3,.8,.25,1) both}\n[data-prism-liberty].pl-gpu .pl-img{visibility:hidden}\n@keyframes plRise{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}\n@media (prefers-reduced-motion:reduce){[data-prism-liberty] .pl-img,[data-prism-liberty].pl-gpu canvas.pl-statue{animation:none}}"),
          document.head.appendChild(t),
          (a = !0));
      }
      let n = {};
      const i = r.querySelector('script[type="application/json"]');
      if (i)
        try {
          n = JSON.parse(i.textContent || "{}");
        } catch (t) {
          console.warn("Prism Liberty: settings JSON is invalid", t);
        }
      ((n = ((t, e) => {
        const a = {};
        for (const r in t)
          a[r] =
            t[r] && "object" == typeof t[r] && !Array.isArray(t[r])
              ? Object.assign({}, t[r], (e || {})[r])
              : void 0 !== (e || {})[r]
                ? e[r]
                : t[r];
        return a;
      })(t, o || n)),
        !existing &&
          !r.style.height &&
          r.clientHeight < 40 &&
          (r.style.height = "100svh"));
      if (existing) r.setAttribute("data-prism-existing", "");
      r.setAttribute("data-prism-liberty", "");
      if (getComputedStyle(r).position === "static")
        r.style.position = "relative";
      const s = (t, e, a) => {
          const r = document.createElement(t);
          if ((e && (r.className = e), a))
            for (const t in a) r.setAttribute(t, a[t]);
          return r;
        },
        l = s("div", "pl-scene"),
        c =
          !(o && o.scene) && s("canvas", "pl-back", { "aria-hidden": "true" }),
        h = !(o && o.scene) && s("div", "pl-grain", { "aria-hidden": "true" }),
        u =
          !(o && o.scene) && s("canvas", "pl-light", { "aria-hidden": "true" }),
        d =
          !(o && o.scene) && s("canvas", "pl-glow", { "aria-hidden": "true" }),
        g =
          existing ||
          s("img", "pl-img", {
            alt: n.alt,
            decoding: "async",
            fetchpriority: "high",
          }),
        f = s("canvas", "pl-statue", { "aria-hidden": "true" }),
        m =
          !(o && o.scene) && s("canvas", "pl-front", { "aria-hidden": "true" });
      l.setAttribute("aria-hidden", "true");
      l.style.pointerEvents = "none";
      if (existing) {
        l.append(...[c, h, u, d, f, m].filter(Boolean));
        l.style.visibility = "hidden";
        r.append(l);
      } else {
        l.append(c, h, u, d, g, f, m);
        r.prepend(l);
      }
      const originalOpacity = g.style.getPropertyValue("opacity");
      const originalPriority = g.style.getPropertyPriority("opacity");
      const p = { root: r, cfg: n, engine: null, statue: null };
      function b(t, e) {
        if (existing) {
          const imageRect = g.getBoundingClientRect();
          const rootRect = r.getBoundingClientRect();
          const scaleX = r.offsetWidth ? rootRect.width / r.offsetWidth : 1;
          const scaleY = r.offsetHeight ? rootRect.height / r.offsetHeight : 1;
          return {
            x:
              (imageRect.left - rootRect.left) / (scaleX || 1) -
              r.clientLeft +
              r.scrollLeft,
            y:
              (imageRect.top - rootRect.top) / (scaleY || 1) -
              r.clientTop +
              r.scrollTop,
            w: imageRect.width / (scaleX || 1),
            h: imageRect.height / (scaleY || 1),
          };
        }
        const a = n.layout,
          ratio = (g.naturalWidth || 443) / (g.naturalHeight || 663);
        let o = e * a.size,
          i = o * ratio;
        return (
          i > t * a.maxWidth && ((i = t * a.maxWidth), (o = i / ratio)),
          { x: t * a.x - i / 2, y: e * a.y - o / 2, w: i, h: o }
        );
      }
      r.__prism = p;
      if (existing) existing.__prism = p;
      let x = null;
      function w() {
        const t = b(r.clientWidth, r.clientHeight),
          e = 0.14 * t.h;
        (!existing &&
          Object.assign(g.style, {
            left: t.x + "px",
            top: t.y + "px",
            width: t.w + "px",
            height: t.h + "px",
          }),
          Object.assign(f.style, {
            left: t.x - e + "px",
            top: t.y - e + "px",
            width: t.w + 2 * e + "px",
            height: t.h + 2 * e + "px",
          }),
          (x = t.w > 0 && t.h > 0 ? [e, e, t.w, t.h] : null));
      }
      const resize = new ResizeObserver(w);
      resize.observe(r);
      if (existing) resize.observe(g);
      g.addEventListener("load", w);
      const v = () => Object.assign({}, n.aurora, n.sparkle, e),
        M = () => {
          r.classList.remove("pl-gpu");
          if (existing) {
            l.style.visibility = "hidden";
            if (originalOpacity)
              g.style.setProperty("opacity", originalOpacity, originalPriority);
            else g.style.removeProperty("opacity");
          }
        };
      const source =
        (o && o.texture) ||
        g.getAttribute("data-prism-texture") ||
        n.image ||
        g.currentSrc ||
        g.src;
      w();
      return (
        source
          ? (function (t) {
              if (!existing) g.src = t;
              const e = new Image();
              ((e.crossOrigin = "anonymous"),
                (e.onload = () =>
                  (function (t) {
                    w();
                    try {
                      p.engine =
                        o && o.scene
                          ? o.scene.start(t, g)
                          : window.createLightEngine({
                              settings: v(),
                              stage: r,
                              back: c,
                              light: u,
                              glow: d,
                              front: m,
                              grain: h,
                              img: t,
                              layout: (t, e) => b(t, e),
                            });
                    } catch (t) {
                      console.warn(
                        "Prism Liberty: light engine unavailable",
                        t,
                      );
                    }
                    try {
                      p.statue = window.createPrism(f, t, n.statue, {
                        observe: !0,
                        fit: () => x,
                        onFirstFrame: () => {
                          r.classList.add("pl-gpu");
                          if (existing) {
                            l.style.visibility = "visible";
                            g.style.setProperty("opacity", "0", "important");
                          }
                        },
                        onLost: M,
                        onError: M,
                      });
                    } catch (t) {
                      (console.warn(
                        "Prism Liberty: statue effect unavailable",
                        t,
                      ),
                        M());
                    }
                    p.onReady && p.onReady(p);
                  })(e)),
                (e.onerror = () => {
                  (M(), p.onReady && p.onReady(p));
                }),
                (e.src = t));
            })(source)
          : console.warn(
              'Prism Liberty: add your image URL to "image" in the settings JSON',
            ),
        (p.set = (t, e, a) => {
          ((n[t][e] = a),
            "statue" === t
              ? p.statue && p.statue.set(e, a)
              : "layout" === t
                ? (w(), p.engine && p.engine.relayout())
                : p.engine && p.engine.set(e, a));
        }),
        (p.config = () => JSON.parse(JSON.stringify(n))),
        p
      );
    }
    window.PrismLiberty = {
      mount: r,
      DEFAULTS: t,
      LOCKED: e,
      version: "1.2.0",
      scene: mountScene,
    };
    function mountScene(options = {}) {
      const mode = options.mode || "hero";
      if (mode !== "hero" && mode !== "viewport")
        throw new Error('Prism Liberty: mode must be "hero" or "viewport"');
      const host =
        mode === "viewport"
          ? document.body
          : typeof options.hero === "string"
            ? document.querySelector(options.hero)
            : options.hero;
      if (!host) throw new Error("Prism Liberty: hero element not found");
      if (host.__prismScene) return host.__prismScene;
      const images = Array.from(
        host.querySelectorAll(options.selector || "img[data-prism]"),
      );
      if (!images.length)
        throw new Error("Prism Liberty: no marked images found");
      if (images.some((image) => image.__prism))
        throw new Error(
          "Prism Liberty: initialize the scene before mounting its images",
        );
      const stage = document.createElement("div");
      stage.setAttribute("data-prism-liberty", "");
      stage.setAttribute("data-prism-existing", "");
      stage.setAttribute("aria-hidden", "true");
      Object.assign(stage.style, {
        position: mode === "viewport" ? "fixed" : "absolute",
        inset: "0",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: "-1",
      });
      if (mode === "hero" && getComputedStyle(host).position === "static")
        host.style.position = "relative";
      host.style.isolation = "isolate";
      const layer = document.createElement("div");
      layer.className = "pl-scene";
      const layers = {};
      for (const name of ["back", "light", "glow", "front", "grain"]) {
        const element = document.createElement(
          name === "grain" ? "div" : "canvas",
        );
        element.className = "pl-" + name;
        layers[name] = element;
        layer.appendChild(element);
      }
      stage.appendChild(layer);
      host.prepend(stage);
      const scene = {
        mode,
        stage,
        engine: null,
        instances: [],
        start(texture, image) {
          if (this.engine || image !== images[0]) return this.engine;
          // The first marked image anchors the shared lighting.
          const layout = () => {
            const rect = image.getBoundingClientRect();
            const area = stage.getBoundingClientRect();
            const sx = area.width / stage.clientWidth || 1;
            const sy = area.height / stage.clientHeight || 1;
            return {
              x: (rect.left - area.left) / sx,
              y: (rect.top - area.top) / sy,
              w: rect.width / sx,
              h: rect.height / sy,
            };
          };
          this.engine = window.createLightEngine({
            ...layers,
            stage,
            img: texture,
            layout,
            settings: Object.assign(
              {},
              t.aurora,
              options.aurora,
              t.sparkle,
              options.sparkle,
              e,
            ),
          });
          let scheduled = false;
          const update = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
              scheduled = false;
              this.engine.relayout();
            });
          };
          new ResizeObserver(update).observe(image);
          window.addEventListener("resize", update, { passive: true });
          if (mode === "viewport")
            window.addEventListener("scroll", update, {
              passive: true,
              capture: true,
            });
          return this.engine;
        },
      };
      host.__prismScene = scene;
      for (const image of images) {
        try {
          scene.instances.push(r(image, { ...options, scene }));
        } catch (error) {
          console.warn("Prism Liberty: image mount unavailable", error);
        }
      }
      return scene;
    }
    const o = () => {
      if (window.PrismLibertyConfig) {
        try {
          mountScene(window.PrismLibertyConfig);
        } catch (error) {
          console.warn("Prism Liberty: scene unavailable", error);
        }
        return;
      }
      document
        .querySelectorAll(
          "img[data-prism]:not([data-manual]), [data-prism-liberty]:not([data-manual])",
        )
        .forEach((t) => {
          try {
            r(t);
          } catch (error) {
            console.warn("Prism Liberty: mount unavailable", error);
          }
        });
    };
    "loading" === document.readyState
      ? document.addEventListener("DOMContentLoaded", o)
      : o();
  })());
