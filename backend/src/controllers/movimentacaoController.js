import modelMovimentacao from "../models/movimentacaoModel.js";
import veiculoModel from "../models/veiculoModel.js";
class MovimentacaoController {
  // Lista todas as movimentações
  static async findMovimentacao(req, res) {
    try {
      const result = await modelMovimentacao.listMovimentacao();
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }
  // Busca uma movimentação em aberto pela placa do veículo
  static async findMovimentacaoPlaca(req, res) {
    try {
      const { placa } = req.params;
      if (!placa) {
        let message = "Informe placa valida.";
        return res.status(400).json({ message });
      }

      const movimentacaoPlaca =
        await modelMovimentacao.findMovimentacaoPlaca(placa);

      if (!movimentacaoPlaca) {
        let message = "Nenhuma movimentação em aberto encontrada.";
        return res.status(404).json({ message });
      }

      return res.status(200).json(movimentacaoPlaca);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  // registrando entrada de veículo
  static async registerEntrada(req, res) {
    try {
      const { placa, tipo } = req.body;

      const placaFormatada = placa?.trim().toUpperCase();

      if (
        !placaFormatada ||
        !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)
      ) {
        return res.status(400).json({
          message: "Informe uma placa válida.",
        });
      }

      if (!placaFormatada || !tipo) {
        return res.status(400).json({
          message: "Placa e tipo são obrigatórios.",
        });
      }

      if (tipo !== "MOTO" && tipo !== "CARRO") {
        return res.status(400).json({
          message: "Informe um tipo de veículo válido.",
        });
      }

      const placaDentro =
        await modelMovimentacao.findMovimentacaoPlaca(placaFormatada);

      if (placaDentro) {
        return res.status(409).json({
          message: "Veículo já está dentro do estacionamento.",
        });
      }

      let veiculo = await veiculoModel.findVeiculoPlaca(placa);

      if (veiculo) {
        if (veiculo.tipo !== tipo) {
          return res.status(409).json({
            message: "O tipo informado é diferente do veículo cadastrado.",
          });
        }
      } else {
        const result = await veiculoModel.veiculoRegister(placa, tipo);

        veiculo = {
          id: result.insertId,
          placa,
          tipo,
        };
      }

      const result = await modelMovimentacao.registerEntrada(
        veiculo.id,
        req.user.id,
        "MANUAL",
      );

      return res.status(201).json({
        message: "Entrada registrada com sucesso.",
        id: result.insertId,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  // registrando saída de veículo
  static async registerSaida(req, res) {
    try {
      const { placa } = req.body;

      const placaFormatada = placa?.trim().toUpperCase();

      if (
        !placaFormatada ||
        !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)
      ) {
        return res.status(400).json({
          message: "Informe uma placa válida.",
        });
      }

      if (!placaFormatada) {
        return res.status(400).json({
          message: "Informe a placa do veículo.",
        });
      }

      const movimentacaoAberta =
        await modelMovimentacao.findMovimentacaoPlaca(placaFormatada);

      if (!movimentacaoAberta) {
        return res.status(404).json({
          message: "Nenhuma entrada em aberto encontrada.",
        });
      }

      const result = await modelMovimentacao.registerSaida(
        req.user.id,
        "MANUAL",
        movimentacaoAberta.id,
      );

      if (result.affectedRows === 0) {
        return res.status(409).json({
          message: "A movimentação não está mais em aberto.",
        });
      }
      await modelMovimentacao.findMovimentacaoPlaca(placaFormatada);
      return res.status(200).json({
        message: "Saída registrada com sucesso.",
        id: movimentacaoAberta.id,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  // Editar movimentação
  static async editMovimentacao(req, res) {
    try {
      const { id } = req.params;

      if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
          message: "ID da movimentação inválido.",
        });
      }

      const { placa, tipo, data_entrada, data_saida } = req.body;

      // Valida placa
      const placaFormatada = placa?.trim().toUpperCase();

      if (
        !placaFormatada ||
        !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)
      ) {
        return res.status(400).json({
          message: "Informe uma placa válida.",
        });
      }

      // Valida tipo
      if (tipo !== "CARRO" && tipo !== "MOTO") {
        return res.status(400).json({
          message: "Informe um tipo de veículo válido.",
        });
      }

      // Busca a movimentação
      const movimentacao = await modelMovimentacao.findMovimentacaoId(id);

      if (!movimentacao) {
        return res.status(404).json({
          message: "Movimentação não encontrada.",
        });
      }

      // VIGIA só pode editar entrada manual registrada por ele
      if (req.user.tipo !== "ADM") {
        if (
          movimentacao.origem_entrada !== "MANUAL" ||
          Number(movimentacao.usuario_entrada_id) !== Number(req.user.id)
        ) {
          return res.status(403).json({
            message: "Você não tem permissão para editar essa movimentação.",
          });
        }
      }

      // Define as datas atuais
      let dataEntrada = new Date(movimentacao.data_entrada);
      let dataSaida = movimentacao.data_saida
        ? new Date(movimentacao.data_saida)
        : null;

      // Somente ADM pode alterar datas
      if (req.user.tipo === "ADM") {
        if (!data_entrada) {
          return res.status(400).json({
            message: "A data de entrada é obrigatória.",
          });
        }

        dataEntrada = new Date(data_entrada);

        if (Object.hasOwn(req.body, "data_saida")) {
          if (data_saida === null || data_saida === "") {
            dataSaida = null;
          } else {
            dataSaida = new Date(data_saida);
          }
        }
      } else {
        // VIGIA não pode alterar datas
        if (
          Object.hasOwn(req.body, "data_entrada") ||
          Object.hasOwn(req.body, "data_saida")
        ) {
          return res.status(403).json({
            message: "Vigia não tem permissão para alterar datas.",
          });
        }
      }

      // Valida data de entrada
      if (isNaN(dataEntrada.getTime())) {
        return res.status(400).json({
          message: "Data de entrada inválida.",
        });
      }

      if (dataEntrada > new Date()) {
        return res.status(400).json({
          message: "A data de entrada não pode ser futura.",
        });
      }

      // Valida data de saída
      if (dataSaida !== null) {
        if (isNaN(dataSaida.getTime())) {
          return res.status(400).json({
            message: "Data de saída inválida.",
          });
        }

        if (dataSaida > new Date()) {
          return res.status(400).json({
            message: "A data de saída não pode ser futura.",
          });
        }

        if (dataSaida < dataEntrada) {
          return res.status(400).json({
            message: "A data de saída não pode ser inferior à data de entrada.",
          });
        }
      }

      // Executa a edição dentro de uma transação
      const resultado = await modelMovimentacao.editMovimentacaoTransacao(
        id,
        placaFormatada,
        tipo,
        dataEntrada,
        dataSaida,
        req.user.id,
      );

      if (resultado.status === 404) {
        return res.status(404).json({
          message: "Movimentação não encontrada.",
        });
      }

      if (resultado.status === 409) {
        return res.status(409).json({
          message: resultado.message,
        });
      }

      return res.status(200).json({
        message: "Movimentação atualizada com sucesso.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro interno do servidor.",
      });
    }
  }

  // Deletar movimentação
  static async deleteMovimentacao(req, res) {
    try {
      const { id } = req.params;

      // Verifica se somente ADM pode excluir
      if (req.user.tipo !== "ADM") {
        return res.status(403).json({
          message: "Apenas o administrador pode excluir movimentações.",
        });
      }

      // Valida o ID
      if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
          message: "ID da movimentação inválido.",
        });
      }

      // Executa a exclusão no Model
      const resultado = await modelMovimentacao.deleteMovimentacao(id);

      if (!resultado) {
        return res.status(404).json({
          message: "Movimentação não encontrada.",
        });
      }

      return res.status(200).json({
        message: "Movimentação excluída com sucesso.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro interno do servidor.",
      });
    }
  }
}
export default MovimentacaoController;
