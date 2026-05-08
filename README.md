# Dashboard MRR — VISAT & PRIME Brasil

Painel interativo de Receita Recorrente Mensal (MRR) para clientes VISAT e distribuidores PRIME Brasil, com dados de 2023 a 2025.

## Visão geral

Este projeto é um dashboard estático que consome `data.json` para apresentar:

- Visão geral de MRR por marca e ano
- Evolução histórica mensal
- Métricas de desempenho e ranking
- Distribuição por região e estado
- Tabela detalhada de clientes e valores

## Estrutura do projeto

- `index.html` — página principal do dashboard
- `style.css` — estilos visuais e layout
- `dashboard.js` — lógica de filtros, gráficos e visualização
- `data.json` — dados do dashboard
- `logo_thum_prime.png` — imagem do logo usada no painel
- `Dockerfile` — container Nginx para servir o site
- `nginx.conf` — configuração do Nginx
- `check_stats.py` — script simples para validar somas e estatísticas do `data.json`
- `export_data.py` — script para gerar `data.json` a partir das planilhas Excel
- `MRR clientes VISAT Brasil 2023_2025..xlsx` — dados de clientes VISAT
- `MRR Distribuidores PRIME Brasil 2023-2025.xlsx` — dados de distribuidores PRIME

## Como usar

### Rodar localmente

A forma mais simples é abrir `index.html` no navegador. Como o dashboard faz `fetch('data.json')`, é recomendado servir os arquivos via HTTP.

Exemplo usando Python:

```bash
python3 -m http.server 8000
```

Então acesse:

```text
http://localhost:8000
```

### Rodar com Docker

Construa a imagem e execute o container:

```bash
docker build -t mrr-dashboard .
docker run -p 8080:80 mrr-dashboard
```

Acesse em:

```text
http://localhost:8080
```

## Atualizar os dados

Para gerar `data.json` a partir das planilhas Excel, instale a dependência Python `openpyxl` e execute:

```bash
pip install openpyxl
python3 export_data.py
```

Isso irá ler os arquivos Excel e exportar o conjunto de dados para `data.json`.

## Verificação rápida

Para conferir os totais de MRR e os principais distribuidores/estados, rode:

```bash
python3 check_stats.py
```

## Requisitos

- Navegador moderno com suporte a JavaScript
- `python3` se quiser gerar/validar `data.json`
- `docker` opcional para execução em container

## Notas

- O dashboard usa `Chart.js` via CDN para renderizar gráficos
- O filtro de dados permite selecionar ano, marca, categoria e estado
- O layout é responsivo e inclui navegação lateral para seções do painel
