"use client";
import * as d3 from "d3";
import Link from "next/link";
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
  color?: string;
};

const countryMap = {
  "United States of America": { code: "us", color: "#3C3B6E" },
  "United Kingdom": { code: "gb", color: "#CF142B" },
  Germany: { code: "de", color: "#000000" },
  China: { code: "cn", color: "#DE2910" },
  "Russian Federation": { code: "ru", color: "#3F6DB3" },
  France: { code: "fr", color: "#0055A4" },
};

const YEARS = ["1965", "1980", "1995", "2010", "2023"];

interface NetworkGraphProps {
  data: InfluenceEntry[];
}

export default function NetworkGraph({ data }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [yearIndex, setYearIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
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

        const source = netVal > 0 ? entry.a_first : entry.a_seond;
        const target = netVal > 0 ? entry.a_seond : entry.a_first;

        let color =
          countryMap[source as keyof typeof countryMap]?.color || "#999";
        if (netVal === 0) color = "#fff";
        links.push({ source, target, value: Math.abs(netVal), color });
      });

      const nodes: Node[] = Array.from(nodesSet).map((id) => ({ id }));
      return { nodes, links };
    };

    const { nodes, links } = getGraphDataForYear(year);

    const defs = svg.append("defs");

    links.forEach((link) => {
      const sourceId = (link.source as any).id || link.source;
      const targetId = (link.target as any).id || link.target;

      if (link.value === 0) {
        console.log(link);
        return;
      }
      let stid =
        countryMap[sourceId as keyof typeof countryMap]?.code || sourceId;
      let enid =
        countryMap[targetId as keyof typeof countryMap]?.code || targetId;
      const markerId = `arrow-${stid + enid}-${year}`;
      const color =
        countryMap[sourceId as keyof typeof countryMap]?.color || "#999";

      defs
        .append("marker")
        .attr("id", markerId)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 30)
        .attr("refY", 0)
        .attr("markerWidth", 25)
        .attr("markerHeight", 25)
        .attr("orient", "auto")
        .attr("markerUnits", "userSpaceOnUse")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    const link = svg
      .append("g")
      .attr("stroke", "#888")
      .attr("stroke-opacity", 0.8)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => d.color || "#888")
      .attr("stroke-width", (d) => Math.max(1, d.value * 50))
      .attr("marker-end", (d: any) => {
        const sourceId: string =
          typeof d.source === "object" && d.source !== null
            ? d.source.id
            : d.source;
        const targetId: string =
          typeof d.target === "object" && d.target !== null
            ? d.target.id
            : d.target;

        const stcountry = countryMap[sourceId as keyof typeof countryMap];
        const encountry = countryMap[targetId as keyof typeof countryMap];
        const code = stcountry.code + encountry.code;
        return `url(#arrow-${code}-${year})`;
      });

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("href", (d) => {
        const country = countryMap[d.id as keyof typeof countryMap];
        return country
          ? `https://hatscripts.github.io/circle-flags/flags/${country.code}.svg`
          : "";
      })
      .attr("width", 40)
      .attr("height", 40)
      .attr("x", -12)
      .attr("y", -12)
      .call(drag(simulation) as any);

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

      node.attr("x", (d) => d.x! - 12).attr("y", (d) => d.y! - 12);

      //   label.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    simulation.force<d3.ForceLink<Node, any>>("link")!.links(links);

    const interval = setInterval(() => {
      setYearIndex((prev) => (prev + 1) % YEARS.length);
    }, 10000);
    let tickCount = 0;
    const tickInterval = 100;
    let totalTicks = Math.ceil(10000 / tickInterval);
    const tickTimer = setInterval(() => {
      tickCount++;
      setProgress((tickCount / totalTicks) * 100);
    }, tickInterval);
    return () => {
      clearInterval(interval);
      clearInterval(tickTimer);
      tooltip.remove();
    };
  }, [yearIndex, data]);

  function drag(simulation: d3.Simulation<Node, undefined>) {
    return d3
      .drag<SVGImageElement, Node>()
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
      <div className="w-full max-w-[800px] h-2 bg-gray-300 rounded mb-2 overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <svg ref={svgRef} width={800} height={600} />

      <Link href={'/'}>
        <div className="bg-[#f0f0f0] p-2 border-lg" >Back to Home</div>
      </Link>
    </div>
  );
}
