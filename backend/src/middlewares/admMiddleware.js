function admMiddleware(req, res, next) {
  if (req.user.tipo !== "ADM") {
    let message = "Acesso negado. Apenas administradores.";
    return res.status(403).json({ message });
  }
  next();
}

export default admMiddleware;
