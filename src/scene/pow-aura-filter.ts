const { AbstractBaseFilter } = foundry.canvas.rendering.filters;

/** Room for the aura around the token, most of a grid space at the current zoom. */
function auraPadding(): number {
  return (canvas?.dimensions?.size ?? 100) * (canvas?.stage?.scale.x ?? 1) * 0.9;
}

/**
 * A dense, swirling, ghostly aura with colored streaks, drawn over a token's space instead of the token, so the
 * shape of what is seen stays hidden: Second Sight shows a POW aura, not a creature.
 */
export class PowAuraFilter extends AbstractBaseFilter {
  // A frame cut to the screen edge would move and squash the aura, like for core's outline filter
  override autoFit = false;
  override padding = auraPadding();

  static override get defaultUniforms() {
    return { time: 0, inner: 0.6 };
  }

  static override _createVertexShader(): string {
    return `
    precision ${PIXI.Program.defaultFragmentPrecision} float;
    attribute vec2 aVertexPosition;
    uniform mat3 projectionMatrix;
    uniform vec4 inputSize;
    uniform vec4 outputFrame;
    varying vec2 vTextureCoord;
    varying vec2 vUv;

    void main(void) {
      vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.0)) + outputFrame.xy;
      gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
      vTextureCoord = aVertexPosition * (outputFrame.zw * inputSize.zw);
      vUv = aVertexPosition;
    }`;
  }

  static override _createFragmentShader(): string {
    return `
    precision ${PIXI.Program.defaultFragmentPrecision} float;
    varying vec2 vUv;
    uniform vec4 outputFrame;
    uniform float time;
    uniform float inner;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    float fbm(vec2 p) {
      float total = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 5; i++) {
        total += amp * noise(p);
        p = mat2(1.6, 1.2, -1.2, 1.6) * p;
        amp *= 0.5;
      }
      return total;
    }

    vec3 hue(float h) {
      vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return rgb * rgb * (3.0 - 2.0 * rgb);
    }

    void main(void) {
      // Frame coordinates, -1..1 across its shorter side, then in token half-widths
      vec2 frame = (vUv - 0.5) * 2.0 * outputFrame.zw / min(outputFrame.z, outputFrame.w);
      vec2 p = frame / inner;
      float r = length(p);

      // A twirl that turns faster towards the middle
      float twist = 1.8 / (0.6 + r) + time * 0.12;
      vec2 q = mat2(cos(twist), -sin(twist), sin(twist), cos(twist)) * p;

      // Domain-warped noise for clouds of color that flow into each other
      vec2 warp = vec2(fbm(q * 0.8 + time * 0.07), fbm(q * 0.8 + vec2(5.2, 1.3) - time * 0.06));
      float n = fbm(q * 0.9 + 1.8 * warp);

      // Pale, cool mist, lighter where the noise is thicker
      vec3 color = mix(vec3(0.36, 0.44, 0.62), vec3(0.74, 0.82, 0.96), smoothstep(0.2, 0.8, n));

      // Thin colored streaks along the contour lines of a second warped noise, so they follow the swirl
      float s = fbm(q * 1.3 + 2.4 * warp + vec2(3.1, 7.7));
      float streak = 1.0 - smoothstep(0.0, 0.045, abs(s - 0.5));
      streak = max(streak, 0.6 * (1.0 - smoothstep(0.0, 0.03, abs(s - 0.38))));
      // sin of the angle, not atan, whose jump along one ray would show as a seam
      float h = fract(n * 0.9 + 0.2 * q.y / (r + 0.05) + time * 0.015);
      color = mix(color, hue(h) * 0.85 + 0.1, streak * 0.8);

      // Dense over the token, thinning out into wisps beyond its corners
      float edge = 1.7 + 0.35 * (n - 0.5) * 2.0;
      float fade = 1.0 - smoothstep(0.75, edge, r);
      float wisps = mix(1.0, smoothstep(0.25, 0.75, n), smoothstep(0.8, 1.4, r));
      float alpha = (0.93 + 0.05 * streak) * fade * fade * wisps;
      alpha *= 1.0 - smoothstep(0.7, 1.0, length(frame));
      gl_FragColor = vec4(color * alpha, alpha);
    }`;
  }

  override apply(
    filterManager: PIXI.FilterSystem,
    input: PIXI.RenderTexture,
    output: PIXI.RenderTexture,
    clear?: PIXI.CLEAR_MODES,
  ): void {
    // The frame was built with the current padding, so `inner` uses it before it follows the zoom
    const frame = input.filterFrame;
    if (frame) {
      const half = Math.min(frame.width, frame.height) / 2;
      this.uniforms["inner"] = Math.min(Math.max((half - this.padding) / half, 0.2), 1);
    }
    this.padding = auraPadding();
    if (!canvas?.photosensitiveMode) {
      this.uniforms["time"] = (canvas?.app?.ticker.lastTime ?? 0) / 1000;
    }
    filterManager.applyFilter(this, input, output, clear);
  }
}
