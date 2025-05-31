"use client";
import * as d3 from "d3";
import {
  sankey,
  sankeyLinkHorizontal,
  SankeyNode,
  SankeyLink,
} from "d3-sankey";
import { useEffect, useRef } from "react";

interface InfluenceEntry {
  a_first: string;
  a_second: string;
  [key: `a_${string}` | `b_${string}` | `c_${string}`]: number | string;
}

interface Props {
  data: InfluenceEntry[];
  year: string;
}

export default function SankeyDiagram({ data, year }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length) return;

    const width = 900;
    const height = 600;

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    // Extract unique nodes
    const nodesSet = new Set<string>();
    data.forEach((d) => {
      nodesSet.add(d.a_first);
      nodesSet.add(d.a_second);
    });

    const nodeNames = Array.from(nodesSet);

    interface SankeyNodeType extends SankeyNode<any, any> {
      name: string;
    }

    interface SankeyLinkType extends SankeyLink<any, any> {
      source: string;
      target: string;
      value: number;
    }

    const nodes: SankeyNodeType[] = nodeNames.map((name) => ({ name }));

    const rawLinks: SankeyLinkType[] = data
      .map((d) => {
        const val = Number(d[`a_${year}`]);
        return {
          source: d.a_first,
          target: d.a_second,
          value: isNaN(val) ? 0 : val,
        };
      })
      .filter((l) => l.value > 0 && l.source !== l.target);

    const validLinks = rawLinks.filter(
      (l) => nodeNames.includes(l.source) && nodeNames.includes(l.target)
    );

    let flg: Record<string, boolean> = {};
    let nonCircularLinks = [];
    for(let i = 0; i < validLinks.length; i++) {
      let key = `${validLinks[i].target}-${validLinks[i].source}`;

      if(flg[key]) continue;
      nonCircularLinks.push(validLinks[i]);
      flg[`${validLinks[i].source}-${validLinks[i].target}`] = true;

    }

    console.log(nonCircularLinks)
    const sankeyGenerator = sankey<SankeyNodeType, SankeyLinkType>()
      .nodeWidth(20)
      .nodePadding(20)
      .extent([
        [1, 1],
        [width - 1, height - 6],
      ])
      .nodeId((d) => d.name);

    let sankeyData;
    try {
      sankeyData = sankeyGenerator({
        nodes: nodes.map((d) => ({ ...d })),
        links: nonCircularLinks.map((d) => ({ ...d })),
      });
    } catch (e) {
      console.error("Sankey layout error:", e);
      return;
    }

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // Draw nodes
    svg
      .append("g")
      .selectAll("rect")
      .data(sankeyData.nodes)
      .join("rect")
      .attr("x", (d) => d.x0 ?? 0)
      .attr("y", (d) => d.y0 ?? 0)
      .attr("height", (d) => Math.max(0, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr("width", (d) => Math.max(0, (d.x1 ?? 0) - (d.x0 ?? 0)))
      .attr("fill", (d) => color(d.name))
      .append("title")
      .text((d) => `${d.name}\n${d.value}`);

    // Draw links
    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("path")
      .data(sankeyData.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d) => color((d.source as SankeyNodeType).name))
      .attr("stroke-width", (d) => Math.max(1, d.width ?? 1))
      .append("title")
      .text((d) => {
        const source = d.source as SankeyNodeType;
        const target = d.target as SankeyNodeType;
        return `${source.name} → ${target.name}\n${d.value}`;
      });

    // Add labels
    svg
      .append("g")
      .style("font", "12px sans-serif")
      .selectAll("text")
      .data(sankeyData.nodes)
      .join("text")
      .attr("x", (d) =>
        (d.x0 ?? 0) < width / 2 ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6
      )
      .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) =>
        (d.x0 ?? 0) < width / 2 ? "start" : "end"
      )
      .text((d) => d.name);
  }, [data, year]);

  return <svg ref={ref}></svg>;
}
