"use client";
import dynamic from "next/dynamic";
import influenceData from "@/data/influence.json";
import { useState } from "react";
import Link from "next/link";

const ChordDiagram = dynamic(() => import("../components/ChordDiagram"), {
  ssr: false,
});

export default function ChordPage() {
  const [year, setYear] = useState("2023");
  const [type, setType] = useState<"a_to_b" | "b_to_a" | "net">("b_to_a");

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="flex gap-5 items-center mb-8">
        <h1 className="text-2xl font-bold mb-4">Chord Diagram - Influence</h1>
        <select
          className="mb-4 p-2 rounded border border-gray-500"
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
          className="mb-4 p-2 rounded border border-gray-500"
          onChange={(e) =>
            setType(e.target.value as "a_to_b" | "b_to_a" | "net")
          }
          value={type}
        >
          <option value="a_to_b">Directed Dyadic Influence</option>
          <option value="net">Net Influence</option>
        </select>
      </div>

      <ChordDiagram type={type} data={influenceData} year={year} />

      <Link href={"/"}>
          <div className="bg-[#f0f0f0] p-2 rounded-lg">Go to Home</div>
      </Link>
    </div>
  );
}
