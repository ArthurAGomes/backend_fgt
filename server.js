import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Configuração do dotenv
dotenv.config();

// Configurações básicas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, "mensagens.json");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração de autenticação
const JWT_SECRET = process.env.JWT_SECRET; // Obtém a chave secreta do .env
const CREDENTIALS = {
  username: process.env.ADMIN_USERNAME, // Usuário padrão, configurável no .env
  password: process.env.ADMIN_PASSWORD, // Senha padrão, configurável no .env
};

// Middleware de autenticação para proteger rotas privadas
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1]; // Exemplo: "Bearer token"

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido ou expirado." });
    }
    req.user = decoded; // Usuário autenticado
    next();
  });
}

app.get("/", (req, res) => {
    res.json({ message: "API de mensagens" });
})

// Rota para login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    // Gera o token JWT
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" }); // Expira em 1 hora
    res.json({ success: true, token, message: "Login bem-sucedido." });
  } else {
    res.status(401).json({ error: "Usuário ou senha inválidos." });
  }
});

// Rota pública para obter mensagens
app.get("/api/aviso", (req, res) => {
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Erro ao ler o arquivo de mensagens." });
    }

    const mensagens = JSON.parse(data);
    res.json(mensagens); // Retorna a mensagem atual
  });
});

// Rota privada para alterar mensagens
app.post("/api/mensagem", authMiddleware, (req, res) => {
  const { title, mensagem } = req.body;

  console.log("Título recebido:", title); // Verifique o título
  console.log("Mensagem recebida:", mensagem); // Verifique a mensagem

  if (!title || !mensagem) {
    console.log("Erro: título ou mensagem ausente.");
    return res
      .status(400)
      .json({ error: "Título e mensagem são obrigatórios." });
  }

  const novaMensagem = { title, mensagem };

  fs.writeFile(
    filePath,
    JSON.stringify(novaMensagem, null, 2),
    "utf-8",
    (err) => {
      if (err) {
        console.error("Erro ao salvar a mensagem:", err); // Log de erro do fs
        return res.status(500).json({ error: "Erro ao salvar a mensagem." });
      }

      res.json({ success: true, message: "Mensagem alterada com sucesso!" });
    }
  );
});


// Rota protegida para verificar o token (validação)
app.get("/api/validate-token", authMiddleware, (req, res) => {
  res.json({ success: true, message: "Token válido.", user: req.user });
});

// Função exportada para o Vercel
export default (req, res) => {
  app(req, res);
};
