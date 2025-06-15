import { NextRequest, NextResponse } from "next/server";
import { randomize } from "./algo";


export async function POST(request: NextRequest) {
    try {
        // Parse the incoming request body
        // console.log(request.body);
        const body = await request.json();
        // console.log(body);
        const class_courses = body[0];
        const professors = body[1];
        const labs = body[2];
        const parameter = body[3];
        const lockedClasses = body[4];
        const timetableProfessors = body[5];
        const timetableClasses = body[6];
        const timetableLabs = body[7];
        const labsRest = body[8];
        const proffRest = body[9];

        // console.log(class_courses, professors, proffs_names_to_short, labs, parameter, lockedClasses, timetableProfessors, timetableClasses, timetableLabs);
        const result = randomize(class_courses, professors, labs, parameter, lockedClasses, timetableProfessors, timetableClasses, timetableLabs, labsRest, proffRest);
        // console.log(result);
        return NextResponse.json({ result }, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, {
            status: 500,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}
