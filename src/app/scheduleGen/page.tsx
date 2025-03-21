"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { X } from "lucide-react";
import JSZip from "jszip";

type timetableData = Array<Array<Array<string>>>;
type classTimeTable = {
  [key: string]: [string | string[]][];
};

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

function isFreeProfessor(
  timetable_professors: any,
  proff: string,
  day: number,
  slot: number,
  clas: string
) {
  console.log(proff, day, slot, clas);
  if (timetable_professors[proff][day][slot] === "") {
    let clas_count = 0;
    let period_count = 0;
    for (let i = 0; i < slot; i++) {
      if (typeof timetable_professors[proff][day][i] === typeof "Lunch") {
        continue;
      }
      if (timetable_professors[proff][day][i][1] === clas) {
        clas_count += 1;
      }
      period_count += 1;
    }
    return clas_count < 3 && period_count < 6;
  }
  return false;
}
function adjustIndex(index: number) {
  if (index > 8) {
    index -= 1;
  }
  if (index > 3) {
    index -= 1;
  }
  return index;
}
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
function free_labs(
  timetable_labs: any,
  course_code: string,
  day: number,
  slot1: number,
  slot2: number
) {
  const usable = [];

  for (const lab of Object.keys(timetable_labs)) {
    if (lab.startsWith(course_code.slice(0, 2))) {
      usable.push(lab);
    }
  }

  const temp = [...usable];
  let possibles = [];
  temp.sort();
  for (let i = 0; i < temp.length; i += 2) {
    let j = slot1;
    for (; j <= slot2; j++) {
      if (timetable_labs[temp[i]][day][slot1] != "") break;
      if (timetable_labs[temp[i + 1]][day][slot1] != "") break;
    }
    if (j == slot2 + 1) possibles.push([temp[i], temp[i + 1]]);
  }

  return possibles;
}
function allocateProfessors(
  timetable_professors: any,
  proffs: any,
  day: number,
  slot1: number,
  slot2: number,
  clas: string
) {
  const results: any[][] = [];
  const numPeriods = slot2 - slot1 + 1;
  const allocation = Array(numPeriods).fill(-1);

  function backtrack(period: number) {
    if (period === numPeriods) {
      results.push([...allocation]);
      return;
    }
    for (let p = 0; p < numPeriods; p++) {
      if (
        isFreeProfessor(
          timetable_professors,
          proffs[p],
          day,
          slot1 + period,
          clas
        )
      ) {
        if (allocation.includes(p)) continue;
        allocation[period] = p;
        backtrack(period + 1);
        allocation[period] = -1;
      }
    }
  }

  backtrack(0);
  return results;
}
function getRandomElement(list: Array<any>) {
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

export default function Page() {
  const [mode, setMode] = useState("student");
  const [isGenerated, setIsGenerated] = useState(false);
  const [prof, setProf] = useState("");
  const [timetableData, setTimetableData] = useState<{ [key: string]: any[] }>(
    {}
  );
  let selectCount = 0;
  const [selectedElements, setSelectedElements] = useState<
    Array<Array<number>>
  >([]);
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file3, setFile3] = useState(null);
  const [file4, setFile4] = useState(null);
  const [result, setResult] = useState(null);
  const [parameter, setParameter] = useState<Array<any>>([]);
  const [profData, setProfData] = useState<{ [key: string]: any[] }>({});
  const [lockedClasses, setLockedClasses] = useState<Array<String>>([]);
  const [timetableClasses, setTimetableClasses] = useState({});
  const [timetableProfessors, setTimetableProfessors] = useState({});
  const [proffToShort, setProffShorts] = useState({});
  const [proffsToYear, setProffsYear] = useState({});
  const [timetableLabs, setTimetableLabs] = useState({});
  const [currentSection, setCurrentSection] = useState("AIDS Section A");
  const [currentClass, setCurrentClass] = useState("2nd Year");
  const [isSwapMode, setIsSwapMode] = useState(true);
  const [isSwapLabMode, setIsSwapLabMode] = useState(false);
  const [swapArra, setSwapArra] = useState([]);
  const [swapArrb, setSwapArrb] = useState([]);
  const [classCourses, setClassCourses] = useState<{ [key: string]: any[] }>(
    {}
  );

  const handleLoadSession = async () => {
    // check if file4 is uploaded
    if (!(file4 && file1 && file2 && file3)) {
      alert("Please upload the previous session timetable.");
      return;
    }
    // printOutput(false);
    console.log("file4", file4);

    // read the json file (file4)
    // assign classCourses,proffToShort,proffsToYear,timetableLabs,timetableData,timetableClasses,profData,timetableProfessors
    const reader = new FileReader();

    reader.onload = async (e: any) => {
      const text = e.target.result;
      const data = JSON.parse(text);
      console.log(data);

      setClassCourses(data.classCourses);
      setProffShorts(data.proffToShort);
      setProffsYear(data.proffsToYear);
      setTimetableLabs(data.timetableLabs);
      setTimetableData(data.timetableData);
      setTimetableClasses(data.timetableClasses);
      setProfData(data.profData);
      setTimetableProfessors(data.timetableProfessors);
    };

    reader.readAsText(file4);
  };

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
          row[1] === "Hours" &&
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
      } else if (row.length === 5) {
        dictionary[currentSection].push([
          row[0].trim(),
          parseInt(row[1]),
          row[2].trim(),
          row[3].trim(),
          row[4].trim()
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
      if (row.length != 3) {
        check = false;
        return;
      }
      labs.push(row);
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
        labs = JSON.parse(JSON.stringify(thing));
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
    console.log(results);

    if (!results) {
      return;
    }

    const { class_courses, professors, proffs_names_to_short, labs } = results;

    setClassCourses(class_courses);

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
    setResult(tables);
    setTimetableProfessors(JSON.parse(JSON.stringify(tables[1])));
    console.log(timetableProfessors);
    setTimetableClasses(JSON.parse(JSON.stringify(tables[0])));
    setTimetableLabs(JSON.parse(JSON.stringify(tables[3])));
    setProffShorts(JSON.parse(JSON.stringify(proffs_names_to_short)));
    setProffsYear(JSON.parse(JSON.stringify(tables[4])));
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
    console.log(timetableData);

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

    console.log(results);

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
    function jsonToCsv(
      jsonObj: { [x: string]: any },
      josnObj1: { [x: string]: any }
      // result: { [x: string]: any }[]
    ) {
      // Extract headers
      const headers = Object.keys(jsonObj[Object.keys(jsonObj)[0]][0]);
      const headers1 = Object.keys(jsonObj[Object.keys(jsonObj)[0]][0]);

      // Create a CSV string
      let csv = headers.join(",") + "\n";
      // console.log(josnObj1)
      // console.log(jsonObj)

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

      csv = csv + headers1.join(",") + "\n";
      for (const section in josnObj1) {
        csv += section + "\n";
        josnObj1[section].forEach(
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

    function downloadZip(csv: BlobPart, json: object) {
      const zip = new JSZip();

      // Add the CSV file to the ZIP
      const csvBlob = new Blob([csv], { type: "text/csv" });
      zip.file("timetable.csv", csvBlob);

      // Add the JSON file to the ZIP
      const jsonBlob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      zip.file("timetable.json", jsonBlob);

      // Generate the ZIP and download
      zip.generateAsync({ type: "blob" }).then((content: Blob) => {
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "timetable.zip";
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // CSV data
    const csv = jsonToCsv(timetableData, profData);

    // JSON data
    const json = {
      classCourses,
      proffToShort,
      proffsToYear,
      timetableLabs,
      timetableData,
      timetableClasses,
      profData,
      timetableProfessors,
    };

    // Download as a ZIP
    downloadZip(csv, json);
    // downloadCsv(csv, "timetable.csv");
  };
  const getSamples = async () => {
    const files = [
        { name: "class_courses.csv", path: "/class_courses.csv" },
        { name: "proffs_to_short.csv", path: "/proffs_to_short.csv" },
        { name: "labs.csv", path: "/labs.csv" },
    ];

    files.forEach(async (file) => {
        try {
            const response = await fetch(file.path);
            const data = await response.blob();
            const url = window.URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error(`Error downloading ${file.name}:`, error);
        }
    });
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

  const handleSwapNLockSelect = (index: number, index1: number) => {
    // get count of elements selected using getElementsByClassName
    // if count is 2, then swap the elements
    // else, add the element to the selected elements
    if (mode == "student") {
      const element = document.getElementById(`${index}${index1 + 1}`);
      if (isSwapMode) {
        if (!isSwapLabMode) {
          if (element?.className.includes("#3d4758")) {
            // console.log(selectedElements);
            if (
              timetableData[currentClass + " B_Tech " + currentSection][index][
                index1
              ] === "Break" ||
              timetableData[currentClass + " B_Tech " + currentSection][index][
                index1
              ] === "Lunch" ||
              timetableData[currentClass + " B_Tech " + currentSection][index][
                index1
              ].includes("LAB")
            ) {
              return;
            }
            element.className = element.className.replace("#3d4758", "#ffffff");
            if (selectedElements.length >= 2) {
              for (let i = 0; i < selectedElements.length; i++) {
                const element1 = document.getElementById(
                  `${selectedElements[i][0]}${selectedElements[i][1] + 1}`
                );
                element1!.className = element1!.className.replace(
                  "#ffffff",
                  "#3d4758"
                );
              }
              setSelectedElements([[index, index1]]);
            } else {
              setSelectedElements([...selectedElements, [index, index1]]);
            }
          } else {
            element!.className = element!.className.replace(
              "#ffffff",
              "#3d4758"
            );
            setSelectedElements(
              selectedElements.filter(
                (el) => el[0] !== index || el[1] !== index1
              )
            );
          }
        } else {
          if (element?.className.includes("#3d4758")) {
            // console.log(selectedElements);
            if (
              !timetableData[currentClass + " B_Tech " + currentSection][index][
                index1
              ].includes("LAB")
            ) {
              return;
            }
          }
        }
      } else {
        if (element?.className.includes("#3d4758")) {
          // console.log(selectedElements);
          if (
            timetableData[currentClass + " B_Tech " + currentSection][index][
              index1
            ] === "Break" ||
            timetableData[currentClass + " B_Tech " + currentSection][index][
              index1
            ] === "Lunch" ||
            timetableData[currentClass + " B_Tech " + currentSection][index][
              index1
            ].includes("LAB")
          ) {
            return;
          }
          element.className = element.className.replace("#3d4758", "#ffffff");
          if (selectedElements.length >= 1) {
            for (let i = 0; i < selectedElements.length; i++) {
              const element1 = document.getElementById(
                `${selectedElements[i][0]}${selectedElements[i][1] + 1}`
              );
              element1!.className = element1!.className.replace(
                "#ffffff",
                "#3d4758"
              );
            }
            setSelectedElements([[index, index1]]);
          } else {
            setSelectedElements([...selectedElements, [index, index1]]);
          }
        } else {
          element!.className = element!.className.replace("#ffffff", "#3d4758");
          setSelectedElements(
            selectedElements.filter((el) => el[0] !== index || el[1] !== index1)
          );
        }
      }
    }
  };

  const handleSwap = (
    indexa: number,
    index1a: number,
    indexb: number,
    index1b: number
  ) => {
    index1a = adjustIndex(index1a);
    index1b = adjustIndex(index1b);

    let classtt = JSON.parse(JSON.stringify(timetableClasses));
    let profftt = JSON.parse(JSON.stringify(timetableProfessors));
    let currClass = currentClass + " B_Tech " + currentSection;
    let proff1 = classtt[currClass][indexa][index1a][1];
    let proff2 = classtt[currClass][indexb][index1b][1];
    console.log(classtt, proff1, proff2);

    if (proff1 == proff2 && proff1 == "self_proff") {
      console.log("Nice Joke");
      alert("Take this seriously bro 😑");
      return;
    }
    if (
      !isFreeProfessor(
        timetableProfessors,
        proff1,
        indexb,
        index1b,
        currClass
      ) &&
      proff1 != proff2
    ) {
      console.log(proff1 + " is not free");
      alert(proff1 + " is not free");
      return;
    }
    if (
      !isFreeProfessor(
        timetableProfessors,
        proff2,
        indexa,
        index1a,
        currClass
      ) &&
      proff1 != proff2
    ) {
      console.log(proff2 + " is not free");
      alert(proff2 + " is not free");
      return;
    }

    let temp1 = JSON.parse(JSON.stringify(classtt[currClass][indexa][index1a]));
    let temp2 = JSON.parse(JSON.stringify(classtt[currClass][indexb][index1b]));
    let ptemp1 = JSON.parse(JSON.stringify(profftt[proff1][indexa][index1a]));
    let ptemp2 = JSON.parse(JSON.stringify(profftt[proff2][indexb][index1b]));

    classtt[currClass][indexa][index1a] = temp2;
    classtt[currClass][indexb][index1b] = temp1;
    profftt[proff1][indexa][index1a] = "";
    profftt[proff2][indexb][index1b] = "";
    profftt[proff1][indexb][index1b] = ptemp1;
    profftt[proff2][indexa][index1a] = ptemp2;
    setTimetableClasses(JSON.parse(JSON.stringify(classtt)));
    setTimetableProfessors(JSON.parse(JSON.stringify(profftt)));
    format_timetables(
      classtt,
      profftt,
      JSON.parse(JSON.stringify(timetableLabs)),
      proffsToYear,
      proffToShort
    );
    setTimetableData(classtt);
  };
  // swapArra format: [course, proff, day, start, end, lab2, lab2]
  // swapArrb format:  [[course, proff, day, slot], [course, proff, day, slot], [course, proff, day, slot]...]
  const handleLabSwap = () => {
    if (swapArra[3] - swapArra[4] != swapArrb.length) return;
    let proffs_array: any[] = [swapArrb[0][1]];
    for (let i = 1; i < swapArrb.length; i++) {
      if (swapArrb[i][3] != swapArrb[i - 1][3] + 1) return;
      proffs_array.push(swapArrb[i][1]);
    }
    const [labCourse, labProff, day, slot1, end1, initialLab1, initialLab2] =
      swapArra;
    const clas = currentClass;
    const numPeriods = swapArrb.length;
    const slot2 = swapArrb[0][3];
    const possibleProffAllocs = allocateProfessors(
      timetableProfessors,
      proffs_array,
      day,
      slot1,
      slot2,
      clas
    );
    if (possibleProffAllocs.length == 0) {
      console.log(
        "No possble configuration of theory classes proffesors possible to allocate classes"
      );
      return;
    }
    for (let slot = slot2; slot < slot2 + numPeriods; slot++) {
      if (!isFreeProfessor(timetableProfessors, labProff, day, slot, clas)) {
        console.log("Professor: ", labProff, " is not Free!");
        return;
      }
    }
    const freeLabs = free_labs(
      timetableLabs,
      labCourse,
      day,
      slot1,
      slot1 + numPeriods - 1
    );
    if (freeLabs.length == 0) {
      console.log("No Free Labs");
      return;
    }
    const chosenAlloc = getRandomElement(possibleProffAllocs);
    const [chosenLab1, chosenLab2] = getRandomElement(freeLabs);
    let timetable_lab = JSON.parse(JSON.stringify(timetableLabs));
    let timetable_classes = JSON.parse(JSON.stringify(timetableClasses));
    let timetable_professors = JSON.parse(JSON.stringify(timetableProfessors));
    for (let i = 0; i < numPeriods; i++) {
      timetable_lab[initialLab1][day][slot1 + i] = "";
      timetable_lab[initialLab2][day][slot1 + i] = "";
      timetable_lab[chosenLab1][day][slot2 + i] = [labCourse, clas, labProff];
      timetable_lab[chosenLab2][day][slot2 + i] = [labCourse, clas, labProff];
      let pos = chosenAlloc[i];
      timetable_classes[clas][day][slot1 + i] = [
        swapArrb[pos][0],
        swapArrb[pos][1],
      ];
      timetable_classes[clas][day][slot2 + i] = [
        labCourse,
        labProff,
        chosenLab1,
        chosenLab2,
      ];
      timetable_professors[labProff][day][slot1 + i] = "";
      timetable_professors[labProff][day][slot2 + i] = [
        labCourse,
        clas,
        chosenLab1,
        chosenLab2,
      ];
      timetable_professors[swapArrb[pos][1]][day][slot1 + i] = [
        swapArrb[pos][0],
        clas,
      ];
      timetable_professors[swapArrb[pos][1]][day][slot2 + i] = "";
    }
    setTimetableClasses(timetable_classes);
    setTimetableLabs(timetable_lab);
    setTimetableProfessors(timetable_professors);
    format_timetables(
      timetable_classes,
      timetable_professors,
      timetable_lab,
      proffsToYear,
      proffToShort
    );
    setTimetableData(timetable_classes);
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
        <h1 className="text-white bg-[#2d3748] px-3 mt-2">
          Previous Session Timetable(Optional)
        </h1>
        <div className="px-12 bg-[#3d4758]">
          <input
            type="file"
            className=""
            onChange={(e) => handleFileChange(e, setFile4)}
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
          handleLoadSession();
        }}
        className="bg-[#3d4758] p-3 mt-3 ml-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
      >
        Load Previous Session
      </button>
      <button
        onClick={() => {
          console.log(timetableData["1st Year B_Tech AIDS Section A"]);
        }}
        className="bg-[#3d4758] p-3 mt-3 ml-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
      >
        Upload Timetable
      </button>
      <button
        className="bg-[#3d4758] p-3 mt-3 ml-2 mb-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
        onClick={(e) => genPDFall()}
      >
        Download All CSV
      </button>
      <button
        className="bg-[#3d4758] p-3 mt-3 ml-2 mb-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
        onClick={(e) => getSamples()}
      >
        Get Sample CSVs
      </button>
      <button
        className="bg-[#3d4758] p-3 mt-3 ml-2 mb-2 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
        onClick={(e) => {
          // setIsSwapMode(!isSwapMode);
          if (isSwapMode) {
            if (isSwapLabMode) {
              setIsSwapLabMode(false);
            } else {
              setIsSwapMode(false);
            }
          } else {
            setIsSwapMode(true);
            setIsSwapLabMode(true);
          }
          for (let i = 0; i < selectedElements.length; i++) {
            const element1 = document.getElementById(
              `${selectedElements[i][0]}${selectedElements[i][1] + 1}`
            );
            element1!.className = element1!.className.replace(
              "#ffffff",
              "#3d4758"
            );
          }
          setSelectedElements([]);
        }}
      >
        {isSwapMode
          ? isSwapLabMode
            ? "Swap Lab Mode"
            : "Swap Mode"
          : "Lock Mode"}
      </button>
      <div className="bg-white h-[3px] w-1/2"></div>

      {/* Display the parameters */}
      {parameter.length > 0 && (
        <>
          <h1 className="text-2xl mt-4 font-black">Parameters</h1>
          <div className="bg-white h-[3px] w-1/2"></div>
          <div className="mt-4 grid grid-cols-3 w-[1300px] grid-flow-dense">
            {parameter.map((param, index) => (
              <div className="m-3 w-[404px] bg-[#2d3748] flex items-center select-none">
                <div key={index} className="p-3 w-96">
                  <div className="font-bold">{param[0]}</div>
                  <div className="flex gap-2">
                    <div>{param[1]}</div>
                    <div>{param[2]}</div>
                  </div>
                  <div className="flex gap-2">
                    <div>{days[param[3]]}</div>
                    <div>
                      {param[4] + 1}
                      <sup>
                        {param[4] == 0 ? "st" : param[4] == 1 ? "nd" : "rd"}
                      </sup>{" "}
                      period
                    </div>
                  </div>
                </div>
                <X
                  onClick={() => {
                    let temp = [...parameter];
                    temp.splice(index, 1);
                    setParameter(temp);
                  }}
                  className="h-full active:bg-black"
                ></X>
              </div>
            ))}
          </div>
          <div className="bg-white h-[3px] w-1/2"></div>
        </>
      )}

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
              for (let i = 0; i < selectedElements.length; i++) {
                const element1 = document.getElementById(
                  `${selectedElements[i][0]}${selectedElements[i][1] + 1}`
                );
                element1!.className = element1!.className.replace(
                  "#ffffff",
                  "#3d4758"
                );
              }
              setSelectedElements([]);

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
        <div className="flex mt-6 gap-[1px] w-[1300px] overflow-y-hidden overflow-x-auto overflow-scroll whitespace-nowrap scroll-smooth">
          {Object.keys(profData).map((prof1: any, index: number) => {
            return (
              <div className="flex gap-1 select-none  ">
                {prof === prof1 ? (
                  <div className="flex font-bold items-center justify-center px-4 bg-[#2d3748] min-w-[140px] h-[50px] border-white border-2">
                    {prof1}
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setProf(prof1);
                    }}
                    className="flex font-bold items-center justify-center px-4 bg-[#2d3748] min-w-[140px] h-[50px] border-black border-2"
                  >
                    {prof1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mode == "student" ? (
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
                  <div className="flex gap-1 mb-1 select-none">
                    <div
                      key={(index + 1) * 100}
                      className="bg-[#1d2738] w-[113px] h-[70px] border-black border-2 flex items-center justify-center"
                    >
                      {days[index]}
                    </div>
                    <div className="flex gap-1" key={index}>
                      {row.map((col: string, index1: number) => {
                        return (
                          <div
                            key={`${index}${index1 + 1}`}
                            id={`${index}${index1 + 1}`}
                            onClick={() => handleSwapNLockSelect(index, index1)}
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
            {isSwapMode ? (
              <button
                onClick={(e) => {
                  if (selectedElements.length === 2) {
                    console.log(selectedElements);
                    handleSwap(
                      selectedElements[0][0],
                      selectedElements[0][1],
                      selectedElements[1][0],
                      selectedElements[1][1]
                    );
                  }
                }}
                className="ml-auto bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Swap
              </button>
            ) : (
              <button
                onClick={(e) => {
                  if (selectedElements.length === 0) return;
                  const courseCode =
                    timetableData[currentClass + " B_Tech " + currentSection][
                      selectedElements[0][0]
                    ][selectedElements[0][1]].split(" ")[1] == "T"
                      ? timetableData[
                          currentClass + " B_Tech " + currentSection
                        ][selectedElements[0][0]][selectedElements[0][1]].split(
                          " "
                        )[0] +
                        " " +
                        timetableData[
                          currentClass + " B_Tech " + currentSection
                        ][selectedElements[0][0]][selectedElements[0][1]].split(
                          " "
                        )[1]
                      : timetableData[
                          currentClass + " B_Tech " + currentSection
                        ][selectedElements[0][0]][selectedElements[0][1]].split(
                          " "
                        )[0];
                  console.log(courseCode);
                  let prof1;
                  if (courseCode.split(" ").length == 1) {
                    prof1 = classCourses[
                      currentClass + " B_Tech " + currentSection
                    ].find((el: any) => el[0] === courseCode);
                  } else {
                    prof1 = classCourses[
                      currentClass + " B_Tech " + currentSection
                    ].find((el: any) => el[0] === courseCode.split(" ")[0]);
                  }
                  console.log(prof1);
                  const element = [
                    currentClass + " B_Tech " + currentSection,
                    courseCode,
                    courseCode == "Self-Learning" ? "self_proff" : prof1[3],
                    selectedElements[0][0],
                    selectedElements[0][1],
                  ];
                  console.log(element);
                  if (selectedElements.length === 1) {
                    const checkExist = () => {
                      for (let i = 0; i < parameter.length; i++) {
                        if (parameter[i].toString() == element.toString()) {
                          return true;
                        }
                      }
                      return false;
                    };
                    if (!checkExist()) {
                      setParameter([...parameter, element]);
                    }
                    console.log(parameter);
                  }
                }}
                className="ml-auto bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Lock Slot
              </button>
            )}
            {!lockedClasses.includes(
              currentClass + " B_Tech " + currentSection
            ) ? (
              <button
                onClick={() => {
                  if (
                    !lockedClasses.includes(
                      currentClass + " B_Tech " + currentSection
                    )
                  ) {
                    setLockedClasses(() => [
                      ...lockedClasses,
                      currentClass + " B_Tech " + currentSection,
                    ]);
                  }
                  console.log(lockedClasses);
                }}
                className="ml-2 bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Freeze
              </button>
            ) : (
              <button
                onClick={() => {
                  if (
                    lockedClasses.includes(
                      currentClass + " B_Tech " + currentSection
                    )
                  ) {
                    setLockedClasses(() => {
                      return lockedClasses.filter((el) => {
                        return (
                          el !== currentClass + " B_Tech " + currentSection
                        );
                      });
                    });
                  }
                  console.log(lockedClasses);
                }}
                className="ml-2 bg-[#282828] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Unfreeze
              </button>
            )}
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
      ) : (
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
            {profData[prof]?.map((row: any, index: number) => {
              return (
                <div className="flex gap-1 mb-1 select-none">
                  <div
                    key={(index + 1) * 100}
                    className="bg-[#1d2738] w-[113px] h-[70px] border-black border-2 flex items-center justify-center"
                  >
                    {days[index]}
                  </div>
                  <div className="flex gap-1" key={index}>
                    {row.map((col: string, index1: number) => {
                      return (
                        <div
                          key={`${index}${index1 + 1}`}
                          id={`${index}${index1 + 1}`}
                          onClick={() => {
                            handleSwapNLockSelect(index, index1);
                            console.log(col);
                          }}
                          className="bg-[#3d4758] w-[112.5px] h-[70px] border-black border-2 flex flex-col items-center justify-center text-xs font-semibold text-center"
                        >
                          {col.split(" ").length > 3
                            ? col
                                .split(" ")
                                .map((el: string, index: number) => {
                                  if (index != 0 && el != "T") {
                                    return el + " ";
                                  }
                                })
                            : col}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="w-full flex p-3">
            {isSwapMode ? (
              <button
                onClick={(e) => {
                  if (selectedElements.length === 2) {
                    console.log(selectedElements);
                    handleSwap(
                      selectedElements[0][0],
                      selectedElements[0][1],
                      selectedElements[1][0],
                      selectedElements[1][1]
                    );
                  }
                }}
                className="ml-auto bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Swap
              </button>
            ) : (
              <button
                onClick={(e) => {
                  if (selectedElements.length != 1) return;
                  const courseCode =
                    timetableData[currentClass + " B_Tech " + currentSection][
                      selectedElements[0][0]
                    ][selectedElements[0][1]].split(" ")[0];
                  const prof1 = classCourses[
                    currentClass + " B_Tech " + currentSection
                  ].find((el: any) => el[0] === courseCode);
                  console.log(prof1);
                  const element = [
                    currentClass + " B_Tech " + currentSection,
                    courseCode,
                    courseCode == "Self-Learning" ? "Self-Learning" : prof1[3],
                    selectedElements[0][0],
                    selectedElements[0][1],
                  ];
                  console.log(element);
                  if (selectedElements.length === 1) {
                    const checkExist = () => {
                      for (let i = 0; i < parameter.length; i++) {
                        if (parameter[i].toString() == element.toString()) {
                          return true;
                        }
                      }
                      return false;
                    };
                    if (!checkExist()) {
                      setParameter([...parameter, element]);
                    }
                    console.log(parameter);
                  }
                }}
                className="ml-auto bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Lock Slot
              </button>
            )}
            {!lockedClasses.includes(
              currentClass + " B_Tech " + currentSection
            ) ? (
              <button
                onClick={() => {
                  if (
                    !lockedClasses.includes(
                      currentClass + " B_Tech " + currentSection
                    )
                  ) {
                    setLockedClasses(() => [
                      ...lockedClasses,
                      currentClass + " B_Tech " + currentSection,
                    ]);
                  }
                  console.log(lockedClasses);
                }}
                className="ml-2 bg-[#3d4758] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Freeze
              </button>
            ) : (
              <button
                onClick={() => {
                  if (
                    lockedClasses.includes(
                      currentClass + " B_Tech " + currentSection
                    )
                  ) {
                    setLockedClasses(() => {
                      return lockedClasses.filter((el) => {
                        return (
                          el !== currentClass + " B_Tech " + currentSection
                        );
                      });
                    });
                  }
                  console.log(lockedClasses);
                }}
                className="ml-2 bg-[#282828] p-3 mt-3 rounded border-[#2d3748] border-r-[#071122] border-b-[#071122] border-2 active:border-black active:border-l-[#071122] active:border-t-[#071122]"
              >
                Unfreeze
              </button>
            )}
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
      )}
    </main>
  );
}
