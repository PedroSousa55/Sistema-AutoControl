import dotenv from "dotenv";

dotenv.config();

function cameraMiddleware(req, res, next) {
  const chaveCamera = req.headers["x-camera-key"];

  if (!process.env.CAMERA_API_KEY) {
    return res.status(500).json({
      message: "Chave da câmera não configurada no servidor.",
    });
  }

  if (chaveCamera !== process.env.CAMERA_API_KEY) {
    return res.status(401).json({
      message: "Acesso não autorizado para a câmera.",
    });
  }

  next();
}

export default cameraMiddleware;
