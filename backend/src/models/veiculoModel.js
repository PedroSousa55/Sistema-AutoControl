import conect from "../config/database.js";

async function listVeiculos() {
  try {
    const sql = `
        SELECT * FROM veiculos;
        `;
    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function veiculoRegister(placa, tipo) {
  try {
    const sql = `
        INSERT INTO veiculos (placa, tipo) VALUES
        (?, ?);
        `;
    const [dados] = await conect.query(sql, [placa, tipo]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function findVeiculoPlaca(placa) {
  try {
    const sql = `
        SELECT * FROM veiculos
        WHERE placa = ?;
        `;
    const [dados] = await conect.query(sql, [placa]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// fazer edit veiculo e delete veiculo
async function veiculoEdit(id) {}

async function veiculoDelete(id) {}

export default {
  listVeiculos,
  veiculoRegister,
  findVeiculoPlaca,
  veiculoEdit,
  veiculoDelete,
};
