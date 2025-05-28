"use client";
import { useMemo } from "react";
import OneNetworkGraph from "./OneNetworkGraph";


const YEARS = ["1965", "1980", "1995", "2010", "2023"];

type InfluenceEntry = {
  a_first: string;
  a_seond: string;
  [key: `a_${string}` | `b_${string}` | `net_${string}`]: number | string;
};

interface AllGraphsProps {
  data: InfluenceEntry[];
}

export default function AllGraphs({ data }: AllGraphsProps) {
  // Use useMemo to avoid recalculating the same set of graphs on every render
  const graphs = useMemo(() => {
    return YEARS.map((year) => (
      <div key={year} className="flex flex-col items-center">
        <h2 className="text-lg font-semibold mb-2">Year: {year}</h2>
        <OneNetworkGraph key={year} data={data} year={year} />
      </div>
    ));
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      {graphs}
    </div>
  );
}
