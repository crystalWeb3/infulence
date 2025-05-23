"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const WorldMap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const flags = [
      {
        name: "USA",
        code: "us",
        coords: [-77.0369, 38.9072],
        data: [20.913, 25.679, 24.418, 25.601, 27.894],
        offset: [-20, 30],
      },
      {
        name: "UK",
        code: "gb",
        coords: [-0.1276, 51.5074],
        data: [9.155, 14.16, 11.152, 10.144, 9.079],
        offset: [-100, -90],
      },
      {
        name: "France",
        code: "fr",
        coords: [2.3522, 48.8566],
        data: [8.71, 16.855, 15.085, 13.231, 14.054],
        offset: [-100, 30],
      },
      {
        name: "Germany",
        code: "de",
        coords: [13.405, 52.52],
        data: [5.732, 15.119, 14.101, 18.439, 17.321],
        offset: [20, 20],
      },
      {
        name: "Russia",
        code: "ru",
        coords: [37.6173, 55.7558],
        data: [5.791, 8.606, 5.18, 8.218, 8.906],
        offset: [20, -90],
      },
      {
        name: "China",
        code: "cn",
        coords: [116.4074, 39.9042],
        data: [0.156, 1.984, 3.558, 13.179, 19.623],
        offset: [-20, 30],
      },
    ];

    const years = [1965, 1980, 1995, 2010, 2023];

    const drawBarChart = (
      container: d3.Selection<SVGGElement, unknown, null, undefined>,
      data: number[],
      x: number,
      y: number
    ) => {
      const chartW = 100;
      const chartH = 60;
      const margin = { top: 10, right: 10, bottom: 12, left: 15 };

      const g = container
        .append("g")
        .attr("transform", `translate(${x}, ${y})`);

      const xScale = d3
        .scaleBand()
        .domain(years.map(String))
        .range([0, chartW])
        .padding(0.1);
      const yScale = d3
        .scaleLinear()
        .domain([0, 30])
        .nice()
        .range([chartH, 0]);

      g.append("rect")
        .attr("width", chartW + margin.left + margin.right)
        .attr("height", chartH + margin.top + margin.bottom)
        .attr("x", -margin.left)
        .attr("y", -margin.top)
        .attr("rx", 10)
        .attr("fill", "white")
        .attr("stroke", "#ccc")
        .attr("opacity", 0.95);

      g.selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", (_, i) => xScale(String(years[i]))!)
        .attr("y", (d) => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => chartH - yScale(d))
        .attr("fill", "#6600ff");

      const yAxis = d3.axisLeft(yScale).ticks(3).tickSize(0);
      g.append("g")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "9px");

      const xAxis = d3
        .axisBottom(xScale)
        .tickFormat((d) => `'${d.toString().slice(2)}`)
        .tickSize(0);
      g.append("g")
        .attr("transform", `translate(0,${chartH})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "9px");
    };

    const svg = d3.select(svgRef.current as SVGSVGElement);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const projection = d3
      .geoMercator()
      .scale(width / 7)
      .translate([width / 2, height / 1.5]);

    const pathGenerator = d3.geoPath().projection(projection);

    console.log(pathGenerator);

    // Add a group to apply zoom/pan transforms
    svg.selectAll("*").remove(); // clear existing
    svg.attr("width", width).attr("height", height);
    const zoomGroup = svg.append("g").attr("class", "zoom-group");

    d3.json("/world-geojson.json").then((data: any) => {
      if (!data?.features) return;

      // Draw countries
      zoomGroup
        .selectAll(".country")
        .data(data.features)
        .join("path")
        .attr("class", "country")
        .attr("d", pathGenerator)
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#999");

      // Draw flags
      zoomGroup
        .selectAll(".flag")
        .data(flags)
        .join("image")
        .attr("class", "flag")
        .attr("href", (d) => `https://hatscripts.github.io/circle-flags/flags/${d.code}.svg`)
        .attr("x", (d) => {
          const [x] = projection(d.coords as [number, number]) ?? [0, 0];
          return x - 12;
        })
        .attr("y", (d) => {
          const [, y] = projection(d.coords as [number, number]) ?? [0, 0];
          return y - 12;
        })
        .attr("width", 24)
        .attr("height", 24)
        .attr("clip-path", "circle(12px at 12px 12px)");

      // Draw bar charts
      flags.forEach((country) => {
        const [x, y] = projection(country.coords as [number, number]) ?? [0, 0];
        const offset = country.offset as [number, number];
        drawBarChart(zoomGroup, country.data, x + offset[0], y + offset[1]);
      });
    });

    // Add zoom behavior
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 8])
        .on("zoom", (event) => {
          zoomGroup.attr("transform", event.transform);
        })
    );
  }, []);

  return (
    <svg
      ref={svgRef}
      className="fixed top-0 left-0 w-full h-full z-0" // allow pointer events for zoom
    />
  );
};

export default WorldMap;
