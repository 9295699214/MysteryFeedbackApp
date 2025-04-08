import dbConnect from "@/lib/db.Connect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";

import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";

export async function POST(request: Request) {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
        return new Response("Please fill all the fields", {
            status: 400,
        });
    }

    await dbConnect();

    const existingUserVerfiedByUsername = await UserModel.findOne({ username, isVerified: true });
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (existingUserVerfiedByUsername) {
        return new Response("User already exists", {
            status: 400,
        });
    }

    const existingUserVerfiedByEmail = await UserModel.findOne({ email, isVerified: true });
    if (existingUserVerfiedByEmail) {

        if(existingUserVerfiedByEmail.isVerified){
            return new Response("User already exists with this email", {
                status: 400,
            });
        }else{
            const hashedPassword = await bcrypt.hash(password, 10);
            existingUserVerfiedByEmail.password = hashedPassword;
            existingUserVerfiedByEmail.verifyCode = verifyCode;
            existingUserVerfiedByEmail.verifyCodeExpire = new Date(Date.now() + 10 * 60 * 1000); 
            await existingUserVerfiedByEmail.save();
        }
        
    }else {

    const hashedPassword = await bcrypt.hash(password, 10);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 10); 

    const user = await UserModel.create({
        username,
        email,
        password: hashedPassword,
        verifyCode :verifyCode, 
        verifyCodeExpire : expiryDate,
        isVerified: false,
        isAcceptingMessages: true,
        messages: []
    });
    await user.save();

   }

    const emailResponse = await sendVerificationEmail(email, username, verifyCode);
    if (!emailResponse.success) {
        return new Response(emailResponse.message, {
            status: 500,
        });
    }

    return new Response("User registered successfully", {
        status: 201,
    });
}
