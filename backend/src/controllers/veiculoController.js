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

      if (tipo !== "CARRO" && tipo !== "MOTO") {
        return res.status(400).json({
          message: "Tipo de veículo inválido.",
        });
      }

      const veiculoPlaca = await modelVeiculos.findVeiculoPlaca(placa);
      if (veiculoPlaca) {
        let message = "Veiculo já existe!";
        return res.status(400).json({ message });
      }

      await modelVeiculos.veiculoRegister(placa, tipo);
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


  static async veiculoEdit(req, res){

  }

  static async veiculoDelete(req, res){
    
  }
}

export default VeiculosController;
