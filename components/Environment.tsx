import * as THREE from 'three'
import { Clouds } from './Clouds'
import { Ground } from './Ground'
import { Grass } from './Grass'
import { Rocks } from './Rocks'
import { defaultGrassOptions } from '../config/GrassOptions'

export class Environment extends THREE.Group {
  clouds: Clouds
  ground: Ground
  grass: Grass
  private rocks: Rocks

  constructor() {
    super()

    this.ground = new Ground(defaultGrassOptions)
    this.add(this.ground)

    this.clouds = new Clouds()
    this.clouds.position.set(0, 200, 0)
    this.clouds.rotation.x = Math.PI / 2
    this.add(this.clouds)

    this.grass = new Grass()
    this.add(this.grass)

    // Create rocks
    this.rocks = new Rocks()
    this.add(this.rocks)
  }

  update(elapsedTime: number): void {
    this.clouds.update(elapsedTime)
    this.grass.update(elapsedTime)
  }
}
