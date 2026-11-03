async function verifyResponse(response) {
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));

    throw new Error(erro.message || `erro HTTP: ${response.status}`);
  }
  return response;
}

const API = "http://localhost:3333";

function obterToken() {
  return localStorage.getItem("token");
}

function httpAuth() {
  const token = obterToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function httpHeader() {
  return {
    "Content-Type": "application/json",
  };
}

const usuarioApi = {
  async listUser() {
    try {
      const response = await fetch(`${API}/usuario`, {
        method: "GET",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async registerUser(register) {
    try {
      const response = await fetch(`${API}/usuario/register`, {
        method: "POST",
        headers: httpAuth(),
        body: JSON.stringify(register),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async loginUser(login) {
    try {
      const response = await fetch(`${API}/usuario/login`, {
        method: "POST",
        headers: httpHeader(),
        body: JSON.stringify(login),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  async findUserAuthenticator() {
    try {
      const response = await fetch(`${API}/usuario/auth`, {
        method: "GET",
        headers: httpAuth(),
      });

      await verifyResponse(response);

      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

const dashboardApi = {
  async resumo() {
    try {
      const response = await fetch(`${API}/dashboard/resumo`, {
        method: "GET",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

const veiculoApi = {
  async listVeiculos() {
    try {
      const response = await fetch(`${API}/veiculos`, {
        method: "GET",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async registerVeiculo(veiculo) {
    try {
      const response = await fetch(`${API}/veiculos/placa/register`, {
        method: "POST",
        headers: httpAuth(),
        body: JSON.stringify(veiculo),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  // Edita veículo
  async editVeiculo(id, veiculo) {
    try {
      const response = await fetch(`${API}/veiculos/${id}`, {
        method: "PUT",
        headers: httpAuth(),
        body: JSON.stringify(veiculo),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  // Exclui veículo
  async deleteVeiculo(id) {
    try {
      const response = await fetch(`${API}/veiculos/${id}`, {
        method: "DELETE",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

const movimentacaoApi = {
  async listMovimentacoes() {
    try {
      const response = await fetch(`${API}/movimentacao`, {
        method: "GET",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  async registerEntrada(movimentacao) {
    try {
      const response = await fetch(`${API}/movimentacao/register/entrada`, {
        method: "POST",
        headers: httpAuth(),
        body: JSON.stringify(movimentacao),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  async registerSaida(movimentacao) {
    try {
      const response = await fetch(`${API}/movimentacao/register/saida`, {
        method: "POST",
        headers: httpAuth(),
        body: JSON.stringify(movimentacao),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async listSaidas() {
    try {
      const response = await fetch(`${API}/movimentacao/saidas`, {
        method: "GET",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  // Edita uma movimentação
  async editMovimentacao(id, movimentacao) {
    try {
      const response = await fetch(`${API}/movimentacao/edit/${id}`, {
        method: "POST",
        headers: httpAuth(),
        body: JSON.stringify(movimentacao),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  // Exclui uma movimentação
  async deleteMovimentacao(id) {
    try {
      const response = await fetch(`${API}/movimentacao/delete/${id}`, {
        method: "DELETE",
        headers: httpAuth(),
      });

      await verifyResponse(response);
      return response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

export { usuarioApi, dashboardApi, veiculoApi, movimentacaoApi };
