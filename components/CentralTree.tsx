import * as THREE from 'three'
import { Tree } from '@dgreenheck/ez-tree'

export class CentralTree extends THREE.Object3D {
  private tree: Tree
  private windOptions = {
    windStrength: { x: 0.1, y: 0, z: 0.1 },
    windFrequency: 0.1,
    windScale: 80.0,
  }

  constructor() {
    super()

    this.tree = new Tree()
    this.tree.loadPreset('Ash Large')
    this.tree.generate()
    this.tree.castShadow = true
    this.tree.receiveShadow = true

    // Apply wind shader to leaves
    this.applyWindShaderToLeaves()

    this.add(this.tree)
  }

  private applyWindShaderToLeaves() {
    this.tree.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material) {
        // Create a new material with the original map if it exists
        const material = new THREE.MeshPhongMaterial({
          map: (o.material as THREE.MeshStandardMaterial).map || null,
          transparent: o.material.transparent,
          alphaTest: o.material.alphaTest,
        })

        // Apply wind shader to each leaf mesh
        this.appendWindShader(material)

        // Replace the original material
        o.material = material
      }
    })
  }

  update(elapsedTime: number): void {
    this.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material?.userData?.shader) {
        o.material.userData.shader.uniforms.uTime.value = elapsedTime
      }
    })
  }

  private appendWindShader(material: THREE.Material): void {
    material.onBeforeCompile = (
      shader: THREE.WebGLProgramParametersWithUniforms
    ) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uWindStrength = {
        value: new THREE.Vector3(
          ...Object.values(this.windOptions.windStrength)
        ),
      }
      shader.uniforms.uWindFrequency = { value: this.windOptions.windFrequency }
      shader.uniforms.uWindScale = { value: this.windOptions.windScale }

      shader.vertexShader =
        `
      uniform float uTime;
      uniform vec3 uWindStrength;
      uniform float uWindFrequency;
      uniform float uWindScale;
      ` + shader.vertexShader

      // Add code for simplex noise
      shader.vertexShader = shader.vertexShader.replace(
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

      // Apply wind shader to leaves
      const vertexShader = `
        vec4 mvPosition = vec4(transformed, 1.0);
        float windOffset = 2.0 * 3.14 * simplex2d((modelMatrix * mvPosition).xz / uWindScale);
        vec3 windSway = 0.2 * position.y * uWindStrength * 
        sin(uTime * uWindFrequency + windOffset) *
        cos(uTime * 1.4 * uWindFrequency + windOffset);

        mvPosition.xyz += windSway;
        mvPosition = modelViewMatrix * mvPosition;

        gl_Position = projectionMatrix * mvPosition;
      `

      shader.vertexShader = shader.vertexShader.replace(
        `#include <project_vertex>`,
        vertexShader
      )

      material.userData = { shader }
    }
  }
}
