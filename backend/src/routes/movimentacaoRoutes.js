import express from "express";
import MovimentacaoController from "../controllers/movimentacaoController";
import admMiddleware from "../middlewares/admMiddleware";
import authMiddleware from "../middlewares/authMiddleware";
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
