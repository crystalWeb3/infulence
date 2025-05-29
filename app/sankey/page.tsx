// pages/sankey.tsx
"use client";
import dynamic from "next/dynamic";
import influenceData from "@/data/influence.json"; // Adjust path as needed

const SankeyDiagram = dynamic(() => import("../components/SanKeyDiagram"), {
  ssr: false,
});

export default function SankeyPage() {
  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">Sankey Diagram</h1>
      <SankeyDiagram data={influenceData} year="2023" />
    </div>
  );
}
