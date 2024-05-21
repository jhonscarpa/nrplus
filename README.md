# File Upload and Management Service

Este projeto é uma aplicação Node.js/Express que permite o upload, download, listagem e conversão de arquivos utilizando o AWS S3.

## Índice

- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Endpoints](#endpoints)
- [Dependências](#dependências)

## Instalação

Para instalar e rodar este projeto, siga os passos abaixo:

1. Clone o repositório:
    ```sh
    git clone https://github.com/jhonscarpa/nrplus.git
    cd seu-repositorio
    ```

2. Instale as dependências:
    ```sh
    npm install
    ```

3. Instale o [LibreOffice](https://www.libreoffice.org/download/download/), necessário para a conversão de arquivos para PDF. Certifique-se de que o comando `soffice` esteja disponível no seu PATH.

## Configuração

Crie um arquivo `.env` na raiz do projeto e configure as seguintes variáveis de ambiente:

```env
PORT=3000
AWS_KEY=sua-chave-de-acesso
AWS_SECRET_KEY=sua-chave-secreta
AWS_BUCKET_NAME=nome-do-seu-bucket
```

## Uso
Para iniciar o servidor, execute:
```sh
npm run dev
```
O servidor estará disponivel na porta especifica no arquivo `.env`.

## Endpoints

### Upoload de arquivos
  - URL: `/upload`
  - Método: `POST`
  - Descrição: Faz upload de múltiplos arquivos para o S3.
  - Parâmetros:
    - `files` (multipart/form-data): Arquivos para upload

### Listar arquivos
  - URL: `/files`
  - Método: `GET`
  - Descrição: Lista arquivos armazenados no S3 com paginação.
  - Parâmetros:
    - `page` (query): Número da página.
    - `pageSize` (query): Tamanho da página.

### Baixar arquivo
  - URL: `/download/:fileName`
  - Método: `GET`
  - Descrição: Retorna uma URL assinada para download do arquivo.
  - Parâmetros:
    - `fileName` (path): Nome do arquivo(key) para download.

### Converter arquivo
  - URL: `/file/:key`
  - Método: `GET`
  - Descrição: Converte o arquivo para gerar um preview em PDF.
  - Parâmetros:
    - `key` (path): Nome do arquivo(key).
    - `typeFile` (query): tipo do arquivo a ser convertido.

### Baixar todos os arquivos em .zip
  - URL: `/download-all`
  - Método: `GET`
  - Descrição: Baixa um arquivo zip contento todos os arquivos listados na página especificada.
  - Parâmetros:
    - `page` (query): Número da página.
    - `pageSize` (query): Tamanho da página.

## Dependências

- [express](https://www.npmjs.com/package/express)
- [multer](https://www.npmjs.com/package/multer)
- [aws-sdk](https://www.npmjs.com/package/aws-sdk)
- [archiver](https://www.npmjs.com/package/archiver)
- [cors](https://www.npmjs.com/package/cors)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [libreoffice](https://www.libreoffice.org/download/download/)






