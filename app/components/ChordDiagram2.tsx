"use client";
import * as d3 from "d3";
import { chord, ribbon, Chord, ChordSubgroup } from "d3-chord";
import { arc, Arc } from "d3-shape";
import { useEffect, useRef } from "react";
import { countryNameToCode } from "@/utils/countryCodes";
import { countryNameToColor } from "@/utils/countryColors"; // NEW IMPORT

const powerToRegion: Record<string, string> = {
  "United States of America": "Americas",
  "Russian Federation": "Europe",
  China: "Asia",
  France: "Europe",
  Germany: "Europe",
  "United Kingdom": "Europe",
};

const regionColor: Record<string, string> = {
  Asia: "#00A86B",
  Europe: "#AA2910",
  Africa: "#4be0ea",
  Oceania: "#c4c4c4",
  Americas: "#3C3B6E",
};

const iconRegions: Record<string, string> = {
  Asia: "https://www.svgrepo.com/show/173977/world-globe-asia-view.svg",
  Europe:
    "https://www.svgrepo.com/show/352084/globe-europe.svg",
  Africa:
    "https://www.svgrepo.com/show/369332/globe-africa.svg",
  Oceania: "https://www.svgrepo.com/show/317084/continent.svg",
  Americas: "https://www.svgrepo.com/show/399370/earth-america.svg",
};

interface Props {
  matrix: number[][];
  labels: string[];
}

export default function ChordDiagram2({ matrix, labels }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const width = 800;
    const height = 800;
    const innerRadius = Math.min(width, height) * 0.4;
    const outerRadius = innerRadius + 10;

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`);

    svg.selectAll("*").remove();

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

    const chords = chord().padAngle(0.03).sortSubgroups(d3.descending)(matrix);

    const arcGen: Arc<any, d3.ChordGroup> = arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const group = svg.append("g").selectAll("g").data(chords.groups).join("g");

    const getColor = (name: string): string => {
      if (regionColor[name]) return regionColor[name];
      const region = powerToRegion[name];
      return regionColor[region] || "#c4c4c4";
    };

    // Arcs
    group
      .append("path")
      .attr("fill", (d) => getColor(labels[d.index]))
      .attr("stroke", "#fff")
      .attr("d", arcGen)
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1).html(`<strong>${labels[d.index]}</strong>`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    // Flags
    const flagSize = 30;

    group
  .append("image")
  .attr("href", (d) => {
    const name = labels[d.index];
    const code = countryNameToCode[name];
    const regionIcon = iconRegions[name];

    if (regionIcon) return regionIcon;

    return code
      ? `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`
      : `/flags/${name.replaceAll(" ", "_").toLowerCase()}.svg`;
  })
  .attr("width", flagSize)
  .attr("height", flagSize)
  .attr("x", -flagSize / 2)
  .attr("y", -flagSize / 2)
  .attr("transform", (d) => {
    const angle = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
    const x = Math.cos(angle) * (outerRadius + 18);
    const y = Math.sin(angle) * (outerRadius + 18);
    return `translate(${x},${y})`;
  })
  .on("mouseover", (event, d) => {
    tooltip
      .style("opacity", 1)
      .html(`<strong>${labels[d.index]}</strong>`);
  })
  .on("mousemove", (event) => {
    tooltip
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY + "px");
  })
  .on("mouseout", () => tooltip.style("opacity", 0));

    // Ribbons
    const ribbonGen = ribbon<Chord, ChordSubgroup>().radius(innerRadius);
    svg
      .append("g")
      .attr("fill-opacity", 0.75)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbonGen)
      .attr("fill", (d) => {
        const from = labels[d.source.index];
        return countryNameToColor[from] || getColor(from);
      })
      .attr("stroke", "#00000022")
      .on("mouseover", (event, d) => {
        const from = labels[d.source.index];
        const to = labels[d.target.index];
        const value = matrix[d.source.index][d.target.index].toFixed(2);
        tooltip
          .style("opacity", 1)
          .html(`<strong>${from} → ${to}</strong><br/>Influence: ${value}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    return () => { tooltip.remove(); };
  }, [matrix, labels]);

  return <svg ref={ref} />;
}
