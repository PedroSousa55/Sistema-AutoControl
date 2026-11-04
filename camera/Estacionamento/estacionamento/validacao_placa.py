"""
validacao_placa.py - Confere se o texto lido é uma placa brasileira válida
e corrige confusões comuns do OCR de acordo com a POSIÇÃO do caractere.

Formatos aceitos (sempre 7 caracteres, sem hífen):
    Mercosul : L L L N L N N   ->  ABC1D23
    Antigo   : L L L N N N N   ->  ABC1234   (escrito ABC-1234 na placa)
    (L = letra, N = número)

Repare que os dois formatos só diferem na 5ª posição (índice 4):
    Mercosul tem LETRA ali, o antigo tem NÚMERO.

Por que corrigir pela posição?
    O OCR às vezes confunde letras e números parecidos: O e 0, I e 1,
    B e 8... Mas nós SABEMOS o que deve existir em cada posição:
    as 3 primeiras são sempre letras; a 4ª, a 6ª e a 7ª são sempre números.
    Então, se aparecer um "0" na 1ª posição, só pode ser a letra "O".
    Na 5ª posição não dá para corrigir, porque ali pode ser letra
    (Mercosul) ou número (antiga) - deixamos como o OCR leu.
"""

import re

# Expressões regulares (regex) dos dois formatos.
#   [A-Z] = uma letra    [0-9] = um número    {3} = repete 3 vezes
#   ^ e $ = início e fim do texto (não pode sobrar nada)
REGEX_MERCOSUL = re.compile(r"^[A-Z]{3}[0-9][A-Z][0-9]{2}$")
REGEX_ANTIGA = re.compile(r"^[A-Z]{3}[0-9]{4}$")

# Número que o OCR leu, mas a posição exige LETRA -> troca pela letra parecida
NUMERO_PARA_LETRA = {
    "0": "O",
    "1": "I",
    "8": "B",
    "5": "S",
    "2": "Z",
    "6": "G",
    "4": "A",
    "7": "T",
}

# Letra que o OCR leu, mas a posição exige NÚMERO -> troca pelo número parecido
LETRA_PARA_NUMERO = {
    "O": "0",
    "Q": "0",
    "D": "0",
    "I": "1",
    "L": "1",
    "B": "8",
    "S": "5",
    "Z": "2",
    "G": "6",
    "A": "4",
    "T": "7",
}

# O que cada posição deve ter: "L" = letra, "N" = número, "?" = qualquer um
MASCARA = "LLLN?NN"


def limpar(texto):
    """Deixa só letras e números, em maiúsculas (tira hífen, espaço, ponto)."""
    return re.sub(r"[^A-Z0-9]", "", str(texto).upper())


def corrigir_por_posicao(texto):
    """Aplica as trocas letra<->número conforme a máscara LLLN?NN.

    Só funciona com 7 caracteres; com outro tamanho devolve sem mudar.
    """
    if len(texto) != 7:
        return texto

    corrigido = []
    for caractere, esperado in zip(texto, MASCARA):
        if esperado == "L" and caractere.isdigit():
            caractere = NUMERO_PARA_LETRA.get(caractere, caractere)
        elif esperado == "N" and caractere.isalpha():
            caractere = LETRA_PARA_NUMERO.get(caractere, caractere)
        corrigido.append(caractere)
    return "".join(corrigido)


def identificar_formato(placa):
    """Retorna "mercosul", "antiga" ou None (formato inválido)."""
    if REGEX_MERCOSUL.match(placa):
        return "mercosul"
    if REGEX_ANTIGA.match(placa):
        return "antiga"
    return None


def validar(texto_ocr):
    """Limpa, corrige e valida o texto do OCR.

    Retorna um dicionário:
        {"placa": "ABC1D23", "formato": "mercosul", "valida": True,
         "original": "A8C1D23"}
    """
    original = limpar(texto_ocr)
    placa = corrigir_por_posicao(original)
    formato = identificar_formato(placa)
    return {
        "placa": placa,
        "formato": formato,
        "valida": formato is not None,
        "original": original,
    }


def formatar_para_exibir(placa, formato):
    """Placa antiga é mostrada com hífen (ABC-1234); Mercosul sem (ABC1D23)."""
    if formato == "antiga":
        return f"{placa[:3]}-{placa[3:]}"
    return placa


# Teste rápido:  .venv\Scripts\python -m estacionamento.validacao_placa
if __name__ == "__main__":
    exemplos = ["ABC1D23", "A8C1D23", "0BC-1234", "ABCID23", "abc 1z34", "AB1234", "RI0ZE5S"]
    for exemplo in exemplos:
        r = validar(exemplo)
        status = "OK " if r["valida"] else "INVÁLIDA"
        print(f"{exemplo:>10} -> {r['placa']:<8} {status} {r['formato'] or ''}")
