import express from "express";
import MovimentacaoController from "../controllers/movimentacaoController.js";
import admMiddleware from "../middlewares/admMiddleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router = express.Router();

//rota de movimentacao
router.get("/", authMiddleware, MovimentacaoController.findMovimentacao);

router.post(
  "/register/entrada",
  authMiddleware,
  MovimentacaoController.registerEntrada,
);

router.post(
  "/register/saida",
  authMiddleware,
  MovimentacaoController.registerSaida,
);

router.get("/saidas", authMiddleware, MovimentacaoController.findSaidas);

router.get(
  "/placa/:placa",
  authMiddleware,
  MovimentacaoController.findMovimentacaoPlaca,
);

router.post(
  "/edit/:id",
  authMiddleware,
  MovimentacaoController.editMovimentacao,
);

router.delete(
  "/delete/:id",
  authMiddleware,
  admMiddleware,
  MovimentacaoController.deleteMovimentacao,
);

export default router;
