// Makes a random number

Math.seedrandom = function (seed) {
    return function () {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
};

let labMap = {}
let labRestrictions = {}
let proffRestrictions = {}

function adjustIndex(index) {
    if (index > 8) {
      index -= 1;
    }
    if (index > 3) {
      index -= 1;
    }
    return index;
}

function printObject(obj) {
    console.log(require('util').inspect((JSON.parse(JSON.stringify((obj)))), { depth: null }))
}

function make_random() {
    const currentTimeNs = Date.now() * 1000000;
    Math.seedrandom(currentTimeNs);
    return Math.floor(Math.random() * 100000000);
}

function shuffle_array(array) {
    let currentIndex = array.length;
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

//Checks if a professor is free on a specific day and slot
function is_free_professor(timetable_professors, proff, day, slot, clas) {
    if (timetable_professors[proff][day][slot] == "") {
        let clas_count = 0
        let period_count = 0;
        for (let i = 0; i < slot; i++) {
            if (typeof timetable_professors[proff][day][i] === typeof "Lunch") {
                continue;
            }
            if (timetable_professors[proff][day][i][1] == clas) {
                clas_count += 1;
            }
            period_count += 1;
        }
        return (clas_count < 1 && period_count < 6);
    }
    return false
}

function constructLabMap(labArray) {
    labArray.forEach(([labName, block, floor]) => {
        labMap[labName] = [block, floor];
    });
}

function constructRestrictions(lr, pr) {
    labRestrictions = lr;
    proffRestrictions = pr;
}

//Assumes Lab names start with CS, ECE, PHY etc. Uses that to return a list of labs for that course which are free for slots between slot1 and slot2 on that day 
function free_labs(timetable_labs, course_code, day, slot1, slot2) {
    const usable = [];

    for (const lab of Object.keys(timetable_labs)) {
        if (lab.startsWith(course_code.slice(0, 2))) {
            usable.push(lab);
        }
    }

    const temp = [...usable];
    for (const lab of usable) {
        for (let slot = slot1; slot < slot2; slot++) {
            if (timetable_labs[lab][day][slot] != "") {
                temp.splice(temp.indexOf(lab), 1);
                break;
            }
        }
    }

    return temp;
}

function getLabs(labsArray, count) {
    // If count is invalid, return empty array
    if (count <= 0 || count > labsArray.length) {
      return [];
    }
    
    // Group labs by academic block and floor
    const groupedLabs = {};
    
    labsArray.forEach(lab => {
      const [block, floor] = labMap[lab];
      
      if (!groupedLabs[block]) {
        groupedLabs[block] = {};
      }
      
      if (!groupedLabs[block][floor]) {
        groupedLabs[block][floor] = [];
      }
      
      groupedLabs[block][floor].push(lab);
    });
    
    // Find block and floor with enough labs
    // First try: same block, same floor
    for (const block in groupedLabs) {
      for (const floor in groupedLabs[block]) {
        if (groupedLabs[block][floor].length >= count) {
          return groupedLabs[block][floor].slice(0, count);
        }
      }
    }
    
    // Second try: same block, different floors
    for (const block in groupedLabs) {
      const blockLabs = Object.values(groupedLabs[block]).flat();
      if (blockLabs.length >= count) {
        return blockLabs.slice(0, count);
      }
    }
    
    // If no block has enough labs, return empty array
    return [];
}

// Checks if all courses are assigned to the classes
function is_assigned_courses(classes_to_courses) {
    for (let course of Object.values(classes_to_courses)) {
        if (course.length != 0) {
            return false;
        }
    }
    return true
}

function lab_insert(lab_classes, timetable_classes, timetable_professors, timetable_labs) {
    let classes = Object.keys(lab_classes);
    shuffle_array(classes)
    for (let clas of classes) {
        // if all lab classes are assigned, move on
        if (lab_classes[clas].length === 0) {
            continue
        }
        for (let day = 0; day < 5; day++) {
            for (let slot = 0; slot < 8; slot++) {
                if (timetable_classes[clas][day][slot] != "") {
                    continue;
                }

                if (make_random() % 5) {
                    continue;
                }

                //gets all possible labs and courses and puts them into a dictionary with course as key and labs as value
                let possible_labs = {}
                for (let lab_course of lab_classes[clas]) {
                    let check = true;
                    for (let i = 0; i < lab_course[2]; i++) {
                        if ((slot + i) >= 8 || timetable_classes[clas][day][slot + i] != "" || !is_free_professor(timetable_professors, lab_course[3], day, slot + i, clas)) {
                            check = false;
                            break;
                        }
                    }
                    if (!check) {
                        continue
                    }
                    let temp = free_labs(timetable_labs, lab_course[1], day, slot, slot + lab_course[2])
                    if (temp.length === 0 || temp.length < lab_course[4]) {
                        continue;
                    }
                    possible_labs[lab_course[1]] = temp;
                }
                if (Object.keys(possible_labs).length === 0) {
                    continue;
                }

                let options = Object.keys(possible_labs);
                let choice = options[make_random() % options.length];                
                let lab_count = -1;
                let course_details = []

                for (let lab_course of lab_classes[clas]) {
                    if (lab_course[1] == choice) {
                        course_details = lab_course;
                        lab_count = course_details[4]
                        break
                    }
                }
                for (let i = 0; i < course_details[2]; i++) {
                    timetable_classes[clas][day][slot + i] = [choice, course_details[3]]
                    timetable_professors[course_details[3]][day][slot + i] = [choice, clas]
                }

                let labs = getLabs(possible_labs[choice], lab_count);
                for (let lab of labs) {
                    for (let i = 0; i < course_details[2]; i++) {
                        timetable_classes[clas][day][slot + i].push(lab)
                        timetable_professors[course_details[3]][day][slot + i].push(lab)
                        timetable_labs[lab][day][slot + i] = [choice, clas, course_details[3]]
                    }
                }
                lab_classes[clas].splice(lab_classes[clas].indexOf(course_details), 1)
            }
        }
    }
}

function insertTheoryClassesRecursive(theory_classes, timetable_classes, timetable_professors) {
    // Create a deep copy of inputs to avoid modifying originals during backtracking
    const classes = JSON.parse(JSON.stringify(theory_classes));
    const classTimetable = JSON.parse(JSON.stringify(timetable_classes));
    const profTimetable = JSON.parse(JSON.stringify(timetable_professors));
    
    // Get all classes that need scheduling
    const classNames = Object.keys(classes);
    let cache = new Set()

    // Calculate total periods for each class
    const totalPeriodsNeeded = {};
    for (const className of classNames) {
      totalPeriodsNeeded[className] = 40; // Total periods per week (5 days * 8 slots)
      
      for (let day = 0; day < 5; day++) {
        for (let slot = 0; slot < 8; slot++) {
          if (classTimetable[className][day][slot] === "Lunch") {
            // Count lunch periods
            totalPeriodsNeeded[className]--;
          } else if (classTimetable[className][day][slot] != "") {
            // Count already assigned periods
            totalPeriodsNeeded[className]--;
          }
        }
      }
      
      // Calculate how many periods are already accounted for by courses
      let assignedPeriods = 0;
      for (const course of classes[className]) {
        assignedPeriods += course[2]
      }
      
      // Remaining periods are the difference
      totalPeriodsNeeded[className] -= assignedPeriods;
    }
    
    // Helper function to recursively assign classes
    function backtrack(classIndex, day, slot) {
      // If we've processed all classes, we're done
      if (classIndex >= classNames.length) {
        return true;
      }
      
      const currentClass = classNames[classIndex];
      
      // If we've gone through all slots for this class, try next class
      if (day >= 5) {
        return backtrack(classIndex + 1, 0, 0);
      }
      
      // If we've gone through all slots in this day, move to next day
      if (slot >= 8) {
        return backtrack(classIndex, day + 1, 0);
      }
      
      // If slot is already filled or it's lunch, move to next slot
      if (classTimetable[currentClass][day][slot] !== "") {
        return backtrack(classIndex, day, slot + 1);
      }

      const cacheKey = currentClass + day + slot + JSON.stringify(classes[currentClass]);
      if (cache.has(cacheKey)) {
        return false;
      }

      // Special handling for the last two slots of the day
      if (slot === 6) {
        // Check if last slot (7) is empty - if so, we need to decide whether to use self-learning for both
        if (classTimetable[currentClass][day][7] === "") {
          // Try using self-learning for both slots 6 and 7
          if (totalPeriodsNeeded[currentClass] >= 2) {
            classTimetable[currentClass][day][6] = [`Self-Learning`, "self_proff"];
            classTimetable[currentClass][day][7] = [`Self-Learning`, "self_proff"];
            
            totalPeriodsNeeded[currentClass] -= 2;
            
            if (backtrack(classIndex, day + 1, 0)) {
              return true;
            }
            
            // Undo if that didn't work
            classTimetable[currentClass][day][6] = "";
            classTimetable[currentClass][day][7] = "";
            totalPeriodsNeeded[currentClass] += 2;
          }
        }
      }
      
      // Try to assign a course to this slot
      const possibleCourses = [];
      
      for (let i = 0; i < classes[currentClass].length; i++) {
        const course = classes[currentClass][i];
        if (course[0] == "T" && course[2] > 0 && is_free_professor(profTimetable, course[3], day, slot, currentClass)) {
            possibleCourses.push(i)
        } else if (course[0] == "E") {
            let count = (course.length - 3)/2
            let check = true
            for (let i = 0; i < count; i++) {
                if (!is_free_professor(profTimetable, course[i*2 + 4], day, slot, currentClass)) {
                    check = false;
                    break;
                }
            }
            if (check) {
                possibleCourses.push(i)
            }
        }
      }
      
      shuffle_array(possibleCourses);
      
      // Try each possible course
      for (const courseIndex of possibleCourses) {
        const course = classes[currentClass][courseIndex];
        
        // Assign the course
        if (course[0] == "T") {
            classTimetable[currentClass][day][slot] = [course[1], course[3]];
            profTimetable[course[3]][day][slot] = [course[1], currentClass];
        } else {
            classTimetable[currentClass][day][slot] = [course[1], "E"];
            let count = (course.length - 3)/2;
            for (let i = 0; i < count; i++) {
                classTimetable[currentClass][day][slot].push(course[i*2 + 4])
                profTimetable[course[i*2 + 4]][day][slot] = [course[1], currentClass];
            }
        }

        // Update remaining classes
        course[2]--;
        
        // Recursively try to assign the rest
        if (backtrack(classIndex, day, slot + 1)) {
          return true;
        }
        
        // Backtrack - undo the assignment
        classTimetable[currentClass][day][slot] = "";
        if (course[0] == "E") {
            let count = (course.length - 3)/2;
            for (let i = 0; i < count; i++) {
                profTimetable[course[i*2 + 4]][day][slot] = "";
            }
        } else {
            profTimetable[course[3]][day][slot] = "";
        }
        
        course[2]++;
      }
      
      // If no course worked and we still have self-learning slots available, use self-learning
      if (totalPeriodsNeeded[currentClass] > 0) {
        // Create a self-learning period
        const selfLearningCourse = ["Self-Learning", "self_proff"];
        
        // Assign the self-learning
        classTimetable[currentClass][day][slot] = selfLearningCourse;
        
        // Decrease total periods needed
        totalPeriodsNeeded[currentClass]--;
        
        // Try to continue with rest of scheduling
        if (backtrack(classIndex, day, slot + 1)) {
          return true;
        }
        
        // If that didn't work, undo
        classTimetable[currentClass][day][slot] = "";
        totalPeriodsNeeded[currentClass]++;
      }
      
      // If no course worked, return false
      cache.add(cacheKey);
      return false;
    }
    
    // Start backtracking from the first class, day, and slot
    const result = backtrack(0, 0, 0);
    
    // If successful, update the original timetables
    if (result) {
      Object.assign(theory_classes, classes);
      Object.assign(timetable_classes, classTimetable);
      Object.assign(timetable_professors, profTimetable);
    }
    
    return result;
}

// removes courses for classes in locked_Classes
function initialise_class_courses(class_courses, locked_classes) {
    let result = JSON.parse(JSON.stringify(class_courses))
    let temp = JSON.parse(JSON.stringify(class_courses));

    // Remove keys that are in locked_classes
    for (let locked_class of locked_classes) {
        if (result.hasOwnProperty(locked_class)) {
            delete result[locked_class];
        }
    }

    return [result, temp];
}

// its in the name
function initialise_timetables(classes_to_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable) {
    let timetable_classes_ini = {}
    let timetable_professors_ini = {}
    let timetable_labs_ini = {}

    for (let clas of Object.keys(classes_to_courses)) {
        if (locked_classes.includes(clas)) {
            continue;
        }
        timetable_classes_ini[clas] = [["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""]]
    }

    // Adds the classes of locked classes
    for (let clas of locked_classes) {
        timetable_classes_ini[clas] = JSON.parse(JSON.stringify((classes_initial_timetable[clas])));
    }

    for (let proff of professors) {
        timetable_professors_ini[proff] = [["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""]]
    }
    timetable_professors_ini["self_proff"] = [["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""]]

    for (let lab of labs) {
        timetable_labs_ini[lab[0]] = [["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""]]
    }

    // For professors who teach accross 1st and 2nd eyar, they have 2 Lunchs as I dont want to deal with the logic otherwise
    let proff_to_year = {}
    for (let [clas, courses] of Object.entries(classes_to_courses)) {
        for (let course of courses) {
            if (course[0] == "T" || course[0] == "L") {
                if (proff_to_year[course[3]]) {
                    if (proff_to_year[course[3]] != clas.slice(0, 1)) {
                        proff_to_year[course[3]] = "cross"
                    }
                } else {
                    proff_to_year[course[3]] = clas.slice(0, 1)
                }
            } else {
                let count = (course.length - 3)/2;
                for (let i = 0; i < count; i++) {
                    if (proff_to_year[course[i*2 + 4]] && proff_to_year[course[i*2 +4]] != clas.slice(0,1)) {
                        proff_to_year[course[i*2 + 4]] = "cross";
                    } else {
                        proff_to_year[course[i*2 + 4]] = clas.slice(0,1);
                    }
                }
            }
        }
    }

    for (let clas of Object.keys(timetable_classes_ini)) {
        if (clas.slice(0, 1) === "1") {
            for (let day = 0; day < timetable_classes_ini[clas].length; day++) {
                timetable_classes_ini[clas][day][4] = "Lunch"
            }
        } else {
            for (let day = 0; day < timetable_classes_ini[clas].length; day++) {
                timetable_classes_ini[clas][day][5] = "Lunch"
            }
        }
    }

    for (let proff of Object.keys(proff_to_year)) {
        if (proff.includes("self")) {
            continue;
        }
        if (proff_to_year[proff] === "1") {
            for (let day = 0; day < timetable_professors_ini[proff].length; day++) {
                timetable_professors_ini[proff][day][4] = "Lunch"
            }
        } else if (proff_to_year[proff] === "cross") {
            for (let day = 0; day < timetable_professors_ini[proff].length; day++) {
                timetable_professors_ini[proff][day][4] = "Lunch"
            }
        } else {
            for (let day = 0; day < timetable_professors_ini[proff].length; day++) {
                timetable_professors_ini[proff][day][5] = "Lunch"
            }
        }
    }
    
    // Adds periods of locked classes to professor timetable
    for (let proff of Object.keys(proffs_initial_timetable)) {
        for (let day = 0; day < 5; day++) {
            for (let slot = 0; slot < 8; slot++) {
                if (locked_classes.includes(proffs_initial_timetable[proff][day][slot][1])) {
                    timetable_professors_ini[proff][day][slot] = JSON.parse(JSON.stringify(proffs_initial_timetable[proff][day][slot]));
                }
            }
        }
    }

    for (let lab of Object.keys(labs_initial_timetable)) {
        for (let day = 0; day < 5; day++) {
            for (let slot = 0; slot < 8; slot++) {
                if (typeof labs_initial_timetable[lab][day][slot] == typeof "string") {
                    continue;
                }
                if (locked_classes.includes(labs_initial_timetable[lab][day][slot][1])) {
                    timetable_labs_ini[lab][day][slot] = JSON.parse(JSON.stringify(labs_initial_timetable[lab][day][slot]));
                }
            }
        }
    }

    for (const lab in labRestrictions) {
        if (timetable_labs_ini.hasOwnProperty(lab)) {
            labRestrictions[lab].forEach(([day, slot]) => {
                timetable_labs_ini[lab][day][slot] = "Blocked";
            });
        }
    }

    for (const proff in proffRestrictions) {
        if (timetable_professors_ini.hasOwnProperty(proff)) {
            proffRestrictions[proff].forEach(([day, slot]) => {
                if (timetable_professors_ini[proff][day][slot] != "Lunch") timetable_professors_ini[proff][day][slot] = "Blocked";
            });
        }
    }

    let temp = JSON.parse(JSON.stringify(initial_lectures));
    let classes_to_courses_temp = JSON.parse(JSON.stringify(classes_to_courses));

    for (let lecture of temp) {
        if (locked_classes.includes(lecture[0])) continue;
        if (lecture.length == 5) {            
            let [clas, course_code, proff, day, slot] = lecture;
            slot = adjustIndex(slot);
            if (locked_classes.includes(clas)) {
                continue;
            }
            let i = 0;
            while (i < classes_to_courses_temp[clas].length) {
                let course = classes_to_courses_temp[clas][i];
                if (course[1] == course_code && course[3] == proff && timetable_classes_ini[clas][day][slot] == "" && is_free_professor(timetable_professors_ini, proff, day, slot, clas)) {
                    timetable_classes_ini[clas][day][slot] = [course_code, proff]
                    if (proff != "self_proff") {
                        timetable_professors_ini[proff][day][slot] = [course_code, clas]
                    }
                    initial_lectures.splice(initial_lectures.indexOf(lecture), 1);
                    course[2] -= 1
                    if (course[2] == 0) {
                        classes_to_courses_temp[clas].splice(classes_to_courses_temp[clas].indexOf(course), 1);
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }
            }
        }
    }
    return [timetable_classes_ini, timetable_professors_ini, timetable_labs_ini, proff_to_year, classes_to_courses_temp]
}

// Its in the name
function get_replacements(classes_to_courses, timetable_professors, locked_classes) {
    let proff_replacements = {}
    for (let prof of Object.keys(timetable_professors)) {
        proff_replacements[prof] = {}
        for (let day = 0; day < 5; day++) {
            for (let slot = 0; slot < 8; slot++) {
                if (typeof timetable_professors[prof][day][slot] == typeof "string") {
                    continue
                }
                let clas = timetable_professors[prof][day][slot][1]
                if (locked_classes.includes(clas)) {
                    continue;
                }
                let replacements = []
                for (let course of classes_to_courses[clas]) {
                    if (course[0] == "T" || course[0] == "L") {
                        if (is_free_professor(timetable_professors, course[3], day, slot, clas)) {
                            replacements.push(course[3])
                        }
                    } else if (course[0] == "E") {
                        let check = true;
                        let count = (course.length - 3)/2;
                        for (let i = 0; i < count; i++) {
                            if (!is_free_professor(timetable_professors, course[i*2 + 4], day, slot, clas)) {
                                check = false;
                                break;
                            }
                        }
                        if (check) {
                            for (let i = 0; i < count; i++) {
                                replacements.push(course[i*2 + 4]);
                            }
                        }
                    }
                }
                proff_replacements[prof][day.toString() + slot.toString()] = replacements;
            }
        }
    }
    return proff_replacements
}

function get_timetables(class_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable) {
    // Initialises courses and timetables
    let [classes_to_courses, original] = initialise_class_courses(class_courses, locked_classes);
    let [timetable_classes_ini, timetable_professors_ini, timetable_labs_ini, proff_to_year, classes_to_courses_temp] = initialise_timetables(classes_to_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable);

    classes_to_courses = JSON.parse(JSON.stringify(classes_to_courses_temp));

    let check = false;
    let fallback = 0;

    // Fallbacks and all are used to avoid infinite while loops
    while (!check && fallback < 100) {
        let classes_to_courses1 = JSON.parse(JSON.stringify(classes_to_courses));

        let timetable_classes = JSON.parse(JSON.stringify(timetable_classes_ini));
        let timetable_professors = JSON.parse(JSON.stringify(timetable_professors_ini));
        let timetable_labs = JSON.parse(JSON.stringify(timetable_labs_ini));

        let lab_classes = {};
        for (let [clas, courses] of Object.entries(classes_to_courses1)) {
            let lab_course = courses.filter(course => course[0] === "L" || course[0] == "EL");
            lab_classes[clas] = JSON.parse(JSON.stringify(lab_course));
            // Makes a dictionary of courses with lab courses only
        }

        let theory_classes = {};
        for (let [clas, courses] of Object.entries(classes_to_courses1)) {
            theory_classes[clas] = courses.filter(course => course[0] === "T" || course[0] == "E");
        }
        
        let failsafe = 0
        // Keeps on looping and assigns lab classes
        while (!is_assigned_courses(lab_classes) && failsafe < 10) {
            lab_insert(lab_classes, timetable_classes, timetable_professors, timetable_labs);
            failsafe += 1;
        }
        if (!is_assigned_courses(lab_classes)) {
            fallback += 1;
            continue;
        }

        let theorySuccess = insertTheoryClassesRecursive(theory_classes, timetable_classes, timetable_professors);
        
        // If theory assignment failed, restart the outer loop
        if (!theorySuccess) {
            fallback += 1;
            continue
        }

        try {
            let proff_replacements = get_replacements(original, timetable_professors, locked_classes);
            return [timetable_classes, timetable_professors, proff_replacements, timetable_labs, proff_to_year]
        } catch (error) {
            console.log("Error getting replacements", error);
        }
        fallback += 1;
    }
    return {}
}

export function randomize(class_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable, labRestrictionsTemp, proffRestrictionsTemp) {
    try {
        constructLabMap(labs);
        constructRestrictions(labRestrictionsTemp, proffRestrictionsTemp);
        const result = get_timetables(class_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable);
        return result;
    } catch (error) {
        console.error('Error generating timetables:', error);
        return {};
    }
}