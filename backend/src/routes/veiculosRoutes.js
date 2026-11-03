import express from "express";
import VeiculosController from "../controllers/veiculoController.js";
import admMiddleware from "../middlewares/admMiddleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Rotas de veículos

// Cadastra veículo
router.post(
  "/placa/register",
  authMiddleware,
  VeiculosController.registerVeiculo,
);

// Lista todos os veículos
router.get("/", authMiddleware, VeiculosController.listVeiculos);

// Busca veículo pela placa
router.get(
  "/placa/:placa",
  authMiddleware,
  VeiculosController.findPlacaVeiculo,
);

// Edita veículo (apenas ADM)
router.put(
  "/:id",
  authMiddleware,
  admMiddleware,
  VeiculosController.veiculoEdit,
);

// Exclui veículo (apenas ADM)
router.delete(
  "/:id",
  authMiddleware,
  admMiddleware,
  VeiculosController.veiculoDelete,
);

export default router;
