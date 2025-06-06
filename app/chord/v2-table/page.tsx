"use client";
import { useMemo, useState } from "react";
import influenceDataRawJson from "@/data/influence2.json";
import regionMap from "@/data/regionMap.json";
import Link from "next/link";

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
  const [type, setType] = useState<"a_to_b" | "b_to_a" | "net">("a_to_b");
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

    if (type === "net") {
      const forwardMap = new Map<string, number>();
      const reverseMap = new Map<string, number>();

      for (const d of influenceDataRaw) {
        const a = getNode(d.a_first);
        const b = getNode(d.a_second);
        const valAB = +d[`a_${selectedYear}`];
        const valBA = +d[`b_${selectedYear}`];

        if (!a || !b || a === b) continue;
        if (!allNodes.includes(a) || !allNodes.includes(b)) continue;

        const keyAB = `${a}|||${b}`;
        const keyBA = `${b}|||${a}`;

        forwardMap.set(keyAB, (forwardMap.get(keyAB) || 0) + valAB);
        reverseMap.set(keyBA, (reverseMap.get(keyBA) || 0) + valBA);
      }

      const allKeys = new Set([...forwardMap.keys(), ...reverseMap.keys()]);

      for (const key of allKeys) {
        const [from, to] = key.split("|||");
        const keyAB = `${from}|||${to}`;
        const keyBA = `${to}|||${from}`;

        const valAB = forwardMap.get(keyAB) || 0;
        const valBA = reverseMap.get(keyBA) || 0;
        const netVal = valAB - valBA;

        if (netVal > 0) {
          pairMap.set(keyAB, netVal);
          totalInfluence += netVal;
        }
      }
    } else {
      for (const d of influenceDataRaw) {
        const from = getNode(type === "a_to_b" ? d.a_first : d.b_first);
        const to = getNode(type === "a_to_b" ? d.a_second : d.b_second);
        const value = +d[`${type === "a_to_b" ? "a" : "b"}_${selectedYear}`];

        if (!from || !to || from === to) continue;
        if (!allNodes.includes(from) || !allNodes.includes(to)) continue;

        const key = `${from}|||${to}`;
        pairMap.set(key, (pairMap.get(key) || 0) + value);
        totalInfluence += value;
      }
    }

    let resultRows = Array.from(pairMap.entries()).map(([key, value]) => {
      const [from, to] = key.split("|||");
      return { from, to, value };
    });

    if (searchFrom)
      resultRows = resultRows.filter((r) =>
        r.from.toLowerCase().includes(searchFrom.toLowerCase())
      );
    if (searchTo)
      resultRows = resultRows.filter((r) =>
        r.to.toLowerCase().includes(searchTo.toLowerCase())
      );

    resultRows.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    const filteredTotal = resultRows.reduce((sum, r) => sum + r.value, 0);
    return { rows: resultRows, total: filteredTotal };
  }, [selectedYear, searchFrom, searchTo, sortBy, sortAsc, type]);

  const downloadCSV = () => {
    const header = "From,To,Influence\n";
    const body = rows
      .map((r) => `${r.from},${r.to},${r.value.toFixed(3)}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `influence_${type}_${selectedYear}.csv`;
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

  const typeMap: Record<string, string> = {
    a_to_b: "Directed Dyadic Influence",
    net: "Net Influence",
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Influence Table - {selectedYear} ({typeMap[type] || type})
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

        <label className="font-medium">Type:</label>
        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value as "a_to_b" | "b_to_a" | "net")
          }
          className="p-2 border rounded"
        >
          <option value="a_to_b">Directed Dyadic Influence</option>
          <option value="net">Net Influence</option>
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

        <div className="flex-grow ml-auto flex items-center gap-2">
          <button
            onClick={downloadCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Download CSV
          </button>

          <Link
            href={"/"}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Go to Home
          </Link>
        </div>
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
                  {col === "from" ? "From" : col === "to" ? "To" : "Influence"}{" "}
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
