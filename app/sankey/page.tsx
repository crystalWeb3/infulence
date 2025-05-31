// pages/sankey.tsx
"use client";
import dynamic from "next/dynamic";
import influenceData from "@/data/influence.json"; // Adjust path as needed
import Link from "next/link";

const SankeyDiagram = dynamic(() => import("../components/SanKeyDiagram"), {
  ssr: false,
});

export default function SankeyPage() {
  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">Sankey Diagram</h1>
      <SankeyDiagram data={influenceData} year="2023" />

      <Link href={"/"}>
        <div className="w-[200px] bg-[#f0f0f0] p-2 mr-2 border-lg text-center mt-6">
          Back to Home
        </div>
      </Link>
    </div>
  );
}
