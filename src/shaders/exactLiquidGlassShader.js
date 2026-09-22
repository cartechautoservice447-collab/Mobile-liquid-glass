export const exactStudioVertexShader = `varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

export const exactStudioFragmentShader = `precision highp float;

varying vec2 vUv;

#define MAX_BOXES 64

uniform vec2 uResolution;
uniform vec4 uBoxes[MAX_BOXES]; // xy = center in screen px (top-left origin), zw = width & height
uniform float uRadii[MAX_BOXES];
uniform float uBezels[MAX_BOXES];
uniform int uBoxCount;
uniform int uFixedTopBoxIdx; // Index of the fixed top glass (e.g. horizontal bottom dock)
uniform float uTime;          // Animation time for liquid ripples and specular sheen

uniform float uThickness;
uniform float uIOR;
uniform float uDispersion;
uniform float uBlur;
uniform float uSpecular;
uniform float uTint;
uniform float uShadow;

uniform sampler2D uBgTex;
uniform float uBgAspect;
uniform float uRenderBg;

// Exact Signed Distance Field from webglGlassShader.ts
float sdRoundedRect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// Exact surface height from webglGlassShader.ts
float surfaceHeight(float t) {
  float s = 1.0 - t;
  return pow(1.0 - s * s * s * s, 0.25);
}

// Exact background sampling with aspect ratio calculation from webglGlassShader.ts
vec3 sampleBg(vec2 screenUV) {
  float screenAspect = uResolution.x / uResolution.y;
  vec2 uv = screenUV;
  if (uBgAspect > screenAspect) {
    float s = screenAspect / uBgAspect;
    uv.x = uv.x * s + (1.0 - s) * 0.5;
  } else {
    float s = uBgAspect / screenAspect;
    uv.y = uv.y * s + (1.0 - s) * 0.5;
  }
  uv.y = 1.0 - uv.y;
  return texture2D(uBgTex, uv).rgb;
}

// Exact 16 Poisson disk blur sample offsets from webglGlassShader.ts
vec3 sampleBgBlurred(vec2 uv, float radius) {
  if (radius < 0.5) return sampleBg(uv);
  vec3 sum = vec3(0.0);
  vec2 px = 1.0 / uResolution;
  vec2 offsets[16];
  offsets[0]  = vec2(-0.94201, -0.39906);
  offsets[1]  = vec2( 0.94558, -0.76890);
  offsets[2]  = vec2(-0.09418, -0.92938);
  offsets[3]  = vec2( 0.34495,  0.29387);
  offsets[4]  = vec2(-0.91588, -0.45771);
  offsets[5]  = vec2(-0.81544,  0.48568);
  offsets[6]  = vec2(-0.38277, -0.56071);
  offsets[7]  = vec2(-0.12675,  0.84686);
  offsets[8]  = vec2( 0.89642,  0.41254);
  offsets[9]  = vec2( 0.18150, -0.30020);
  offsets[10] = vec2(-0.01445, -0.16001);
  offsets[11] = vec2( 0.59614,  0.71118);
  offsets[12] = vec2( 0.49742, -0.47280);
  offsets[13] = vec2( 0.80685,  0.04588);
  offsets[14] = vec2(-0.32490, -0.03965);
  offsets[15] = vec2(-0.60975,  0.06566);

  for (int i = 0; i < 16; i++) {
    sum += sampleBg(uv + offsets[i] * radius * px);
  }
  return sum / 16.0;
}

