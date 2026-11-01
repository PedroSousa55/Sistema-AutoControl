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

  //registrando entrada de veiculo
  static async registerEntrada(req, res) {
    try {
      const { placa, tipo, data_entrada } = req.body;

      if (!placa || !tipo || !data_entrada) {
        let message = "Todos os campos são obrigatórios.";
        return res.status(400).json({ message });
      }

      if (tipo !== "MOTO" && tipo !== "CARRO") {
        let message = "Informe o tipo de veiculo valido.";
        return res.status(400).json({ message });
      }

      const data = new Date(data_entrada);
      //verifica se a data informada é uma data valida
      if (isNaN(data.getTime())) {
        return res.status(400).json({
          message: "Data de entrada invalida.",
        });
      }
      if (data > new Date()) {
        return res.status(400).json({
          message: "A data de entrada não pode ser acima da data atual.",
        });
      }

      const placaDentro = await modelMovimentacao.findMovimentacaoPlaca(placa);

      if (placaDentro) {
        let message = "Veiculo já está dentro do estacionamento.";
        return res.status(409).json({ message });
      }

      let veiculo = await veiculoModel.findVeiculoPlaca(placa);

      if (veiculo) {
        //vai veirificar se o tipo está correto
        if (veiculo.tipo !== tipo) {
          return res.status(409).json({
            message: "O tipo informado é diferente do veículo cadastrado.",
          });
        }
      } else {
        //se veiculo nao existe vamos cadastrar ele no sistema
        const result = await veiculoModel.veiculoRegister(placa, tipo);

        veiculo = {
          id: result.insertId,
          placa: placa,
          tipo: tipo,
        };
      }

      const result = await modelMovimentacao.registerEntrada(
        veiculo.id,
        req.user.id,
        data_entrada,
        "MANUAL",
      );

      let message = "Entrada registrada com sucesso.";
      return res.status(201).json({
        message,
        id: result.insertId,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  // registrado saida do veiculo
  static async registerSaida(req, res) {
    try {
      const { placa, data_saida } = req.body;

      if (!placa || !data_saida) {
        let message = "Todos os campos são obrigatórios.";
        return res.status(400).json({ message });
      }

      //Validando se a data de saida é valida e nao esta no futuro.
      const data = new Date(data_saida);

      if (isNaN(data.getTime())) {
        return res.status(400).json({
          message: "Data de saida invalida.",
        });
      }

      if (data > new Date()) {
        return res.status(400).json({
          message: "A data de saída não pode ser futura.",
        });
      }
      const movimentacaoAberta =
        await modelMovimentacao.findMovimentacaoPlaca(placa);

      if (!movimentacaoAberta) {
        return res.status(404).json({
          message: "Nenhuma entrada em aberto encontrada.",
        });
      }

      const dataEntrada = new Date(movimentacaoAberta.data_entrada);

      if (data < dataEntrada) {
        return res.status(400).json({
          message: "A data de saída não pode ser anterior à entrada.",
        });
      }

      const result = await modelMovimentacao.registerSaida(
        data_saida,
        req.user.id,
        "MANUAL",
        movimentacaoAberta.id,
      );

      if (result.affectedRows === 0) {
        return res.status(409).json({
          message: "A movimentação não está mais em aberto.",
        });
      }

      let message = "Saida registrada com sucesso.";
      return res.status(200).json({
        message,
        id: movimentacaoAberta.id,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  //falta o editar a movimentação
  static async editMovimentacao(req, res) {
    try {
      //pedando o id da url e verificando se ele é valido
      const { id } = req.params;

      if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        let message = "ID da movimentação inválido.";
        return res.status(400).json({ message });
      }

      const { placa, tipo, data_entrada, data_saida } = req.body;
      //fazer validação quando data_saida nao for enviada
      if (!placa || !tipo || !data_entrada) {
        let message =
          "Os campos placa, tipo, data de entrada são obrigatórios.";
        return res.status(400).json({ message });
      }

      //tou buscando a movimentação pelo id para verificar se ela existe
      const movimentacao = await modelMovimentacao.findMovimentacaoId(id);

      if (!movimentacao) {
        let message = "Movimentação não encontrada.";
        return res.status(404).json({ message });
      }
      //verificando se usuario pode editar
      // a regra é que usuario so pode edita movimentaçoes manual
      if (
        movimentacao.origem_entrada === "AUTOMATICA" ||
        movimentacao.origem_saida === "AUTOMATICA"
      ) {
        let message =
          "Movimentações automáticas não podem ser editadas manualmente.";
        return res.status(400).json({ message });
      }

      //aqui nos vamos fazer uma validação para validar se usuario pode editar a movimentaçao
      if (
        req.user.tipo !== "ADM" &&
        movimentacao.usuario_entrada_id !== req.user.id &&
        movimentacao.usuario_saida_id !== req.user.id
      ) {
        let message = "Você não tem permissão para editar essa movimentação.";
        return res.status(403).json({ message });
      }

      //validando o tipo do veiculo
      if (tipo !== "CARRO" && tipo !== "MOTO") {
        let message = "Informe um tipo de veículo válido.";
        return res.status(400).json({ message });
      }

      //esse bloco faz a validação das datas
      const dataEntrada = new Date(data_entrada);

      //verificação de data entrada se ela é valida ou não
      if (isNaN(dataEntrada.getTime())) {
        return res.status(400).json({
          message: "Data Entrada Invalida.",
        });
      }

      //verificação de uma data futura se a data entrada nao é uma data futura
      if (dataEntrada > new Date()) {
        return res.status(400).json({
          message: "A data de entrada não pode ser futura.",
        });
      }

      //verificação de data saida
      const temDataSaida = Object.hasOwn(req.body, "data_saida");

      let dataSaida = movimentacao.data_saida
        ? new Date(movimentacao.data_saida)
        : null;

      if (temDataSaida) {
        if (data_saida === null || data_saida === "") {
          dataSaida = null;
        } else {
          dataSaida = new Date(data_saida);
        }
      }

      if (dataSaida !== null) {
        if (isNaN(dataSaida.getTime())) {
          return res.status(400).json({
            message: "Data saída inválida.",
          });
        }

        if (dataSaida > new Date()) {
          return res.status(400).json({
            message: "A data saída não pode ser futura..",
          });
        }

        if (dataSaida < dataEntrada) {
          return res.status(400).json({
            message: "A data saída não pode ser inferior a data de entrada.",
          });
        }
      }

      //buscando veiculo pela placa pra verificar se ele existe
      const veiculo = await veiculoModel.findVeiculoPlaca(placa);
      let veiculo_id;

      //verificando se veiculo ja existe
      if (veiculo) {
        //verificando o tipo do veiculo cadastrado
        if (veiculo.tipo !== tipo) {
          let message = "O tipo informado é diferente do veículo cadastrado.";
          return res.status(409).json({ message });
        }

        veiculo_id = veiculo.id;
      } else {
        //se ele nao existi vamos cadastrar ele na nossa tabela veiculo
        const novoVeiculo = await veiculoModel.veiculoRegister(placa, tipo);

        veiculo_id = novoVeiculo.insertId;
      }

      if (dataSaida === null) {
        const outraMovimentacao =
          await modelMovimentacao.findOutraMovimentacaoAberta(placa, id);

        if (outraMovimentacao) {
          let message = "Esse veículo ja possui uma movimentação em aberto.";
          return res.status(409).json({ message });
        }
      }

      let usuarioSaidaId = movimentacao.usuario_saida_id;
      let origemSaida = movimentacao.origem_saida;

      if (dataSaida === null) {
        usuarioSaidaId = null;
        origemSaida = null;
      } else if (movimentacao.data_saida === null) {
        usuarioSaidaId = req.user.id;
        origemSaida = "MANUAL";
      }

      const result = await modelMovimentacao.updateMovimentacao(
        id,
        veiculo_id,
        dataEntrada,
        dataSaida,
        usuarioSaidaId,
        origemSaida,
      );

      return res.status(200).json({
        message: "Movimentacão atualizada com sucesso.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  //deletar movimentação
  static async deleteMovimentacao(req, res) {
    try {
      const { id } = req.params;

      if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
          message: "ID da movimentação inválido.",
        });
      }

      const movimentacao = await modelMovimentacao.findMovimentacaoId(id);

      if (!movimentacao) {
        return res.status(404).json({
          message: "Movimentação não encontrada.",
        });
      }

      if (
        movimentacao.origem_entrada === "AUTOMATICA" ||
        movimentacao.origem_saida === "AUTOMATICA"
      ) {
        return res.status(400).json({
          message:
            "Movimentações automáticas não podem ser excluídas manualmente.",
        });
      }
      await modelMovimentacao.deleteMovimentacao(id);

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
