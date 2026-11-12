import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

@Component({
  selector: 'app-ambient-3d-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #bgContainer class="ambient-3d-canvas-container"></div>
  `,
  styles: [`
    .ambient-3d-canvas-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      opacity: 0.85;
    }
  `]
})
export class Ambient3dBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // 3D Grid Wave Particles
  private particlesMesh!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleCount = 2400;
  private gridX = 60;
  private gridY = 40;

  // Floating 3D Logistics Iso Nodes
  private floatingShapes: THREE.Mesh[] = [];

  // Mouse Parallax
  private mouseX = 0;
  private mouseY = 0;
  private targetCameraX = 0;
  private targetCameraY = 0;

  ngAfterViewInit(): void {
    this.initThree();
    this.build3dWaveGrid();
    this.buildFloating3dNodes();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    this.mouseX = (e.clientX - halfW);
    this.mouseY = (e.clientY - halfH);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.containerRef || !this.renderer || !this.camera) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private initThree(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    
    // Soft subtle ambient fog for atmospheric depth
    this.scene.fog = new THREE.FogExp2(0xf8fafc, 0.015);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 16, 42);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.containerRef.nativeElement.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const light1 = new THREE.DirectionalLight(0x0284c7, 1.8);
    light1.position.set(20, 40, 20);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    light2.position.set(-20, -20, -20);
    this.scene.add(light2);
  }

  private build3dWaveGrid(): void {
    // 3D undulating grid of points representing global trade routes
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    const color1 = new THREE.Color(0x1d4e89); // Navy Slate
    const color2 = new THREE.Color(0xcbd5e1); // Soft Mist

    let idx = 0;
    const sep = 2.4;
    const startX = -(this.gridX * sep) / 2;
    const startZ = -(this.gridY * sep) / 2;

    for (let ix = 0; ix < this.gridX; ix++) {
      for (let iy = 0; iy < this.gridY; iy++) {
        const x = startX + ix * sep;
        const z = startZ + iy * sep;
        const y = 0;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        const mixedColor = color1.clone().lerp(color2, (ix / this.gridX));
        colors[idx * 3] = mixedColor.r;
        colors[idx * 3 + 1] = mixedColor.g;
        colors[idx * 3 + 2] = mixedColor.b;

        idx++;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.25
    });

    this.particlesMesh = new THREE.Points(geometry, material);
    this.particlesMesh.position.y = -8;
    this.particlesMesh.rotation.x = 0.2;
    this.scene.add(this.particlesMesh);
    this.particlePositions = positions;
  }

  private buildFloating3dNodes(): void {
    // Floating translucent 3D geometric prisms (cargo waypoints)
    const geometries = [
      new THREE.OctahedronGeometry(1.2, 0),
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.TetrahedronGeometry(1.1, 0)
    ];

    const materials = [
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      }),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      }),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        wireframe: true,
        transparent: true,
        opacity: 0.25
      })
    ];

    for (let i = 0; i < 16; i++) {
      const geo = geometries[i % geometries.length];
      const mat = materials[i % materials.length];
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 30 + 5,
        (Math.random() - 0.5) * 60
      );

      (mesh as any).rotSpeedX = (Math.random() - 0.5) * 0.012;
      (mesh as any).rotSpeedY = (Math.random() - 0.5) * 0.015;
      (mesh as any).floatOffset = Math.random() * Math.PI * 2;
      (mesh as any).baseY = mesh.position.y;

      this.floatingShapes.push(mesh);
      this.scene.add(mesh);
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const time = performance.now() * 0.001;

    // 1. Undulate 3D grid wave
    if (this.particlesMesh && this.particlePositions) {
      const pos = this.particlesMesh.geometry.attributes['position'] as THREE.BufferAttribute;
      let idx = 0;

      for (let ix = 0; ix < this.gridX; ix++) {
        for (let iy = 0; iy < this.gridY; iy++) {
          const u = ix * 0.15;
          const v = iy * 0.15;
          // Fluid 3D harmonic wave
          const wave = Math.sin(u + time * 1.2) * Math.cos(v + time * 0.8) * 2.2 +
                       Math.sin(u * 0.5 - time * 0.6) * 1.2;

          pos.setY(idx, wave);
          idx++;
        }
      }
      pos.needsUpdate = true;
    }

    // 2. Rotate & float 3D node prisms
    this.floatingShapes.forEach(mesh => {
      const custom = mesh as any;
      mesh.rotation.x += custom.rotSpeedX;
      mesh.rotation.y += custom.rotSpeedY;
      mesh.position.y = custom.baseY + Math.sin(time + custom.floatOffset) * 1.5;
    });

    // 3. Smooth Camera Parallax following mouse
    this.targetCameraX = (this.mouseX * 0.008);
    this.targetCameraY = 16 - (this.mouseY * 0.006);

    this.camera.position.x += (this.targetCameraX - this.camera.position.x) * 0.04;
    this.camera.position.y += (this.targetCameraY - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };
}

