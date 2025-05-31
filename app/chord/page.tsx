"use client";
import dynamic from "next/dynamic";
import top6data from "@/data/influence.json";

import worldDataRaw from "@/data/influence2.json";
import { useMemo, useState } from "react";
import Link from "next/link";

import {
  getTopCountries,
  getNatoCountries,
  getBricsCountries,
  getCountriesByContinent,
} from "@/utils/getTopCountries";

const ChordDiagram = dynamic(() => import("../components/ChordDiagram"), {
  ssr: false,
});

export default function ChordPage() {
  const [year, setYear] = useState("2023");
  const [type, setType] = useState<"a_to_b" | "b_to_a" | "net">("b_to_a");
  const [topNum, setTopNum] = useState("10");

  const [sourceType, setSourceType] = useState<string>("power6");

  // Ensure worldData is an array
  const worldData = worldDataRaw as Array<any>;

  const data = useMemo(() => {
    let countries = [];
    let countriesNames: string[] = [];
    if (sourceType === "power6") {
      return top6data;
    } else {
      if (sourceType === "top") {
        countries = getTopCountries(Number(year), Number(topNum)); // { name, value }
        countriesNames = countries.map((d) => d.name);
      } else if (sourceType === "nato") {
        countries = getNatoCountries(Number(year));
        countriesNames = countries.map((d) => d.name);
      } else if (sourceType === "brics") {
        countries = getBricsCountries(Number(year));
        countriesNames = countries.map((d) => d.name);
      } else {
        countries = getCountriesByContinent(Number(year), sourceType);
        countriesNames = countries.map((d) => d.name);
      }
      let influenceData = worldData.filter(
        (d: any) =>
          countriesNames.includes(d.a_first) &&
          countriesNames.includes(d.a_second)
      );

      return influenceData;
    }
  }, [sourceType, year, type, topNum]);

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="flex gap-5 items-center mb-8">
        <h1 className="text-2xl font-bold ">Chord Diagram - Influence</h1>
        <select
          className=" p-2 rounded border border-gray-500"
          onChange={(e) => setYear(e.target.value)}
          value={year}
        >
          <option value="2023">2023</option>
          <option value="2010">2010</option>
          <option value="1995">1995</option>
          <option value="1980">1980</option>
          <option value="1965">1965</option>
        </select>

        <select
          className=" p-2 rounded border border-gray-500"
          onChange={(e) =>
            setType(e.target.value as "a_to_b" | "b_to_a" | "net")
          }
          value={type}
        >
          <option value="a_to_b">Directed Dyadic Influence</option>
          <option value="net">Net Influence</option>
        </select>

        <select
          className=" p-2 rounded border border-gray-500"
          onChange={(e) => setSourceType(e.target.value)}
          value={sourceType}
        >
          <option value="power6">6 Power Countries</option>
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
      </div>

      <ChordDiagram type={type} data={data} year={year} />

      <Link href={"/"}>
        <div className="bg-[#f0f0f0] p-2 rounded-lg">Go to Home</div>
      </Link>
    </div>
  );
}
