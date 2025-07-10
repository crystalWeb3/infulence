"use client";

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { countryNameToCode } from "@/utils/countryCodes";

type NodeType = {
  id: string;
  value: number;
};

type LinkType = {
  source: string;
  target: string;
  value: number;
};

type Props = {
  nodes: NodeType[];
  links: LinkType[];
};

const WorldMapGraphNetwork: React.FC<Props> = ({ nodes, links }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);

    const blob = new Blob(
      ['<?xml version="1.0" standalone="no"?>\n' + source],
      {
        type: "image/svg+xml;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "influence_network3-gradient.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr("width", width).attr("height", height);

    const projection = d3
      .geoMercator()
      .scale(width / 7)
      .translate([width / 2, height / 1.5]);

    const pathGenerator = d3.geoPath().projection(projection);

    function createTrianglePath(
      source: [number, number],
      target: [number, number],
      width: number
    ) {
      const angle = Math.atan2(target[1] - source[1], target[0] - source[0]);
      const dx = (width / 2) * Math.sin(angle);
      const dy = (width / 2) * -Math.cos(angle);

      const path = d3.path();
      path.moveTo(source[0] - dx, source[1] - dy);
      path.lineTo(source[0] + dx, source[1] + dy);
      path.lineTo(target[0], target[1]);
      path.closePath();

      return path.toString();
    }

    const drawMap = async () => {
      const worldData: any = await d3.json("/world-geojson.json");

      if (!worldData?.features) return;

      const mapGroup = svg.append("g").attr("class", "map-group");

      mapGroup
        .selectAll(".country")
        .data(worldData.features)
        .join("path")
        .attr("class", "country")
        .attr("d", (d: any) => pathGenerator(d)!)
        .attr("fill", "#f8f8f8")
        .attr("stroke", "#e0e0e0");

      const nodePositions: Record<string, [number, number]> = {};
      nodes.forEach((node) => {
        const code = countryNameToCode[node.id]?.toUpperCase();
        const feature = worldData.features.find(
          (f: any) =>
            f.properties?.postal === code ||
            f.properties?.name_sort === node.id ||
            f.properties?.name === node.id
        );

        if (feature && feature.geometry) {
          nodePositions[node.id] = projection(d3.geoCentroid(feature))!;
        } else {
          console.warn(`No geo data found for ${node.id}`);
          nodePositions[node.id] = projection([0, 0])!;
        }
      });

      const influenceExtent = d3.extent(
        links.map((l) => Math.abs(l.value))
      ) as [number, number];

      const linkWidth = d3.scaleSqrt().domain(influenceExtent).range([2, 8]);

      const linkOpacity = d3
        .scaleLinear()
        .domain(influenceExtent)
        .range([0.15, 0.9]);

      const influenceRatioScale = d3
        .scaleLinear()
        .domain(influenceExtent)
        .range([0, 1]);

      const defs = svg.append("defs");
      const linkGroup = svg.append("g").attr("class", "link-group");

      linkGroup
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("d", (d) => {
          const source = nodePositions[d.source] || [0, 0];
          const target = nodePositions[d.target] || [0, 0];
          const width = linkWidth(Math.abs(d.value));
          return createTrianglePath(source, target, width);
        })
        .attr("fill", (d, i) => {
          const id = `link-gradient-${i}`;
          defs.select(`#${id}`).remove(); // Clean up old gradients if re-rendered

          const gradient = defs
            .append("linearGradient")
            .attr("id", id)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", nodePositions[d.source]?.[0] || 0)
            .attr("y1", nodePositions[d.source]?.[1] || 0)
            .attr("x2", nodePositions[d.target]?.[0] || 0)
            .attr("y2", nodePositions[d.target]?.[1] || 0);

          gradient
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "red");

            gradient
            .append("stop")
            .attr("offset", "90%")
            .attr("stop-color", "#03adfc90"); 
       
          gradient
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#03adfc90"); // Blue

          return `url(#${id})`;
        })

        .attr("opacity", (d) => linkOpacity(Math.abs(d.value)))
        .on("mouseover", (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGPathElement).attr("opacity", 1);
          if (tooltipRef.current) {
            tooltipRef.current.style.display = "block";
            tooltipRef.current.innerHTML = `<strong>${d.source} → ${
              d.target
            }</strong><br/>Influence: ${d.value.toFixed(2)}`;
          }
        })
        .on("mousemove", (event: MouseEvent) => {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 20}px`;
          }
        })
        .on("mouseout", (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGPathElement).attr(
            "opacity",
            linkOpacity(Math.abs(d.value))
          );
          if (tooltipRef.current) {
            tooltipRef.current.style.display = "none";
          }
        });

      const sizeScale = d3
        .scaleSqrt()
        .domain(d3.extent(nodes.map((n) => n.value)) as [number, number])
        .range([8, 20]);

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
        .attr(
          "x",
          (d) => (nodePositions[d.id]?.[0] || 0) - sizeScale(d.value) / 2
        )
        .attr(
          "y",
          (d) => (nodePositions[d.id]?.[1] || 0) - sizeScale(d.value) / 2
        )
        .on("mouseover", (event: MouseEvent, d) => {
          if (tooltipRef.current) {
            tooltipRef.current.style.display = "block";
            tooltipRef.current.innerHTML = `<strong>${d.id}</strong><br/>Influence: ${d.value}`;
          }
        })
        .on("mousemove", (event: MouseEvent) => {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 20}px`;
          }
        })
        .on("mouseout", () => {
          if (tooltipRef.current) {
            tooltipRef.current.style.display = "none";
          }
        });
    };

    drawMap();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        svg.selectAll("g").attr("transform", event.transform);
      });

    svg.call(zoom);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [nodes, links]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="fixed top-0 left-0 w-full h-full z-0" />
      <div
        ref={tooltipRef}
        className="absolute z-10 pointer-events-none bg-black/80 text-white text-sm px-3 py-2 rounded hidden min-w-[80px] max-w-[260px] whitespace-pre-line"
      />
      <button
        onClick={downloadSVG}
        className="absolute top-4 right-4 z-20 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
      >
        Download SVG
      </button>
    </div>
  );
};

export default WorldMapGraphNetwork;
