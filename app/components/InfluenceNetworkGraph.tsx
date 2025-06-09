"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { countryNameToCode } from "@/utils/countryCodes";
import { groupColorMap } from "@/utils/groupColors";
import { getContinentByCountry } from "@/utils/getCountryGroup";

type NodeType = d3.SimulationNodeDatum & {
  id: string;
  value: number;
  group?: string;
};

type LinkType = {
  source: string;
  target: string;
  value: number;
  group?: string;
  color?: string;
};

type Props = {
  allview: string;
  nodes: NodeType[];
  links: LinkType[];
};

export default function InfluenceNetworkGraph({
  allview,
  nodes: originalNodes,
  links: originalLinks,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (originalNodes.length === 0 || originalLinks.length === 0) return;

    const width = 1400;
    const height = 800;

    const sizeScale = (value: number) => {
      if (value <= 0) value = 0.001;
      return Math.max(20, Math.sqrt(Math.abs(value || 0)) * 20);
    };

    const nodes = originalNodes
      .map((node) => ({
        ...node,
        group: getContinentByCountry(node.id) || "Other",
      }))
      .filter((node) => node.group !== "Other");

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = originalLinks.filter(
      (l) =>
        nodeIds.has(
          typeof l.source === "object"
            ? (l.source as { id: string }).id
            : l.source
        ) &&
        nodeIds.has(
          typeof l.target === "object"
            ? (l.target as { id: string }).id
            : l.target
        )
    );

    function forceCluster(strength = 1) {
      return (alpha: number) => {
        const groupNodes = d3.group(nodes, (d) => d.group);
        for (const [_, nodesInGroup] of groupNodes.entries()) {
          for (let i = 0; i < nodesInGroup.length; i++) {
            const nodeA = nodesInGroup[i];
            for (let j = i + 1; j < nodesInGroup.length; j++) {
              const nodeB = nodesInGroup[j];
              const dx = nodeB.x! - nodeA.x!;
              const dy = nodeB.y! - nodeA.y!;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const sizeA = sizeScale(nodeA.value);
              const sizeB = sizeScale(nodeB.value);
              const minDistance = (sizeA + sizeB) * 0.6;
              if (distance < minDistance) {
                const adjustment =
                  ((minDistance - distance) / distance) * alpha * strength;
                const offsetX = dx * adjustment * 0.5;
                const offsetY = dy * adjustment * 0.5;
                nodeA.vx! -= offsetX;
                nodeA.vy! -= offsetY;
                nodeB.vx! += offsetX;
                nodeB.vy! += offsetY;
              }
            }
          }
        }
      };
    }

    function shortenArcPath(x1: number, y1: number, x2: number, y2: number, r: number) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const normX = dx / len;
      const normY = dy / len;
      const newX = x2 - normX * (r + 6);
      const newY = y2 - normY * (r + 6);
      const dr = len * 1.5;
      return `M${x1},${y1}A${dr},${dr} 0 0,1 ${newX},${newY}`;
    }

    let groupCenters: Record<string, [number, number]> = {
      Asia: [width * 1, height * 0],
      Europe: [width * 0.55, height * 0.3],
      Africa: [width * 0.55, height * 0.7],
      NorthAmerica: [width * 0, height * 0],
      SouthAmerica: [width * 0, height * 0.7],
      Oceania: [width * 1, height * 0.6],
      MiddleEast: [width * 0.8, height * 0.6],
    };

    if (
      [
        "Asia",
        "Europe",
        "Africa",
        "NorthAmerica",
        "SouthAmerica",
        "Oceania",
        "MiddleEast",
      ].includes(allview)
    ) {
      groupCenters = Object.fromEntries(
        Object.entries(groupCenters).map(([k]) => [k, [width * 0.5, height * 0.4]])
      );
    }

    function forceGroupCentering(strength = 1.5) {
      return (alpha: number) => {
        nodes.forEach((node: any) => {
          const center = groupCenters[node.group || "Other"];
          node.vx += (center[0] - node.x) * strength * alpha;
          node.vy += (center[1] - node.y) * strength * alpha;
        });
      };
    }

    function forceRepelGroups(baseStrength = -100) {
      return d3.forceManyBody().strength((d: any) => {
        const strength = sizeScale(d.value) * 0.3;
        return -Math.max(baseStrength, strength);
      });
    }

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "#f9f9f9");

    svg.selectAll("*").remove();

    const zoomGroup = svg.append("g");
    const defs = svg.append("defs");

    links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? (link.source as any).id : link.source;
      const targetId =
        typeof link.target === "object" ? (link.target as any).id : link.target;
      const sourceCode = countryNameToCode[sourceId] || sourceId;
      const targetCode = countryNameToCode[targetId] || targetId;
      const markerId = `arrow-${sourceCode}-${targetCode}`;

      defs
        .append("marker")
        .attr("id", markerId)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 3)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .attr("markerUnits", "userSpaceOnUse")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", link.color || "#ccc");
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((link: any) => {
            const baseDistance = 100;
            const influenceScale = d3
              .scaleLinear()
              .domain([0, d3.max(links, (d) => d.value || 1)!])
              .range([baseDistance, 500]);
            return influenceScale(link.value || 0);
          })
          .strength(0.7)
      )
      .force("charge", d3.forceManyBody().strength(-150))
      .force("grouping", forceGroupCentering(1.5))
      .force("clustering", forceCluster(1))
      .force(
        "collide",
        d3.forceCollide().radius((d: any) => sizeScale(d.value) / 2 + 4)
      )
      .force("repelGroups", forceRepelGroups(-150));

    const tooltip = d3
      .select(tooltipRef.current)
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "14px")
      .style("display", "none");

    const link = zoomGroup
      .append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.6)
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("stroke", (d: any) => d.color || "#ccc")
      .attr("stroke-width", (d: any) =>
        Math.max(1, Math.sqrt(Math.abs(d.value)) * 10)
      )
      .attr("stroke-linecap", "round")
      .attr("marker-end", (d: any) => {
        const sourceId = typeof d.source === "object" ? d.source.id : d.source;
        const targetId = typeof d.target === "object" ? d.target.id : d.target;
        const sourceCode = countryNameToCode[sourceId] || sourceId;
        const targetCode = countryNameToCode[targetId] || targetId;
        return `url(#arrow-${sourceCode}-${targetCode})`;
      })
      .on("mouseover", function (event, d: any) {
        const source = typeof d.source === "object" ? d.source.id : d.source;
        const target = typeof d.target === "object" ? d.target.id : d.target;
        tooltip
          .style("display", "block")
          .html(`<strong>${source} → ${target}</strong><br/>Influence: ${d.value.toFixed(2)}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
      });

    const nodeGroup = zoomGroup
      .append("g")
      .selectAll("foreignObject")
      .data(nodes)
      .join("foreignObject")
      .attr("width", (d) => sizeScale(d.value))
      .attr("height", (d) => sizeScale(d.value))
      .style("overflow", "visible")
      .append("xhtml:img")
      .attr("src", (d) => {
        const code = countryNameToCode[d.id];
        return code
          ? `https://hatscripts.github.io/circle-flags/flags/${code}.svg`
          : "";
      })
      .attr("width", (d) => sizeScale(d.value))
      .attr("height", (d) => sizeScale(d.value))
      .style("border-radius", "50%")
      .style("border", "1px solid #ccc")
      .on("mouseover", function (event, d: any) {
        tooltip
          .style("display", "block")
          .html(`<strong>${d.id}</strong><br/>Influence: ${d.value.toFixed(2)}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
      });

    simulation.on("tick", () => {
      link.attr("d", (d: any) => {
        const x1 = d.source.x;
        const y1 = d.source.y;
        const x2 = d.target.x;
        const y2 = d.target.y;
        const rTarget = sizeScale(d.target.value) / 2;
        return shortenArcPath(x1, y1, x2, y2, rTarget);
      });

      zoomGroup
        .selectAll("foreignObject")
        .attr("x", (d: any) => d.x! - sizeScale(d.value) / 2)
        .attr("y", (d: any) => d.y! - sizeScale(d.value) / 2);
    });

    if (svgRef.current) {
      d3.select<SVGSVGElement, unknown>(svgRef.current).call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.3, 5])
          .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
          })
      );
    }
  }, [originalNodes, originalLinks, allview]);

  return (
    <div className="relative w-full">
      <svg ref={svgRef} className="fixed top-0 left-0 w-full h-full z-0" />
      <div ref={tooltipRef} className="absolute z-10" />
    </div>
  );
}
