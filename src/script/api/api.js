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

export default { usuarioApi, dashboardApi };
