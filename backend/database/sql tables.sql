create database autocontrol;
use autocontrol;

CREATE TABLE usuario(
	id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo ENUM('ADM', 'VIGIA') NOT NULL
);

CREATE TABLE veiculos(
	id INT AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(7) UNIQUE NOT NULL,
    tipo ENUM('CARRO', 'MOTO') NOT NULL
);

CREATE TABLE movimentacoes(
	id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    usuario_entrada_id INT NULL,
    usuario_saida_id INT NULL,
    data_entrada DATETIME NOT NULL,
    data_saida DATETIME NULL,
    origem_entrada ENUM('MANUAL', 'AUTOMATICA') NOT NULL,
    origem_saida ENUM('MANUAL', 'AUTOMATICA') NULL,
    
    FOREIGN KEY(veiculo_id) REFERENCES veiculos(id),
    FOREIGN KEy(usuario_entrada_id) REFERENCES usuario(id),
    FOREIGN KEy(usuario_saida_id) REFERENCES usuario(id)
);
