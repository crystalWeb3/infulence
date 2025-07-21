"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { countryNameToCode } from "@/utils/countryCodes";
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
  const slugify = (str: string) => str.replace(/\s+/g, "-").toLowerCase();

  // function downloadSVG() {
  //   if (!svgRef.current) return;
  //   const svgElement = svgRef.current;
  //   const serializer = new XMLSerializer();
  //   const source = serializer.serializeToString(svgElement);
  //   const svgBlob = new Blob(['<?xml version="1.0"?>\r\n' + source], {
  //     type: "image/svg+xml;charset=utf-8",
  //   });
  //   const url = URL.createObjectURL(svgBlob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "influence_network.svg";
  //   document.body.appendChild(a);
  //   a.click();
  //   document.body.removeChild(a);
  //   URL.revokeObjectURL(url);
  // }

  useEffect(() => {
    if (!originalNodes.length || !originalLinks.length) return;

    const width = 1100;
    const height = 700;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "#f9f9f9");
    svg.selectAll("*").remove();

    const zoomGroup = svg.append("g");
    const defs = svg.append("defs");

    const sizeScale = (value: number) =>
      Math.max(20, Math.sqrt(Math.max(value, 0.001)) * 20);

    const nodes = originalNodes
      .map((n) => ({
        ...n,
        group: getContinentByCountry(n.id) || "Other",
      }))
      .filter((n) => n.group !== "Other");

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
    const opacityScale = d3
      .scaleLinear()
      .domain([0, maxInfluence])
      .range([0.2, 1]);
    const widthScale = d3
      .scaleLinear()
      .domain([0, maxInfluence * maxInfluence])
      .range([1, 4]);

    links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? (link.source as any).id : link.source;
      const targetId =
        typeof link.target === "object" ? (link.target as any).id : link.target;
      const sourceCode = countryNameToCode[sourceId];
      const targetCode = countryNameToCode[targetId];
      const gradId = `grad-${sourceCode}-${targetCode}`;
      const grad = defs
        .append("linearGradient")
        .attr("id", gradId)
        .attr("gradientUnits", "userSpaceOnUse");

      grad.append("stop").attr("offset", "0%").attr("stop-color", "red");
      grad.append("stop").attr("offset", "90%").attr("stop-color", "#03adfc90");
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#03adfc90");
    });

    const groupCenters: Record<string, [number, number]> = {
      Asia: [width * 1, height * 0],
      Europe: [width * 0.55, height * 0.3],
      Africa: [width * 0.55, height * 0.7],
      NorthAmerica: [width * 0, height * 0],
      SouthAmerica: [width * 0, height * 0.7],
      Oceania: [width * 1, height * 0.6],
      MiddleEast: [width * 0.8, height * 0.6],
    };

    if (groupCenters[allview]) {
      Object.keys(groupCenters).forEach(
        (key) => (groupCenters[key] = [width * 0.5, height * 0.4])
      );
    }

    const forceCluster =
      (strength = 1) =>
      (alpha: number) => {
        const groupMap = d3.group(nodes, (d) => d.group);
        for (const group of groupMap.values()) {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const a = group[i],
                b = group[j];
              const dx = b.x! - a.x!,
                dy = b.y! - a.y!;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = (sizeScale(a.value) + sizeScale(b.value)) * 0.6;
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
    function forceGroupCentering(strength = 1.5) {
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

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d) =>
            d3.scaleLinear().domain([0, maxInfluence]).range([100, 500])(
              d.value
            )
          )
          .strength(0.7)
      )
      .force("charge", d3.forceManyBody().strength(-150))
      .force("grouping", forceGroupCentering(1.5))
      .force("clustering", forceCluster(1))
      .force(
        "collide",
        d3.forceCollide().radius((d: any) => {
          const padding = d.group === "Europe" ? 30 : 4;
          return sizeScale(d.value) / 2 + padding;
        })
      );

    const tooltip = d3
      .select(tooltipRef.current)
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "14px");

    const link = zoomGroup
      .append("g")
      .attr("fill-opacity", 0.8)
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", (d: any) => {
        const s =
          countryNameToCode[d.source.id || d.source] ||
          slugify(d.source.id || d.source);
        const t =
          countryNameToCode[d.target.id || d.target] ||
          slugify(d.target.id || d.target);
        return `url(#grad-${s}-${t})`;
      })
      .attr("stroke", "none")
      .on("mouseover", (event, d: any) => {
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
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    zoomGroup
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
      .on("mouseover", (event, d) => {
        tooltip
          .style("display", "block")
          .html(
            `<strong>${d.id}</strong><br/>Influence: ${d.value.toFixed(2)}`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    simulation.on("tick", () => {
      link.attr("d", (d: any) => {
        const x1 = d.source.x;
        const y1 = d.source.y;
        const x2 = d.target.x;
        const y2 = d.target.y;
        const width = widthScale(d.value * d.value);

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const normX = dx / len;
        const normY = dy / len;

        const perpX = -normY;
        const perpY = normX;

        const p1x = x1 + perpX * width;
        const p1y = y1 + perpY * width;
        const p2x = x1 - perpX * width;
        const p2y = y1 - perpY * width;

        return `M ${p1x},${p1y} L ${p2x},${p2y} L ${x2},${y2} Z`;
      });

      zoomGroup
        .selectAll("foreignObject")
        .attr("x", (d: any) => d.x! - sizeScale(d.value) / 2)
        .attr("y", (d: any) => d.y! - sizeScale(d.value) / 2);

      links.forEach((l) => {
        const s = l.source as any,
          t = l.target as any;
        const sCode = countryNameToCode[s.id];
        const tCode = countryNameToCode[t.id];
        d3.select(`#grad-${sCode}-${tCode}`)
          .attr("x1", s.x)
          .attr("y1", s.y)
          .attr("x2", t.x)
          .attr("y2", t.y);
      });
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
  }, [originalNodes, originalLinks, allview]);

  return (
    <div className="relative w-full">
      <svg ref={svgRef} className="fixed top-0 left-0 w-full h-full z-0" />
      <div ref={tooltipRef} className="absolute z-10" />
      {/* <button
        onClick={downloadSVG}
        className="absolute top-4 right-4 z-20 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Download SVG
      </button> */}
    </div>
  );
}
