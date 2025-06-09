"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { countryNameToCode } from "@/utils/countryCodes";
import { countryNameToColor } from "@/utils/countryColors";

type NodeType = {
  id: string;
  value: number;
};

type LinkType = {
  source: string;
  target: string;
  value: number;
  color?: string;
};

type Props = {
  nodes: NodeType[];
  links: LinkType[];
};

const WorldMapInfluenceNetwork: React.FC<Props> = ({ nodes, links }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!svgRef.current) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Projection and path
    const projection = d3
      .geoMercator()
      .scale(width / 7)
      .translate([width / 2, height / 1.5]);
    const pathGenerator = d3.geoPath().projection(projection);

    d3.json("/world-geojson.json").then((data: any) => {
      if (!data?.features) return;

      // Create a group for the map
      const mapGroup = svg.append("g").attr("class", "map-group");

      // Draw countries
      mapGroup
        .selectAll(".country")
        .data(data.features)
        .join("path")
        .attr("class", "country")
        .attr("d", (d: any) => pathGenerator(d)!)
        .attr("fill", "#f5f5f5")
        .attr("stroke", "#f0f0f0");

      // Compute country positions using centroids
      const nodePositions: Record<string, [number, number]> = {};
      nodes.forEach((node) => {
        const feature = data.features.find(
          (f: any) =>
            f.properties?.postal === countryNameToCode[node.id]?.toUpperCase() ||
            f.properties?.name_sort === node.id
        );
        if (feature && feature.geometry) {
          nodePositions[node.id] = projection(d3.geoCentroid(feature))!;
        } else {
          nodePositions[node.id] = projection([0, 0])!;
        }
      });

      // --- Arrow markers ---
      const defs = svg.append("defs");
      links.forEach((link) => {
        const sourceCode = countryNameToCode[link.source] || link.source;
        const targetCode = countryNameToCode[link.target] || link.target;
        const markerId = `arrow-${sourceCode}-${targetCode}`;
        if (!svg.select(`#${markerId}`).node()) {
          defs
            .append("marker")
            .attr("id", markerId)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .attr("markerUnits", "userSpaceOnUse")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", link.color || "#888");
        }
      });

      // Draw links
      const linkGroup = svg.append("g").attr("class", "link-group");
      const linkWidthScale = d3
        .scaleSqrt()
        .domain(d3.extent(links.map((l) => Math.abs(l.value))) as [number, number])
        .range([1, 4]);
      linkGroup
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("d", (d) => {
          const source = nodePositions[d.source];
          const target = nodePositions[d.target];
          if (!source || !target) return null;
          const dx = target[0] - source[0];
          const dy = target[1] - source[1];
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
          return `M${source[0]},${source[1]}A${dr},${dr} 0 0,1 ${target[0]},${target[1]}`;
        })
        .attr("stroke", (d) => d.color || "#888")
        .attr("stroke-width", (d) => linkWidthScale(Math.abs(d.value)))
        .attr("fill", "none")
        .attr("opacity", 0.7)
        .attr("marker-end", (d) => {
          const sourceCode = countryNameToCode[d.source] || d.source;
          const targetCode = countryNameToCode[d.target] || d.target;
          return `url(#arrow-${sourceCode}-${targetCode})`;
        })
        .on("mouseover", function (event, d) {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.innerHTML = `<strong>${d.source} → ${d.target}</strong><br/>Influence: ${d.value}`;
        })
        .on("mousemove", function (event) {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY - 20 + "px";
        })
        .on("mouseout", function () {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.display = "none";
        });

      // Draw nodes (flags)
      const sizeScale = d3
        .scaleSqrt()
        .domain(d3.extent(nodes.map((d) => d.value)) as [number, number])
        .range([10, 25]);
      const nodeGroup = svg.append("g").attr("class", "node-group");
      nodeGroup
        .selectAll("image")
        .data(nodes)
        .join("image")
        .attr("href", (d) => {
          const code = countryNameToCode[d.id];
          return code
            ? `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`
            : "";
        })
        .attr("width", (d) => sizeScale(d.value))
        .attr("height", (d) => sizeScale(d.value))
        .attr("x", (d) => (nodePositions[d.id]?.[0] || 0) - sizeScale(d.value) / 2)
        .attr("y", (d) => (nodePositions[d.id]?.[1] || 0) - sizeScale(d.value) / 2)
        .attr("opacity", 1)
        .on("mouseover", function (event, d) {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.innerHTML = `<strong>${d.id}</strong><br/>Influence: ${d.value}`;
        })
        .on("mousemove", function (event) {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY - 20 + "px";
        })
        .on("mouseout", function () {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.display = "none";
        });
    });

    // Add zoom/pan
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 8])
        .on("zoom", (event) => {
          svg.selectAll("g").attr("transform", event.transform);
        })
    );
  }, [nodes, links]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="fixed top-0 left-0 w-full h-full z-0" />
      <div
        ref={tooltipRef}
        className="absolute z-10 pointer-events-none"
        style={{
          display: "none",
          position: "absolute",
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: "4px",
          fontSize: "14px",
          pointerEvents: "none",
          minWidth: "80px",
          maxWidth: "260px",
          whiteSpace: "pre-line",
        }}
      />
    </div>
  );
};

export default WorldMapInfluenceNetwork;