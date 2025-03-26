import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";


interface CreatePayload {
  isGroup: boolean;
  members: string[];
  name: string;
}

class ConversationController {
  static async create(req: Request, res: Response) {
    try {
      const payload: CreatePayload = req.body;
      const { isGroup, name, members } = payload;
      // NOTE: asserting here that user always exists
      const currentUser = req.user!;

      if (!members || members.length < 1) {
        return res.status(400).json({
          message:
            "Bad Request: At least one user should be present to create conversation.",
          status: 400,
        });
      }

      if (isGroup) {
        if (name === null || name === null) {
          return res
            .status(400)
            .json({ message: "Bad request, Group Name missing", status: 400 });
        }
        if (members.length <= 1) {
          return res.status(400).json({
            message: "Bad Request: Group atleast needs two users.",
            status: 400,
          });
        }

        members.push(currentUser.id);
        const newConversation = await prisma.conversation.create({
          data: {
            isGroup: true,
            name: name,
            users: {
              create: members.map((member) => ({
                user: {
                  connect: { id: member },
                },
              })),
            },
          },
        });

        return res
          .status(200)
          .json({ conversation: newConversation, status: 200 });
      }
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            {
              users: {
                some: {
                  userId: currentUser.id,
                },
              },
            },
            {
              users: {
                some: {
                  userId: members[0],
                },
              },
            },
            {
              users: {
                every: {
                  userId: {
                    in: [members[0], currentUser.id],
                  },
                },
              },
            },
          ],
        },
      });

      if (existingConversation) {
        return res
          .status(200)
          .json({ conversation: existingConversation, status: 200 });
      }

      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          users: {
            create: [
              {
                user: {
                  connect: { id: members[0] },
                },
              },
              {
                user: {
                  connect: {
                    id: currentUser.id,
                  },
                },
              },
            ],
          },
        },
      });

      return res
        .status(200)
        .json({ conversation: newConversation, status: 200 });
    } catch (error) {
      return res.status(500).json({ message: "Server Side Error!" });
    }
  }
  static async getConversations(req:Request,res:Response){
    try {
      // const currentUser = req.user!;
      const {currentUser} = req.body; 
      const conversations = await prisma.conversationsOnUsers.findMany({
        where:{
          userId: currentUser.id,
        },
        include:{
          conversation:{
            include:{
              users:{
                include:{
                  user:{
                    select:{
                      id:true,
                      email:true,
                      name:true,
                      image:true,
                    }
                  }
                }
              },
              messages:{
                take:1,
                include:{
                  createdBy:{
                    select:{
                      name:true,
                    }
                  },

                },
                orderBy:{
                  createdAt:'desc'
                }
              }
            }
          },
        },
        orderBy:{
          conversation:{
            lastMessageAt:'asc',
          }
        },
      });

      if(!conversations){
        return res.status(200).json({message: "No conversations found",status:200});
      }      

      return res.status(200).json({conversations,status:200});
    } catch (error) {
      return res.status(500).json({message:"Internal Server Error!",status:500});
    }
  }
  static async getMessages(req:Request,res:Response){

  }
}

export default ConversationController;
