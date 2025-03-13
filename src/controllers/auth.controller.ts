import {Request,Response} from "express";
import { prisma } from "../config/prisma.js";
import { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { AccountData, UserData } from "../models/auth.schemas.js";

interface LoginPayloadType{
  name:string;
  email:string;
  provider:string;
  oauth_id:string;
  image?:string;
}

class AuthController{

  static async login(request:Request,response:Response){
    try {
      const body:LoginPayloadType = request.body;
      let findUser = await prisma.user.findUnique({
        where:{
          email: body.email,
        }
      });
      if(!findUser){
        findUser = await prisma.user.create({
          data:body
        });
      }

      let JWTPayload={
        name:body.name,
        email:body.email,
        image:body.image,
        id:findUser.id,
      }

      const token = jwt.sign(JWTPayload,process.env.JWT_SECRET as string,{
        expiresIn:"30d"
      });

      return response.json({
        message:"Logged in Sucessfully!",
        user:{
          ...findUser,
          token:`Bearer ${token}`
        }
      })
    } catch (error) {
      console.log(error);
      return response.status(500).json({message:"Internal Server Error"});
    }
  }
}

export default AuthController;