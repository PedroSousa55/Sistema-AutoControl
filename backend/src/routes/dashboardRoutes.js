import express from "express";
import DashboardController from "../controllers/dashboardController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router = express.Router();

// sem admMiddleware: o VIGIA também vê o Início
router.get("/resumo", authMiddleware, DashboardController.resumo);

export default router;
