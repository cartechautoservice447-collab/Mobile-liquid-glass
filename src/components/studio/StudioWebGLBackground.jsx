import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { exactStudioVertexShader, exactStudioFragmentShader } from '../../shaders/exactLiquidGlassShader.js';
import { isOrbScene, isWhiteOrbScene } from '../../data/backgroundTemplates.js';

export const StudioWebGLBackground = ({
  currentBg,
  getBoxes,
  glParams = {
    thick: 50,
    bezel: 55,
    ior: 3.0,
    blur: 1.5,
    spec: 0.55,
    tint: 0.08,
    shadow: 0.5,
    dispersion: 1.9,
  },
  performanceMode = 'ultra',
  isModalOpen = false,
}) => {
  const canvasRef = useRef(null);
  const currentBgRef = useRef(currentBg);
  currentBgRef.current = currentBg;
  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;
  const performanceModeRef = useRef(performanceMode);
  performanceModeRef.current = performanceMode;

  const threeRef = useRef(null);
  const getBoxesRef = useRef(getBoxes);
  getBoxesRef.current = getBoxes;
  const glParamsRef = useRef(glParams);
  glParamsRef.current = glParams;

  // Initialize Three.js WebGL exact liquid glass renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.warn('WebGL initialization failed:', err);
      return;
    }

    const isUltraInit = performanceModeRef.current === 'ultra';
    const initialPixelRatio = isUltraInit ? Math.min(window.devicePixelRatio || 1, 2) : 1.0;
    const initialRtScale = isUltraInit ? 1.0 : 0.75;
    renderer.setPixelRatio(initialPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- BACKGROUND SCENE (Orbs + Void + Wall) ---
    const bgScene = new THREE.Scene();
    bgScene.background = new THREE.Color('#1a1a1a');

    const bgCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    bgCamera.position.z = 5;

    // Refraction Backdrop (100x100 wall): physical background #0f0f15
    const wallGeo = new THREE.PlaneGeometry(100, 100);
    const wallMat = new THREE.MeshStandardMaterial({ color: '#0f0f15', roughness: 1.0 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.z = -10;
    bgScene.add(wall);

    // Colored Orbs
    const orbGroup = new THREE.Group();
    bgScene.add(orbGroup);
    const orbMeshes = [];
    const orbGeometries = [];
    const orbMaterials = [];

    const createOrb = (color, x, y, z, size) => {
      const geo = new THREE.SphereGeometry(size, 64, 64);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      orbGeometries.push(geo);
      orbMaterials.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      // Store immutable base coordinates to ensure deterministic, bounded animation without drift
      mesh.userData = { baseX: x, baseY: y, baseZ: z };
      orbGroup.add(mesh);
      orbMeshes.push(mesh);
      return mesh;
    };

    createOrb('#ff0055', -3, 2, -4, 1.5);
    createOrb('#00d0ff', 4, -1, -5, 2.0);
    createOrb('#7000ff', -2, -3, -6, 1.8);
    createOrb('#ffaa00', 2, 3, -8, 2.5);

    // Lights for the bgScene
    const ambient = new THREE.AmbientLight('#ffffff', 0.5);
    bgScene.add(ambient);
    const pointLight = new THREE.PointLight('#ffffff', 2, 50);
    pointLight.position.set(0, 5, 5);
    bgScene.add(pointLight);

    // Dynamic theme updater for dark void vs pure white void
    const updateOrbTheme = (isWhite) => {
      if (isWhite) {
        bgScene.background = new THREE.Color('#f4f4f7');
        wallMat.color.set('#ebebf0');
        ambient.intensity = 0.95;
        pointLight.intensity = 2.2;
        const whiteOrbColors = ['#ff0055', '#00b4d8', '#7b2cbf', '#ff9e00'];
        orbMeshes.forEach((m, idx) => {
          const mat = m.material;
          const c = whiteOrbColors[idx % whiteOrbColors.length];
          mat.color.set(c);
          mat.emissive.set(c);
          mat.emissiveIntensity = 0.35;
          mat.roughness = 0.15;
          mat.metalness = 0.3;
          mat.clearcoat = 1.0;
          mat.clearcoatRoughness = 0.1;
        });
      } else {
        bgScene.background = new THREE.Color('#1a1a1a');
        wallMat.color.set('#0f0f15');
        ambient.intensity = 0.5;
        pointLight.intensity = 2.0;
        const darkOrbColors = ['#ff0055', '#00d0ff', '#7000ff', '#ffaa00'];
        orbMeshes.forEach((m, idx) => {
          const mat = m.material;
          const c = darkOrbColors[idx % darkOrbColors.length];
          mat.color.set(c);
          mat.emissive.set(c);
          mat.emissiveIntensity = 0.5;
          mat.roughness = 0.1;
          mat.metalness = 0.8;
          mat.clearcoat = 1.0;
          mat.clearcoatRoughness = 0.1;
        });
      }
    };

    // Apply theme according to current initial background
    updateOrbTheme(isWhiteOrbScene(currentBgRef.current));

    const renderTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.round(window.innerWidth * initialRtScale)),
      Math.max(1, Math.round(window.innerHeight * initialRtScale)),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }
    );

    // --- FOREGROUND SCENE (Glass Shader) ---
    const fgScene = new THREE.Scene();
    const fgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const boxVectors = Array.from({ length: 64 }, () => new THREE.Vector4());
    const radiiArray = new Float32Array(64);
    const bezelsArray = new Float32Array(64);
    const isCurrentOrb = isOrbScene(currentBgRef.current);

    const material = new THREE.ShaderMaterial({
      vertexShader: exactStudioVertexShader,
      fragmentShader: exactStudioFragmentShader,
      uniforms: {
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uMouse: {
          value: new THREE.Vector2(-1, -1),
        },
        uBoxes: { value: boxVectors },
        uRadii: { value: radiiArray },
        uBezels: { value: bezelsArray },
        uBoxCount: { value: 0 },
        uFixedTopBoxIdx: { value: -1 },
        uTime: { value: 0.0 },
        uThickness: { value: glParamsRef.current.thick ?? 50 },
        uIOR: { value: glParamsRef.current.ior ?? 3.0 },
        uDispersion: { value: glParamsRef.current.dispersion ?? 1.9 },
        uBlur: { value: glParamsRef.current.blur ?? 1.5 },
        uSpecular: { value: glParamsRef.current.spec ?? 0.55 },
        uTint: { value: glParamsRef.current.tint ?? 0.08 },
        uShadow: { value: glParamsRef.current.shadow ?? 0.5 },
        uRenderBg: { value: isCurrentOrb ? 1.0 : 0.0 },
        uBgTex: { value: isCurrentOrb ? renderTarget.texture : null },
        uBgAspect: { value: window.innerWidth / window.innerHeight },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const fgPlaneGeo = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(fgPlaneGeo, material);
    fgScene.add(mesh);

    const threeObj = {
      renderer,
      scene: fgScene,
      camera: fgCamera,
      material,
      bgTexture: isCurrentOrb ? renderTarget.texture : null,
      loadedImgTexture: null,
      rafId: 0,
      boxVectors,
      radiiArray,
      bezelsArray,
      bgScene,
      bgCamera,
      renderTarget,
      orbGroup,
      updateOrbTheme,
    };
    threeRef.current = threeObj;

    // Render loop tracking real element bounding boxes
    const renderLoop = (time) => {
      if (!threeRef.current) return;
      const isOrb = isOrbScene(currentBgRef.current);
      const isModal = isModalOpenRef.current;

      if (isOrb) {
        // Animate Orbs deterministically from immutable base coordinates
        threeRef.current.orbGroup.children.forEach((child, i) => {
          const base = child.userData;
          if (base && typeof base.baseX === 'number') {
            child.position.x = base.baseX + Math.cos(time * 0.0012 + i) * 0.25;
            child.position.y = base.baseY + Math.sin(time * 0.001 + i) * 0.4;
            child.position.z = base.baseZ;
          }
        });

        // 1. Render the background scene to the render target
        threeRef.current.renderer.setRenderTarget(threeRef.current.renderTarget);
        threeRef.current.renderer.render(threeRef.current.bgScene, threeRef.current.bgCamera);
      }

      threeRef.current.material.uniforms.uRenderBg.value = isOrb ? 1.0 : (threeRef.current.loadedImgTexture ? 1.0 : 0.0);

      const boxes = typeof getBoxesRef.current === 'function' ? getBoxesRef.current() : [];
      const count = Math.min(boxes.length, 64);

      for (let i = 0; i < 64; i++) {
        if (i < count) {
          const b = boxes[i];
          threeRef.current.boxVectors[i].set(b.x, b.y, b.w, b.h);
          threeRef.current.radiiArray[i] = b.r;
          threeRef.current.bezelsArray[i] = b.bezel ?? 45;
        } else {
          threeRef.current.boxVectors[i].set(0, 0, 0, 0);
          threeRef.current.radiiArray[i] = 0;
          threeRef.current.bezelsArray[i] = 0;
        }
      }

      threeRef.current.material.uniforms.uBoxCount.value = count;
      threeRef.current.material.uniforms.uBoxes.value = threeRef.current.boxVectors;
      threeRef.current.material.uniforms.uRadii.value = threeRef.current.radiiArray;
      threeRef.current.material.uniforms.uBezels.value = threeRef.current.bezelsArray;

      // Find index of the fixed horizontal glass dock to grant top-layer priority and sheen animation
      const dockIdx = boxes.findIndex((b) => b.id === 'dock');
      threeRef.current.material.uniforms.uFixedTopBoxIdx.value = dockIdx >= 0 && dockIdx < count ? dockIdx : -1;
      threeRef.current.material.uniforms.uTime.value = time * 0.001;

      // Update optical uniforms if adjusted
      const curParams = glParamsRef.current;
      threeRef.current.material.uniforms.uThickness.value = curParams.thick ?? 50;
      threeRef.current.material.uniforms.uIOR.value = curParams.ior ?? 3.0;
      threeRef.current.material.uniforms.uDispersion.value = curParams.dispersion ?? 1.9;
      threeRef.current.material.uniforms.uBlur.value = curParams.blur ?? 1.5;
      threeRef.current.material.uniforms.uSpecular.value = curParams.spec ?? 0.55;
      threeRef.current.material.uniforms.uTint.value = curParams.tint ?? 0.08;
      threeRef.current.material.uniforms.uShadow.value = curParams.shadow ?? 0.5;

      // 2. Render the foreground glass scene to the screen
      threeRef.current.renderer.setRenderTarget(null);
      threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera);

      threeObj.rafId = requestAnimationFrame(renderLoop);
    };

    threeObj.rafId = requestAnimationFrame(renderLoop);

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isUltra = performanceModeRef.current === 'ultra';
      const targetPixelRatio = isUltra ? Math.min(window.devicePixelRatio || 1, 2) : 1.0;
      const targetRtScale = isUltra ? 1.0 : 0.75;

      renderer.setSize(w, h);
      renderer.setPixelRatio(targetPixelRatio);
      threeRef.current?.renderTarget.setSize(
        Math.max(1, Math.round(w * targetRtScale)),
        Math.max(1, Math.round(h * targetRtScale))
      );

      if (threeRef.current) {
        threeRef.current.material.uniforms.uResolution.value.set(w, h);
        if (isOrbScene(currentBgRef.current)) {
          threeRef.current.material.uniforms.uBgAspect.value = w / h;
        }
        threeRef.current.bgCamera.aspect = w / h;
        threeRef.current.bgCamera.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e) => {
      if (!threeRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      threeRef.current.material.uniforms.uMouse.value.set(clientX, clientY);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      if (threeObj.rafId) cancelAnimationFrame(threeObj.rafId);
      threeObj.renderTarget.dispose();
      if (threeObj.loadedImgTexture) {
        threeObj.loadedImgTexture.dispose();
        threeObj.loadedImgTexture = null;
      }
      wallGeo.dispose();
      wallMat.dispose();
      orbGeometries.forEach((g) => g.dispose());
      orbMaterials.forEach((m) => m.dispose());
      fgPlaneGeo.dispose();
      material.dispose();
      renderer.dispose();
      threeRef.current = null;
    };
  }, []);

  // Dynamically update background when currentBg prop changes
  useEffect(() => {
    let isCurrent = true;
    if (!threeRef.current) return;

    if (isOrbScene(currentBg)) {
      threeRef.current.updateOrbTheme(isWhiteOrbScene(currentBg));
      threeRef.current.material.uniforms.uRenderBg.value = 1.0;
      threeRef.current.material.uniforms.uBgTex.value = threeRef.current.renderTarget.texture;
      threeRef.current.material.uniforms.uBgAspect.value = window.innerWidth / window.innerHeight;
      if (threeRef.current.loadedImgTexture) {
        threeRef.current.loadedImgTexture.dispose();
        threeRef.current.loadedImgTexture = null;
      }
    } else if (currentBg) {
      threeRef.current.material.uniforms.uRenderBg.value = 0.0;
      new THREE.TextureLoader().load(
        currentBg,
        (tex) => {
          if (!isCurrent || !threeRef.current) {
            tex.dispose();
            return;
          }
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.generateMipmaps = false;

          if (threeRef.current.loadedImgTexture && threeRef.current.loadedImgTexture !== tex) {
            threeRef.current.loadedImgTexture.dispose();
          }
          threeRef.current.loadedImgTexture = tex;

          if (!isOrbScene(currentBgRef.current)) {
            threeRef.current.material.uniforms.uBgTex.value = tex;
            threeRef.current.material.uniforms.uRenderBg.value = 1.0;
            if (tex.image && tex.image.width && tex.image.height) {
              threeRef.current.material.uniforms.uBgAspect.value =
                tex.image.width / tex.image.height;
            }
          }
        },
        undefined,
        (err) => {
          console.warn('Background texture failed to load safely:', err);
        }
      );
    }

    return () => {
      isCurrent = false;
    };
  }, [currentBg]);

  // Dynamically update renderer pixel ratio and render target resolution when performanceMode changes
  useEffect(() => {
    if (!threeRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isUltra = performanceMode === 'ultra';
    const targetPixelRatio = isUltra ? Math.min(window.devicePixelRatio || 1, 2) : 1.0;
    const targetRtScale = isUltra ? 1.0 : 0.75;
    threeRef.current.renderer.setPixelRatio(targetPixelRatio);
    threeRef.current.renderer.setSize(w, h);
    threeRef.current.renderTarget.setSize(
      Math.max(1, Math.round(w * targetRtScale)),
      Math.max(1, Math.round(h * targetRtScale))
    );
  }, [performanceMode]);

  return (
    <canvas
      id="studio-webgl-canvas"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    />
  );
};

export default StudioWebGLBackground;
