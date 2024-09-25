"use client";
import React, { useState } from "react";
import { generatePDF } from "./print";
import Papa from "papaparse";
import { saveAs } from "file-saver";

type timetableData = Array<Array<Array<string>>>;

const timings = [
  "days",
  "8.10-9.00",
  "9.00-9.50",
  "9.50-10.40",
  "10.40-11.00",
  "11.00-11.50",
  "11.50-12.40",
  "12.40-1.40",
  "1.40-2.30",
  "2.30-2.40",
  "2.40-3.30",
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function format_timetables(
  timetable_classes: any,
  timetable_professors: any,
  timetable_labs: any,
  proff_to_year: any,
  proff_to_short: any
) {
  for (let clas of Object.keys(timetable_classes)) {
    if (clas.slice(0, 1) === "1") {
      for (let day = 0; day < 5; day++) {
        timetable_classes[clas][day].splice(2, 0, "Break");
        timetable_classes[clas][day].splice(8, 0, "Break");
      }
    } else {
      for (let day = 0; day < 5; day++) {
        timetable_classes[clas][day].splice(3, 0, "Break");
        timetable_classes[clas][day].splice(8, 0, "Break");
      }
    }
  }
  for (let prof of Object.keys(timetable_professors)) {
    if (proff_to_year[prof] === "1") {
      for (let day = 0; day < 5; day++) {
        timetable_professors[prof][day].splice(2, 0, "Break");
        timetable_professors[prof][day].splice(8, 0, "Break");
      }
    } else if (proff_to_year[prof] === "2") {
      for (let day = 0; day < 5; day++) {
        timetable_professors[prof][day].splice(3, 0, "Break");
        timetable_professors[prof][day].splice(8, 0, "Break");
      }
    } else {
      for (let day = 0; day < 5; day++) {
        if (timetable_professors[prof][day][2] === "") {
          timetable_professors[prof][day].splice(2, 0, "Break");
        } else if (timetable_professors[prof][day][2][1].slice(0, 1) === "1") {
          timetable_professors[prof][day].splice(2, 0, "Break");
        } else {
          timetable_professors[prof][day].splice(3, 0, "Break");
        }
        timetable_professors[prof][day].splice(8, 0, "Break");
      }
    }
  }

  for (let clas of Object.keys(timetable_classes)) {
    for (let day = 0; day < 5; day++) {
      for (let slot = 0; slot < timetable_classes[clas][day].length; slot++) {
        if (typeof timetable_classes[clas][day][slot] === typeof "string") {
          continue;
        } else {
          if (timetable_classes[clas][day][slot][0].includes("Self-Learning")) {
            timetable_classes[clas][day][slot] = "Self-Learning";
          } else {
            let result = "";
            for (let i of timetable_classes[clas][day][slot]) {
              if (proff_to_short[i]) {
                result += proff_to_short[i];
              } else {
                result += i;
              }
              result += " ";
            }
            timetable_classes[clas][day][slot] = result;
          }
        }
      }
    }
  }

  for (let prof of Object.keys(timetable_professors)) {
    for (let day = 0; day < 5; day++) {
      for (
        let slot = 0;
        slot < timetable_professors[prof][day].length;
        slot++
      ) {
        if (typeof timetable_professors[prof][day][slot] === typeof "string") {
          continue;
        } else {
          let result = "";
          for (let i of timetable_professors[prof][day][slot]) {
            result += i;
            result += " ";
          }
          timetable_professors[prof][day][slot] = result;
        }
      }
    }
  }

  for (let lab of Object.keys(timetable_labs)) {
    for (let day = 0; day < 5; day++) {
      for (let slot = 0; slot < timetable_labs[lab][day].length; slot++) {
        if (typeof timetable_labs[lab][day][slot] === typeof "string") {
          continue;
        } else {
          let result = "";
          for (let i of timetable_labs[lab][day][slot]) {
            result += i;
            result += " ";
          }
          timetable_labs[lab][day][slot] = result;
        }
      }
    }
  }
}

export default function Page() {
  const [mode, setMode] = useState("professor");
  const [isGenerated, setIsGenerated] = useState(false);
  const [prof, setProf] = useState("");
  const [timetableData, setTimetableData] = useState<{ [key: string]: any[] }>(
    {}
  );
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file3, setFile3] = useState(null);
  const [parameter, setParameter] = useState([]);
  const [profData, setProfData] = useState([]);
  const [lockedClasses, setLockedClasses] = useState([]);
  const [timetableClasses, setTimetableClasses] = useState({});
  const [timetableProfessors, setTimetableProfessors] = useState({});
  const [timetableLabs, setTimetableLabs] = useState({});
  const [currentSection, setCurrentSection] = useState("AIDS Section A");
  const [currentClass, setCurrentClass] = useState("2nd Year");
  const handleFileChange = (e: any, setFile: Function) => {
    setFile(e.target.files[0]);
  };
  const createDictionary_class = (data: Array<Array<string>>) => {
    const dictionary: any = {};
    let currentSection = "";
    let check = true;

    data.forEach((row) => {
      let count = 0;
      for (let i = 0; i < row.length; i++) {
        if (row[i] != "") {
          count++;
        }
      }
      if (count === 1) {
        currentSection = row[0].trim();
        dictionary[currentSection] = [];
      } else if (row.length === 4) {
        // console.log(row)
        if (
          row[0] === "Course" &&
          row[1] === "Credits" &&
          row[2] === "Type" &&
          row[3] === "Professor"
        ) {
          return;
        }
        dictionary[currentSection].push([
          row[0].trim(),
          parseInt(row[1]),
          row[2].trim(),
          row[3].trim(),
        ]);
      } else {
        check = false;
        return;
      }
    });
    if (!check) {
      return {};
    }
    return dictionary;
  };

  const createList_labs = (data: any) => {
    const labs: any = [];
    let check = true;
    data.forEach((row: any) => {
      if (row.length != 1) {
        check = false;
        return;
      }
      labs.push(row[0]);
    });
    if (!check) {
      return [];
    }
    return labs;
  };

  const creatDictionary_proff = (data: any) => {
    const proffs_to_short: { [key: string]: string } = {};
    let check = true;
    data.forEach((row: Array<string>) => {
      if (row.length != 2) {
        check = false;
        return;
      }
      proffs_to_short[row[0]] = row[1];
    });
    if (!check) {
      return {};
    }
    return proffs_to_short;
  };
  const parseCSVFiles = async (files: any) => {
    let done_files = new Set();
    let results = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const file_name = file.name;

      if (done_files.has(file_name)) {
        alert("Repeating Files!!");
        return null;
      } else {
        done_files.add(file_name);
      }

      const result = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const text = e.target.result;
          Papa.parse(text, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
              const data = results.data;
              let dictionary = {};

              switch (index) {
                case 0:
                  dictionary = createDictionary_class(data as string[][]);
                  break;
                case 1:
                  dictionary = createList_labs(data);
                  break;
                case 2:
                  dictionary = creatDictionary_proff(data);
                  break;
                default:
                  reject(new Error("Invalid index"));
              }

              resolve(dictionary);
            },
          });
        };
        reader.readAsText(file);
      });

      if (
        (Array.isArray(result) && result.length === 0) ||
        Object.keys(result as object).length === 0
      ) {
        alert("Improper File = " + file_name);
        return null;
      }
      results.push(result);
    }

    let class_courses = {};
    let proffs_names_to_short = {};
    let labs: any[] = [];

    results.forEach((thing) => {
      if (typeof thing === "object" && !Array.isArray(thing)) {
        let keys = thing ? Object.keys(thing) : [];
        if (keys[0].includes("Year")) {
          class_courses = JSON.parse(JSON.stringify(thing));
        } else {
          proffs_names_to_short = JSON.parse(JSON.stringify(thing));
        }
      } else if (Array.isArray(thing)) {
        if (thing[0].includes("LAB")) {
          labs = JSON.parse(JSON.stringify(thing));
        }
      }
    });
    let professors = Object.keys(proffs_names_to_short);
    return { class_courses, professors, proffs_names_to_short, labs };
  };

  const printOutput = async () => {
    if (!(file1 && file2 && file3)) {
      alert("Please upload all 4 CSV files.");
      return;
    }

    const processFiles = [file1, file2, file3];
    const results = await parseCSVFiles(processFiles);
    // console.log(results)

    if (!results) {
      return;
    }

    const { class_courses, professors, proffs_names_to_short, labs } = results;

    //class_courses, professors, proff_to_short, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable is syntax

    console.log([
      class_courses,
      professors,
      proffs_names_to_short,
      labs,
      parameter,
      lockedClasses,
      timetableProfessors,
      timetableClasses,
      timetableLabs,
    ]);
    const response = await fetch("/api/timetableGenrator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        class_courses,
        professors,
        proffs_names_to_short,
        labs,
        parameter,
        lockedClasses,
        timetableProfessors,
        timetableClasses,
        timetableLabs,
      ]),
    });
    const body = await response.json();
    console.log(body);
    const tables = body["result"];
    if (Object.keys(tables).length === 0) {
      alert(
        "Error in timetable generation!! Please contact the developer via the discord handle 'DrunkenCloud' or https://discord.gg/wwN64wD4 in this discord server."
      );
      return;
    }
    setTimetableProfessors(JSON.parse(JSON.stringify(tables[1])));
    setTimetableClasses(JSON.parse(JSON.stringify(tables[0])));
    setTimetableLabs(JSON.parse(JSON.stringify(tables[3])));
    format_timetables(
      tables[0],
      tables[1],
      tables[3],
      tables[4],
      proffs_names_to_short
    );
    let a = tables[0];
    let b = tables[1];

    console.log("a: ", a);
    console.log("b: ", b);

    setProfData(b);
    setTimetableData(a);
    console.log(timetableData["1st Year B_Tech AIDS Section A"]);

    setIsGenerated(true);
  };

  const convertDetails = async (classTitle: any) => {
    if (!(file1 && file2 && file3)) {
      alert("Please upload all 4 CSV files.");
      return;
    }

    const processFiles = [file1, file2, file3];
    const results = await parseCSVFiles(processFiles);

    if (!results) {
      return;
    }

    const { class_courses, professors, proffs_names_to_short, labs } = results;

    let course = (class_courses as { [key: string]: any })[classTitle];
    let proffDetails = [];
    let proffs_names_to_short_new: { [key: string]: string } =
      proffs_names_to_short;

    for (let i = 0; i < course.length; i++) {
      let temp: { [key: string]: any } = {};
      temp[course[i][0]] = [
        course[i][0],
        proffs_names_to_short_new[course[i][3]],
        "HS",
        3,
      ];
      proffDetails.push(temp);
    }
    // console.log(proffDetails);
    return proffDetails;
  };

  const genPDF = async (classTitle: string) => {
    let temp: { [key: string]: any } = {};
    let a = await convertDetails(classTitle);
    temp[classTitle] = timetableData[classTitle] || [];
    const pdf = await generatePDF(temp, a);
    const blob = new Blob([pdf], { type: "application/pdf" });
    saveAs(blob, classTitle + ".pdf");
  };

  const genCSV = async (classTitle: string) => {
    const timetable = timetableData[classTitle];
    if (!timetable) {
      alert(`No timetable found for ${classTitle}`);
      return;
    }

    const headers = Object.keys(timetable[0]);
    let csv = classTitle + "\n";
    csv += headers.join(",") + "\n";

    timetable.forEach((row: { [s: string]: unknown } | ArrayLike<unknown>) => {
      csv +=
        Object.values(row)
          .map((value) => {
            if (typeof value === "string") {
              const value1 = value.replace(/"/g, '""');
              if (value1.search(/("|,|\n)/g) >= 0) value = `"${value1}"`;
            }
            return value;
          })
          .join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, classTitle + ".csv");
  };

  const genPDFall = async () => {
    function jsonToCsv(jsonObj: { [x: string]: any }) {
      // Extract headers
      const headers = Object.keys(jsonObj[Object.keys(jsonObj)[0]][0]);

      // Create a CSV string
      let csv = headers.join(",") + "\n";

      // Iterate over each section
      for (const section in jsonObj) {
        csv += section + "\n";
        jsonObj[section].forEach(
          (row: ArrayLike<unknown> | { [s: string]: unknown }) => {
            csv +=
              Object.values(row)
                .map((value) => {
                  // Escape commas and quotes
                  if (typeof value === "string") {
                    const value1 = value.replace(/"/g, '""');
                    if (value1.search(/("|,|\n)/g) >= 0) value = `"${value1}"`;
                  }
                  return value;
                })
                .join(",") + "\n";
          }
        );
      }
      console.log(csv);
      return csv;
    }

    function downloadCsv(csv: BlobPart, filename: string) {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    }

    let csv = jsonToCsv(timetableData);
    downloadCsv(csv, "timetable.csv");
  };

  const saveTimeTable = async () => {
    console.log("timetable", timetableData);
    const data = {
      timetable: timetableData,
    };
    console.log(profData);
    const data1 = {
      timetable: profData,
    };
    let timetabl = [data, data1];
    try {
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timetabl),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response:", data);
    } catch (error) {
      console.error("Error updating timetable:", error);
    }
  };
  return (
    <main className="pl-[100px] pt-[100px] font-semibold">
      <h1 className="text-2xl mb-2 font-black">Schedule Generator</h1>
      <div className="bg-white h-[2px] w-1/2"></div>
      <div className="border border-[#3d4758] p-2 min-w-[300px] max-w-[600px] mt-3 mb-3">
        <h1 className="text-white bg-[#2d3748] px-3">Class to Courses</h1>
        <div className="px-12 bg-[#3d4758]">
          <input
            type="file"
            className=""
            onChange={(e) => handleFileChange(e, setFile1)}
          />
        </div>
        <h1 className="text-white bg-[#2d3748] px-3 mt-2">Labs</h1>
        <div className="px-12 bg-[#3d4758]">
          <input
            type="file"
            className=""
            onChange={(e) => handleFileChange(e, setFile2)}
          />
        </div>
        <h1 className="text-white bg-[#2d3748] px-3 mt-2">
          Professors Shortforms
        </h1>
        <div className="px-12 bg-[#3d4758]">
          <input
            type="file"
            className=""
            onChange={(e) => handleFileChange(e, setFile3)}
          />
        </div>
      </div>
      <button
        onClick={() => {
          console.log("Hiii");
          printOutput();
        }}
        className="bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
      >
        Generate
      </button>
      <button
        onClick={() => {
          console.log(timetableData["1st Year B_Tech AIDS Section A"]);
        }}
        className="bg-[#3d4758] p-3 mt-3 ml-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
      >
        Upload Timetable
      </button>
      <button className="bg-[#3d4758] p-3 mt-3 ml-2 mb-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]">
        Download All CSV
      </button>
      <div className="bg-white h-[3px] w-1/2"></div>

      <div className="flex mt-12 gap-1 select-none  ">
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
            Professor
          </div>
        ) : (
          <div
            onClick={() => {
              setMode("professor");
            }}
            className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-black border-2"
          >
            Professor
          </div>
        )}
      </div>

      {mode == "student" ? (
        <>
          <div className="flex mt-6 gap-1 select-none  ">
            {currentClass === "2nd Year" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-white border-2">
                2<sup>nd</sup> Year
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentClass("2nd Year");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-black border-2"
              >
                2<sup>nd</sup> Year
              </div>
            )}
            {currentClass === "3rd Year" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-white border-2">
                3<sup>rd</sup> Year
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentClass("3rd Year");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-black border-2"
              >
                3<sup>rd</sup> Year
              </div>
            )}
            {currentClass === "4th Year" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-white border-2">
                4<sup>th</sup> Year
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentClass("4th Year");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[100px] h-[50px] border-black border-2"
              >
                4<sup>th</sup> Year
              </div>
            )}
          </div>

          {/* now for the sections */}
          <div className="flex mt-6 gap-1 select-none  ">
            {currentSection === "AIDS Section A" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-white border-2">
                AIDS Section A
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentSection("AIDS Section A");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-black border-2"
              >
                AIDS Section A
              </div>
            )}
            {currentSection === "AIDS Section B" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-white border-2">
                AIDS Section B
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentSection("AIDS Section B");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-black border-2"
              >
                AIDS Section B
              </div>
            )}
            {currentSection === "IoT Section A" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-white border-2">
                IoT Section A
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentSection("IoT Section A");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-black border-2"
              >
                IoT Section A
              </div>
            )}
            {currentSection === "IoT Section B" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-white border-2">
                IoT Section B
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentSection("IoT Section B");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-black border-2"
              >
                IoT Section B
              </div>
            )}
            {currentSection === "Cyber Security" ? (
              <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-white border-2">
                Cyber Security
              </div>
            ) : (
              <div
                onClick={() => {
                  setCurrentSection("Cyber Security");
                }}
                className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-black border-2"
              >
                Cyber Security
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex mt-6 gap-[1px] w-[1300px] overflow-scroll">
          {Object.keys(profData).map((prof: any, index: number) => {
            return (
              <div className="flex gap-1 select-none  ">
                {currentSection === prof ? (
                  <div className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-white border-2">
                    {prof}
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setProf(prof);
                    }}
                    className="flex font-bold items-center justify-center bg-[#2d3748] w-[140px] h-[50px] border-black border-2"
                  >
                    {prof}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-[#2d3748] w-[1300px] overflow-visible">
        <div className="flex mt-12 gap-1 select-none p-3">
          {timings.map((timing, index) => {
            return (
              <div
                key={index}
                className="bg-[#1d2738] w-[113px] h-[50px] border-black border-2 flex items-center justify-center"
              >
                {timing}
              </div>
            );
          })}
        </div>
        <div className="px-3 gap-3">
          {timetableData[currentClass + " B_Tech " + currentSection]?.map(
            (row: any, index: number) => {
              return (
                <div className="flex gap-1 mb-1">
                  <div
                    key={index}
                    className="bg-[#1d2738] w-[113px] h-[70px] border-black border-2 flex items-center justify-center"
                  >
                    {days[index]}
                  </div>
                  <div className="flex gap-1" key={index}>
                    {row.map((col: string, index: number) => {
                      return (
                        <div
                          key={index}
                          className="bg-[#3d4758] w-[112.5px] h-[70px] border-black border-2 flex flex-col items-center justify-center text-xs font-semibold text-center"
                        >
                          {col}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </div>
        <div className="w-full flex p-3">
          <button className="ml-auto bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]">
            Fix
          </button>
          <button
            onClick={() => {
              genCSV(currentClass + " B_Tech " + currentSection);
            }}
            className="ml-2 bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
          >
            Download CSV
          </button>
        </div>
      </div>
    </main>
  );
}
