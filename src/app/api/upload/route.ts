import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Data must be a non-empty array for bulk insertion' },
        { status: 400 }
      );
    }

    let insertQuery = '';
    let values = [];

    switch (type) {
      case 'faculty':
        insertQuery = `
          INSERT INTO Faculty (FacultyName, ShortForm) 
          VALUES ${data.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')}`;
        values = data.flatMap(({ FacultyName, ShortForm }) => [FacultyName, ShortForm]);
        break;

      case 'class':
        insertQuery = `
          INSERT INTO Class (ClassName) 
          VALUES ${data.map((_, i) => `($${i + 1})`).join(', ')}`;
        values = data.map(({ ClassName }) => ClassName);
        break;

      case 'course':
        insertQuery = `
          INSERT INTO Course (CourseCode, CourseName, CourseType, FacultyID, ClassID, Credits)
          VALUES ${data
            .map(
              (_, i) =>
                `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
            )
            .join(', ')}`;
        values = data.flatMap(({ CourseCode, CourseName, CourseType, FacultyID, ClassID, Credits }) => [
          CourseCode,
          CourseName,
          CourseType,
          FacultyID,
          ClassID,
          Credits,
        ]);
        break;

      case 'labAssignment':
        insertQuery = `
          INSERT INTO LabAssignment (CourseCode, Lab1, Lab2) 
          VALUES ${data.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ')}`;
        values = data.flatMap(({ CourseCode, Lab1, Lab2 }) => [CourseCode, Lab1, Lab2]);
        break;

      case 'timetable':
        insertQuery = `
          INSERT INTO Timetable (ClassID, Day, Period, CourseCode, IsTheory, FacultyID, LabAssignmentID)
          VALUES ${data
            .map(
              (_, i) =>
                `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
            )
            .join(', ')}`;
        values = data.flatMap(
          ({ ClassID, Day, Period, CourseCode, IsTheory, FacultyID, LabAssignmentID }) => [
            ClassID,
            Day,
            Period,
            CourseCode,
            IsTheory,
            FacultyID,
            LabAssignmentID,
          ]
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type specified' },
          { status: 400 }
        );
    }

    // Execute bulk insert
    await query(insertQuery, values);

    return NextResponse.json({ message: `${type} data inserted successfully` });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to insert data in bulk' },
      { status: 500 }
    );
  }
}
