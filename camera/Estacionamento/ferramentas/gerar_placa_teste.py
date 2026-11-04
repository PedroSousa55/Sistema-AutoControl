"""
gerar_placa_teste.py - Cria imagens de placas FICTÍCIAS para imprimir e testar.

Uso:
    .venv\\Scripts\\python ferramentas\\gerar_placa_teste.py
    .venv\\Scripts\\python ferramentas\\gerar_placa_teste.py ABC1D23 XYZ9876

Gera na pasta "placas_teste":
    placa_ABC1D23.png  -> placa para IMPRIMIR (sai com 20 cm de largura, metade
                          do tamanho real, para caber numa folha A4)
    cena_ABC1D23.jpg   -> a placa "colada" numa foto falsa, para testar com
                          rodar.bat --imagem placas_teste\\cena_ABC1D23.jpg

Dica: imprima em papel comum, sem "ajustar à página" (escala 100%).
A fonte usada é a Arial Negrito do Windows, parecida com a das placas
(a fonte oficial é outra, então o OCR real em carros pode se sair até melhor).
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "placas_teste"

# Placa real: 400 x 130 mm. Geramos 1600 x 520 px.
LARGURA, ALTURA = 1600, 520
DPI_IMPRESSAO = 203.2  # 1600 px / 203.2 dpi = 7,87 pol = 20 cm no papel


def _fonte(tamanho, negrito=True):
    candidatos = ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"] if negrito else ["arial.ttf", "DejaVuSans.ttf"]
    for nome in candidatos:
        for pasta in ("C:/Windows/Fonts/", ""):
            try:
                return ImageFont.truetype(pasta + nome, tamanho)
            except OSError:
                continue
    return ImageFont.load_default()


def _fonte_que_cabe(desenho, texto, tamanho, largura_max):
    """Diminui a fonte até o texto caber na largura disponível."""
    while tamanho > 20:
        fonte = _fonte(tamanho)
        caixa = desenho.textbbox((0, 0), texto, font=fonte)
        if caixa[2] - caixa[0] <= largura_max:
            return fonte
        tamanho -= 10
    return _fonte(tamanho)


def _texto_centralizado(desenho, texto, fonte, centro_x, centro_y, cor):
    caixa = desenho.textbbox((0, 0), texto, font=fonte)
    largura, altura = caixa[2] - caixa[0], caixa[3] - caixa[1]
    desenho.text((centro_x - largura / 2 - caixa[0], centro_y - altura / 2 - caixa[1]), texto, font=fonte, fill=cor)


def placa_mercosul(texto):
    """Fundo branco, faixa azul com BRASIL no topo, letras pretas."""
    img = Image.new("RGB", (LARGURA, ALTURA), "white")
    d = ImageDraw.Draw(img)
    faixa = 120
    d.rectangle([0, 0, LARGURA, faixa], fill=(0, 51, 153))
    _texto_centralizado(d, "BRASIL", _fonte(80), LARGURA / 2, faixa / 2, "white")
    # bandeirinha simplificada no canto direito da faixa
    d.rectangle([LARGURA - 170, 25, LARGURA - 50, 95], fill=(0, 156, 59))
    d.polygon([(LARGURA - 110, 30), (LARGURA - 55, 60), (LARGURA - 110, 90), (LARGURA - 165, 60)], fill=(255, 223, 0))
    d.ellipse([LARGURA - 128, 42, LARGURA - 92, 78], fill=(0, 39, 118))
    # "BR" no canto esquerdo, como na placa real
    _texto_centralizado(d, "BR", _fonte(50), 75, ALTURA - 60, "black")
    fonte = _fonte_que_cabe(d, texto, 330, LARGURA - 260)
    _texto_centralizado(d, texto, fonte, LARGURA / 2 + 30, faixa + (ALTURA - faixa) / 2, "black")
    d.rounded_rectangle([4, 4, LARGURA - 5, ALTURA - 5], radius=30, outline="black", width=8)
    return img


def placa_antiga(texto):
    """Fundo cinza claro, letras pretas, cidade no topo: ABC-1234."""
    img = Image.new("RGB", (LARGURA, ALTURA), (205, 205, 205))
    d = ImageDraw.Draw(img)
    _texto_centralizado(d, "SAO LUIS - MA", _fonte(70), LARGURA / 2, 70, "black")
    fonte = _fonte_que_cabe(d, f"{texto[:3]}-{texto[3:]}", 330, LARGURA - 120)
    _texto_centralizado(d, f"{texto[:3]}-{texto[3:]}", fonte, LARGURA / 2, 320, "black")
    d.rounded_rectangle([4, 4, LARGURA - 5, ALTURA - 5], radius=30, outline="black", width=10)
    return img


def cena(placa, semente=0):
    """Cola a placa (pequena e levemente girada) num 'para-choque' falso."""
    rng = np.random.default_rng(semente)
    fundo = np.zeros((720, 1280, 3), np.uint8)
    # degradê cinza-azulado imitando a traseira de um carro
    for y in range(720):
        fundo[y, :] = (60 + y // 8, 65 + y // 9, 75 + y // 10)
    fundo = np.clip(fundo + rng.normal(0, 6, fundo.shape), 0, 255).astype(np.uint8)
    imagem = Image.fromarray(fundo)
    d = ImageDraw.Draw(imagem)
    d.rounded_rectangle([200, 260, 1080, 560], radius=40, fill=(35, 35, 40))  # suporte da placa

    pequena = placa.resize((480, 156), Image.LANCZOS).rotate(3, expand=True, fillcolor=(35, 35, 40))
    imagem.paste(pequena, (400, 320))
    return imagem.filter(ImageFilter.GaussianBlur(0.8))


def gerar(texto):
    texto = texto.upper().replace("-", "")
    PASTA.mkdir(exist_ok=True)
    eh_mercosul = texto[4].isalpha()
    placa = placa_mercosul(texto) if eh_mercosul else placa_antiga(texto)
    placa.save(PASTA / f"placa_{texto}.png", dpi=(DPI_IMPRESSAO, DPI_IMPRESSAO))
    cena(placa).save(PASTA / f"cena_{texto}.jpg", quality=92)
    tipo = "Mercosul" if eh_mercosul else "antiga"
    print(f"{texto} ({tipo}) -> placas_teste/placa_{texto}.png e cena_{texto}.jpg")


if __name__ == "__main__":
    for placa_texto in sys.argv[1:] or ["BRA2E19", "RIO1A23", "ABC1234"]:
        gerar(placa_texto)
