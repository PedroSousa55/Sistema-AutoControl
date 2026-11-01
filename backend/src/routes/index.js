import express from "express";
import usuarioRoutes from "./usuarioRoutes.js";
import veiculoRoutes from "./veiculosRoutes.js";
import movimentacaoRoutes from "./movimentacaoRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const routes = (app) => {
  app.route("/").get((req, res) => {
    let message = "Servidor rodando!";
    res.status(200).send(message);
  });
  app.use(express.json());
  app.use("/usuario", usuarioRoutes);
  app.use("/veiculos", veiculoRoutes);
  app.use("/movimentacao", movimentacaoRoutes);
  app.use("/dashboard", dashboardRoutes);
};

export default routes;
