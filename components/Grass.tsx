import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { simplex2d } from '../config/noise'

type WebGLProgramParametersWithUniforms = {
  uniforms: {
    [uniform: string]: THREE.IUniform
  }
  vertexShader: string
  fragmentShader?: string
}

export class GrassOptions {
  instanceCount = 5000
  maxInstanceCount = 25000
  flowerCount = 50
  scale = 100
  patchiness = 0.7
  size = { x: 5, y: 4, z: 5 }
  sizeVariation = { x: 1, y: 2, z: 1 }
  windStrength = { x: 0.3, y: 0, z: 0.3 }
  windFrequency = 1.0
  windScale = 400.0
}

export class Grass extends THREE.Object3D {
  private options: GrassOptions
  private grassMesh?: THREE.InstancedMesh
  private flowers: THREE.Group
  private static loaded = false
  private static grassMesh: THREE.Mesh | null = null
  private static whiteFlower: THREE.Mesh | null = null
  private static blueFlower: THREE.Mesh | null = null
  private static yellowFlower: THREE.Mesh | null = null

  constructor(options = new GrassOptions()) {
    super()
    this.options = options
    this.flowers = new THREE.Group()
    this.add(this.flowers)

    this.fetchAssets()
      .then(() => {
        console.log('Grass Assets Loaded:', {
          grassMesh: !!Grass.grassMesh,
          whiteFlower: !!Grass.whiteFlower,
          blueFlower: !!Grass.blueFlower,
          yellowFlower: !!Grass.yellowFlower,
        })
        this.generateGrass()
        this.generateFlowers(Grass.whiteFlower!)
        this.generateFlowers(Grass.blueFlower!)
        this.generateFlowers(Grass.yellowFlower!)
      })
      .catch((error) => {
        console.error('Error loading grass assets:', error)
      })
  }

  get instanceCount(): number {
    return this.grassMesh?.count ?? this.options.instanceCount
  }

  set instanceCount(value: number) {
    if (this.grassMesh) {
      this.grassMesh.count = value
    }
  }

  private async fetchAssets(): Promise<void> {
    if (Grass.loaded) return

    const gltfLoader = new GLTFLoader()

    Grass.grassMesh = (await gltfLoader.loadAsync('/models/grass.glb')).scene
      .children[0] as THREE.Mesh
    console.log('Grass Mesh:', Grass.grassMesh)

    const whiteFlowerScene = await gltfLoader.loadAsync(
      '/models/flower_white.glb'
    )
    Grass.whiteFlower = whiteFlowerScene.scene.children[0] as THREE.Mesh

    const blueFlowerScene = await gltfLoader.loadAsync(
      '/models/flower_blue.glb'
    )
    Grass.blueFlower = blueFlowerScene.scene.children[0] as THREE.Mesh

    const yellowFlowerScene = await gltfLoader.loadAsync(
      '/models/flower_yellow.glb'
    )
    Grass.yellowFlower = yellowFlowerScene.scene.children[0] as THREE.Mesh

    // Prepare flower materials
    ;[Grass.whiteFlower, Grass.blueFlower, Grass.yellowFlower].forEach(
      (mesh) => {
        mesh.traverse((o) => {
          if (o instanceof THREE.Mesh && o.material) {
            // Create a new material with the original map if it exists
            const material = new THREE.MeshPhongMaterial({
              map: (o.material as THREE.MeshStandardMaterial).map || null,
            })

            // Apply wind shader to each mesh part
            this.appendWindShader(material)

            // Replace the original material
            o.material = material
          }
        })
      }
    )

    Grass.loaded = true
  }

