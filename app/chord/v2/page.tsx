"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import influenceDataRawJson from "@/data/influence2.json";

// Ensure influenceDataRaw is typed as an array
const influenceDataRaw: any[] = Array.isArray(influenceDataRawJson) ? influenceDataRawJson : [];
import regionMap from "@/data/regionMap.json";

const ChordDiagram = dynamic(() => import("@/app/components/ChordDiagram2"), {
  ssr: false,
});

const regions = ["Americas", "Europe", "Asia", "Africa", "Oceania"];
const powers = [
  "United States of America",
  "Russian Federation",
  "China",
  "France",
  "Germany",
  "United Kingdom",
];
const powerToRegion = {
  "United States of America": "Americas",
  "Russian Federation": "Europe",
  China: "Asia",
  France: "Europe",
  Germany: "Europe",
  "United Kingdom": "Europe",
};
const allNodes = ["United States of America", "Americas", "France", "Germany", "United Kingdom", "Russian Federation", "Europe", "China", "Asia",  "Africa", "Oceania"];

export default function ChordHierarchyPage() {
  const [year, setYear] = useState("2023");
  const [type, setType] = useState<"a_to_b" | "b_to_a" | "net">("a_to_b");

  const processedData = useMemo(() => {
    // Create country -> region map
    const countryToRegion: Record<string, string> = {};
    for (const [region, countries] of Object.entries(regionMap)) {
      for (const country of countries) {
        countryToRegion[country] = region;
      }
    }

    // Helper: Get region group for a country or power
    const getRegionGroup = (actor: string): string => {
      if (regions.includes(actor)) return actor;
      if (powers.includes(actor)) return powerToRegion[actor as keyof typeof powerToRegion];
      return countryToRegion[actor];
    };

    // Initialize matrix
    const matrixMap: Record<string, Record<string, number>> = {};
    for (const source of allNodes) {
      matrixMap[source] = {};
      for (const target of allNodes) {
        matrixMap[source][target] = 0;
      }
    }

    // For each dyad, accumulate influence based on selected direction and year
    influenceDataRaw.forEach((d: any) => {
      let from: string, to: string, value: number;

      switch (type) {
        case "a_to_b":
          from = d.a_first;
          to = d.a_second;
          value = +d[`a_${year}`];
          break;
        case "b_to_a":
          from = d.b_first;
          to = d.b_second;
          value = +d[`b_${year}`];
          break;
        case "net":
          from = d.a_first;
          to = d.a_second;
          value = +d[`a_${year}`];
          break;
      }

      if (!from || !to) return;

      // Determine final source/target node
      const source = powers.includes(from) ? from : countryToRegion[from];
      const target = powers.includes(to) ? to : countryToRegion[to];

      // Skip if invalid mapping
      if (!allNodes.includes(source) || !allNodes.includes(target)) return;

      // Skip if both belong to same region group
      // const sourceGroup = getRegionGroup(source);
      // const targetGroup = getRegionGroup(target);
      // if (sourceGroup === targetGroup) return;

      if(source === target) return; // Skip self-loops

      matrixMap[source][target] += value;
    });

    const matrix: number[][] = allNodes.map((from) =>
      allNodes.map((to) => matrixMap[from][to] || 0)
    );

    return {
      matrix,
      labels: allNodes,
    };
  }, [year, type]);

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="flex gap-4 mb-6 items-center">
        <h1 className="text-2xl font-bold">
          Chord Diagram - Global Influence - V2
        </h1>

        <select
          className="p-2 rounded border border-gray-500"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {["1965", "1980", "1995", "2010", "2023"].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          className="p-2 rounded border border-gray-500"
          value={type}
          onChange={(e) =>
            setType(e.target.value as "a_to_b" | "b_to_a" | "net")
          }
        >
          <option value="a_to_b">Directed Dyadic Influence</option>
          <option value="net">symmetrize</option>
          {/* <option value="b_to_a">B ➝ A</option>
          <option value="net">Net (A - B)</option> */}
        </select>
      </div>

      <ChordDiagram
        matrix={processedData.matrix}
        labels={processedData.labels}
        year = {year}
        type={type}
      />

      <Link
        href="/"
        className="bg-[#f0f0f0] p-2 rounded-lg"
      >
         Go to Home
      </Link>
    </div>
  );
}
