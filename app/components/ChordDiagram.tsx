"use client";
import * as d3 from "d3";
import { chord, ribbon, Chord, ChordSubgroup } from "d3-chord";
import { arc, Arc } from "d3-shape";
import { useEffect, useRef } from "react";

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

    const flags = [
      { name: "United States of America", code: "us", color: "#3C3B6E" },
      { name: "United Kingdom", code: "gb", color: "#CF142B" },
      { name: "France", code: "fr", color: "#0055A4" },
      { name: "Germany", code: "de", color: "#000000" },
      { name: "Russian Federation", code: "ru", color: "#3F6DB3" },
      { name: "China", code: "cn", color: "#DE2910" },
    ];

    const colorMap = new Map(flags.map((f) => [f.name, f.color]));
    const flagMap = new Map(
      flags.map((f) => [f.name, `https://hatscripts.github.io/circle-flags/flags/${f.code}.svg`])
    );

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`);

    svg.selectAll("*").remove();

    const countries = Array.from(new Set(data.flatMap((d) => [d.a_first, d.a_second])));
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
        matrix[i][j] =  Math.max(0, netVal);
      }

    }

    const chords = chord()(matrix);

    const arcGen: Arc<any, d3.ChordGroup> = arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const group = svg.append("g").selectAll("g").data(chords.groups).join("g");

    group
      .append("path")
      .attr("fill", (d) => colorMap.get(countries[d.index]) || "#ccc")
      .attr("stroke", "#fff")
      .attr("d", arcGen);

    const flagSize = 30;
    group
      .append("image")
      .attr("href", (d) => flagMap.get(countries[d.index]) || "")
      .attr("width", flagSize)
      .attr("height", flagSize)
      .attr("x", -flagSize / 2)
      .attr("y", -flagSize / 2)
      .attr("transform", (d) => {
        const angle = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
        const x = Math.cos(angle) * (outerRadius + 15);
        const y = Math.sin(angle) * (outerRadius + 15);
        return `translate(${x},${y})`;
      });

    const ribbonGen = ribbon<Chord, ChordSubgroup>().radius(innerRadius);

    svg
      .append("g")
      .attr("fill-opacity", 0.7)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", (d) => ribbonGen(d)!)
      .attr("fill", (d) => colorMap.get(countries[d.source.index]) || "#999")
      .attr("stroke", "#999");
  }, [data, year, type]);

  return <svg ref={ref} />;
}
