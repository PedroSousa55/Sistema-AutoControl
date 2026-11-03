import conect from "../config/database.js";
import veiculoModel from "./veiculoModel.js";

// Lista todas as movimentações
// Lista todas as movimentações com dados do veículo e responsável
async function listMovimentacao() {
  try {
    const sql = `
      SELECT
        m.id,
        m.data_entrada,
        m.data_saida,
        m.origem_entrada,
        m.origem_saida,
        m.usuario_entrada_id,
        v.placa,
        v.tipo,
        u.nome AS responsavel
      FROM movimentacoes AS m
      INNER JOIN veiculos AS v
        ON m.veiculo_id = v.id
      LEFT JOIN usuario AS u
        ON m.usuario_entrada_id = u.id
      ORDER BY m.data_entrada DESC;`;

    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Lista todas as saídas com dados do veículo e responsável
async function listSaidas() {
  try {
    const sql = `
      SELECT
        m.id,
        m.data_entrada,
        m.data_saida,
        m.origem_entrada,
        m.origem_saida,
        m.usuario_entrada_id,
        v.placa,
        v.tipo,
        u.nome AS responsavel
      FROM movimentacoes AS m
      INNER JOIN veiculos AS v
        ON m.veiculo_id = v.id
      LEFT JOIN usuario AS u
        ON m.usuario_saida_id = u.id
      WHERE m.data_saida IS NOT NULL
      ORDER BY m.data_saida DESC;`;

    const [dados] = await conect.query(sql);
    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Busca movimentação em aberto pela placa
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

// Registra entrada com data e hora geradas pelo MySQL
async function registerEntrada(veiculo_id, usuario_entrada_id, origem_entrada) {
  try {
    const sql = `
      INSERT INTO movimentacoes (
        veiculo_id,
        usuario_entrada_id,
        data_entrada,
        origem_entrada
      )
      VALUES (?, ?, NOW(), ?);
    `;

    const [dados] = await conect.query(sql, [
      veiculo_id,
      usuario_entrada_id,
      origem_entrada,
    ]);

    return dados;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Registra saída com data e hora geradas pelo MySQL
async function registerSaida(usuario_saida_id, origem_saida, id) {
  try {
    const sql = `
      UPDATE movimentacoes
      SET
        data_saida = NOW(),
        usuario_saida_id = ?,
        origem_saida = ?
      WHERE id = ?
      AND data_saida IS NULL;
    `;

    const [dados] = await conect.query(sql, [
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

// Busca movimentação pelo ID
async function findMovimentacaoId(id) {
  try {
    const sql = `
      SELECT *
      FROM movimentacoes
      WHERE id = ?;
    `;

    const [dados] = await conect.query(sql, [id]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Busca outra movimentação em aberto pela placa
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

// Busca movimentação dentro da transação
async function findMovimentacaoIdTransacao(conexao, id) {
  const sql = `
    SELECT *
    FROM movimentacoes
    WHERE id = ?
    FOR UPDATE;
  `;

  const [dados] = await conexao.query(sql, [id]);
  return dados[0];
}

// Verifica se o veículo possui outras movimentações
async function findMovimentacaoPorVeiculo(conexao, veiculo_id) {
  const sql = `
    SELECT id
    FROM movimentacoes
    WHERE veiculo_id = ?
    LIMIT 1;
  `;

  const [dados] = await conexao.query(sql, [veiculo_id]);
  return dados[0];
}

// Verifica outra movimentação em aberto pelo ID do veículo
async function findOutraMovimentacaoAbertaPorVeiculo(conexao, veiculo_id, id) {
  try {
    const sql = `
      SELECT id
      FROM movimentacoes
      WHERE veiculo_id = ?
      AND data_saida IS NULL
      AND id <> ?
      LIMIT 1;
    `;

    const [dados] = await conexao.query(sql, [veiculo_id, id]);
    return dados[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Atualiza movimentação usando a conexão da transação
async function updateMovimentacao(
  conexao,
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
      WHERE id = ?;
    `;

    const [dados] = await conexao.query(sql, [
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

// Edita movimentação usando transação
async function editMovimentacaoTransacao(
  id,
  placa,
  tipo,
  dataEntrada,
  dataSaida,
  usuarioId,
) {
  const conexao = await conect.getConnection();

  try {
    await conexao.beginTransaction();

    // Busca e bloqueia a movimentação
    const movimentacao = await findMovimentacaoIdTransacao(conexao, id);

    if (!movimentacao) {
      await conexao.rollback();
      return { status: 404 };
    }

    // Busca o veículo pela placa informada
    let veiculo = await veiculoModel.findVeiculoPlacaTransacao(conexao, placa);

    // Se já existe, verifica se o tipo é compatível
    if (veiculo && veiculo.tipo !== tipo) {
      await conexao.rollback();
      return {
        status: 409,
        message: "O tipo informado é diferente do veículo cadastrado.",
      };
    }

    // Se não existe, cadastra o novo veículo
    if (!veiculo) {
      const novoVeiculo = await veiculoModel.veiculoRegisterTransacao(
        conexao,
        placa,
        tipo,
      );

      veiculo = {
        id: novoVeiculo.insertId,
      };
    }

    // Verifica se existe outra entrada em aberto para esse veículo
    if (dataSaida === null) {
      const outraMovimentacao = await findOutraMovimentacaoAbertaPorVeiculo(
        conexao,
        veiculo.id,
        id,
      );

      if (outraMovimentacao) {
        await conexao.rollback();
        return {
          status: 409,
          message: "Esse veículo já possui uma movimentação em aberto.",
        };
      }
    }

    // Mantém os dados da saída quando ela já existia
    let usuarioSaidaId = movimentacao.usuario_saida_id;
    let origemSaida = movimentacao.origem_saida;

    if (dataSaida === null) {
      usuarioSaidaId = null;
      origemSaida = null;
    } else if (movimentacao.data_saida === null) {
      usuarioSaidaId = usuarioId;
      origemSaida = "MANUAL";
    }

    // Atualiza a movimentação
    await updateMovimentacao(
      conexao,
      id,
      veiculo.id,
      dataEntrada,
      dataSaida,
      usuarioSaidaId,
      origemSaida,
    );

    // Remove o veículo antigo somente se não houver histórico associado
    if (movimentacao.veiculo_id !== veiculo.id) {
      const veiculoAntigo = await findMovimentacaoPorVeiculo(
        conexao,
        movimentacao.veiculo_id,
      );

      if (!veiculoAntigo) {
        await veiculoModel.veiculoDeleteTransacao(
          conexao,
          movimentacao.veiculo_id,
        );
      }
    }

    await conexao.commit();

    return { status: 200 };
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}

// Exclui movimentação usando a conexão da transação
async function deleteMovimentacaoTransacao(conexao, id) {
  const sql = `
    DELETE FROM movimentacoes
    WHERE id = ?;
  `;

  const [dados] = await conexao.query(sql, [id]);
  return dados;
}

// Exclui movimentação sem apagar o veículo cadastrado
async function deleteMovimentacao(id) {
  const conexao = await conect.getConnection();

  try {
    await conexao.beginTransaction();

    const movimentacao = await findMovimentacaoIdTransacao(conexao, id);

    if (!movimentacao) {
      await conexao.rollback();
      return false;
    }

    // Exclui somente a movimentação
    await deleteMovimentacaoTransacao(conexao, id);

    await conexao.commit();

    return true;
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}

export default {
  listMovimentacao,
  findMovimentacaoPlaca,
  registerEntrada,
  registerSaida,
  findMovimentacaoId,
  findMovimentacaoIdTransacao,
  findOutraMovimentacaoAberta,
  findOutraMovimentacaoAbertaPorVeiculo,
  findMovimentacaoPorVeiculo,
  updateMovimentacao,
  editMovimentacaoTransacao,
  deleteMovimentacao,
  listSaidas,
};
