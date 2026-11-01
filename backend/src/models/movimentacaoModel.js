import conect from "../config/database.js";

//listando movimentacao
async function listMovimentacao() {
  try {
    const sql = `
        SELECT * FROM movimentacoes;
        `;
    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/* 
buscando entrada em aberto pelo veiculo vai 
funcionar como uma validação para verificar se veiculo 
tem etrada em aberto
 */
async function findMovimentacaoPlaca(placa) {
  try {
    const sql = `
        SELECT m.*
        FROM movimentacoes AS m
        INNER JOIN veiculos AS v
        ON m.veiculo_id = v.id
        WHERE v.placa = ?
        AND m.data_saida IS NULL;
    `;
    const [dados] = await conect.query(sql, [placa]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

//registra entrada
async function registerEntrada(
  veiculo_id,
  usuario_entrada_id,
  data_entrada,
  origem_entrada,
) {
  try {
    const sql = `
    INSERT INTO movimentacoes (
    veiculo_id,
    usuario_entrada_id,
    data_entrada,
    origem_entrada
    )
    VALUES (?, ?, ?, ?);
    `;
    const [dados] = await conect.query(sql, [
      veiculo_id,
      usuario_entrada_id,
      data_entrada,
      origem_entrada,
    ]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

//registra saida
async function registerSaida(data_saida, usuario_saida_id, origem_saida, id) {
  try {
    const sql = `
    UPDATE movimentacoes
    SET
    data_saida = ?,
    usuario_saida_id = ?,
    origem_saida = ?
    WHERE id = ?
    AND data_saida IS NULL; 
    `;
    const [dados] = await conect.query(sql, [
      data_saida,
      usuario_saida_id,
      origem_saida,
      id,
    ]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
//busca movimentação pelo id
async function findMovimentacaoId(id) {
  try {
    const sql = `
    SELECT * FROM movimentacoes
    WHERE id = ?;
    `;
    const [dados] = await conect.query(sql, [id]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

//buscando outra movimentacao que ta aberta
async function findOutraMovimentacaoAberta(placa, id) {
  try {
    const sql = `
        SELECT *
      FROM movimentacoes
      INNER JOIN veiculos
        ON movimentacoes.veiculo_id = veiculos.id
      WHERE veiculos.placa = ?
        AND movimentacoes.data_saida IS NULL
        AND movimentacoes.id <> ?
      LIMIT 1;
    `;
    const [dados] = await conect.query(sql, [placa, id]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

//consulta de editar movimentação
async function updateMovimentacao(
  id,
  veiculo_id,
  data_entrada,
  data_saida,
  usuario_saida_id,
  origem_saida,
) {
  try {
    const sql = `
    UPDATE movimentacoes
    SET
      veiculo_id = ?,
      data_entrada = ?,
      data_saida = ?,
      usuario_saida_id = ?,
      origem_saida = ?
    WHERE id = ?;    `;

    const [dados] = await conect.query(sql, [
      veiculo_id,
      data_entrada,
      data_saida,
      usuario_saida_id,
      origem_saida,
      id,
    ]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

//consulta sql para apagar a movimentação
async function deleteMovimentacao(id) {
  try {
    const sql = `
    DELETE FROM movimentacoes
    WHERE id = ?;
    `;
    const [dados] = await conect.query(sql, [id]);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export default {
  listMovimentacao,
  findMovimentacaoPlaca,
  registerEntrada,
  registerSaida,
  findMovimentacaoId,
  findOutraMovimentacaoAberta,
  deleteMovimentacao,
  updateMovimentacao,
};
