import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

function authMiddleware(req, res, next) {
  //pegando o token do http header
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(400).json({
      message: "Token não informado.",
    });
  }
  try {
    //vamos separa o token do bearer e pegar somente o token
    //o .split(' ') divide uma string sempre que tiver um espaço
    const token = authorization.split(" ")[1];

    //verifica se o token é valido se tem a chave secreta e se ja expirou
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = payload;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      message: "Token Invalido",
    });
  }
}
export default authMiddleware;
