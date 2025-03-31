import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";


interface LoginPayloadType {
  name: string;
  email: string;
  provider: string;
  oauth_id: string;
  image?: string;
}

class AuthController {
  static async login(request: Request, response: Response) {
    try {
      const body: LoginPayloadType = request.body;
      let existingUser = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
        include: {
          conversations: true,
        },
      });

      let user;
      if (!existingUser) {
        user = await prisma.user.create({
          data: {
            ...body,
            conversations: {
              create: {
                conversation: {
                  create: {
                    isGroup: false,
                  },
                },
              },
            },
          },
        });
        // console.log(user);
      } else {
        if (existingUser.conversations.length === 0) {
          const newConversation = await prisma.conversation.create({
            data: {
              isGroup: false,
              users: {
                create: {
                  user: {
                    connect: {
                      id: existingUser.id,
                    },
                  },
                },
              },
            },
          });
        }
        user = {
          name: existingUser.name,
          id: existingUser.id,
          email: existingUser.email,
          image: existingUser.image,
          provider: existingUser.provider,
          oauth_id: existingUser.oauth_id,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
        };
      }

      let JWTPayload: AuthUser = {
        name: body.name,
        email: body.email,
        image: body.image,
        id: user.id,
      };

      const token = jwt.sign(JWTPayload, process.env.JWT_SECRET as string, {
        expiresIn: "10d",
      });

      return response.json({
        message: "Logged in Sucessfully!",
        user: {
          ...user,
          token: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.log(error);
      return response.status(500).json({ message: "Internal Server Error" });
    }
  }
}

export default AuthController;
