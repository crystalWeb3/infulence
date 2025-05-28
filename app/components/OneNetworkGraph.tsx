"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

type InfluenceEntry = {
  a_first: string;
  a_seond: string;
  [key: `a_${string}` | `b_${string}` | `net_${string}`]: number | string;
};

type Node = {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type Link = {
  source: string;
  target: string;
  value: number;
};

const YEARS = ["1965", "1980", "1995", "2010", "2023"];

interface NetworkGraphProps {
  data: InfluenceEntry[];
}

export default function NetworkGraph({ data }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [yearIndex, setYearIndex] = useState<number>(0);

  useEffect(() => {
    const width = 800;
    const height = 600;
    const year = YEARS[yearIndex];

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
svg
  .append("defs")
  .append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 30) // Adjust to place arrow near node
  .attr("refY", 0)
  .attr("markerWidth", 20)
  .attr("markerHeight", 20)
  .attr("orient", "auto")
  .attr("markerUnits", "userSpaceOnUse") // Prevent scaling with stroke-width
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#555");


    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3
      .forceSimulation<Node>()
      .force(
        "link",
        d3
          .forceLink<Node, any>()
          .id((d) => d.id)
          .distance(400)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const getGraphDataForYear = (year: string) => {
      const links: Link[] = [];
      const nodesSet = new Set<string>();

      // Collect all nodes regardless of netVal
      data.forEach((entry) => {
        nodesSet.add(entry.a_first);
        nodesSet.add(entry.a_seond);
      });

      // Create links based on netVal
      data.forEach((entry) => {
        const netKey = `net_${year}` as keyof InfluenceEntry;
        const netVal = entry[netKey] as number;
        if (netVal !== 0) {
          const source = netVal > 0 ? entry.a_first : entry.a_seond;
          const target = netVal > 0 ? entry.a_seond : entry.a_first;
          links.push({ source, target, value: Math.abs(netVal) });
        }
      });

      const nodes: Node[] = Array.from(nodesSet).map((id) => ({ id }));
      return { nodes, links };
    };

    const { nodes, links } = getGraphDataForYear(year);

    const link = svg
      .append("g")
      .attr("stroke", "#888")
      .attr("stroke-opacity", 0.8)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.max(1, d.value * 50))
      .attr("marker-end", "url(#arrow)");

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d) => color(d.id))
      .call(drag(simulation));

    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.id)
      .attr("font-size", "12px")
      .attr("dx", 12)
      .attr("dy", 4);

    // Tooltip (optional)
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "5px 10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    node
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.id}</strong>`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    simulation.nodes(nodes).on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      label.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    simulation.force<d3.ForceLink<Node, any>>("link")!.links(links);

    const interval = setInterval(() => {
      setYearIndex((prev) => (prev + 1) % YEARS.length);
    }, 10000);

    return () => {
      clearInterval(interval);
      tooltip.remove();
    };
  }, [yearIndex, data]);

  function drag(simulation: d3.Simulation<Node, undefined>) {
    return d3
      .drag<SVGCircleElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl mb-4">
        Network Diagram - Year: {YEARS[yearIndex]}
      </h2>
      <svg ref={svgRef} width={800} height={600} />
    </div>
  );
}
