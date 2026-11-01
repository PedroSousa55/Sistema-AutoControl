import express from "express";
import VeiculosController from "../controllers/veiculoController";
import admMiddleware from "../middlewares/admMiddleware";
import authMiddleware from "../middlewares/authMiddleware";
const router = express.Router();

//rotas de veiculos
router.post(
  "/placa/register",
  authMiddleware,
  VeiculosController.registerVeiculo,
);

// lista todos os veiculos
router.get("/", authMiddleware, VeiculosController.listVeiculos);

//busca pela placa
router.get(
  "/placa/:placa",
  authMiddleware,
  VeiculosController.findPlacaVeiculo,
);

export default router;
