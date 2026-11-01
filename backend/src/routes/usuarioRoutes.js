import express from "express";
import UserController from "../controllers/userController.js";
import admMiddleware from "../middlewares/admMiddleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router = express.Router();

//rotas de usuario
router.get("/", authMiddleware, admMiddleware, UserController.findUsers); //lista todos os usuarios
router.post(
  "/register",
  authMiddleware,
  admMiddleware,
  UserController.userRegister,
);
//cadastrando usuario passando o tipo
router.post("/login", UserController.userLogin); //login do usuario

router.get("/auth", authMiddleware, UserController.userAuth);
export default router;
