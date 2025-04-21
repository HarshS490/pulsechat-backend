import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import ConversationController from "../controllers/conversation.controller.js";
import { authMiddleWare } from "../middlewares/AuthMiddleware.js";
import { UserController } from "../controllers/users.controller.js";
import FriendController from "../controllers/friends.controller.js";

const router = Router();

router.post("/auth/login", AuthController.login);

router.post("/new/chat", authMiddleWare, ConversationController.create);
router.get("/chats/all",authMiddleWare,ConversationController.getConversations);
router.post("/chat/id",ConversationController.getConversationById);
router.get("/chat/messages",authMiddleWare,ConversationController.getMessages);
router.post("/chat/send/message",authMiddleWare,ConversationController.sendMessage);
router.delete("/chat/message",authMiddleWare,ConversationController.deleteMessage);

router.post("/friendrequest/send",authMiddleWare,FriendController.sendFriendRequest);
router.get("/friend/requests",authMiddleWare,FriendController.getFriendRequests);
router.post("/friend/accept",authMiddleWare,FriendController.acceptFriendRequests);
router.post("/friend/decline",authMiddleWare,FriendController.acceptFriendRequests);

router.get("/users/all",authMiddleWare,UserController.getAllUsers);
router.get("/user",UserController.getUserById);


export default router;
