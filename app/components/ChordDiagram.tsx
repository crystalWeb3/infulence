"use client";
import * as d3 from "d3";
import { chord, ribbon, Chord, ChordSubgroup } from "d3-chord";
import { arc, Arc } from "d3-shape";
import { useEffect, useRef } from "react";
import { countryNameToCode } from "@/utils/countryCodes";
import { countryNameToColor } from "@/utils/countryColors";

interface InfluenceEntry {
  a_first: string;
  a_second: string;
  [key: `a_${string}` | `b_${string}` | `c_${string}`]: number | string;
}

interface Props {
  data: InfluenceEntry[];
  year: string;
  type: "a_to_b" | "b_to_a" | "net";
}

export default function ChordDiagram({ data, year, type }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const width = 700;
    const height = 700;
    const innerRadius = Math.min(width, height) * 0.4;
    const outerRadius = innerRadius + 10;

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`);

    svg.selectAll("*").remove();

    // Tooltip div
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "6px 10px")
      .style("background", "rgba(0,0,0,0.75)")
      .style("color", "#fff")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("font-size", "14px")
      .style("z-index", "1000")
      .style("opacity", 0);

    const countries = Array.from(
      new Set(data.flatMap((d) => [d.a_first, d.a_second]))
    );
    const indexMap = new Map(countries.map((c, i) => [c, i]));
    const matrix = Array.from({ length: countries.length }, () =>
      new Array(countries.length).fill(0)
    );

    for (const entry of data) {
      const from = entry.a_first;
      const to = entry.a_second;
      const i = indexMap.get(from)!;
      const j = indexMap.get(to)!;

      const aVal = Number(entry[`a_${year}`] ?? 0);
      const bVal = Number(entry[`b_${year}`] ?? 0);
      const netVal = Number(entry[`c_${year}`] ?? 0);

      if (type === "a_to_b") {
        matrix[i][j] = aVal;
      } else if (type === "b_to_a") {
        matrix[j][i] = bVal;
      } else if (type === "net") {
        matrix[i][j] = Math.max(0, netVal);
      }
    }

    const chords = chord()(matrix);

    const arcGen: Arc<any, d3.ChordGroup> = arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const group = svg.append("g").selectAll("g").data(chords.groups).join("g");

    // Arcs with tooltips
    group
      .append("path")
      .attr("fill", (d) => countryNameToColor[countries[d.index]] || "#ccc")
      .attr("stroke", "#fff")
      .attr("d", arcGen)
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${countries[d.index]}</strong>`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Flags
    const flagSize = 30;
    group
      .append("image")
      .attr(
        "href",
        (d) =>
          `https://hatscripts.github.io/circle-flags/flags/${
            countryNameToCode[countries[d.index]]
          }.svg`
      )
      .attr("width", flagSize)
      .attr("height", flagSize)
      .attr("x", -flagSize / 2)
      .attr("y", -flagSize / 2)
      .attr("transform", (d) => {
        const angle = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
        const x = Math.cos(angle) * (outerRadius + 15);
        const y = Math.sin(angle) * (outerRadius + 15);
        return `translate(${x},${y})`;
      })
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${countries[d.index]}</strong>`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    const ribbonGen = ribbon<Chord, ChordSubgroup>().radius(innerRadius);

    svg
      .append("g")
      .attr("fill-opacity", 0.7)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", (d) => ribbonGen(d)!)
      .attr(
        "fill",
        (d) => countryNameToColor[countries[d.source.index]] || "#999"
      )
      .attr("stroke", "#999")
      .on("mouseover", (event, d) => {
        const source = countries[d.source.index];
        const target = countries[d.target.index];
        const value = matrix[d.source.index][d.target.index];
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${source} → ${target}</strong><br/>Influence: ${value}`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    return () => {
      tooltip.remove(); // Cleanup on unmount
    };
  }, [data, year, type]);

  return <svg ref={ref} />;
}
