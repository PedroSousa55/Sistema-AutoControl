import modelMovimentacao from "../models/movimentacaoModel.js";
import veiculoModel from "../models/veiculoModel.js";

// Valida e converte data ISO 8601 para DATETIME no horário de São Luís
function converterDataCamera(dataHora) {
  if (typeof dataHora !== "string") {
    return null;
  }

  const formatoISO =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  const partes = dataHora.match(formatoISO);

  if (!partes) {
    return null;
  }

  const [, ano, mes, dia, hora, minuto, segundo, fuso] = partes;

  const anoNumero = Number(ano);
  const mesNumero = Number(mes);
  const diaNumero = Number(dia);
  const horaNumero = Number(hora);
  const minutoNumero = Number(minuto);
  const segundoNumero = Number(segundo);

  const diasNoMes = new Date(Date.UTC(anoNumero, mesNumero, 0)).getUTCDate();

  if (
    mesNumero < 1 ||
    mesNumero > 12 ||
    diaNumero < 1 ||
    diaNumero > diasNoMes ||
    horaNumero > 23 ||
    minutoNumero > 59 ||
    segundoNumero > 59
  ) {
    return null;
  }

  if (fuso !== "Z") {
    const [horasFuso, minutosFuso] = fuso.slice(1).split(":").map(Number);

    if (horasFuso > 14 || minutosFuso > 59) {
      return null;
    }
  }

  const data = new Date(dataHora);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  const partesData = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const valores = {};

  partesData.forEach((parte) => {
    valores[parte.type] = parte.value;
  });

  return `${valores.year}-${valores.month}-${valores.day} ${valores.hour}:${valores.minute}:${valores.second}`;
}

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

  // Registra entrada automática enviada pela câmera
  static async registerEntradaAutomatica(req, res) {
    try {
      const { placa, data_hora } = req.body;

      const placaFormatada =
        typeof placa === "string" ? placa.trim().toUpperCase() : "";

      if (
        !placaFormatada ||
        !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)
      ) {
        return res.status(400).json({
          message: "A câmera enviou uma placa inválida.",
        });
      }

      const dataEntrada = converterDataCamera(data_hora);

      if (!dataEntrada) {
        return res.status(400).json({
          message:
            "Data e hora da câmera inválidas. Utilize ISO 8601 com fuso horário.",
        });
      }

      // Verifica se já existe uma entrada aberta
      const movimentacaoAberta =
        await modelMovimentacao.findMovimentacaoPlaca(placaFormatada);

      if (movimentacaoAberta) {
        return res.status(409).json({
          message: "Esse veículo já possui uma entrada em aberto.",
        });
      }

      // Procura o veículo cadastrado
      let veiculo = await veiculoModel.findVeiculoPlaca(placaFormatada);

      // Se não existir, cadastra com tipo NULL
      if (!veiculo) {
        const resultado = await veiculoModel.veiculoRegister(
          placaFormatada,
          null,
        );

        veiculo = {
          id: resultado.insertId,
          placa: placaFormatada,
          tipo: null,
        };
      }

      // Registra a movimentação automática
      const resultado = await modelMovimentacao.registerEntradaAutomatica(
        veiculo.id,
        dataEntrada,
      );

      return res.status(201).json({
        message: "Entrada automática registrada com sucesso.",
        id: resultado.insertId,
        placa: placaFormatada,
        data_entrada: dataEntrada,
        origem: "AUTOMATICA",
      });
    } catch (error) {
      console.error("Erro na entrada automática:", error);

      return res.status(500).json({
        message: "Erro ao registrar entrada automática.",
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

  // Registra saída automática enviada pela câmera
  static async registerSaidaAutomatica(req, res) {
    try {
      const { placa, data_hora } = req.body;

      const placaFormatada =
        typeof placa === "string" ? placa.trim().toUpperCase() : "";

      if (
        !placaFormatada ||
        !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)
      ) {
        return res.status(400).json({
          message: "A câmera enviou uma placa inválida.",
        });
      }

      const dataSaida = converterDataCamera(data_hora);

      if (!dataSaida) {
        return res.status(400).json({
          message:
            "Data e hora da câmera inválidas. Utilize ISO 8601 com fuso horário.",
        });
      }

      // Procura a entrada em aberto
      const movimentacaoAberta =
        await modelMovimentacao.findMovimentacaoPlaca(placaFormatada);

      if (!movimentacaoAberta) {
        return res.status(404).json({
          message: "Nenhuma entrada em aberto encontrada para essa placa.",
        });
      }

      // Impede saída anterior à entrada
      if (dataSaida < movimentacaoAberta.data_entrada) {
        return res.status(400).json({
          message: "A data de saída não pode ser anterior à data de entrada.",
        });
      }

      // Atualiza a movimentação existente
      const resultado = await modelMovimentacao.registerSaidaAutomatica(
        movimentacaoAberta.id,
        dataSaida,
      );

      if (resultado.affectedRows === 0) {
        return res.status(409).json({
          message: "A movimentação não está mais em aberto.",
        });
      }

      return res.status(200).json({
        message: "Saída automática registrada com sucesso.",
        id: movimentacaoAberta.id,
        placa: placaFormatada,
        data_saida: dataSaida,
        origem: "AUTOMATICA",
      });
    } catch (error) {
      console.error("Erro na saída automática:", error);

      return res.status(500).json({
        message: "Erro ao registrar saída automática.",
      });
    }
  }

  // Lista todas as saídas
  static async findSaidas(req, res) {
    try {
      const result = await modelMovimentacao.listSaidas();
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro ao carregar as saídas.",
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
