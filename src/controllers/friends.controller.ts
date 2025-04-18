import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

class FriendController {
  static async sendFriendRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const { friendId } = req.body;
      console.log("friendId: ",friendId);
      console.log("currentuser: ",currentUser?.id);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized!", status: 401 });
      }
      if (!friendId) {
        return res.status(400).json({
          message: "Bad Request: Friend Id is required!",
          status: 400,
        });
      }
      if (currentUser.id === friendId) {
        return res
          .status(400)
          .json({ message: "Cannot send request to yourself", status: 400 });
      }

      const existingFriend = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: currentUser.id, receiverId: friendId.id },
            { senderId: friendId.id, receiverId: currentUser.id },
          ],
        },
      });
      if (existingFriend && existingFriend.status === "pending") {
        return res.status(200).json({
          message: "Request already sent",
          existingFriend,
          status: 200,
        });
      }
      const newFriend = await prisma.friendRequest.create({
        data: {
          sender: {
            connect: {
              id: currentUser?.id,
            },
          },
          receiver: {
            connect: {
              id: friendId,
            },
          },
        },
        include: {
          sender: {
            select: {
              name: true,
              email: true,
              image: true,
              id: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          receiver: {
            select: {
              name: true,
              email: true,
              image: true,
              id: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      return res.status(200).json({ friendRequest: newFriend, status: 200 });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal Server Error!", status: 500 });
    }
  }

  static async getFriendRequests(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized!", status: 401 });
      }

      const friendRequests = await prisma.friendRequest.findMany({
        where: {
          receiverId: currentUser.id,
        },
        include: {
          sender: {
            select: {
              name: true,
              email: true,
              image: true,
              id: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          receiver: {
            select: {
              name: true,
              email: true,
              image: true,
              id: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      console.log(friendRequests);

      return res.status(200).json({ friendRequests, status: 200 });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal Server Error!", status: 500 });
    }
  }

  static async acceptFriendRequests(req: Request, res: Response) {
    try {
      const currentUser = req.user!;
      const { requestId, friendId } = req.body;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized!", status: 401 });
      }
      if (!requestId || !friendId) {
        return res.status(400).json({ message: "Bad Request", status: 400 });
      }

      const [acceptedRequest, updatedCurrUser, updatedFriend] =
        await prisma.$transaction([
          prisma.friendRequest.update({
            where: {
              id: requestId,
            },
            data: { status: "accepted" },
          }),
          prisma.user.update({
            where: { id: currentUser.id },
            data: {
              friendsWith: {
                connect: { id: friendId },
              },
            },
          }),
          prisma.user.update({
            where: { id: friendId },
            data: {
              friendsWith: {
                connect: { id: currentUser.id },
              },
            },
          }),
        ]);

      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          users: {
            create: [
              {
                user: {
                  connect: { id: acceptedRequest.senderId },
                },
              },
              {
                user: {
                  connect: { id: acceptedRequest.receiverId },
                },
              },
            ],
          },
        },
      });

      return res
        .status(200)
        .json({ newConversation, newFriend: updatedFriend, status: 200 });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal Server Error!", status: 500 });
    }
  }

  static async declineFriendRequests(req: Request, res: Response) {
    try {
      const currentUser = req.user!;
      const { requestId } = req.body;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized!", status: 401 });
      }
      if (!requestId) {
        return res.status(400).json({ message: "Bad Request: Request Id is needed!", status: 400 });
      }
      const declinedRequest = await prisma.friendRequest.delete({
        where: {
          id: requestId,
        },
      });

      return res.status(200).json({ declinedRequest, status: 200 });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal Server Error!", status: 500 });
    }
  }
}

export default FriendController;
