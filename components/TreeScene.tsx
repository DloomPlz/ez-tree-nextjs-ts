import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Environment } from './Environment'
import { Forest } from './Forest'
import { CentralTree } from './CentralTree'

const TreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const environmentRef = useRef<Environment | null>(null)
  const forestRef = useRef<Forest | null>(null)
  const centralTreeRef = useRef<CentralTree | null>(null)

  useEffect(() => {
    // Cleanup any existing renderer or canvas
    const currentMount = mountRef.current
    if (!currentMount) return

    // Remove any existing canvas
    const existingCanvas = currentMount.querySelector('canvas')
    if (existingCanvas) {
      currentMount.removeChild(existingCanvas)
    }

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0x87ceeb) // Sky blue background
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0005)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    cameraRef.current = camera
    camera.position.set(0, 20, 50)
    camera.lookAt(0, 20, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    rendererRef.current = renderer
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // Ensure only one canvas is added
    currentMount.innerHTML = '' // Clear any existing content
    currentMount.appendChild(renderer.domElement)

    // Debug: Add event listeners to renderer's DOM element
    const domElement = renderer.domElement
    domElement.style.cursor = 'grab' // Visual indicator of interactivity
    domElement.addEventListener('mousedown', (e) => {
      console.log('Mouse down on canvas', e)
    })
    domElement.addEventListener('mousemove', (e) => {
      console.log('Mouse move on canvas', e)
    })
    domElement.addEventListener('mouseup', (e) => {
      console.log('Mouse up on canvas', e)
    })

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.target.set(0, 20, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = true
    controls.enablePan = true
    controls.minDistance = 10
    controls.maxDistance = 200
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    }
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    }
    controls.listenToKeyEvents(window) // Enable keyboard controls
    console.log('OrbitControls initialized:', controls) // Debug log
    controls.update()

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // Directional light (sun) with configurable position
    const directionalLight = new THREE.DirectionalLight(0xffe5b0, 5)
    const sunAzimuth = 90
    const sunElevation = 45
    
    // Calculate sun position based on azimuth and elevation
    const el = THREE.MathUtils.degToRad(sunElevation)
    const az = THREE.MathUtils.degToRad(sunAzimuth)

    directionalLight.position.set(
      100 * Math.cos(el) * Math.sin(az),
      100 * Math.sin(el),
      100 * Math.cos(el) * Math.cos(az)
    )
    
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    directionalLight.shadow.mapSize = new THREE.Vector2(512, 512)
    directionalLight.shadow.bias = -0.001
    directionalLight.shadow.normalBias = 0.2
    
    scene.add(directionalLight)

    // Ground Plane
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      roughness: 0.8,
      metalness: 0.2,
    })
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.receiveShadow = true
    scene.add(groundMesh)

    // Environment, Forest, and Central Tree
    const environment = new Environment()
    environmentRef.current = environment
    scene.add(environment)

    const forest = new Forest()
    forestRef.current = forest
    scene.add(forest)

    const centralTree = new CentralTree()
    centralTreeRef.current = centralTree
    scene.add(centralTree)

    // Resize handler
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        const camera = cameraRef.current
        const renderer = rendererRef.current
        
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        
        renderer.setSize(window.innerWidth, window.innerHeight)
        controlsRef.current?.update()
      }
    }
    
    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = (time: number) => {
      requestAnimationFrame(animate)

      const elapsedTime = time * 0.001 // Convert to seconds

      // Update components
      environment.update(elapsedTime)
      centralTreeRef.current?.update(elapsedTime)
      
      // Update controls
      controlsRef.current?.update()

      // Render
      renderer.render(scene, camera)
    }

    animate(0)

    // Comprehensive cleanup
    return () => {
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement)
      }
      controls.dispose()
      renderer.dispose()
      scene.clear()
      window.removeEventListener('resize', handleResize)
    }
  }, []) // Empty dependency array to run only once

  return <div ref={mountRef} style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }} />
}

export default TreeScene
