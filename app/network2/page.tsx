"use client";

import InfluenceNetworkGraph from "../components/InfluenceNetworkGraph";
import influenceDataRaw from "@/data/influence2.json";

import {
  getTopCountries,
  getNatoCountries,
  getBricsCountries,
  getCountriesByContinent,
} from "@/utils/getTopCountries";
import {
  getContinentByCountry,
  getCountryGroup,
} from "@/utils/getCountryGroup";

import { useMemo, useState } from "react";
import Link from "next/link";
import { scaleQuantile } from "d3-scale";

export default function InfluenceNetworkPage() {
  const [type, setType] = useState("top");
  const [year, setYear] = useState("2023");
  const [topNum, setTopNum] = useState("100");
  const [colorStyle, setColorStyle] = useState("influence");
  const [net, setNet] = useState("atob");
  const [visibleLimit, setVisibleLimit] = useState(0.1);

  const influenceData: any[] = influenceDataRaw as any[];

  const { nodes, links } = useMemo(() => {
    let countries = [];
    let countriesNames = [];

    if (type === "top") {
      countries = getTopCountries(Number(year), Number(topNum));
    } else if (type === "nato") {
      countries = getNatoCountries(Number(year));
    } else if (type === "brics") {
      countries = getBricsCountries(Number(year));
    } else {
      countries = getCountriesByContinent(Number(year), type);
    }
    countriesNames = countries.map((d) => d.name);
    const influenceMap = new Map(countries.map((d) => [d.name, d.value]));

    const filteredData = influenceData.filter(
      (d: any) =>
        countriesNames.includes(d.a_first) &&
        countriesNames.includes(d.a_second)
    );

    const nodeSet = new Set<string>();
    filteredData.forEach((d: any) => {
      nodeSet.add(d.a_first);
      nodeSet.add(d.a_second);
    });

    const nodes = Array.from(nodeSet).map((id) => ({
      id,
      value: influenceMap.get(id) ?? 1,
      group: getCountryGroup(id),
      continent: getContinentByCountry(id) || "Other",
    }));

    let b = "a_";
    if (net === "btoa") b = "b_";
    if (net === "net") b = "c_";
    const yearkey = b + year;

    // Get min and max influence from full dataset
    const allValues = influenceData
      .map((d: any) => d[yearkey])
      .filter((v) => typeof v === "number" && !isNaN(v));

    const baseColors = [
      "#9f9faf20",
      "#03adfc30",
      "#03adfc90",
      "#ff0000",
      "#ff0000",
      "#ff0000",
    ];
    const solidbaseColors = [
      "#03adfc20",
      "#03adfc60",
      "#03adfc90",
      "#03adfc95",
      "#03adfc98",
      "#03adfc",
    ];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const logMin = Math.log(minValue + 1e-6); // avoid log(0)
    const logMax = Math.log(maxValue);
    const logBucketSize = (logMax - logMin) / baseColors.length;

    const colorQuantile = scaleQuantile<string>()
      .domain([minValue, maxValue])
      .range(baseColors);

    const colorQuantileBySolid = scaleQuantile<string>()
      .domain([minValue, maxValue])
      .range(solidbaseColors);

    function getColorByInfluence(val: number): string {
      return colorQuantile(val);
    }

    function getColorBySolid(val: number): string {
      return colorQuantileBySolid(val);
    }
    function hexToRgba(hex: string, alpha: number) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const rawLinks = filteredData.filter(
      (d: any) => d[yearkey] >= visibleLimit
    );

    const links = rawLinks.map((d: any) => {
      const val = d[yearkey];
      let baseColor = "#c4c4c4";

      if (colorStyle === "continent") {
        const continent1 = getContinentByCountry(d.a_first);
        switch (continent1) {
          case "Asia":
            baseColor = "#00A86B";
            break;
          case "Europe":
            baseColor = "#AA2910";
            break;
          case "Africa":
            baseColor = "#4be0ea";
            break;
          case "NorthAmerica":
            baseColor = "#3C3B6E";
            break;
          case "SouthAmerica":
            baseColor = "#009739";
            break;
          case "Oceania":
            baseColor = "#c4c4c4";
            break;
          default:
            baseColor = "#c4c4c4";
        }
      } else if (colorStyle === "influence") {
        baseColor = getColorByInfluence(val);
      } else if (colorStyle === "solid") {
        baseColor = getColorBySolid(val);
      }

      // const opacity =
      //   val < (maxValue - minValue) / 3
      //     ? 0.8
      //     : val < ((maxValue - minValue) * 2) / 3
      //     ? 0.9
      //     : 1.0;

      // const color =
      //   colorStyle === "influence" ? hexToRgba(baseColor, opacity) : baseColor;

      return {
        source: d.a_first,
        target: d.a_second,
        value: val,
        color: baseColor,
        group:
          getCountryGroup(d.a_first) === getCountryGroup(d.a_second)
            ? getCountryGroup(d.a_first)
            : "Mixed",
      };
    });

    const connectedNodeIds = new Set(
      links.flatMap((link) => [link.source, link.target])
    );
    const filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));

    return { nodes: filteredNodes, links };
  }, [year, topNum, type, visibleLimit, net, colorStyle]);

  return (
    <main>
      <div className="bg-[#a0a0a0] rounded-lg ml-3 p-1 shadow-lg absolute top-[10px] z-10">
        <span className="flex flex-wrap gap-2 items-center justify-center">
          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="2023">2023</option>
            <option value="2010">2010</option>
            <option value="1995">1995</option>
            <option value="1980">1980</option>
            <option value="1965">1965</option>
          </select>

          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setTopNum(e.target.value)}
          >
            <option value="100">100</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value="25">25</option>
            <option value="30">30</option>
            <option value="50">50</option>
            
          </select>

          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setType(e.target.value)}
          >
            <option value="top">Top Countries</option>
            <option value="nato">Nato</option>
            <option value="brics">BRICS</option>
            <option value="NorthAmerica">North America</option>
            <option value="SouthAmerica">South America</option>
            <option value="Asia">Asia</option>
            <option value="Europe">Europe</option>
            <option value="Africa">Africa</option>
            <option value="Oceania">Oceania</option>
          </select>

          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setNet(e.target.value)}
          >
            <option value="atob">Directed Dyadic Influence A</option>
            <option value="btoa">Directed Dyadic Influence B</option>
            <option value="net">Net influence</option>
          </select>

          <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setColorStyle(e.target.value)}
          >
            <option value="influence">Influence Level</option>
            <option value="solid">Solid</option>
            
            <option value="continent">Continent</option>
          </select>

           <select
            className="p-2 rounded border border-gray-500"
            onChange={(e) => setVisibleLimit(Number(e.target.value))}
          >
            <option value="0.1">0.1</option>
            <option value="0.2">0.2</option>            
            <option value="0.15">0.15</option>            
            <option value="0.25">0.25</option>
            <option value="0.3">0.3</option>
            <option value="0.35">0.35</option>
          </select>

          <Link href="/">
            <span className="text-center bg-[#f0f0f0] p-2 rounded-lg">
              Back to Home
            </span>
          </Link>
        </span>
      </div>

      <div className="relative">
        <InfluenceNetworkGraph allview={type} nodes={nodes} links={links} />
      </div>
    </main>
  );
}
