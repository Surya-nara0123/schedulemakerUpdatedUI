"use client";

import React, { useState } from "react";
import {
  Menu,
  CalendarCheck2,
  Grid2x2Plus,
  Grid2x2PlusIcon,
  CalendarRange,
} from "lucide-react";

export default function SideBar() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="select-none">
      {isOpen ? (
        <nav className="fixed bg-[#2d3748] h-screen w-[300px]">
          <button
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            className="bg-[#3d4758] p-3 m-3 w-[50px] rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
          >
            <Menu />
          </button>
          <div>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex bg-[#3d4758] p-3 m-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
            >
              <CalendarCheck2 className="mr-2" />
              View Timetables
            </button>
            <button
              onClick={() => {
                window.location.href = "/scheduleGen";
              }}
              className="flex bg-[#3d4758] p-3 m-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
            >
              <Grid2x2Plus className="mr-2" />
              Generate Timetables
            </button>
          </div>
        </nav>
      ) : (
        <button
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          className="fixed bg-[#3d4758] p-3 m-3 w-[50px] rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
        >
          <Menu />
        </button>
      )}
    </div>
  );
}
