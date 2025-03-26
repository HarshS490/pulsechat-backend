import { NextFunction, Request,Response } from "express"
import jwt from "jsonwebtoken"

const authMiddleWare = (req:Request,res:Response,next:NextFunction)=>{
  const authHeader = req.headers.authorization;
  if(authHeader===null || authHeader=== undefined){
    return res.status(401).json({status:401,message:"Unauthorized"});
  }
  const token = authHeader.split(" ")[1];

  //verify token
  const auth_secret = process.env.AUTH_SECRET;
  if(!auth_secret){
    throw new Error("Missing jwt secret from environment variables.");
  }

  jwt.verify(token,auth_secret,(err,user)=>{
    if(err) return res.status(401).json({status:401,message:"Unauthorized"});

    req.user = user as AuthUser;
  });
  next();
}

export {authMiddleWare};