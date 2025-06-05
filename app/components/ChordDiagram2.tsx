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
  Asia: "#FF0000", // Red
  Europe: "#0000FF", // Blue
  Africa: "#388E3C", // Green
  Americas: "#800080", // Purple
  Oceania: "#FBC02D", // Ochre (Yellow-ish)
};

const iconRegions: Record<string, string> = {
  Asia: "https://www.svgrepo.com/show/173977/world-globe-asia-view.svg",
  Europe: "https://www.svgrepo.com/show/352084/globe-europe.svg",
  Africa: "https://www.svgrepo.com/show/369332/globe-africa.svg",
  Oceania: "https://www.svgrepo.com/show/317084/continent.svg",
  Americas: "https://www.svgrepo.com/show/399370/earth-america.svg",
};

interface Props {
  matrix: number[][];
  labels: string[];
  year: string;
}

export default function ChordDiagram2({ matrix, labels, year }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  const downloadSVG = () => {
    const svg = ref.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `chord_${year}`;
    a.click();

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const width = 800;
    const height = 800;
    const totalInfluence = matrix.flat().reduce((a, b) => a + b, 0);
    const scale = d3.scaleLinear().domain([0, 200]).range([100, 400]);

    const innerRadius = scale(totalInfluence);

    console.log("Total Influence:", totalInfluence);
    console.log("Inner Radius:", innerRadius);
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

    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        const avg = (matrix[i][j] + matrix[j][i]) / 2;
        matrix[i][j] = avg;
        matrix[j][i] = avg;
      }
    }
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

    group.each(function (d) {
      const groupEl = d3.select(this);
      const name = labels[d.index];
      const angle = (d.startAngle + d.endAngle) / 2;
      const x = Math.cos(angle - Math.PI / 2) * (outerRadius + 30);
      const y = Math.sin(angle - Math.PI / 2) * (outerRadius + 30);

      if (regionColor[name]) {
        // 🌍 Region: show upright text
        groupEl
          .append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .attr("font-family", "Times New Roman")
          .attr("font-size", 18)
          // .attr(
          //   "transform",
          //   `rotate(${(angle * 180) / Math.PI - 90}, ${x}, ${y})`
          // )
          .text(name)
          .on("mouseover", (event) => {
            tooltip.style("opacity", 1).html(`<strong>${name}</strong>`);
          })
          .on("mousemove", (event) => {
            tooltip
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY + "px");
          })
          .on("mouseout", () => tooltip.style("opacity", 0));
      } else {
        // 🇺🇸 Country: show upright flag
        const code = countryNameToCode[name];
        if (code) {
          groupEl
            .append("image")
            .attr(
              "href",
              `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`
            )
            .attr("width", flagSize)
            .attr("height", flagSize)
            .attr("x", x - flagSize / 2)
            .attr("y", y - flagSize / 2)
            .on("mouseover", (event) => {
              tooltip.style("opacity", 1).html(`<strong>${name}</strong>`);
            })
            .on("mousemove", (event) => {
              tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));
        }
      }
    });

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

    return () => {
      tooltip.remove();
    };
  }, [matrix, labels]);

  return (
    <div>
      <svg ref={ref} />
      <div className="flex item-center justify-center mt-4">
        <button className="m-2 bg-[#f0f0f0] p-2 rounded-lg" onClick={downloadSVG}>
          Download SVG
        </button>
      </div>
    </div>
  );
}
