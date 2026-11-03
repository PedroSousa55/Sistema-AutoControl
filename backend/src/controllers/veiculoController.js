import modelVeiculos from "../models/veiculoModel.js";

class VeiculosController {
  static async listVeiculos(req, res) {
    try {
      const result = await modelVeiculos.listVeiculos();
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  static async registerVeiculo(req, res) {
    try {
      const { placa, tipo } = req.body;

      if (!placa || !tipo) {
        let message = "Todos os campos são obrigatórios.";
        return res.status(400).json({ message });
      }

      const placaFormatada = placa.trim().toUpperCase();

      if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)) {
        return res.status(400).json({
          message: "Informe uma placa válida.",
        });
      }

      if (tipo !== "CARRO" && tipo !== "MOTO") {
        return res.status(400).json({
          message: "Tipo de veículo inválido.",
        });
      }

      const veiculoPlaca = await modelVeiculos.findVeiculoPlaca(placaFormatada);

      if (veiculoPlaca) {
        let message = "Veiculo já existe!";
        return res.status(400).json({ message });
      }

      await modelVeiculos.veiculoRegister(placaFormatada, tipo);
      let message = "Veiculo cadastrado com sucesso.";
      return res.status(201).json({ message });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  static async findPlacaVeiculo(req, res) {
    try {
      const { placa } = req.params;

      const veiculo = await modelVeiculos.findVeiculoPlaca(placa);

      if (!veiculo) {
        return res.status(404).json({
          message: "Veiculo não encontrado.",
        });
      }

      return res.status(200).json(veiculo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erro de servidor!",
      });
    }
  }

  static async veiculoEdit(req, res) {
    try {
      const id = Number(req.params.id);
      const { placa, tipo } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "ID do veículo inválido.",
        });
      }

      if (!placa || !tipo) {
        return res.status(400).json({
          message: "Placa e tipo são obrigatórios.",
        });
      }

      const placaFormatada = placa.trim().toUpperCase();

      if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placaFormatada)) {
        return res.status(400).json({
          message: "Informe uma placa válida.",
        });
      }

      if (tipo !== "CARRO" && tipo !== "MOTO") {
        return res.status(400).json({
          message: "Tipo de veículo inválido.",
        });
      }

      const veiculo = await modelVeiculos.findVeiculoId(id);

      if (!veiculo) {
        return res.status(404).json({
          message: "Veículo não encontrado.",
        });
      }

      const placaExistente =
        await modelVeiculos.findVeiculoPlaca(placaFormatada);

      if (placaExistente && placaExistente.id !== id) {
        return res.status(409).json({
          message: "Essa placa já está cadastrada.",
        });
      }

      await modelVeiculos.veiculoEdit(id, placaFormatada, tipo);

      return res.status(200).json({
        message: "Veículo atualizado com sucesso.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro ao atualizar veículo.",
      });
    }
  }

  static async veiculoDelete(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "ID do veículo inválido.",
        });
      }

      const veiculo = await modelVeiculos.findVeiculoId(id);

      if (!veiculo) {
        return res.status(404).json({
          message: "Veículo não encontrado.",
        });
      }

      const resultado = await modelVeiculos.veiculoDelete(id);

      if (resultado.bloqueado) {
        return res.status(409).json({
          message:
            "Não é possível excluir: existem movimentações vinculadas a este veículo.",
        });
      }

      if (!resultado.excluido) {
        return res.status(400).json({
          message: "Não foi possível excluir o veículo.",
        });
      }

      return res.status(200).json({
        message: "Veículo excluído com sucesso.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Erro ao excluir veículo.",
      });
    }
  }
}

export default VeiculosController;
