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

function lab_insert(lab_classes, timetable_classes, timetable_professors, timetable_labs, class_phy_cprog_lab) {
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

                //gets all possible labs and courses and puts them into a dictionary with course as key and labs as value
                let possible_labs = {}
                for (let lab_course of lab_classes[clas]) {
                    let check = true;
                    for (let i = 0; i < lab_course[1]; i++) {
                        if ((slot + i) >= 8 || timetable_classes[clas][day][slot + i] != "" || !is_free_professor(timetable_professors, lab_course[3], day, slot + i, clas)) {
                            check = false;
                            break
                        }
                    }
                    if (!check) {
                        continue
                    }
                    let temp = free_labs(timetable_labs, lab_course[0], day, slot, slot + lab_course[1])
                    if (temp.length === 0 || temp.length < lab_course[4]) {
                        continue;
                    }
                    possible_labs[lab_course[0]] = temp;
                }
                if (Object.keys(possible_labs).length === 0) {
                    continue
                }

                // To spread out the labs
                if (make_random() % 5 != 0) {
                    continue;
                }

                let options = Object.keys(possible_labs);
                let choice = options[make_random() % options.length];

                // Special Condition for engineering physics and c programming for first years in which they are together
                if (((choice == "PHY102") && (options.includes("CSE102"))) || ((choice == "CSE102") && (options.includes("PHY102") && !clas.includes("IoT")))) {
                    let lab1 = "PHYLAB1"
                    let lab2 = possible_labs["CSE102"][make_random() % possible_labs["CSE102"].length];
                    let hours = 0;
                    let phy_course = []
                    let cpo_course = []
                    for (let lab_course of lab_classes[clas]) {
                        if (lab_course[0] === "PHY102") {
                            hours = lab_course[1]
                            phy_course = lab_course
                        } else if (lab_course[0] === "CSE102") {
                            cpo_course = lab_course
                        }
                    }
                    for (let i = 0; i < hours; i++) {
                        timetable_classes[clas][day][slot + i] = ["PHY102", "CSE102", phy_course[3], cpo_course[3], lab1, lab2];
                        timetable_professors[phy_course[3]][day][slot + i] = ["PHY102", clas, lab1]
                        timetable_professors[cpo_course[3]][day][slot + i] = ["CSE102", clas, lab2]
                        timetable_labs[lab1][day][slot + i] = ["PHY102", clas, phy_course[3]]
                        timetable_labs[lab2][day][slot + i] = ["CSE102", clas, cpo_course[3]]
                    }
                    if (class_phy_cprog_lab[clas]) {
                        lab_classes[clas].splice(lab_classes[clas].indexOf(phy_course), 1)
                        lab_classes[clas].splice(lab_classes[clas].indexOf(cpo_course), 1)
                    } else {
                        class_phy_cprog_lab[clas] = "done"
                    }
                    continue
                }
                // Special Condition for C programming only for first year IoT
                if (choice == "CSE102" && clas.includes("IoT")) {
                    if (possible_labs[choice].length < 2) {
                        continue
                    }
                    let lab1 = possible_labs[choice][make_random() % possible_labs[choice].length];
                    let lab2 = possible_labs[choice][make_random() % possible_labs[choice].length];
                    while (lab1 == lab2) {
                        lab1 = possible_labs[choice][make_random() % possible_labs[choice].length];
                        lab2 = possible_labs[choice][make_random() % possible_labs[choice].length];
                    }
                    let course_details = []
                    for (let lab_course of lab_classes[clas]) {
                        if (lab_course[0] == choice) {
                            course_details = lab_course;
                            break;
                        }
                    }
                    for (let i = 0; i < course_details[1]; i++) {
                        timetable_classes[clas][day][slot + i] = ["CSE102", course_details[3], lab1, lab2]
                        timetable_professors[course_details[3]][day][slot + i] = ["CSE102", clas, lab1, lab2]
                        timetable_labs[lab1][day][slot + i] = ["CSE102", clas, course_details[3]]
                        timetable_labs[lab2][day][slot + i] = ["CSE102", clas, course_details[3]]
                    }
                    lab_classes[clas].splice(lab_classes[clas].indexOf(course_details), 1)
                    continue
                }
                if (choice == "PHY102" || choice == "CSE102") {
                    if (options.length == 1) {
                        continue;
                    }
                    else {
                        while (choice == "PHY102" || choice == "CSE102") {
                            choice = options[make_random() % options.length];
                        }
                    }
                }
                
                let lab_count = -1;
                let course_details = []
                for (let lab_course of lab_classes[clas]) {
                    if (lab_course[0] == choice) {
                        course_details = lab_course;
                        lab_count = course_details[4]
                        break
                    }
                }
                let labs = getLabs(possible_labs[choice], lab_count);
                for (let i = 0; i < course_details[1]; i++) {
                    timetable_classes[clas][day][slot + i] = [choice, course_details[3]]
                    timetable_professors[course_details[3]][day][slot + i] = [choice, clas]
                }
                for (let lab of labs) {
                    for (let i = 0; i < course_details[1]; i++) {
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
        assignedPeriods += course[1];
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
        if (course[1] > 0 && is_free_professor(profTimetable, course[3], day, slot, currentClass)) {
            possibleCourses.push(i);
        }
      }

      
      shuffle_array(possibleCourses);
      
      // Try each possible course
      for (const courseIndex of possibleCourses) {
        const course = classes[currentClass][courseIndex];
        
        // Assign the course
        classTimetable[currentClass][day][slot] = [course[0], course[3]];
        profTimetable[course[3]][day][slot] = [course[0], currentClass];
        
        // Update remaining classes
        course[1]--;
        
        // Recursively try to assign the rest
        if (backtrack(classIndex, day, slot + 1)) {
          return true;
        }
        
        // Backtrack - undo the assignment
        classTimetable[currentClass][day][slot] = "";
        profTimetable[course[3]][day][slot] = "";
        
        course[1]++;
      }
      
      // If no course worked and we still have self-learning slots available, use self-learning
      // Avoid putting self-learning early in the day unless necessary
      
      if (totalPeriodsNeeded[currentClass] > 0) {
        // Create a self-learning period
        const selfLearningCourse = [`Self-Learning`, "self_proff"];
        
        // Assign the self-learning
        classTimetable[currentClass][day][slot] = [selfLearningCourse[0], selfLearningCourse[3]];
        
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

// Adds theory classes for labs and splits Lab and Theory classes like Digital Design and OS. Also removes courses for classes in locked_Classes
function initialise_class_courses(class_courses, locked_classes) {
    let result = JSON.parse(JSON.stringify(class_courses));

    for (let [clas, courses] of Object.entries(result)) {
        for (let i = 0; i < courses.length; i++) {
            let course = courses[i];
            if (course[2] === "LT") {
                let temp_1 = [course[0] + " T", course[1] - 2, "T", course[3]];
                course[1] = 2;
                course[2] = "L";
                course[4] = parseInt(course[4]);
                result[clas].push(temp_1);
            } else if (course[2] === "L") {
                course[1] = parseInt(course[1]) - 1;
                course[4] = parseInt(course[4]);
                let temp_1 = [course[0] + " T", 1, "T", course[3]];
                result[clas].push(temp_1);
            }
        }
    }

    // No longer adding self-learning courses here
    // Instead, they will be dynamically added in the backtracking algorithm

    let temp = JSON.parse(JSON.stringify(result));
    // Remove keys that are in locked_classes
    for (let locked_class of locked_classes) {
        if (result.hasOwnProperty(locked_class)) {
            delete result[locked_class];
        }
    }

    return [result, temp];
}

// its in the name
function initialise_timetables(classes_to_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable, initial_proffs) {
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
            if (proff_to_year[course[3]]) {
                if (proff_to_year[course[3]] != clas.slice(0, 1)) {
                    proff_to_year[course[3]] = "cross"
                }
            } else {
                proff_to_year[course[3]] = clas.slice(0, 1)
            }
        }
    }

    //Adds lunch periods
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
    temp.push(["2nd Year B_Tech AIDS Section A", "CS2805", "Dr.Debajyoti Biswas", 0, 0, 2, "CSELAB17", "CSELAB13"]);

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
                if (course[0] == course_code && course[3] == proff && timetable_classes_ini[clas][day][slot] == "" && is_free_professor(timetable_professors_ini, proff, day, slot, clas)) {
                    timetable_classes_ini[clas][day][slot] = [course_code, proff]
                    if (proff != "self_proff") {
                        timetable_professors_ini[proff][day][slot] = [course_code, clas]
                    }
                    initial_lectures.splice(initial_lectures.indexOf(lecture), 1);
                    course[1] -= 1
                    if (course[1] == 0) {
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

    for (let i of initial_proffs) {
        let proff = i[0];
        let days = i[1];
        let slots = i[2];
        let possible_slots = [];
        for (let day of days) {
            for (let slot of slots) {
                possible_slots.push([day, slot]);
            }
        }
        let proff_courses = [];
        for (let clas of Object.keys(classes_to_courses)) {
            for (let course of [...classes_to_courses_temp[clas]]) {
                if (course[3] === proff) {
                    proff_courses.push([clas, course]);
                }
            }
        }
        shuffle_array(possible_slots);
        for (let period of possible_slots) {
            let possible = [];
            for (let classes of proff_courses) {
                if (is_free_professor(timetable_professors_ini, proff, period[0], period[1], classes[0]) && timetable_classes_ini[classes[0]][period[0]][period[1]].length == 0) {
                    possible.push(classes);
                }
            }
            if (possible.length == 0) {
                continue;
            }
            let choice = possible[make_random() % possible.length];
            timetable_classes_ini[choice[0]][period[0]][period[1]] = [choice[1][0], proff];
            timetable_professors_ini[proff][period[0]][period[1]] = [choice[1][0], choice[0]];
            let i = 0;
            while (i < classes_to_courses_temp[choice[0]].length) {
                let course = classes_to_courses_temp[choice[0]][i];
                if (course[0] == choice[1][0]) {
                    course[1] -= 1;
                    if (course[1] == 0) {
                        classes_to_courses_temp[choice[0]].splice(classes_to_courses_temp[choice[0]].indexOf(course), 1);
                        break;
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }
            }
            i = 0;
            while (i < proff_courses.length) {
                let course = proff_courses[i];
                if (course[0] == choice[0]) {
                    if (course[1][1] == 0) {
                        proff_courses.splice(proff_courses.indexOf(course), 1);
                        break;
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

function verify_everything(classes_to_courses, timetable_classes, timetable_professors, timetable_labs) {
    let classes = Object.keys(classes_to_courses);
    shuffle_array(classes);

    for (let clas of classes) {
        for (let day = 0; day < 5; day++) {
            let self_count = 0;
            for (let slot = 0; slot < 8; slot++) {
                if (timetable_classes[clas][day][slot] === "") {
                    console.log(`Class ${clas}, Day ${day}, Slot ${slot}: Empty slot`);
                    return false;
                }

                if (timetable_classes[clas][day][slot] === "Lunch") {
                    continue;
                }

                const temp = timetable_classes[clas][day][slot];

                if (temp.length === 2) {
                    if (temp[0].includes("Self-Learning")) {
                        // self_count += 1;
                        // if (self_count > 3) {
                        //     console.log(`Class ${clas}, Day ${day}, Slot ${slot}: Too many self-learning periods`);
                        //     // Not failing on this - it's a soft constraint now
                        //     // return false;
                        // }
                        // Self-learning periods are generated dynamically now, no need to check classes_to_courses
                        continue;
                    }
                    if (timetable_professors[temp[1]][day][slot][0] != temp[0] || timetable_professors[temp[1]][day][slot][1] != clas) {
                        console.log(`Class ${clas}, Day ${day}, Slot ${slot}: Professor mismatch for ${temp}`);
                        console.log(`Professor slot content: ${timetable_professors[temp[1]][day][slot]}`);
                        return false;
                    }
                    timetable_professors[temp[1]][day][slot] = "";
                    for (let i = 0; i < classes_to_courses[clas].length; i++) {
                        if (classes_to_courses[clas][i][0] === temp[0]) {
                            classes_to_courses[clas][i][1] -= 1;
                            if (classes_to_courses[clas][i][1] === 0) {
                                classes_to_courses[clas].splice(i, 1);
                            }
                            break;
                        }
                    }
                    continue;
                } else if (temp.length >= 4) {
                    if (temp.length === 6 && temp[0].includes("PHY102") && temp[1].includes("CSE102")) {
                        if (timetable_labs[temp[4]][day][slot][0] != temp[0] || timetable_labs[temp[4]][day][slot][1] != clas || timetable_labs[temp[4]][day][slot][2] != temp[2] ||
                            timetable_labs[temp[5]][day][slot][0] != temp[1] || timetable_labs[temp[5]][day][slot][1] != clas || timetable_labs[temp[5]][day][slot][2] != temp[3] ||
                            timetable_professors[temp[2]][day][slot][0] != temp[0] || timetable_professors[temp[2]][day][slot][1] != clas || timetable_professors[temp[2]][day][slot][2] != temp[4] ||
                            timetable_professors[temp[3]][day][slot][0] != temp[1] || timetable_professors[temp[3]][day][slot][1] != clas || timetable_professors[temp[3]][day][slot][2] != temp[5]) {
                            console.log(`Class ${clas}, Day ${day}, Slot ${slot}: Lab or professor mismatch for ${temp}`);
                            console.log(`Lab slot content 1: ${timetable_labs[temp[4]][day][slot]}`);
                            console.log(`Lab slot content 2: ${timetable_labs[temp[5]][day][slot]}`);
                            console.log(`Professor slot content 1: ${timetable_professors[temp[2]][day][slot]}`);
                            console.log(`Professor slot content 2: ${timetable_professors[temp[3]][day][slot]}`);
                            return false;
                        }
                        timetable_professors[temp[2]][day][slot] = "";
                        timetable_professors[temp[3]][day][slot] = "";
                        timetable_labs[temp[4]][day][slot] = "";
                        timetable_labs[temp[5]][day][slot] = "";
                        continue;
                    }
                    for (let i = 2; i < temp.length; i++) {
                        if (
                            timetable_labs[temp[i]][day][slot][0] != temp[0] ||
                            timetable_labs[temp[i]][day][slot][1] != clas ||
                            timetable_labs[temp[i]][day][slot][2] != temp[1]
                        ) {
                            console.log(`Class ${clas}, Day ${day}, Slot ${slot}: Lab mismatch for ${temp[i]}`);
                            console.log(`Lab slot content: ${timetable_labs[temp[i]][day][slot]}`);
                            return false;
                        }
                        timetable_labs[temp[i]][day][slot] = ""
                    }
                    
                    if (
                        timetable_professors[temp[1]][day][slot][0] != temp[0] ||
                        timetable_professors[temp[1]][day][slot][1] != clas
                    ) {
                        console.log(`Class ${clas}, Day ${day}, Slot ${slot}: Professor mismatch for ${temp[1]}`);
                        console.log(`Professor slot content: ${timetable_professors[temp[1]][day][slot]}`);
                        return false;
                    }
                    
                    timetable_professors[temp[1]][day][slot] = "";
                    for (let i = 3; i < temp.length; i++) {
                        timetable_labs[temp[i]][day][slot] = "";
                    }
                } else {
                    console.log("tempt: ", temp)
                }
            }
        }
    }

    for (let proff of Object.keys(timetable_professors)) {
        for (let day = 0; day < 5; day++) {
            for (let slot = 0; slot < 8; slot++) {
                if (timetable_professors[proff][day][slot] != "" && timetable_professors[proff][day][slot] != "Lunch" && timetable_professors[proff][day][slot] != "Blocked") {
                    console.log(`Professor ${proff}, Day ${day}, Slot ${slot}: Non-empty slot`);
                    console.log(`Slot content: ${timetable_professors[proff][day][slot]}`);
                    return false;
                }
            }
        }
    }

    for (let lab of Object.keys(timetable_labs)) {
        for (let day = 0; day < 5; day++) {
            for (let slot = 0; slot < 8; slot++) {
                if (timetable_labs[lab][day][slot] != "" && timetable_labs[lab][day][slot] != "Blocked") {
                    console.log(`Lab ${lab}, Day ${day}, Slot ${slot}: Non-empty slot`);
                    console.log(`Slot content: ${timetable_labs[lab][day][slot]}`);
                    return false;
                }
            }
        }
    }
    return true;
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
                    if (is_free_professor(timetable_professors, course[3], day, slot, clas)) {
                        replacements.push(course[3])
                    }
                }
                proff_replacements[prof][day.toString() + slot.toString()] = replacements;
            }
        }
    }
    return proff_replacements
}

function get_timetables(class_courses, professors, proff_to_short, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable, initial_proffs) {
    // Initialises courses and timetables
    let [classes_to_courses, original] = initialise_class_courses(class_courses, locked_classes);
    let [timetable_classes_ini, timetable_professors_ini, timetable_labs_ini, proff_to_year, classes_to_courses_temp] = initialise_timetables(classes_to_courses, professors, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable, initial_proffs);

    classes_to_courses = JSON.parse(JSON.stringify(classes_to_courses_temp));

    let check = false;
    let fallback = 0;

    // Fallbacks and all are used to avoid infinite while loops
    while (!check && fallback < 200) {
        let classes_to_courses1 = JSON.parse(JSON.stringify(classes_to_courses));

        let timetable_classes = JSON.parse(JSON.stringify(timetable_classes_ini));
        let timetable_professors = JSON.parse(JSON.stringify(timetable_professors_ini));
        let timetable_labs = JSON.parse(JSON.stringify(timetable_labs_ini));

        let lab_classes = {};
        for (let [clas, courses] of Object.entries(classes_to_courses1)) {
            let lab_course = courses.filter(course => course[2] === "L");
            lab_classes[clas] = JSON.parse(JSON.stringify(lab_course));
            // Makes a dictionary of courses with lab courses only
        }

        let theory_classes = {};
        for (let [clas, courses] of Object.entries(classes_to_courses1)) {
            theory_classes[clas] = courses.filter(course => course[2] === "T");
            // Makes a dictionary of courses with theory courses only
        }

        // purely for first year c programming and engineering physics MAGIC
        let class_phy_cprog_lab = {}
        let failsafe = 0
        // Keeps on looping and assigns lab classes
        while (!is_assigned_courses(lab_classes) && failsafe < 10) {
            lab_insert(lab_classes, timetable_classes, timetable_professors, timetable_labs, class_phy_cprog_lab);
            failsafe += 1;
        }
        if (!is_assigned_courses(lab_classes)) {
            continue;
        }

        let theorySuccess = insertTheoryClassesRecursive(theory_classes, timetable_classes, timetable_professors);
        
        // If theory assignment failed, restart the outer loop
        if (!theorySuccess) {
            fallback += 1;
            continue;
        }

        let timetable_professors_copy = JSON.parse(JSON.stringify(timetable_professors));
        let timetable_labs_copy = JSON.parse(JSON.stringify(timetable_labs));
        let origina_temp = JSON.parse(JSON.stringify(original));
        check = verify_everything(origina_temp, timetable_classes, timetable_professors_copy, timetable_labs_copy);
        if (check) {
            try {
                let proff_replacements = get_replacements(original, timetable_professors, locked_classes);
                return [timetable_classes, timetable_professors, proff_replacements, timetable_labs, proff_to_year]
            } catch (error) {
                console.log("Error getting replacements", error);
            }
        }
        fallback += 1;
    }
    return {}
}

export function randomize(class_courses, professors, proff_to_short, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable, initial_proffs, labRestrictionsTemp, proffRestrictionsTemp) {
    try {
        constructLabMap(labs);
        constructRestrictions(labRestrictionsTemp, proffRestrictionsTemp);
        const result = get_timetables(class_courses, professors, proff_to_short, labs, initial_lectures, locked_classes, proffs_initial_timetable, classes_initial_timetable, labs_initial_timetable, initial_proffs);
        return result;
    } catch (error) {
        console.error('Error generating timetables:', error);
        return {};
    }
}