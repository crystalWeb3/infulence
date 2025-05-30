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
  nodes,
  links,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nodes.length === 0 || links.length === 0) return;

    const width = 1400;
    const height = 800;

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
              const minDistance = 150;
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

    nodes.forEach((node) => {
      const group = getContinentByCountry(node.id);
      node.group = group || "Other";
      if (!group) console.warn(`Missing continent for: ${node.id}`);
    });

    let groupCenters: Record<string, [number, number]> = {
      Asia: [width * 0.8, height * 0.4],
      Europe: [width * 0.4, height * 0.5],
      Africa: [width * 0.4, height * 0.7],
      NorthAmerica: [width * 0.2, height * 0.4],
      SouthAmerica: [width * 0.2, height * 0.7],
      Oceania: [width * 0.9, height * 0.8],
      MiddleEast: [width * 0.6, height * 0.5],
      Other: [1, 1],
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
        Object.entries(groupCenters).map(([k]) => [
          k,
          [width * 0.5, height * 0.4],
        ])
      );
    }

    function forceGroupCentering(strength = 1) {
      return (alpha: number) => {
        nodes.forEach((node: any) => {
          const center = groupCenters[node.group || "Other"];
          node.vx += (center[0] - node.x) * strength * alpha;
          node.vy += (center[1] - node.y) * strength * alpha;
        });
      };
    }

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "#f9f9f9");

    svg.selectAll("*").remove();

    const zoomGroup = svg.append("g"); // Group to zoom/pan

    const defs = svg.append("defs");

    links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" &&
        link.source !== null &&
        "id" in link.source
          ? (link.source as { id: string }).id
          : link.source;
      const targetId =
        typeof link.target === "object" &&
        link.target !== null &&
        "id" in link.target
          ? (link.target as { id: string }).id
          : link.target;
      const sourceCode = countryNameToCode[sourceId] || sourceId;
      const targetCode = countryNameToCode[targetId] || targetId;
      const markerId = `arrow-${sourceCode}-${targetCode}`;

      defs
        .append("marker")
        .attr("id", markerId)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 30)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
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
          .distance(500)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("grouping", forceGroupCentering(0.4))
      .force("clustering", forceCluster(0.5));

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
          .html(
            `<strong>${source} → ${target}</strong><br/>Influence: ${d.value.toFixed(
              2
            )}`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", function () {
        tooltip.style("display", "none");
      });

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

    const sizeScale = (value: number) => {
      if (value <= 0) value = 0.001;
      return Math.max(20, Math.sqrt(Math.abs(value || 0)) * 20);
    };

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
          .html(
            `<strong>${d.id}</strong><br/>Influence: ${d.value.toFixed(2)}`
          );
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
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${x1},${y1}A${dr},${dr} 0 0,1 ${x2},${y2}`;
      });

      zoomGroup
        .selectAll("foreignObject")
        .attr("x", (d: any) => d.x! - sizeScale(d.value) / 2)
        .attr("y", (d: any) => d.y! - sizeScale(d.value) / 2);
    });

    if (svgRef.current) {
      d3.select<SVGSVGElement, unknown>(svgRef.current).call(
        d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.3, 5])
          .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
          })
      );
    }
  }, [nodes, links, allview]);

  return (
    <div className="relative w-full">
      <svg ref={svgRef} width={1400} height={800} />
      <div ref={tooltipRef} className="absolute z-10" />
    </div>
  );
}
