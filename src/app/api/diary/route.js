import { getAuth, clerkClient } from "@clerk/nextjs/server";
import prisma from "../../../lib/db";

export async function GET(req) {
    const { userId } = getAuth(req);
    if (!userId) {
        return new Response(JSON.stringify({ error: "User not authenticated" }), { status: 401 });
    }
    let user = await prisma.user.findUnique({
        where: { clerkId: userId },
    })
    let diaries = await prisma.diary.findMany({
        where: {
            userId: user.id,
        },
    });

    return Response.json({ diaries });
}

export async function POST(req) {
    const { userId } = getAuth(req);

    const body = await req.json();

    if (!userId) {
        return new Response(JSON.stringify({ error: "User not authenticated" }), { status: 401 });
    }

    try {
        let clerkUser = await clerkClient.users.getUser(userId)
        clerkUser = {
            id: userId,
            name: clerkUser.firstName + " " + clerkUser.lastName,
            email: clerkUser.primaryEmailAddress.emailAddress,
        }
        let user = await prisma.user.findUnique({
            where: { clerkId: clerkUser.id },
        })
        if (!user) {
            user = await prisma.user.create({
                data: {
                    clerkId: clerkUser.id,
                    name: clerkUser.name || '', // Use fullName if available
                    email: clerkUser.email || '', // Use emailAddress if available
                },
            })
        }
        const diary = await prisma.diary.create({
            data: {
                title: body.title,
                content: body.content,
                userId: user.id,
            },
        });
        return new Response(JSON.stringify(diary), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
