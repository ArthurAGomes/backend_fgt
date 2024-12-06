import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Configuração do dotenv
dotenv.config();

// Definição da URL de conexão com o MongoDB Atlas diretamente
const mongoURI =
  process.env.MONGO_URI;

mongoose
  .connect(mongoURI)
  .then(() => console.log("Conectado ao MongoDB Atlas"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB Atlas:", err));

// Definição do esquema de mensagens
const mensagemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  mensagem: { type: String, required: true },
});

// Modelo para a coleção "mensagens"
const Mensagem = mongoose.model("Mensagem", mensagemSchema);

// Configuração do express
const app = express();
app.use(cors());
app.use(express.json());

// Configuração de autenticação
const JWT_SECRET = process.env.JWT_SECRET;
const CREDENTIALS = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
};

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido ou expirado." });
    }
    req.user = decoded;
    next();
  });
}

// Rota principal
app.get("/", (req, res) => {
  res.json({ message: "API de mensagens" });
});

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
app.get("/api/aviso", async (req, res) => {
  try {
    const mensagem = await Mensagem.findOne(); // Busca a mensagem mais recente
    if (!mensagem) {
      return res.status(404).json({ error: "Nenhuma mensagem encontrada." });
    }
    res.json(mensagem);
  } catch (err) {
    console.error("Erro ao buscar mensagem:", err);
    res.status(500).json({ error: "Erro ao buscar mensagem." });
  }
});

// Rota privada para alterar mensagens
app.post("/api/mensagem", authMiddleware, async (req, res) => {
  const { title, mensagem } = req.body;

  if (!title || !mensagem) {
    return res
      .status(400)
      .json({ error: "Título e mensagem são obrigatórios." });
  }

  try {
    const novaMensagem = await Mensagem.findOneAndUpdate(
      {}, // Critério vazio para atualizar o único documento existente
      { title, mensagem }, // Novos dados
      { new: true, upsert: true } // Cria se não existir
    );
    res.json({
      success: true,
      message: "Mensagem alterada com sucesso!",
      data: novaMensagem,
    });
  } catch (err) {
    console.error("Erro ao salvar mensagem:", err);
    res.status(500).json({ error: "Erro ao salvar a mensagem." });
  }
});

// Rota protegida para validar token
app.get("/api/validate-token", authMiddleware, (req, res) => {
  res.json({ success: true, message: "Token válido.", user: req.user });
});

// Rota para testar a conexão com o banco
app.get("/api/banco", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      success: true,
      message: "Conexão com o banco de dados bem-sucedida!",
    });
  } catch (err) {
    console.error("Erro ao conectar ao banco:", err);
    res.status(500).json({ error: "Erro ao conectar ao banco de dados." });
  }
});

// Exportação para Vercel
export default (req, res) => {
  app(req, res);
};
