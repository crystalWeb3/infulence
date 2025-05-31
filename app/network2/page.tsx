"use client";

import InfluenceNetworkGraph from "../components/InfluenceNetworkGraph";
import influenceDataRaw from "@/data/influence2.json";

const influenceData: any[] = influenceDataRaw as any[];
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

export default function InfluenceNetworkPage() {
  const [type, setType] = useState("top");
  const [year, setYear] = useState("2023");
  const [topNum, setTopNum] = useState("10");
  const [colorStyle, setColorStyle] = useState("continent");

  const [net, setNet] = useState("atob");

  const [visibleLimit, setVisibleLimit] = useState(0.1);

  const { nodes, links } = useMemo(() => {
    let countries = [];
    let countriesNames = [];
    if (type === "top") {
      countries = getTopCountries(Number(year), Number(topNum)); // { name, value }
      countriesNames = countries.map((d) => d.name);
    } else if (type === "nato") {
      countries = getNatoCountries(Number(year));
      countriesNames = countries.map((d) => d.name);
    } else if (type === "brics") {
      countries = getBricsCountries(Number(year));
      countriesNames = countries.map((d) => d.name);
    } else {
      countries = getCountriesByContinent(Number(year), type);
      countriesNames = countries.map((d) => d.name);
    }

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
      group: getCountryGroup(id), // e.g., "Asia", "BRICS"
      continent: getContinentByCountry(id) || "Other",
    }));

    let b = "a_";
    if (net === "btoa") b = "b_";
    if (net === "net") b = "c_";

    let yearkey = b + year;
    const rawLinks = filteredData.filter(
      (d: any) => d[yearkey] >= visibleLimit
    );

    // Get min and max for color scale
    const values = rawLinks.map((d: any) => d[yearkey]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    let onePartSize = (maxValue - minValue) / 6;

    let colors = [
      "#ff1212", // strongest
      "#eabc4b",
      "#4be0ea",
      "#FC4E2A",
      "#7c93d8",
      "#c4c4c4", // weakest
    ];

    const links = rawLinks.map((d: any) => {
      let color;
      if (colorStyle === "continent") {
        let continent1 = getContinentByCountry(d.a_first);

        switch (continent1) {
          case "Asia":
            color = "#00A86B";
            break;
          case "Europe":
            color = "#AA2910";
            break;
          case "Africa":
            color = "#4be0ea";
            break;
          case "NorthAmerica":
            color = "#3C3B6E";
            break;
          case "SouthAmerica":
            color = "#009739";
            break;
          case "Oceania":
            color = "#c4c4c4";
            break;
          default:
            color = "#c4c4c4"; // Other
        }
      } else if (colorStyle === "influence") {
        // console.log(Math.floor((d[yearkey] - minValue) / onePartSize) - 1)
        color = colors[Math.floor((d[yearkey] - minValue) / onePartSize)];
      }

      let opt = 100;
      let smallpart = (maxValue - minValue) / 3;

      if (d[yearkey] < smallpart) {
        opt = 80;
      } else if (d[yearkey] < smallpart * 2) {
        opt = 90;
      }

      if (opt !== 100) color = color + opt.toString();

      // console.log(color)

      return {
        source: d.a_first,
        target: d.a_second,
        value: d[yearkey],
        color: color,
        group:
          getCountryGroup(d.a_first) === getCountryGroup(d.a_second)
            ? getCountryGroup(d.a_first)
            : "Mixed",
      };
    });

    return { nodes, links };
  }, [year, topNum, type, visibleLimit, net, colorStyle]);

  return (
    <main>

      <div className=" bg-[#a0a0a0] rounded-lg ml-3 p-1 shadow-lg absolute top-[10px] z-10">
      
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
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="20">20</option>
          <option value="25">25</option>
          <option value="30">30</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>

        <select
          className="p-2 rounded border border-gray-500"
          onChange={(e) => setType(e.target.value)}
        >
          <option value="top">Top Countries</option>
          <option value="nato">Nato</option>
          <option value="brics">BRICS</option>
          <option value="North America">North America</option>
          <option value="South America">South America</option>
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
          <option value="continent">Continent</option>
          <option value="influence">Influence Level</option>
        </select>

        <input
          type="number"
          className="p-2 rounded border border-gray-500 w-[100px]"
          placeholder="Visible Limit"
          value={visibleLimit}
          onChange={(e) => setVisibleLimit(Number(e.target.value))}
        />

        <Link href = "/">
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
