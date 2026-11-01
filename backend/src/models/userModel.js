import conect from "../config/database.js";

async function listUsers() {
  try {
    const sql = `
    SELECT id, nome, email, tipo FROM usuario
    `;
    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function registerUsers(nome, email, senha, tipo) {
  try {
    const sql = `
      INSERT INTO usuario (nome, email, senha_hash, tipo) 
      VALUES (?, ?, ?, ?);
    `;

    const [dados] = await conect.query(sql, [nome, email, senha, tipo]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function findUserEmail(email) {
  try {
    const sql = `
      SELECT * FROM usuario WHERE email = ?;
    `;

    const [dados] = await conect.query(sql, [email]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}
//fazer edite usuario e delete usuario
async function usuarioEdit(id) {}

async function usuarioDelete(id) {}
export default {
  listUsers,
  registerUsers,
  findUserEmail,
  usuarioEdit,
  usuarioDelete,
};
