"use client";

import { useEffect, useState } from "react";
import * as d3 from "d3";
import InfluenceNetwork3D from "./InfluenceNetwork3D";
import { getContinentByCountry } from "@/utils/getCountryGroup";

// --- Types ---
type NodeType = { id: string; value: number; group?: string };
type LinkType = {
  source: string;
  target: string;
  value: number;
  color: string;
};
type Props = { nodes: NodeType[]; links: LinkType[]; allview: string };

// --- Window size hook ---
function useWindowSize() {
  const [size, setSize] = useState<[number, number]>([
    typeof window === "undefined" ? 1920 : window.innerWidth,
    typeof window === "undefined" ? 1080 : window.innerHeight,
  ]);
  useEffect(() => {
    function onResize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

// --- Main Component ---
export default function InfluenceNetworkForceParent({
  allview,
  nodes: originalNodes,
  links: originalLinks,
}: Props) {
  // Raw layout (virtual coordinates)
  const [rawLayout, setRawLayout] = useState<{
    nodes: any[];
    links: any[];
    VIRTUAL_WIDTH: number;
    VIRTUAL_HEIGHT: number;
  } | null>(null);

  // Real window size
  const [width, height] = useWindowSize();

  // --- 1. Run force simulation ONCE per data change ---
  useEffect(() => {
    if (!originalNodes.length || !originalLinks.length) return;

    // Use a fixed "virtual" layout size
    const VIRTUAL_WIDTH = 1200;
    const VIRTUAL_HEIGHT = 800;

    // 1. Group & filter nodes
    const nodes = originalNodes
      .map((n) => ({
        ...n,
        group: getContinentByCountry(n.id) || "Other",
        x: Math.random() * VIRTUAL_WIDTH,
        y: Math.random() * VIRTUAL_HEIGHT,
        vx: 0,
        vy: 0,
      }))
      .filter((n) => n.group !== "Other");

    const sizeScale = (value: number) =>
      Math.max(20, Math.sqrt(Math.max(value, 0.001)) * 20);

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = originalLinks.filter(
      (l) =>
        nodeIds.has(
          typeof l.source === "object" ? (l.source as any).id : l.source
        ) &&
        nodeIds.has(
          typeof l.target === "object" ? (l.target as any).id : l.target
        )
    );

    const maxInfluence = d3.max(links, (d) => d.value) || 1;
    const widthScale = d3
      .scaleLinear()
      .domain([0, maxInfluence * maxInfluence])
      .range([1, 4]);

    // Set up "groupCenters" in virtual box coordinates
    const groupCenters: Record<string, [number, number]> = {
      Asia: [VIRTUAL_WIDTH * 1, VIRTUAL_HEIGHT * 1],
      Europe: [VIRTUAL_WIDTH * 0.55, VIRTUAL_HEIGHT * 0.7],
      Africa: [VIRTUAL_WIDTH * 0.55, VIRTUAL_HEIGHT * 0.3],
      NorthAmerica: [VIRTUAL_WIDTH * 0, VIRTUAL_HEIGHT * 1],
      SouthAmerica: [VIRTUAL_WIDTH * 0, VIRTUAL_HEIGHT * 0.3],
      Oceania: [VIRTUAL_WIDTH * 1, VIRTUAL_HEIGHT * 0.4],
      MiddleEast: [VIRTUAL_WIDTH * 0.8, VIRTUAL_HEIGHT * 0.4],
    };
    if (groupCenters[allview]) {
      Object.keys(groupCenters).forEach(
        (key) => (groupCenters[key] = [VIRTUAL_WIDTH * 0.5, VIRTUAL_HEIGHT * 0.4])
      );
    }

    // --- Forces ---
    const forceCluster =
      (strength = 1) =>
      (alpha: number) => {
        const groupMap = d3.group(nodes, (d) => d.group);
        for (const group of groupMap.values()) {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const a = group[i],
                b = group[j];
              const dx = b.x! - a.x!;
              const dy = b.y! - a.y!;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = (sizeScale(a.value) + sizeScale(b.value)) * 0.8;
              if (dist < minDist) {
                const adjust = ((minDist - dist) / dist) * alpha * strength;
                const ox = dx * adjust * 0.5,
                  oy = dy * adjust * 0.5;
                a.vx! -= ox;
                a.vy! -= oy;
                b.vx! += ox;
                b.vy! += oy;
              }
            }
          }
        }
      };

    function forceGroupCentering(strength = 2.5) {
      return (alpha: number) => {
        nodes.forEach((node: any) => {
          const group = node.group || "Other";
          const center = groupCenters[group];
          const groupStrength = group === "Europe" ? strength * 0.7 : strength;
          node.vx += (center[0] - node.x) * groupStrength * alpha;
          node.vy += (center[1] - node.y) * groupStrength * alpha;
        });
      };
    }

    // Run D3 force simulation (in virtual space)
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d) =>
            d3
              .scaleLinear()
              .domain([0, maxInfluence])
              .range([
                Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) / 8,
                Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) / 2.2,
              ])(d.value)
          )
          .strength(0.6)
      )
      .force(
        "charge",
        d3.forceManyBody().strength(-Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) / 6)
      )
      .force("grouping", forceGroupCentering(2.2))
      .force("clustering", forceCluster(1))
      .force(
        "collide",
        d3.forceCollide().radius((d: any) => {
          const padding =
            d.group === "Europe"
              ? Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) / 30
              : Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) / 60;
          return sizeScale(d.value) / 2 + padding;
        })
      )
      .force("center", d3.forceCenter(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2));

    for (let i = 0; i < 300; ++i) simulation.tick();

    setRawLayout({
      nodes: nodes.map((n) => ({ ...n })), // x/y/vx/vy in virtual space!
      links: links.map((l) => ({
        ...l,
        source: typeof l.source === "object" && "id" in l.source ? (l.source as { id: string }).id : l.source,
        target: typeof l.target === "object" && "id" in l.target ? (l.target as { id: string }).id : l.target,
        width: widthScale(l.value * l.value),
      })),
      VIRTUAL_WIDTH,
      VIRTUAL_HEIGHT,
    });
  }, [originalNodes, originalLinks, allview]);

  // --- 2. Scale layout to window size ---
  function scaleLayout(rawLayout: any, width: number, height: number) {
    if (!rawLayout) return null;
    const xScale = d3.scaleLinear()
      .domain([0, rawLayout.VIRTUAL_WIDTH])
      .range([0, width]);
    const yScale = d3.scaleLinear()
      .domain([0, rawLayout.VIRTUAL_HEIGHT])
      .range([0, height]);
    return {
      nodes: rawLayout.nodes.map((n: any) => ({
        ...n,
        x: xScale(n.x),
        y: yScale(n.y),
      })),
      links: rawLayout.links.map((l: any) => ({ ...l })), // Links don't need scaling unless you want to
      width,
      height,
    };
  }

  const layout = rawLayout ? scaleLayout(rawLayout, width, height) : null;

  if (!layout) return <div>Loading layout...</div>;
  return (
    <InfluenceNetwork3D
      nodes={layout.nodes}
      links={layout.links}
      width={width}
      height={height}
    />
  );
}
