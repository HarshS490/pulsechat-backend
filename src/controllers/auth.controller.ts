import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";

function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateUserColor(userId: string) {
  // Convert userId to a consistent hash value
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);

  let saturation = 65 + (hash % 25); // 65-90%
  let lightness = 45 + Math.abs((hash >> 8) % 15); // 45-60%
  if (hue > 200 && hue < 250) {
    // Shift blue colors to be more distinct
    saturation = Math.min(saturation + 15, 100);
    lightness = Math.max(lightness - 10, 35);
  }

  if (saturation < 60) {
    saturation = 60;
  }

  // Convert HSL to hex
  return hslToHex(hue, saturation, lightness);
}

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
        const color = generateUserColor(body.email);
        user = await prisma.user.create({
          data: {
            ...body,
            color:color,
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
      } else {
        let userColor=existingUser.color;
        if(!existingUser.color){
          const color = generateUserColor(body.email);
          const updatedUser = await prisma.user.update({where:{id:existingUser.id},data:{color:color}});
          userColor = updatedUser.color;
        }
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
          color: userColor,
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
