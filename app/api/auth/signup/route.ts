import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import client from "@/lib/db"
import { userSchema } from "@/types/schema"
import z from 'zod'

export async function POST(req: NextRequest, res: NextResponse){
    const body: z.infer<typeof userSchema> = await req.json();
    const parsedSchema = await userSchema.safeParse(body)

    if(!parsedSchema.success) return NextResponse.json({msg: "Please check your inputs"},
        {status: 411})

    const userExists = await client.user.findUnique({
        where:{
            email: body.email
        }
    })    
    if(userExists) return NextResponse.json({msg: "User already exists, login instead."},
        {status: 411})

     let hashedPassword = null;

     if(body.password){
             hashedPassword = await bcrypt.hash(body.password, 10)
            console.log("Password Hashed: ", hashedPassword)
       }

    try{
        const save = await client.user.create({
            data:{
                name: body.name,
                email: body.email,
                provider: body.provider,
                password: hashedPassword
            }

        })
    return NextResponse.json({ msg: "User created" }, { status: 201 });

    }
    catch(e){
        console.error(e);
        return NextResponse.json({ msg: "Something went wrong" }, { status: 500 });

    }

}