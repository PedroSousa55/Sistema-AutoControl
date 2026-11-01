import modelUsers from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

class UserController {
  static async findUsers(req, res) {
    try {
      const result = await modelUsers.listUsers();
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      let message = "Erro interno do servidor.";
      return res.status(500).json({ message });
    }
  }
  /* 
controller de criação dos usuarios adicionando o tipo do usuario
ainda sem controller e model de registro para o front end
*/
  static async userRegister(req, res) {
    try {
      const { nome, email, senha, tipo } = req.body;

      //condicional para campos obrigatorios
      if (!nome || !email || !senha || !tipo) {
        let message = "Todos os campos são obrigatorios.";
        return res.status(400).json({ message });
      }

      if (tipo !== "ADM" && tipo !== "VIGIA") {
        return res.status(400).json({
          message: "Tipo de usuario inválido.",
        });
      }

      //condicional para ver se usuario ja existe
      const verificEmail = await modelUsers.findUserEmail(email);
      if (verificEmail) {
        let message = "Usuário já existe!";
        return res.status(400).json({ message });
      }

      //hash para esconder a senha
      const hash = await bcrypt.hash(senha, 10);

      //mandando os dados criados para o banco
      await modelUsers.registerUsers(nome, email, hash, tipo);
      let message = "Usuário cadastrado com sucesso.";
      return res.status(201).json({ message });
    } catch (error) {
      console.error(error);
      let message = "Erro interno do servidor.";
      return res.status(500).json({ message });
    }
  }

  /* 
  controller do login do usuario
  */
  static async userLogin(req, res) {
    try {
      const { email, senha } = req.body;

      //condicional de campos obrigatorios
      if (!email || !senha) {
        let message = "Todos os campos são obrigatórios.";
        return res.status(400).json({ message });
      }

      //buscando usuario pelo email
      const user = await modelUsers.findUserEmail(email);
      //condicional para verificar se usuario existe
      if (!user) {
        let message = "Email ou senha Inválidos.";
        return res.status(401).json({ message });
      }

      //fazendo a comparação da senha digitada com a senha_hash no banco de dados
      //retornando um valor boleano
      const passwordCompare = await bcrypt.compare(senha, user.senha_hash);
      //condicional se a senha é verdadeira ou falsa (se é valida)
      if (!passwordCompare) {
        let message = "Email ou senha Inválidos.";
        return res.status(401).json({ message });
      }

      //criando o token de acesso do nosso usuario
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          tipo: user.tipo,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "8h",
        },
      );

      return res.status(200).json({
        message: "Login efetuado com sucesso.",
        token,
      });
    } catch (error) {
      console.error(error);
      let message = "Erro interno do servidor.";
      return res.status(500).json({ message });
    }
  }

  static userAuth(req, res) {
    try {
      return res.status(200).json({ user: req.user });
    } catch (error) {
      console.error(error);
      let message = "Erro interno do servidor.";
      return res.status(500).json({ message });
    }
  }

  static async userEdit(req, res) {}

  static async userDelete(req, res) {}
}

export default UserController;
