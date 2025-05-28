// app/all-graphs/page.tsx
"use client";
import AllGraphs from "../../components/AllGraphs"; // Adjust the import path as necessary
import data from "@/data/influence.json"; // Replace with your actual path

export default function AllGraphsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">All Network Graphs</h1>
      <AllGraphs data={data} />
    </div>
  );
}
