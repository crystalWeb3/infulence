"use client";
import * as d3 from "d3";
import {
  sankey,
  sankeyLinkHorizontal,
  SankeyNode,
  SankeyLink,
} from "d3-sankey";
import { countryNameToCode } from "@/utils/countryCodes";
import { useEffect, useRef } from "react";

interface SankeyInput {
  start: string;
  end: string;
  value: number;
}

interface Props {
  data: SankeyInput[];
}

export default function SankeyDiagram({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length) return;

    const width = 1400;
    const height = 600;

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    // Extract unique node names
    const nodeNames = Array.from(
      new Set(data.flatMap((d) => [d.start, d.end]))
    );

    interface SankeyNodeType extends SankeyNode<any, any> {
      name: string;
    }

    interface SankeyLinkType extends SankeyLink<any, any> {
      source: string;
      target: string;
      value: number;
    }

    const nodes: SankeyNodeType[] = nodeNames.map((name) => ({ name }));

    const links: SankeyLinkType[] = data
      .filter((d) => d.value > 0 && d.start !== d.end)
      .map((d) => ({
        source: d.start,
        target: d.end,
        value: d.value,
      }));

    // Optional: Remove mirrored/circular links
    const seen: Record<string, boolean> = {};
    const filteredLinks: SankeyLinkType[] = [];

    for (const link of links) {
      const reverseKey = `${link.target}-${link.source}`;
      if (seen[reverseKey]) continue;

      seen[`${link.source}-${link.target}`] = true;
      filteredLinks.push(link);
    }

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
        links: filteredLinks.map((d) => ({ ...d })),
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

    const flagSize = 30;

    svg
      .append("g")
      .selectAll("image")
      .data(sankeyData.nodes)
      .join("image")
      .attr("href", (d) => {
        const code = countryNameToCode[d.name];
        return code
          ? `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`
          : null;
      })
      .attr("width", flagSize)
      .attr("height", flagSize)
      .attr("x", (d) =>
        (d.x0 ?? 0) < width / 2 ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - flagSize - 6
      )
      .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2 - flagSize / 2)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 0.8);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1);
      })
      .append("title")
      .text((d) => `${d.name}\n${d.value}`);
  }, [data]);

  return <svg ref={ref}></svg>;
}
