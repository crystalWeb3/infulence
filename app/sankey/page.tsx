"use client";
import dynamic from "next/dynamic";
import worldDataRaw from "@/data/influence2.json";
import Link from "next/link";
import { useState, useMemo } from "react";

import {
  getTopCountries,
  getNatoCountries,
  getBricsCountries,
  getCountriesByContinent,
} from "@/utils/getTopCountries";

const SankeyDiagram = dynamic(() => import("../components/SanKeyDiagram"), {
  ssr: false,
});

export default function SankeyPage() {
  const [year, setYear] = useState("2023");
  const [topNum, setTopNum] = useState("10");
  const [sourceType, setSourceType] = useState<string>("top");
  const [direction, setDirection] = useState<"atob" | "btoa" | "net">("atob");

  const worldData = worldDataRaw as Array<any>;

  const data = useMemo(() => {
    let countries = [];
    let countriesNames: string[] = [];
    const key =
      direction === "atob"
        ? `a_${year}`
        : direction === "btoa"
        ? `b_${year}`
        : `c_${year}`;

    if (sourceType === "top") {
      countries = getTopCountries(Number(year), Number(topNum));
      

      
    } else if (sourceType === "nato") {
      countries = getNatoCountries(Number(year));
    } else if (sourceType === "brics") {
      countries = getBricsCountries(Number(year));
    } else {
      countries = getCountriesByContinent(Number(year), sourceType);
    }

    const influenceMap: Record<string, number> = {};
    countries.forEach((country) => {
      const name = country.name;
      const totalInfluence = worldData
        .filter(
          (d) =>
            (d.a_first === name &&
              countries.some((c) => c.name === d.a_second)) ||
            (d.a_second === name && countries.some((c) => c.name === d.a_first))
        )
        .reduce((sum, d) => sum + (Number(d[key]) || 0), 0);
      influenceMap[name] = totalInfluence;
    });
    let mid_countries = countries
      .sort((a, b) => (influenceMap[b.name] || 0) - (influenceMap[a.name] || 0))
      .slice(0, Number(topNum));

    countriesNames = mid_countries.map((d) => d.name);

    const influenceData = worldData
      .filter(
        (d: any) =>
          countriesNames.includes(d.a_first) &&
          countriesNames.includes(d.a_second)
      )
      .map((d) => ({
        start: d.a_first,
        end: d.a_second,
        value: Number(d[key]) || 0,
      }))
      .filter((d) => d.value > 0 && d.start !== d.end)
      .sort((a, b) => {
        const aStartIndex = countriesNames.indexOf(a.start);
        const bStartIndex = countriesNames.indexOf(b.start);
        if (aStartIndex !== bStartIndex) {
          return aStartIndex - bStartIndex;
        }
        // If start is the same, use end to determine order
        const aEndIndex = countriesNames.indexOf(a.end);
        const bEndIndex = countriesNames.indexOf(b.end);
        return aEndIndex - bEndIndex;
      });

    console.log(influenceData);

    return influenceData;
  }, [year, topNum, sourceType, direction]);

  return (
    <div className="flex flex-col items-center p-8">
      <div className="flex flex-wrap gap-3 justify-center items-center mb-6">
        <h1 className="text-2xl font-bold">Sankey Diagram</h1>

        <select
          className="p-2 rounded border"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {["2023", "2010", "1995", "1980", "1965"].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded border"
          value={topNum}
          onChange={(e) => setTopNum(e.target.value)}
        >
          {["10", "15", "20", "25", "30", "50", "100"].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded border"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
        >
          <option value="top">Top Countries</option>
          <option value="nato">NATO</option>
          <option value="brics">BRICS</option>
          <option value="NorthAmerica">North America</option>
          <option value="SouthAmerica">South America</option>
          <option value="Asia">Asia</option>
          <option value="Europe">Europe</option>
          <option value="Africa">Africa</option>
          <option value="Oceania">Oceania</option>
        </select>

        <select
          className="p-2 rounded border"
          value={direction}
          onChange={(e) => setDirection(e.target.value as any)}
        >
          <option value="atob">Directed Dyadic Influence A</option>
          <option value="btoa">Directed Dyadic Influence B</option>
          <option value="net">Net Influence</option>
        </select>
      </div>

      <SankeyDiagram data={data} />

      <Link href={"/"}>
        <div className="mt-6 w-[200px] bg-gray-200 p-2 text-center rounded shadow hover:bg-gray-300">
          Back to Home
        </div>
      </Link>
    </div>
  );
}