  update(elapsedTime: number): void {
    this.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material &&
        (
          o.material as THREE.Material & {
            userData?: { shader?: WebGLProgramParametersWithUniforms }
          }
        ).userData?.shader
      ) {
        const shader = (
          o.material as THREE.Material & {
            userData?: { shader?: WebGLProgramParametersWithUniforms }
          }
        ).userData.shader!

        if (shader.uniforms.uTime) {
          shader.uniforms.uTime.value = elapsedTime
        }
      }
    })
  }

  private generateGrass(): void {
    if (!Grass.grassMesh) {
      console.error('No grass mesh available')
      return
    }

    console.log('Generating Grass with Mesh:', Grass.grassMesh)

    const grassMaterial = new THREE.MeshPhongMaterial({
      map: (Grass.grassMesh.material as THREE.MeshStandardMaterial).map,
      emissive: new THREE.Color(0x308040),
      emissiveIntensity: 0.05,
      transparent: false,
      alphaTest: 0.5,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    })

    this.appendWindShader(grassMaterial, true)
    grassMaterial.color.multiplyScalar(0.6)

    this.grassMesh = new THREE.InstancedMesh(
      Grass.grassMesh.geometry,
      grassMaterial,
      this.options.maxInstanceCount
    )

    console.log('Generated InstancedMesh:', this.grassMesh)

    this.generateGrassInstances()
    this.add(this.grassMesh)

    console.log('Grass added to scene')
  }

  private generateGrassInstances(): void {
    if (!this.grassMesh) {
      console.error('No grass mesh available for instancing')
      return
    }

    const dummy = new THREE.Object3D()
    let count = 0

    console.log(
      'Generating grass instances, max count:',
      this.options.maxInstanceCount
    )

    for (let i = 0; i < this.options.maxInstanceCount; i++) {
      const r = 10 + Math.random() * 500
      const theta = Math.random() * 2.0 * Math.PI

      const p = new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta))

      const n =
        0.5 +
        0.5 *
          simplex2d(
            new THREE.Vector2(
              p.x / this.options.scale,
              p.z / this.options.scale
            )
          )

      if (
        n > this.options.patchiness &&
        Math.random() + 0.6 > this.options.patchiness
      )
        continue

      dummy.position.copy(p)
      dummy.rotation.set(0, 2 * Math.PI * Math.random(), 0)
      dummy.scale.set(
        this.options.sizeVariation.x * Math.random() + this.options.size.x,
        this.options.sizeVariation.y * Math.random() + this.options.size.y,
        this.options.sizeVariation.z * Math.random() + this.options.size.z
      )

      dummy.updateMatrix()

      const color = new THREE.Color(
        0.25 + Math.random() * 0.1,
        0.3 + Math.random() * 0.3,
        0.1
      )

      this.grassMesh.setMatrixAt(count, dummy.matrix)
      this.grassMesh.setColorAt(count, color)
      count++
    }

    console.log('Generated grass instances count:', count)

    this.grassMesh.count = Math.min(count, this.options.instanceCount)

    this.grassMesh.receiveShadow = true
    this.grassMesh.castShadow = true

    this.grassMesh.instanceMatrix.needsUpdate = true
    if (this.grassMesh.instanceColor)
      this.grassMesh.instanceColor.needsUpdate = true

    console.log('Grass instances updated')
  }

  private generateFlowers(flowerMesh: THREE.Mesh): void {
    for (let i = 0; i < this.options.flowerCount; i++) {
      const r = 10 + Math.random() * 200
      const theta = Math.random() * 2.0 * Math.PI

      const p = new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta))

      const n =
        0.5 +
        0.5 *
          simplex2d(
            new THREE.Vector2(
              p.x / this.options.scale,
              p.z / this.options.scale
            )
          )

      if (
        n > this.options.patchiness &&
        Math.random() + 0.8 > this.options.patchiness
      )
        continue

      const flower = flowerMesh.clone()
      flower.position.copy(p)
      flower.rotation.set(0, 2 * Math.PI * Math.random(), 0)

      const scale = 0.02 + 0.03 * Math.random()
      flower.scale.set(scale, scale, scale)

      this.flowers.add(flower)
    }
  }

  private appendWindShader(material: THREE.Material, instanced = false): void {
    material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uWindStrength = {
        value: new THREE.Vector3(...Object.values(this.options.windStrength)),
      }
      shader.uniforms.uWindFrequency = { value: this.options.windFrequency }
      shader.uniforms.uWindScale = { value: this.options.windScale }

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

      // To make code reusable for grass and flowers, conditionally multiply by instanceMatrix
      const vertexShader = instanced
        ? `
        vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
        float windOffset = 2.0 * 3.14 * simplex2d((modelMatrix * mvPosition).xz / uWindScale);
        vec3 windSway = position.y * uWindStrength * 
        sin(uTime * uWindFrequency + windOffset) *
        cos(uTime * 1.4 * uWindFrequency + windOffset);

        mvPosition.xyz += windSway;
        mvPosition = modelViewMatrix * mvPosition;

        gl_Position = projectionMatrix * mvPosition;
        `
        : `
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
