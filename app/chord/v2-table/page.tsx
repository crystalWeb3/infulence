"use client";
import { useMemo, useState } from "react";
import influenceDataRawJson from "@/data/influence2.json";
import regionMap from "@/data/regionMap.json";

const influenceDataRaw: any[] = Array.isArray(influenceDataRawJson)
  ? influenceDataRawJson
  : [];

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
const regions = ["Americas", "Europe", "Asia", "Africa", "Oceania"];
const allNodes = [...powers, ...regions];
const allYears = ["1965", "1980", "1995", "2010", "2023"];

export default function ChordDataTablePage() {
  const [selectedYear, setSelectedYear] = useState("2023");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [sortBy, setSortBy] = useState<"from" | "to" | "value">("value");
  const [sortAsc, setSortAsc] = useState(false);

  const { rows, total } = useMemo(() => {
    const countryToRegion: Record<string, string> = {};
    for (const [region, countries] of Object.entries(regionMap)) {
      for (const country of countries) {
        countryToRegion[country] = region;
      }
    }

    const getNode = (actor: string): string => {
      if (powers.includes(actor)) return actor;
      return countryToRegion[actor] || actor;
    };

    const pairMap = new Map<string, number>();
    let totalInfluence = 0;

    for (const d of influenceDataRaw) {
      const from = getNode(d.a_first);
      const to = getNode(d.a_second);
      const value = +d[`a_${selectedYear}`];

      if (!from || !to || from === to) continue;
      if (!allNodes.includes(from) || !allNodes.includes(to)) continue;

      const key = `${from}|||${to}`;
      pairMap.set(key, (pairMap.get(key) || 0) + value);
      totalInfluence += value;
    }

    let resultRows = Array.from(pairMap.entries()).map(([key, value]) => {
      const [from, to] = key.split("|||");
      return { from, to, value };
    });

    // Filter
    if (searchFrom)
      resultRows = resultRows.filter((r) =>
        r.from.toLowerCase().includes(searchFrom.toLowerCase())
      );
    if (searchTo)
      resultRows = resultRows.filter((r) =>
        r.to.toLowerCase().includes(searchTo.toLowerCase())
      );

    // Sort
    resultRows.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return { rows: resultRows, total: totalInfluence };
  }, [selectedYear, searchFrom, searchTo, sortBy, sortAsc]);

  const downloadCSV = () => {
    const header = "From,To,Influence\n";
    const body = rows.map((r) => `${r.from},${r.to},${r.value.toFixed(3)}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `influence_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (column: "from" | "to" | "value") => {
    if (sortBy === column) setSortAsc(!sortAsc);
    else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Influence Table - {selectedYear}
      </h1>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <label className="font-medium">Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="p-2 border rounded"
        >
          {allYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <input
          placeholder="Search From"
          value={searchFrom}
          onChange={(e) => setSearchFrom(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          placeholder="Search To"
          value={searchTo}
          onChange={(e) => setSearchTo(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          onClick={downloadCSV}
          className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Download CSV
        </button>
      </div>

      <div className="mb-4 text-lg font-semibold">
        Total Influence: {total.toLocaleString()}
      </div>

      <div className="overflow-auto max-h-[600px] border rounded-lg">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {["from", "to", "value"].map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col as any)}
                  className="border px-4 py-2 text-left cursor-pointer hover:bg-gray-200"
                >
                  {col === "from"
                    ? "From"
                    : col === "to"
                    ? "To"
                    : "Influence"}{" "}
                  {sortBy === col ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                <td className="border px-4 py-1">{row.from}</td>
                <td className="border px-4 py-1">{row.to}</td>
                <td className="border px-4 py-1 text-right">
                  {row.value.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
