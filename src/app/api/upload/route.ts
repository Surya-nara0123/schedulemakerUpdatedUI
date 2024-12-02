import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function getData() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
    }
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql`...`;
    return data;
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
    }
    const sql = neon(process.env.DATABASE_URL);
    // Insert data into the database
    await sql;
}