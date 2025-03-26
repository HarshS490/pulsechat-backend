import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import ConversationController from "../controllers/conversation.controller.js";
import { authMiddleWare } from "../middlewares/AuthMiddleware.js";
import { UserController } from "../controllers/users.controller.js";

const router = Router();

router.post("/auth/login", AuthController.login);

router.post("/new/chat", authMiddleWare, ConversationController.create);
router.get("/chats/all",ConversationController.getConversations);

router.get("/users/all",UserController.getAllUsers);
router.get("/user",UserController.getUserById);
export default router;
