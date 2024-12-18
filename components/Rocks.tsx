import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

let loaded = false
let _rock1Mesh: THREE.Mesh | null = null
let _rock2Mesh: THREE.Mesh | null = null
let _rock3Mesh: THREE.Mesh | null = null

/**
 *
 * @returns {Promise<void>}
 */
async function fetchAssets(): Promise<void> {
  if (loaded) return

  const gltfLoader = new GLTFLoader()

  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(
    'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
  )
  gltfLoader.setDRACOLoader(dracoLoader)

  try {
    const rock1 = await gltfLoader.loadAsync('/models/rock1.glb')
    const rock2 = await gltfLoader.loadAsync('/models/rock2.glb')
    const rock3 = await gltfLoader.loadAsync('/models/rock3.glb')

    _rock1Mesh = rock1.scene.children[0] as THREE.Mesh
    _rock2Mesh = rock2.scene.children[0] as THREE.Mesh
    _rock3Mesh = rock3.scene.children[0] as THREE.Mesh

    loaded = true
  } catch (error) {
    console.error('Error loading assets:', error)
  }
}

export class RockOptions {
  /**
   * Scale factor
   */
  size: { x: number; y: number; z: number } = { x: 2, y: 2, z: 2 }

  /**
   * Maximum variation in the rock size
   */
  sizeVariation: { x: number; y: number; z: number } = { x: 5, y: 5, z: 5 }
}

export class Rocks extends THREE.Group {
  private options: RockOptions

  constructor(options: RockOptions = new RockOptions()) {
    super()

    this.options = options

    fetchAssets().then(() => {
      if (_rock1Mesh && _rock2Mesh && _rock3Mesh) {
        this.add(this.generateInstances(_rock1Mesh))
        this.add(this.generateInstances(_rock2Mesh))
        this.add(this.generateInstances(_rock3Mesh))
      }
    })
  }

  generateInstances(mesh: THREE.Mesh): THREE.InstancedMesh {
    const instancedMesh = new THREE.InstancedMesh(
      mesh.geometry,
      mesh.material,
      200
    )

    const dummy = new THREE.Object3D()

    let count = 0
    for (let i = 0; i < 50; i++) {
      // Set position randomly
      const p = new THREE.Vector3(
        2 * (Math.random() - 0.5) * 250,
        0.3,
        2 * (Math.random() - 0.5) * 250
      )

      dummy.position.copy(p)

      // Set rotation randomly
      dummy.rotation.set(0, 2 * Math.PI * Math.random(), 0)

      // Set scale randomly
      dummy.scale.set(
        this.options.sizeVariation.x * Math.random() + this.options.size.x,
        this.options.sizeVariation.y * Math.random() + this.options.size.y,
        this.options.sizeVariation.z * Math.random() + this.options.size.z
      )

      // Apply the transformation to the instance
      dummy.updateMatrix()

      instancedMesh.setMatrixAt(count, dummy.matrix)
      count++
    }
    instancedMesh.count = count

    // Ensure the transformation is updated in the GPU
    instancedMesh.instanceMatrix.needsUpdate = true

    instancedMesh.castShadow = true

    return instancedMesh
  }
}
