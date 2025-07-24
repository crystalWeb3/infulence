"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import Select from "react-select";
import influenceDataRawJsonRaw from "@/data/influence2.json";
const influenceDataRawJson: Array<any> = Array.isArray(influenceDataRawJsonRaw) ? influenceDataRawJsonRaw : [];
import regionMap from "@/data/regionMap.json";
import { getContinentByCountry } from "@/utils/getCountryGroup";
import { getAllCountries } from "@/utils/getTopCountries";

const ChordDiagram = dynamic(() => import("@/app/components/ChordDiagram2"), {
  ssr: false,
});

// Main region order
const regions = ["Asia", "Europe", "Africa", "Americas", "Oceania"];
const powers = [
  "United States of America",
  "Russian Federation",
  "China",
  "France",
  "Germany",
  "United Kingdom",
];

// Get all countries present in the current year (for filtering)
const getCountriesThisYear = (year: string | number) =>
  getAllCountries(Number(year))
    .map((c) => c.name)
    .filter((c) => !regions.includes(c));

// Helper: For a node (country or region), get constituent countries
const getCountriesOfNode = (
  node: string,
  regionMap: Record<string, string[]>,
  regions: string[],
  activeNodes: string[]
) => {
  if (regions.includes(node)) {
    // Only include countries NOT in activeNodes
    return (regionMap[node] || []).filter(c => !activeNodes.includes(c));
  }
  return [node];
};

// Proper node sorting: region node first, then its countries alphabetically
const sortNodesByRegion = (nodeList: string[]) => {
  let sorted: string[] = [];
  for (const reg of regions) {
    // Add the region node itself, if selected
    if (nodeList.includes(reg)) sorted.push(reg);
    // Then its countries
    const countries = nodeList
      .filter(
        (n) => n !== reg && getContinentByCountry(n) === reg
      )
      .sort((a, b) => a.localeCompare(b));
    sorted = sorted.concat(countries);
  }
  // Add any other non-region, non-country nodes (like powers or mistakes)
  sorted = sorted.concat(
    nodeList.filter(
      n => !regions.includes(n) && !getContinentByCountry(n)
    )
  );
  return sorted;
};

export default function ChordHierarchyPage() {
  const [year, setYear] = useState("2023");
  const [type, setType] = useState<"a_to_b" | "b_to_a" | "net">("net");
  type OptionType = {
    value: string;
    label: string;
    type: "region" | "country";
  };

  const [selectedNodes, setSelectedNodes] = useState<readonly OptionType[]>([]);

  // All countries for this year (update if year changes)
  const allCountriesThisYear = useMemo(() => getCountriesThisYear(year), [year]);

  // Build nodeOptions: regions first, then all countries for this year
  const nodeOptions: readonly OptionType[] = useMemo(
    () => [
      ...regions.map((n) => ({
        value: n,
        label: n,
        type: "region" as const,
      })),
      ...allCountriesThisYear.map((n) => ({
        value: n,
        label: n,
        type: "country" as const,
      })),
    ],
    [allCountriesThisYear]
  );

  // By default, all regions as nodes (classic world ring)
  const defaultNodes = useMemo(() => [...powers, ...regions], []);

  // Filter+sort active nodes for current view
  const activeNodes = useMemo(() => {
    const nodeVals = selectedNodes.length
      ? selectedNodes.map((n) => n.value)
      : defaultNodes;
    return sortNodesByRegion(nodeVals);
  }, [selectedNodes, year]);

  // Influence lookup for fast summing
  const influenceLookup = useMemo(() => {
    const lookup: Record<string, Record<string, number>> = {};
    influenceDataRawJson.forEach((d) => {
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
        default:
          from = d.a_first;
          to = d.a_second;
          value = +d[`a_${year}`];
          break;
      }
      if (!from || !to) return;
      if (!lookup[from]) lookup[from] = {};
      if (!lookup[from][to]) lookup[from][to] = 0;
      lookup[from][to] += value;
    });
    return lookup;
  }, [type, year, influenceDataRawJson]);

  // Build the matrix (with aggregation for region nodes)
  const processedData = useMemo(() => {
    const matrix = activeNodes.map((fromNode) => {
      const fromCountries = getCountriesOfNode(fromNode, regionMap, regions, activeNodes);
      return activeNodes.map((toNode) => {
        const toCountries = getCountriesOfNode(toNode, regionMap, regions, activeNodes);
        let sum = 0;
        fromCountries.forEach((fc: string) => {
          toCountries.forEach((tc: string) => {
            sum += (influenceLookup[fc]?.[tc] || 0);
          });
        });
        if (fromNode === toNode) sum = 0;
        return sum;
      });
    });

    if (type === "net") {
      const netMatrix = activeNodes.map((from, i) =>
        activeNodes.map((to, j) => Math.max(matrix[i][j] - matrix[j][i], 0))
      );
      console.log(matrix, "Matrix for nodes:", activeNodes);
      return { matrix: netMatrix, labels: activeNodes };
    }

    
    return { matrix, labels: activeNodes };
  }, [activeNodes, influenceLookup, type, year]);

  return (
    <div className="p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">
        Chord Diagram - Global Influence - V2
      </h1>
      <div className="flex gap-4 mb-6 items-center flex-wrap">
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
          <option value="net">Net Influence</option>
          <option value="a_to_b">Directed Dyadic Influence</option>
          </select>
        <div className="w-full">
          <Select
            isMulti
            options={nodeOptions}
            value={selectedNodes}
            onChange={(newValue) => setSelectedNodes((newValue ?? []) as readonly OptionType[])}
            placeholder="Filter nodes (country, region)"
            classNamePrefix="react-select"
            isClearable={false}
            isSearchable
            closeMenuOnSelect={false}
          />
        </div>
      </div>
      <ChordDiagram
        matrix={processedData.matrix}
        labels={processedData.labels}
        year={year}
        type={type}
      />
      <Link href="/" className="bg-[#f0f0f0] p-2 rounded-lg mt-4">
        Go to Home
      </Link>
    </div>
  );
}
