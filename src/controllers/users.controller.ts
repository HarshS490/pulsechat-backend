import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

class UserController {
  static async getAllUsers(req: Request, res: Response) {
    // TODO: return paged Responses, front will use reactQuery so return responses according to that.
    try {
      const currentUser = req.user!;
      const query = req.query.query as string || "";
      const pageNumber = parseInt(req.query.pageNumber as string) || 1;
      
      const PAGE_SIZE = 30;
      const users = await prisma.user.findMany({
        where:{
          name:{
            contains:query,
            mode:'insensitive'
          }
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          name: true,
          image: true,
          createdAt: true,
          id: true,
        },
        skip:(pageNumber-1)*PAGE_SIZE,
        take:PAGE_SIZE,
      });

      return res.status(200).json({ users: users, status: 200 });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal Server Error!", users: [], status: 500 });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.body;
      if (!id) {
        return res
          .status(400)
          .json({ message: "Bad Request: Missing user id", status: 400 });
      }
      const user = await prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (!user) {
        return res.status(200).json({ message: "No User found", status: 200 });
      }
      return res.status(200).json({ user: user, status: 200 });
    } catch (error) {}
  }
}

export { UserController };
