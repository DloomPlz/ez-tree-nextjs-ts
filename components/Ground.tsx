import * as THREE from 'three'
import { GrassOptions, defaultGrassOptions } from '../config/GrassOptions'

interface GroundShader {
  uniforms: {
    uTime: { value: number }
  }
}

export class Ground extends THREE.Mesh {
  private groundShader: GroundShader | null = null

  private grassTexture: THREE.Texture | null = null
  private dirtTexture: THREE.Texture | null = null
  private dirtNormal: THREE.Texture | null = null
  private loaded = false
  public options: GrassOptions

  constructor(options: GrassOptions = defaultGrassOptions) {
    super()
    this.options = options
    this.loadAssets()
  }

  private async loadAssets(): Promise<void> {
    if (this.loaded) return

    const textureLoader = new THREE.TextureLoader()

    try {
      this.grassTexture = await textureLoader.loadAsync(
        '/textures/ground/grass.jpg'
      )
      this.grassTexture.wrapS = THREE.RepeatWrapping
      this.grassTexture.wrapT = THREE.RepeatWrapping
      this.grassTexture.colorSpace = THREE.SRGBColorSpace

      this.dirtTexture = await textureLoader.loadAsync(
        '/textures/ground/dirt_color.jpg'
      )
      this.dirtTexture.wrapS = THREE.RepeatWrapping
      this.dirtTexture.wrapT = THREE.RepeatWrapping
      this.dirtTexture.colorSpace = THREE.SRGBColorSpace

      this.dirtNormal = await textureLoader.loadAsync(
        '/textures/ground/dirt_normal.jpg'
      )
      this.dirtNormal.wrapS = THREE.RepeatWrapping
      this.dirtNormal.wrapT = THREE.RepeatWrapping

      this.createGroundMaterial()
      this.loaded = true
    } catch (error) {
      console.error('Failed to load ground textures:', error)
    }
  }

  private createGroundMaterial(): void {
    this.material = new THREE.MeshPhongMaterial({
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.01,
      normalMap: this.dirtNormal!,
      shininess: 0.1,
    })

    this.material.onBeforeCompile = (shader) => {
      const groundShader = shader as unknown as GroundShader
      groundShader.uniforms.uTime = { value: 0.0 }

      shader.uniforms.uNoiseScale = { value: this.options.scale }
      shader.uniforms.uPatchiness = { value: this.options.patchiness }
      shader.uniforms.uGrassTexture = { value: this.grassTexture }
      shader.uniforms.uDirtTexture = { value: this.dirtTexture }

      // Add varyings and uniforms to vertex/fragment shaders
      shader.vertexShader =
        `
        varying vec3 vWorldPosition;
        ` + shader.vertexShader

      shader.fragmentShader =
        `
        varying vec3 vWorldPosition;
        uniform float uNoiseScale;
        uniform float uPatchiness;
        uniform sampler2D uGrassTexture;
        uniform sampler2D uDirtTexture;
        ` + shader.fragmentShader

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
          vWorldPosition = worldPosition.xyz;
        `
      )

      // Add custom shader code for the ground
      shader.fragmentShader = shader.fragmentShader.replace(
        `void main() {`,
        `
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec2 mod289(vec2 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec3 permute(vec3 x) {
          return mod289(((x * 34.0) + 1.0) * x);
        }

        float simplex2d(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;

          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;

          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;

          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        void main() {`
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        vec2 uv = vec2(vWorldPosition.x, vWorldPosition.z);
        vec3 grassColor = texture2D(uGrassTexture, uv / 30.0).rgb;
        vec3 dirtColor = texture2D(uDirtTexture, uv / 30.0).rgb;

        // Generate base noise for the texture
        float n = 0.5 + 0.5 * simplex2d(uv / uNoiseScale);
        float s = smoothstep(uPatchiness - 0.1 , uPatchiness + 0.1, n);

        // Blend between grass and dirt based on the noise value
        vec4 sampledDiffuseColor = vec4(mix(grassColor, dirtColor, s), 1.0);
        diffuseColor *= sampledDiffuseColor;
        `
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        vec3 mapN = texture2D( normalMap, uv / 30.0 ).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;

        normal = normalize( tbn * mapN );
        `
      )

      this.groundShader = groundShader
    }

    this.geometry = new THREE.PlaneGeometry(2000, 2000)
    this.rotation.x = -Math.PI / 2
    this.receiveShadow = true
  }
}
