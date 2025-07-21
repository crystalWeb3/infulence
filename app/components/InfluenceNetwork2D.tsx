"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { countryNameToCode } from "@/utils/countryCodes";

type NodeType = {
  id: string;
  value: number;
  x: number;
  y: number;
  group?: string;
  continent?: string;
};
type LinkType = {
  source: string;
  target: string;
  value: number;
  color: string;
};
type Props = {
  nodes: NodeType[];
  links: LinkType[];
  width: number;
  height: number;
};

const FLAG_SIZE = 64; // Desired sprite size in screen px (logical)

function makeFlagCircleTexture(
  url: string,
  size: number,
  cb: (t: THREE.Texture) => void,
  fallbackColor = "#3C3B6E"
) {
  const dpr = window.devicePixelRatio || 1;
  const realSize = size * dpr;
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = realSize;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(realSize / 2, realSize / 2, realSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0, realSize, realSize);
    ctx.restore();
    const tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter; // Sharp!
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    // tex.encoding = THREE.LinearEncoding; // Removed to fix type error
    cb(tex);
  };
  img.onerror = () => {
    cb(createCircleTexture(fallbackColor, size));
  };
  img.src = url;
}

function createCircleTexture(color: string, size = FLAG_SIZE) {
  const dpr = window.devicePixelRatio || 1;
  const realSize = size * dpr;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = realSize;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(realSize / 2, realSize / 2, realSize / 2, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // tex.encoding = THREE.sRGBEncoding; // Removed to fix type error
  return tex;
}

function nodeRadius(value: number) {
  return Math.sqrt(value > 0 ? value : 0.01) * 9 + 16;
}

const InfluenceNetwork2D: React.FC<Props> = ({
  nodes,
  links,
  width,
  height,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    mountRef.current.innerHTML = "";

    // --- Layout & scaling ---
    const minX = Math.min(...nodes.map((n) => n.x - nodeRadius(n.value) / 2));
    const maxX = Math.max(...nodes.map((n) => n.x + nodeRadius(n.value) / 2));
    const minY = Math.min(...nodes.map((n) => n.y - nodeRadius(n.value) / 2));
    const maxY = Math.max(...nodes.map((n) => n.y + nodeRadius(n.value) / 2));
    const layoutW = maxX - minX || 1;
    const layoutH = maxY - minY || 1;
    const margin = 80;
    const baseZoom = Math.min(
      (width - margin * 2) / layoutW,
      (height - margin * 2) / layoutH
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // --- Scene & camera ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.OrthographicCamera(
      0,
      width,
      height,
      0,
      -1000,
      1000
    );
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // --- World (for pan/zoom) ---
    const world = new THREE.Group();
    scene.add(world);

    // --- Node + link objects ---
    const nodeObjs: {
      mesh: THREE.Sprite;
      node: NodeType;
      pos: THREE.Vector2;
      r: number;
    }[] = [];
    const linkObjs: {
      mesh: THREE.Mesh;
      link: LinkType;
      source: NodeType;
      target: NodeType;
    }[] = [];

    // --- Draw links ---
    links.forEach((link) => {
      const source = nodes.find((n) => n.id === link.source);
      const target = nodes.find((n) => n.id === link.target);
      if (!source || !target) return;

      const sX = (source.x - cx) * baseZoom;
      const sY = (source.y - cy) * baseZoom;
      const tX = (target.x - cx) * baseZoom;
      const tY = (target.y - cy) * baseZoom;

      const sR = (nodeRadius(source.value) * baseZoom) / 2;
      const tR = (nodeRadius(target.value) * baseZoom) / 2;
      const dx = tX - sX,
        dy = tY - sY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len,
        ny = dy / len;

      const x1 = sX + nx * sR,
        y1 = sY + ny * sR;
      const x2 = tX - nx * tR,
        y2 = tY - ny * tR;
      const px = -ny,
        py = nx;
      const TRIANGLE_WIDTH = Math.max(2, Math.sqrt(link.value) * 1) * baseZoom;
      const p1 = [x1 + px * TRIANGLE_WIDTH, y1 + py * TRIANGLE_WIDTH, 0];
      const p2 = [x1 - px * TRIANGLE_WIDTH, y1 - py * TRIANGLE_WIDTH, 0];
      const p3 = [x2, y2, 0];
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([...p1, ...p2, ...p3]);
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      const colors = new Float32Array([1, 0, 0, 1, 0, 0, 0, 0.7, 1]);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { link, source, target };
      world.add(mesh);
      linkObjs.push({ mesh, link, source, target });
    });

    // --- Draw node sprites, hi-res and sharp ---
    let remaining = nodes.length;
    nodes.forEach((node) => {
      const x = (node.x - cx) * baseZoom;
      const y = (node.y - cy) * baseZoom;
      const r = (nodeRadius(node.value) * baseZoom) / 2;
      const code = countryNameToCode[node.id];
      const addSprite = (tex: THREE.Texture) => {
        // Nearest filter + high-res canvas gives perfect clarity
        const spriteMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          color: 0xffffff,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y, 1);
        sprite.scale.set(r * 2, r * 2, 1);
        world.add(sprite);
        nodeObjs.push({ mesh: sprite, node, pos: new THREE.Vector2(x, y), r });
        if (--remaining === 0) renderer.render(scene, camera);
      };
      if (typeof code === "string" && code.length === 2) {
        const url = `/flags/${code.toLowerCase()}.png`;
        makeFlagCircleTexture(url, FLAG_SIZE, addSprite);
      } else {
        const circleTex = createCircleTexture("#3C3B6E", FLAG_SIZE);
        addSprite(circleTex);
      }
    });

    // --- Pan/Zoom controls ---
    let zoom = 1;
    let pan = { x: width / 2, y: height / 2 };

    function applyTransform() {
      world.position.set(pan.x, pan.y, 0);
      world.scale.set(zoom, zoom, 1);
    }
    applyTransform();

    let isDragging = false;
    let last = { x: 0, y: 0 };

    function onMouseDown(e: MouseEvent) {
      isDragging = true;
      last = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = "grabbing";
    }
    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      pan.x += e.movementX;
      pan.y -= e.movementY;
      applyTransform();
    }
    function onMouseUp() {
      isDragging = false;
      renderer.domElement.style.cursor = "grab";
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      // Mouse pos relative to canvas
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const prevZoom = zoom;
      if (e.deltaY < 0) zoom = Math.min(10, zoom * 1.1);
      else zoom = Math.max(0.05, zoom / 1.1);
      pan.x = mouseX - (mouseX - pan.x) * (zoom / prevZoom);
      pan.y = mouseY - (mouseY - pan.y) * (zoom / prevZoom);
      applyTransform();
    }

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.style.cursor = "grab";

    // --- Tooltips ---
    let tooltip = document.getElementById("three-tooltip") as HTMLDivElement;
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "three-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.background = "#111";
      tooltip.style.color = "#fff";
      tooltip.style.padding = "6px 10px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "1000";
      document.body.appendChild(tooltip);
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerMove(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Transform mouse to world coordinates
      const inverse = new THREE.Matrix4().copy(world.matrixWorld).invert();
      const ndc = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
      ndc.applyMatrix4(inverse);

      // Node tooltips
      let found = false;
      for (let obj of nodeObjs) {
        const dx = ndc.x - obj.pos.x;
        const dy = ndc.y - obj.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < obj.r / zoom) {
          tooltip.innerHTML = `<strong>${obj.node.id}</strong><br/>Influence: ${obj.node.value}`;
          tooltip.style.display = "block";
          tooltip.style.left = event.pageX + 10 + "px";
          tooltip.style.top = event.pageY - 20 + "px";
          found = true;
          break;
        }
      }
      if (found) return;

      // Link tooltips (triangle hit test)
      let hit = null as null | {
        link: LinkType;
        source: NodeType;
        target: NodeType;
      };
      for (let obj of linkObjs) {
        const verts = (obj.mesh.geometry as THREE.BufferGeometry).getAttribute(
          "position"
        );
        const [x1, y1] = [verts.getX(0), verts.getY(0)];
        const [x2, y2] = [verts.getX(1), verts.getY(1)];
        const [x3, y3] = [verts.getX(2), verts.getY(2)];
        const det = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
        const a = ((y3 - y1) * (ndc.x - x1) + (x1 - x3) * (ndc.y - y1)) / det;
        const b = ((y1 - y2) * (ndc.x - x1) + (x2 - x1) * (ndc.y - y1)) / det;
        const c = 1 - a - b;
        if (a > 0 && b > 0 && c > 0) {
          hit = obj;
          break;
        }
      }
      if (hit) {
        tooltip.innerHTML = `<strong>${hit.source.id} → ${hit.target.id}</strong><br/>Strength: ${hit.link.value}`;
        tooltip.style.display = "block";
        tooltip.style.left = event.pageX + 10 + "px";
        tooltip.style.top = event.pageY - 20 + "px";
        return;
      }
      tooltip.style.display = "none";
    }
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    // --- Animation ---
    function animate() {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    // --- Cleanup ---
    return () => {
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      mountRef.current && (mountRef.current.innerHTML = "");
      if (tooltip) tooltip.style.display = "none";
      renderer.dispose();
    };
  }, [nodes, links, width, height]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1,
        overflow: "hidden",
        background: "#f9f9f9",
      }}
    />
  );
};

export default InfluenceNetwork2D;
