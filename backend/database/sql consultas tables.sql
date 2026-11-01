-- CONSULTAS SQL TESTE DO BANCO DE DADOS

-- selecionando as tabelas para ver os dados
SELECT * FROM usuario;
SELECT * FROM veiculos;
SELECT * FROM movimentacoes;


-- inserindo dados dos usuarios
INSERT INTO usuario (nome, email, senha_hash, tipo) VALUES
('Pedro', 'pedro@gmail.com', '12345', 'ADM'), -- usuario administrador 
('Joao', 'joao@gmail.com', '12345', 'VIGIA'); -- usuario do funcionario


-- inserindo valores do veiculos
INSERT INTO veiculos (placa, tipo) VALUES
('GTE4D65', 'CARRO'), 
('PSD3F34', 'CARRO');


-- inserindo dados da movimentacao de entrada
INSERT INTO movimentacoes (
    veiculo_id,
    usuario_entrada_id,
    usuario_saida_id,
    data_entrada,
    data_saida,
    origem_entrada,
    origem_saida
)
VALUES (
    (SELECT id FROM veiculos WHERE placa = 'PSD3F34'), -- seleciona o id da tabela veiculo que tem a placa (XYZ4F56).
    (SELECT id FROM usuario WHERE email = 'joao@gmail.com'), --  seleciona o id da tabela usuario que tem o email (joao@gmail.com).
    NULL,
    '2026-10-21 09:10:00',
    NULL,
    'MANUAL',
    NULL
);

-- atualizando a saida do veiculo
UPDATE movimentacoes
SET
    data_saida = '2026-10-21 17:15:00',
    usuario_saida_id = ( 
        SELECT id FROM usuario
        WHERE email = 'pedro@gmail.com' --  seleciona o id da tabela usuario que tem o email (pedro@gmail.com).
    ),
    origem_saida = 'MANUAL'
WHERE veiculo_id = (
    SELECT id FROM veiculos
    WHERE placa = 'PSD3F34'
) -- ele so vai atualizar a movimentação caso data_saida for = null tiver uma saida em aberto
AND data_saida IS NULL;


-- consultando movimentacao dos veiculos, juntando informaçao da tabela movimentacao e veiculo
SELECT
	v.placa,
    v.tipo,
    m.data_entrada,
    m.data_saida,
    m.origem_entrada,
    m.origem_saida
FROM movimentacoes m
INNER JOIN veiculos v
	ON m.veiculo_id = v.id;
    
    
-- consulando movimentacao dos veiculos que ainda estao dentro do estacionamento
SELECT
	v.placa,
    v.tipo,
    m.data_entrada,
    m.data_saida,
    m.origem_entrada,
    m.origem_saida
FROM movimentacoes m
INNER JOIN veiculos v
	ON m.veiculo_id = v.id
WHERE m.data_saida IS NULL; -- USA IS NOT NULL QUANDO QUISER VER AS MOVIMENTACOES QUE ENTRARAM E SAIRAM

-- testando se o mysql impede cadastrar se id do carro NAO EXISTE.
INSERT INTO movimentacoes (
    veiculo_id,
    usuario_entrada_id,
    usuario_saida_id,
    data_entrada,
    data_saida,
    origem_entrada,
    origem_saida
)
VALUES (
	546, -- seleciona o id da tabela veiculo que tem a placa (XYZ4F56).
    NULL, --  seleciona o id da tabela usuario que tem o email (joao@gmail.com).
    NULL,
    '2026-10-21 09:00:00',
    NULL,
    'AUTOMATICA',
    NULL
);

-- fazendo a contabilidade de movimentacoes, usando consultas que serao feitas na api
-- usando count(*) uma funcao de agregação que conta o numero total de linhas de uma tabela
-- no nosso caso usando uma condição especifica para testar cada indicador do dashboard

-- veirificando total de veiculos dentro do estacionamento 
SELECT COUNT(*) AS veiculos_dentro
FROM movimentacoes
WHERE data_saida IS NULL;

-- verificando total de entrada na data de hoje
SELECT COUNT(*) AS entradas_hoje
FROM movimentacoes
WHERE DATE(data_entrada) = CURDATE();

-- verificando total de saidas na data de hoje
SELECT COUNT(*) AS saida_hoje
FROM movimentacoes
WHERE DATE(data_saida) = CURDATE();


--  verificando vagas dispoivel 250 vagas fixa
SELECT
	250 AS capacidade_total,
    COUNT(*) AS veiculos_dentro,
    GREATEST(250 - COUNT(*), 0) AS vagas_disponiveis
FROM movimentacoes
WHERE data_saida IS NULL;
    


DELETE FROM usuario WHERE id = 2;

DELETE FROM movimentacoes WHERE id = 1;