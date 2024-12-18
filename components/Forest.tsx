import * as THREE from 'three'
import { Tree, TreePreset } from '@dgreenheck/ez-tree'

export class Forest extends THREE.Object3D {
  private trees: Tree[] = []

  constructor() {
    super()

    const treeCount = 50
    const minDistance = 175
    const maxDistance = 500
    const presets = Object.keys(TreePreset)

    for (let i = 0; i < treeCount; i++) {
      const r = minDistance + Math.random() * maxDistance
      const theta = 2 * Math.PI * Math.random()

      const forestTree = new Tree()
      forestTree.position.set(r * Math.cos(theta), 0, r * Math.sin(theta))

      const randomPreset = presets[Math.floor(Math.random() * presets.length)]
      forestTree.loadPreset(randomPreset)
      forestTree.options.seed = 10000 * Math.random()
      forestTree.generate()
      forestTree.castShadow = true
      forestTree.receiveShadow = true

      this.add(forestTree)
      this.trees.push(forestTree)
    }
  }
}
