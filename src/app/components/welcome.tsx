"use client";
import React, { useState } from "react";

export default function HomePageComponent() {
  const [mode, setMode] = useState("professor");
  return (
    <main className="pl-[100px] pt-[100px]">
      <h1 className="text-2xl mb-2">Home</h1>
      <div className="bg-white h-[2px] w-1/2"></div>
      <div className="flex mt-3 gap-1 select-none">
        {mode === "student" ? (
          <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-white border-2">
            Student
          </div>
        ) : (
          <div
            onClick={() => {
              setMode("student");
            }}
            className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-black border-2"
          >
            Student
          </div>
        )}
        {mode === "professor" ? (
          <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-white border-2">
            professor
          </div>
        ) : (
          <div
            onClick={() => {
              setMode("professor");
            }}
            className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-black border-2"
          >
            professor
          </div>
        )}
      </div>
    </main>
  );
}