void main() {
  // Screen pixel coordinate with y=0 at the top (matching browser getBoundingClientRect)
  vec2 screenPx = vec2(vUv.x, 1.0 - vUv.y) * uResolution;

  float minSd = 1e6;
  float maxInsideSd = -1e6;
  int activeBoxIdx = -1;
  vec2 activeCenter = vec2(0.0);
  vec2 activeHalfSize = vec2(0.0);
  float activeRadius = 0.0;
  float activeBezel = 0.0;
  float totalShadow = 0.0;

  // Track fixed top box specifically (the horizontal bottom dock)
  float topBoxSd = 1e6;
  vec2 topCenter = vec2(0.0);
  vec2 topHalfSize = vec2(0.0);
  float topRadius = 0.0;
  float topBezel = 0.0;
  bool hasTopBox = (uFixedTopBoxIdx >= 0 && uFixedTopBoxIdx < uBoxCount);

  for (int i = 0; i < MAX_BOXES; i++) {
    if (i >= uBoxCount) break;

    vec2 center = uBoxes[i].xy;
    vec2 size = uBoxes[i].zw;
    if (size.x <= 1.0 || size.y <= 1.0) continue;

    vec2 halfSize = size * 0.5;
    float r = min(uRadii[i], min(halfSize.x, halfSize.y));
    float b = uBezels[i];
    vec2 p = screenPx - center;
    float sd = sdRoundedRect(p, halfSize, r);

    // If this is the fixed top box, record its SDF parameters
    if (hasTopBox && i == uFixedTopBoxIdx) {
      topBoxSd = sd;
      topCenter = center;
      topHalfSize = halfSize;
      topRadius = r;
      topBezel = b;
      // Drop shadow cast by the fixed top box onto whatever is underneath
      if (sd > 0.0) {
        float shadowFalloff = exp(-sd * sd / 850.0);
        totalShadow += uShadow * shadowFalloff * 0.75;
      }
      continue; // Handled with top-layer priority below
    }

    // Shadow equation for scrolling boxes
    if (sd > 0.0) {
      float shadowFalloff = exp(-sd * sd / 800.0);
      totalShadow += uShadow * shadowFalloff * 0.55;
    }

    if (sd <= 0.0) {
      if (activeBoxIdx == -1 || maxInsideSd < sd) {
        maxInsideSd = sd;
        minSd = sd;
        activeBoxIdx = i;
        activeCenter = center;
        activeHalfSize = halfSize;
        activeRadius = r;
        activeBezel = b;
      }
    } else if (activeBoxIdx == -1 && sd < minSd) {
      minSd = sd;
    }
  }

  // 1. If screenPx is inside the fixed top box, it ALWAYS takes priority!
  // All other glass boxes scroll seamlessly underneath this fixed horizontal glass.
  bool isInsideTopBox = (hasTopBox && topBoxSd <= 0.0);
  if (isInsideTopBox) {
    activeBoxIdx = uFixedTopBoxIdx;
    minSd = topBoxSd;
    activeCenter = topCenter;
    activeHalfSize = topHalfSize;
    activeRadius = topRadius;
    activeBezel = topBezel;
  }

  // Outside all active glass boxes: render background with accumulated drop shadows
  if (minSd > 0.0 || activeBoxIdx == -1) {
    totalShadow = clamp(totalShadow, 0.0, 0.75);
    if (uRenderBg > 0.5) {
      vec3 bgColor = sampleBg(screenPx / uResolution);
      bgColor = mix(bgColor, vec3(0.0), totalShadow);
      gl_FragColor = vec4(bgColor, 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, totalShadow);
    }
    return;
  }

  // Inside the active glass box: apply physical liquid refraction optics
  float sd = minSd;
  vec2 p = screenPx - activeCenter;
  vec2 halfSize = activeHalfSize;
  float uRadius = activeRadius;
  float distFromEdge = -sd;

  float bezel = min(activeBezel, min(uRadius, min(halfSize.x, halfSize.y)) - 1.0);
  bezel = max(bezel, 4.0);

  float t = clamp(distFromEdge / bezel, 0.0, 1.0);
  float h = surfaceHeight(t);

  float dt = 0.001;
  float h2 = surfaceHeight(min(t + dt, 1.0));
  float dh = (h2 - h) / dt;

  // Snell's law refraction displacement
  float slopeAngle = atan(dh * (uThickness / bezel));
  float sinR = sin(slopeAngle) / uIOR;
  sinR = clamp(sinR, -1.0, 1.0);
  float thetaR = asin(sinR);
  float displacement = h * uThickness * (tan(slopeAngle) - tan(thetaR));

  vec2 grad;
  float eps = 0.5;
  grad.x = sdRoundedRect(p + vec2(eps, 0.0), halfSize, uRadius) - sd;
  grad.y = sdRoundedRect(p + vec2(0.0, eps), halfSize, uRadius) - sd;
  grad = normalize(grad);

  // Dynamic subtle wave displacement for liquid glass animation
  vec2 animOffset = vec2(0.0);
  if (activeBoxIdx == uFixedTopBoxIdx) {
    float wave = sin(p.x * 0.025 + uTime * 2.0) * cos(p.y * 0.035 + uTime * 1.5) * 0.08;
    animOffset = vec2(wave * 4.0, wave * 2.0);
  }

  vec2 offset = (-grad * displacement + animOffset) / uResolution;
  vec2 screenUV = screenPx / uResolution;
  vec2 refractedUV = screenUV + offset;

  // Physical chromatic dispersion (wavelength-dependent ray separation at curved boundaries)
  vec2 dispDelta = (grad * displacement * (uDispersion * 0.012)) / uResolution;
  vec2 uvR = refractedUV - dispDelta;
  vec2 uvG = refractedUV;
  vec2 uvB = refractedUV + dispDelta;

  // Sample blurred refracted background with chromatic separation
  vec3 color = vec3(
    sampleBgBlurred(uvR, uBlur).r,
    sampleBgBlurred(uvG, uBlur).g,
    sampleBgBlurred(uvB, uBlur).b
  );

  // If this pixel is inside a scrolling box that is underneath the shadow of the fixed top box,
  // cast the fixed top box shadow down onto the scrolling glass!
  if (!isInsideTopBox && hasTopBox && topBoxSd > 0.0 && topBoxSd < 45.0) {
    float topShadowFalloff = exp(-topBoxSd * topBoxSd / 600.0);
    color = mix(color, vec3(0.0), topShadowFalloff * uShadow * 0.65);
  }

  // Specular highlight with static light angle matching Main/Reference
  vec2 lightDir = normalize(vec2(0.5, -0.7));
  float rimDot = abs(dot(grad, lightDir));
  float rimFalloff = 1.0 - smoothstep(0.0, bezel * 0.4, distFromEdge);
  float specHighlight = pow(rimDot * rimFalloff, 1.5);
  color += vec3(specHighlight * uSpecular);

  // Fixed horizontal glass WebGL animation: periodic smooth specular light sheen sweep
  if (activeBoxIdx == uFixedTopBoxIdx) {
    float sweepPos = mod(uTime * 0.4, 3.5) - 1.25;
    vec2 normP = p / halfSize;
    float sweepDist = abs((normP.x * 0.85 + normP.y * 0.35) - sweepPos);
    float sheen = exp(-sweepDist * sweepDist * 32.0) * 0.42 * uSpecular;
    color += vec3(sheen * 0.9, sheen * 1.1, sheen * 1.35); // Prismatic chromatic sheen

    // Ambient liquid shimmer
    float liquidShimmer = sin(p.x * 0.035 + uTime * 2.2) * cos(p.y * 0.035 + uTime * 1.8) * 0.03;
    color += vec3(liquidShimmer * 0.15);
  }

  // Inner shadow
  float innerShadow = 1.0 - smoothstep(0.0, bezel * 0.6, distFromEdge);
  color *= mix(1.0, 0.7, innerShadow * 0.3);

  // Inner rim
  float innerRim = smoothstep(0.0, 2.0, distFromEdge) * (1.0 - smoothstep(2.0, 5.0, distFromEdge));
  color += vec3(innerRim * 0.15 * uSpecular);

  // Glass tint
  color = mix(color, vec3(1.0), uTint);

  // Smooth edge antialiasing
  float alpha = smoothstep(0.0, 1.5, distFromEdge);
  gl_FragColor = vec4(color, alpha);
}
`;
