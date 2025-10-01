const express = require("express")
const cors = require("cors")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcryptjs")
const app = express()
const port = process.env.PORT || 3000

const db = require("./database") // Importa o arquivo do banco de dados para inicializá-lo
const path = require("path")
const nodemailer = require("nodemailer") // Importa Nodemailer
const crypto = require("crypto") // Importa o módulo crypto para gerar tokens

app.use(express.json()) // Para parsear o corpo das requisições JSON
// Permitir requisições do frontend (ajuste a origem em produção se quiser restringir)
const FRONTEND_URL = process.env.FRONTEND_URL || "https://breno07z.github.io/SIGE"
app.use(
  cors({
    origin: FRONTEND_URL === "*" ? true : FRONTEND_URL,
  })
)

// Configuração do Nodemailer com Ethereal Mail
let transporter
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error("Falha ao criar uma conta de teste Ethereal. " + err.message)
    return process.exit(1)
  }

  console.log("Credenciais Ethereal: %s", account.user)
  console.log(
    "URL de pré-visualização Ethereal: %s",
    nodemailer.getTestMessageUrl(account)
  )

  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  })
})

// Rota de Cadastro de Empresa e Usuário
app.post("/register", async (req, res) => {
  const { name, cnpj, email, userEmail, password } = req.body

  if (!name || !cnpj || !email || !userEmail || !password) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." })
  }

  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Inserir a empresa
    db.run(
      `INSERT INTO companies (name, cnpj, email) VALUES (?, ?, ?)`,
      [name, cnpj, email],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res
              .status(409)
              .json({ message: "CNPJ ou E-mail da empresa já cadastrado." })
          }
          console.error("Erro ao cadastrar empresa:", err.message)
          return res
            .status(500)
            .json({ message: "Erro interno do servidor ao cadastrar empresa." })
        }

        const companyId = this.lastID

        // Inserir o usuário
        db.run(
          `INSERT INTO users (email, password, company_id) VALUES (?, ?, ?)`,
          [userEmail, hashedPassword, companyId],
          function (err) {
            if (err) {
              if (err.message.includes("UNIQUE constraint failed")) {
                return res
                  .status(409)
                  .json({ message: "E-mail do usuário já cadastrado." })
              }
              console.error("Erro ao cadastrar usuário:", err.message)
              return res.status(500).json({
                message: "Erro interno do servidor ao cadastrar usuário.",
              })
            }
            res.status(201).json({
              message: "Empresa e usuário cadastrados com sucesso!",
              companyId: companyId,
              userId: this.lastID,
            })
          }
        )
      }
    )
  } catch (error) {
    console.error("Erro geral no cadastro:", error.message)
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

// Rota de Login de Usuário
app.post("/login", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "E-mail e senha são obrigatórios." })
  }

  try {
    db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      async (err, user) => {
        if (err) {
          console.error("Erro ao buscar usuário:", err.message)
          return res.status(500).json({ message: "Erro interno do servidor." })
        }
        if (!user) {
          return res.status(400).json({ message: "Credenciais inválidas." })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
          return res.status(400).json({ message: "Credenciais inválidas." })
        }

        // No futuro, aqui geraremos e retornaremos um token JWT
        res.status(200).json({
          message: "Login bem-sucedido!",
          userId: user.id,
          companyId: user.company_id,
        })
      }
    )
  } catch (error) {
    console.error("Erro geral no login:", error.message)
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

// Rota para solicitar redefinição de senha
app.post("/forgot-password", (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: "E-mail é obrigatório." })
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      console.error("Erro ao buscar usuário para redefinição:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (!user) {
      // Não informa se o e-mail não foi encontrado por segurança
      return res.status(200).json({
        message:
          "Se o e-mail estiver registrado, você receberá um link de redefinição de senha.",
      })
    }

    const token = crypto.randomBytes(20).toString("hex")
    const expires = Date.now() + 3600000 // 1 hora de validade

    db.run(
      `UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?`,
      [token, expires, user.id],
      async (updateErr) => {
        if (updateErr) {
          console.error(
            "Erro ao atualizar token de redefinição:",
            updateErr.message
          )
          return res.status(500).json({
            message: "Erro interno do servidor ao gerar token de redefinição.",
          })
        }

        // O link de redefinição apontará para uma nova página HTML no frontend
        const resetUrl = `${FRONTEND_URL}/reset-password.html?token=${token}`

        const mailOptions = {
          to: user.email,
          from: "mstech-noreply@example.com", // Pode ser qualquer e-mail para Ethereal
          subject: "Redefinição de Senha MsTech Controladoria",
          html: `<p>Você solicitou a redefinição de senha.</p>
                 <p>Por favor, clique neste link para redefinir sua senha: <a href="${resetUrl}">${resetUrl}</a></p>
                 <p>Este link expirará em 1 hora.</p>`,
        }

        try {
          if (!transporter) {
            throw new Error("Transporter de e-mail não configurado.")
          }
          await transporter.sendMail(mailOptions)
          res.status(200).json({
            message:
              "Se o e-mail estiver registrado, você receberá um link de redefinição de senha.",
          })
        } catch (mailError) {
          console.error(
            "Erro ao enviar e-mail de redefinição:",
            mailError.message
          )
          res.status(500).json({
            message: "Erro interno do servidor ao enviar e-mail.",
          })
        }
      }
    )
  })
})

// Rota para redefinir a senha usando o token
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token e nova senha são obrigatórios." })
  }

  // Validação de força da nova senha no backend (dupla verificação)
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: "A senha deve ter pelo menos 8 caracteres." })
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    return res.status(400).json({
      message: "A senha deve conter pelo menos um caractere especial.",
    })
  }
  if (!/[A-Z]/.test(newPassword)) {
    return res
      .status(400)
      .json({ message: "A senha deve conter pelo menos uma letra maiúscula." })
  }
  if (!/[a-z]/.test(newPassword)) {
    return res
      .status(400)
      .json({ message: "A senha deve conter pelo menos uma letra minúscula." })
  }
  if (!/[0-9]/.test(newPassword)) {
    return res
      .status(400)
      .json({ message: "A senha deve conter pelo menos um número." })
  }

  try {
    db.get(
      `SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > ?`,
      [token, Date.now()],
      async (err, user) => {
        if (err) {
          console.error(
            "Erro ao buscar usuário para redefinição de senha:",
            err.message
          )
          return res.status(500).json({ message: "Erro interno do servidor." })
        }
        if (!user) {
          return res
            .status(400)
            .json({ message: "Token inválido ou expirado." })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        db.run(
          `UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?`,
          [hashedPassword, user.id],
          function (updateErr) {
            if (updateErr) {
              console.error(
                "Erro ao redefinir senha do usuário:",
                updateErr.message
              )
              return res.status(500).json({
                message: "Erro interno do servidor ao redefinir senha.",
              })
            }
            res.status(200).json({ message: "Senha redefinida com sucesso!" })
          }
        )
      }
    )
  } catch (error) {
    console.error("Erro geral na redefinição de senha:", error.message)
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

// Rota para obter dados do perfil da empresa
app.get("/company/profile/:companyId", (req, res) => {
  const { companyId } = req.params

  db.get(
    `SELECT id, name, cnpj, email FROM companies WHERE id = ?`,
    [companyId],
    (err, company) => {
      if (err) {
        console.error("Erro ao buscar perfil da empresa:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada." })
      }
      res.status(200).json({ company })
    }
  )
})

// Rota para atualizar dados do perfil da empresa
app.put("/company/profile/:companyId", (req, res) => {
  const { companyId } = req.params
  const { name, email, cnpj } = req.body

  if (!name && !email && !cnpj) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (name) {
    fields.push("name = ?")
    values.push(name)
  }
  if (email) {
    fields.push("email = ?")
    values.push(email)
  }
  if (cnpj) {
    fields.push("cnpj = ?")
    values.push(cnpj)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE companies SET ${fields.join(", ")} WHERE id = ?`
  values.push(companyId)

  db.run(query, values, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ message: "CNPJ ou E-mail da empresa já em uso." })
      }
      console.error("Erro ao atualizar perfil da empresa:", err.message)
      return res.status(500).json({
        message: "Erro interno do servidor ao atualizar perfil da empresa.",
      })
    }
    if (this.changes === 0) {
      return res
        .status(404)
        .json({ message: "Empresa não encontrada ou nenhum dado alterado." })
    }
    res
      .status(200)
      .json({ message: "Perfil da empresa atualizado com sucesso!" })
  })
})

// Rota para alterar a senha do usuário
app.put("/user/password/:userId", async (req, res) => {
  const { userId } = req.params
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "As senhas atual e nova são obrigatórias." })
  }

  try {
    db.get(`SELECT * FROM users WHERE id = ?`, [userId], async (err, user) => {
      if (err) {
        console.error(
          "Erro ao buscar usuário para alteração de senha:",
          err.message
        )
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." })
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return res.status(401).json({ message: "Senha atual incorreta." })
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10)

      db.run(
        `UPDATE users SET password = ? WHERE id = ?`,
        [hashedNewPassword, userId],
        function (err) {
          if (err) {
            console.error("Erro ao atualizar senha do usuário:", err.message)
            return res
              .status(500)
              .json({ message: "Erro interno do servidor." })
          }
          res.status(200).json({ message: "Senha alterada com sucesso!" })
        }
      )
    })
  } catch (error) {
    console.error("Erro geral na alteração de senha:", error.message)
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

// Nova Rota para deletar um usuário
app.delete("/user/:userId", (req, res) => {
  const { userId } = req.params
  console.log(`Requisição DELETE recebida para o usuário: ${userId}`)

  db.run(`DELETE FROM users WHERE id = ?`, [userId], function (err) {
    if (err) {
      console.error("Erro ao deletar usuário:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." })
    }
    res.status(200).json({ message: "Usuário deletado com sucesso!" })
  })
})

// Nova Rota para deletar uma empresa e todos os seus dados associados
app.delete("/company/:companyId", (req, res) => {
  const { companyId } = req.params

  // Devido ao ON DELETE CASCADE configurado no database.js,
  // deletar a empresa irá automaticamente deletar:
  // - Usuários associados a esta empresa
  // - Produtos associados a esta empresa
  // - Clientes associados a esta empresa
  // - Serviços associados a esta empresa
  // - Ordens de Serviço associadas a esta empresa
  // - Entradas Financeiras associadas a esta empresa
  // - Saídas Financeiras associadas a esta empresa
  // - Termos associados a esta empresa

  db.run(`DELETE FROM companies WHERE id = ?`, [companyId], function (err) {
    if (err) {
      console.error("Erro ao deletar empresa:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Empresa não encontrada." })
    }
    res.status(200).json({
      message: "Empresa e todos os dados relacionados deletados com sucesso!",
    })
  })
})

// Rotas para Produtos
app.post("/products", (req, res) => {
  const { name, category, price, stock, company_id } = req.body

  if (!name || !price || !stock || !company_id) {
    return res.status(400).json({
      message: "Nome, preço, estoque e ID da empresa são obrigatórios.",
    })
  }

  db.run(
    `INSERT INTO products (name, category, price, stock, company_id) VALUES (?, ?, ?, ?, ?)`,
    [name, category, price, stock, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao adicionar produto:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(201).json({
        message: "Produto adicionado com sucesso!",
        productId: this.lastID,
      })
    }
  )
})

app.get("/products/:companyId", (req, res) => {
  const { companyId } = req.params

  db.all(
    `SELECT * FROM products WHERE company_id = ?`,
    [companyId],
    (err, products) => {
      if (err) {
        console.error("Erro ao buscar produtos:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(200).json({ products })
    }
  )
})

app.put("/products/:id", (req, res) => {
  const { id } = req.params
  const { name, category, price, stock, company_id } = req.body

  if (!name && !category && !price && !stock) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (name) {
    fields.push("name = ?")
    values.push(name)
  }
  if (category) {
    fields.push("category = ?")
    values.push(category)
  }
  if (price) {
    fields.push("price = ?")
    values.push(price)
  }
  if (stock) {
    fields.push("stock = ?")
    values.push(stock)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE products SET ${fields.join(
    ", "
  )} WHERE id = ? AND company_id = ?`
  values.push(id, company_id)

  db.run(query, values, function (err) {
    if (err) {
      console.error("Erro ao atualizar produto:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res
        .status(404)
        .json({ message: "Produto não encontrado ou nenhum dado alterado." })
    }
    res.status(200).json({ message: "Produto atualizado com sucesso!" })
  })
})

app.delete("/products/:id", (req, res) => {
  const { id } = req.params
  const { company_id } = req.body // company_id deve ser enviada para garantir que o usuário está deletando o próprio produto

  if (!company_id) {
    return res.status(400).json({ message: "ID da empresa é obrigatório." })
  }

  db.run(
    `DELETE FROM products WHERE id = ? AND company_id = ?`,
    [id, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao deletar produto:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (this.changes === 0) {
        return res.status(404).json({
          message: "Produto não encontrado ou não pertence a esta empresa.",
        })
      }
      res.status(200).json({ message: "Produto deletado com sucesso!" })
    }
  )
})

// Rotas para Clientes
app.post("/clients", (req, res) => {
  const { name, email, phone, city, company_id } = req.body

  if (!name || !email || !company_id) {
    return res
      .status(400)
      .json({ message: "Nome, e-mail e ID da empresa são obrigatórios." })
  }

  db.run(
    `INSERT INTO clients (name, email, phone, city, company_id) VALUES (?, ?, ?, ?, ?)`,
    [name, email, phone, city, company_id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res
            .status(409)
            .json({ message: "E-mail do cliente já cadastrado." })
        }
        console.error("Erro ao adicionar cliente:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(201).json({
        message: "Cliente adicionado com sucesso!",
        clientId: this.lastID,
      })
    }
  )
})

app.get("/clients/:companyId", (req, res) => {
  const { companyId } = req.params

  db.all(
    `SELECT * FROM clients WHERE company_id = ?`,
    [companyId],
    (err, clients) => {
      if (err) {
        console.error("Erro ao buscar clientes:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(200).json({ clients })
    }
  )
})

app.put("/clients/:id", (req, res) => {
  const { id } = req.params
  const { name, email, phone, city, company_id } = req.body

  if (!name && !email && !phone && !city) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (name) {
    fields.push("name = ?")
    values.push(name)
  }
  if (email) {
    fields.push("email = ?")
    values.push(email)
  }
  if (phone) {
    fields.push("phone = ?")
    values.push(phone)
  }
  if (city) {
    fields.push("city = ?")
    values.push(city)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE clients SET ${fields.join(
    ", "
  )} WHERE id = ? AND company_id = ?`
  values.push(id, company_id)

  db.run(query, values, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ message: "E-mail do cliente já em uso." })
      }
      console.error("Erro ao atualizar cliente:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res
        .status(404)
        .json({ message: "Cliente não encontrado ou nenhum dado alterado." })
    }
    res.status(200).json({ message: "Cliente atualizado com sucesso!" })
  })
})

app.delete("/clients/:id", (req, res) => {
  const { id } = req.params
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ message: "ID da empresa é obrigatório." })
  }

  db.run(
    `DELETE FROM clients WHERE id = ? AND company_id = ?`,
    [id, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao deletar cliente:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (this.changes === 0) {
        return res.status(404).json({
          message: "Cliente não encontrado ou não pertence a esta empresa.",
        })
      }
      res.status(200).json({ message: "Cliente deletado com sucesso!" })
    }
  )
})

// Rotas para Serviços
app.post("/services", (req, res) => {
  const { name, description, value, company_id } = req.body

  if (!name || !value || !company_id) {
    return res
      .status(400)
      .json({ message: "Nome, valor e ID da empresa são obrigatórios." })
  }

  db.run(
    `INSERT INTO services (name, description, value, company_id) VALUES (?, ?, ?, ?)`,
    [name, description, value, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao adicionar serviço:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(201).json({
        message: "Serviço adicionado com sucesso!",
        serviceId: this.lastID,
      })
    }
  )
})

app.get("/services/:companyId", (req, res) => {
  const { companyId } = req.params

  db.all(
    `SELECT * FROM services WHERE company_id = ?`,
    [companyId],
    (err, services) => {
      if (err) {
        console.error("Erro ao buscar serviços:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(200).json({ services })
    }
  )
})

app.put("/services/:id", (req, res) => {
  const { id } = req.params
  const { name, description, value, company_id } = req.body

  if (!name && !description && !value) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (name) {
    fields.push("name = ?")
    values.push(name)
  }
  if (description) {
    fields.push("description = ?")
    values.push(description)
  }
  if (value) {
    fields.push("value = ?")
    values.push(value)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE services SET ${fields.join(
    ", "
  )} WHERE id = ? AND company_id = ?`
  values.push(id, company_id)

  db.run(query, values, function (err) {
    if (err) {
      console.error("Erro ao atualizar serviço:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res
        .status(404)
        .json({ message: "Serviço não encontrado ou nenhum dado alterado." })
    }
    res.status(200).json({ message: "Serviço atualizado com sucesso!" })
  })
})

app.delete("/services/:id", (req, res) => {
  const { id } = req.params
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ message: "ID da empresa é obrigatório." })
  }

  db.run(
    `DELETE FROM services WHERE id = ? AND company_id = ?`,
    [id, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao deletar serviço:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (this.changes === 0) {
        return res.status(404).json({
          message: "Serviço não encontrado ou não pertence a esta empresa.",
        })
      }
      res.status(200).json({ message: "Serviço deletado com sucesso!" })
    }
  )
})

// Rotas para Ordens de Serviço
app.post("/orders", (req, res) => {
  const { client_id, service_id, status, value, company_id } = req.body

  if (!client_id || !service_id || !status || !value || !company_id) {
    return res.status(400).json({
      message:
        "ID do cliente, ID do serviço, status, valor e ID da empresa são obrigatórios.",
    })
  }

  db.run(
    `INSERT INTO orders (client_id, service_id, status, value, company_id) VALUES (?, ?, ?, ?, ?)`,
    [client_id, service_id, status, value, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao adicionar ordem de serviço:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(201).json({
        message: "Ordem de serviço adicionada com sucesso!",
        orderId: this.lastID,
      })
    }
  )
})

app.get("/orders/:companyId", (req, res) => {
  const { companyId } = req.params

  // Usar JOIN para obter nomes de clientes e serviços
  db.all(
    `
    SELECT
      o.id,
      c.name AS client_name,
      s.name AS service_name,
      o.status,
      o.value
    FROM orders AS o
    JOIN clients AS c ON o.client_id = c.id
    JOIN services AS s ON o.service_id = s.id
    WHERE o.company_id = ?
  `,
    [companyId],
    (err, orders) => {
      if (err) {
        console.error("Erro ao buscar ordens de serviço:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(200).json({ orders })
    }
  )
})

app.put("/orders/:id", (req, res) => {
  const { id } = req.params
  const { client_id, service_id, status, value, company_id } = req.body

  if (!client_id && !service_id && !status && !value) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (client_id) {
    fields.push("client_id = ?")
    values.push(client_id)
  }
  if (service_id) {
    fields.push("service_id = ?")
    values.push(service_id)
  }
  if (status) {
    fields.push("status = ?")
    values.push(status)
  }
  if (value) {
    fields.push("value = ?")
    values.push(value)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE orders SET ${fields.join(
    ", "
  )} WHERE id = ? AND company_id = ?`
  values.push(id, company_id)

  db.run(query, values, function (err) {
    if (err) {
      console.error("Erro ao atualizar ordem de serviço:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res.status(404).json({
        message: "Ordem de serviço não encontrada ou nenhum dado alterado.",
      })
    }
    res
      .status(200)
      .json({ message: "Ordem de serviço atualizada com sucesso!" })
  })
})

app.delete("/orders/:id", (req, res) => {
  const { id } = req.params
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ message: "ID da empresa é obrigatório." })
  }

  db.run(
    `DELETE FROM orders WHERE id = ? AND company_id = ?`,
    [id, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao deletar ordem de serviço:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (this.changes === 0) {
        return res.status(404).json({
          message:
            "Ordem de serviço não encontrada ou não pertence a esta empresa.",
        })
      }
      res
        .status(200)
        .json({ message: "Ordem de serviço deletada com sucesso!" })
    }
  )
})

// Rotas para Entradas Financeiras
app.post("/financial-entries", (req, res) => {
  const { description, date, value, company_id } = req.body

  if (!description || !date || !value || !company_id) {
    return res.status(400).json({
      message: "Descrição, data, valor e ID da empresa são obrigatórios.",
    })
  }

  db.run(
    `INSERT INTO financial_entries (description, date, value, company_id) VALUES (?, ?, ?, ?)`,
    [description, date, value, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao adicionar entrada financeira:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(201).json({
        message: "Entrada financeira adicionada com sucesso!",
        entryId: this.lastID,
      })
    }
  )
})

app.get("/financial-entries/:companyId", (req, res) => {
  const { companyId } = req.params

  db.all(
    `SELECT * FROM financial_entries WHERE company_id = ? ORDER BY date DESC`,
    [companyId],
    (err, entries) => {
      if (err) {
        console.error("Erro ao buscar entradas financeiras:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(200).json({ entries })
    }
  )
})

app.put("/financial-entries/:id", (req, res) => {
  const { id } = req.params
  const { description, date, value, company_id } = req.body

  if (!description && !date && !value) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (description) {
    fields.push("description = ?")
    values.push(description)
  }
  if (date) {
    fields.push("date = ?")
    values.push(date)
  }
  if (value) {
    fields.push("value = ?")
    values.push(value)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE financial_entries SET ${fields.join(
    ", "
  )} WHERE id = ? AND company_id = ?`
  values.push(id, company_id)

  db.run(query, values, function (err) {
    if (err) {
      console.error("Erro ao atualizar entrada financeira:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res.status(404).json({
        message: "Entrada financeira não encontrada ou nenhum dado alterado.",
      })
    }
    res
      .status(200)
      .json({ message: "Entrada financeira atualizada com sucesso!" })
  })
})

app.delete("/financial-entries/:id", (req, res) => {
  const { id } = req.params
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ message: "ID da empresa é obrigatório." })
  }

  db.run(
    `DELETE FROM financial_entries WHERE id = ? AND company_id = ?`,
    [id, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao deletar entrada financeira:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (this.changes === 0) {
        return res.status(404).json({
          message:
            "Entrada financeira não encontrada ou não pertence a esta empresa.",
        })
      }
      res
        .status(200)
        .json({ message: "Entrada financeira deletada com sucesso!" })
    }
  )
})

// Rotas para Saídas Financeiras
app.post("/financial-exits", (req, res) => {
  const { description, date, value, company_id } = req.body

  if (!description || !date || !value || !company_id) {
    return res.status(400).json({
      message: "Descrição, data, valor e ID da empresa são obrigatórios.",
    })
  }

  db.run(
    `INSERT INTO financial_exits (description, date, value, company_id) VALUES (?, ?, ?, ?)`,
    [description, date, value, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao adicionar saída financeira:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(201).json({
        message: "Saída financeira adicionada com sucesso!",
        exitId: this.lastID,
      })
    }
  )
})

app.get("/financial-exits/:companyId", (req, res) => {
  const { companyId } = req.params

  db.all(
    `SELECT * FROM financial_exits WHERE company_id = ? ORDER BY date DESC`,
    [companyId],
    (err, exits) => {
      if (err) {
        console.error("Erro ao buscar saídas financeiras:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      res.status(200).json({ exits })
    }
  )
})

app.put("/financial-exits/:id", (req, res) => {
  const { id } = req.params
  const { description, date, value, company_id } = req.body

  if (!description && !date && !value) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualizar foi fornecido." })
  }

  let fields = []
  let values = []

  if (description) {
    fields.push("description = ?")
    values.push(description)
  }
  if (date) {
    fields.push("date = ?")
    values.push(date)
  }
  if (value) {
    fields.push("value = ?")
    values.push(value)
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido para atualização." })
  }

  const query = `UPDATE financial_exits SET ${fields.join(
    ", "
  )} WHERE id = ? AND company_id = ?`
  values.push(id, company_id)

  db.run(query, values, function (err) {
    if (err) {
      console.error("Erro ao atualizar saída financeira:", err.message)
      return res.status(500).json({ message: "Erro interno do servidor." })
    }
    if (this.changes === 0) {
      return res.status(404).json({
        message: "Saída financeira não encontrada ou nenhum dado alterado.",
      })
    }
    res
      .status(200)
      .json({ message: "Saída financeira atualizada com sucesso!" })
  })
})

app.delete("/financial-exits/:id", (req, res) => {
  const { id } = req.params
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ message: "ID da empresa é obrigatório." })
  }

  db.run(
    `DELETE FROM financial_exits WHERE id = ? AND company_id = ?`,
    [id, company_id],
    function (err) {
      if (err) {
        console.error("Erro ao deletar saída financeira:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (this.changes === 0) {
        return res.status(404).json({
          message:
            "Saída financeira não encontrada ou não pertence a esta empresa.",
        })
      }
      res
        .status(200)
        .json({ message: "Saída financeira deletada com sucesso!" })
    }
  )
})

// Rotas para Termos
app.get("/terms/:companyId", (req, res) => {
  const { companyId } = req.params

  db.get(
    `SELECT content, last_updated FROM terms WHERE company_id = ?`,
    [companyId],
    (err, terms) => {
      if (err) {
        console.error("Erro ao buscar termos:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }
      if (!terms) {
        // Se não houver termos, retorna um conteúdo padrão ou vazio
        return res.status(200).json({
          content: "Nenhum termo cadastrado ainda.",
          last_updated: null,
        })
      }
      res.status(200).json({ terms })
    }
  )
})

app.put("/terms/:companyId", (req, res) => {
  const { companyId } = req.params
  const { content } = req.body
  const last_updated = new Date().toISOString() // Data e hora atual

  if (!content) {
    return res
      .status(400)
      .json({ message: "O conteúdo dos termos é obrigatório." })
  }

  // Verifica se já existem termos para esta empresa
  db.get(
    `SELECT id FROM terms WHERE company_id = ?`,
    [companyId],
    (err, row) => {
      if (err) {
        console.error("Erro ao verificar termos existentes:", err.message)
        return res.status(500).json({ message: "Erro interno do servidor." })
      }

      if (row) {
        // Atualiza os termos existentes
        db.run(
          `UPDATE terms SET content = ?, last_updated = ? WHERE company_id = ?`,
          [content, last_updated, companyId],
          function (err) {
            if (err) {
              console.error("Erro ao atualizar termos:", err.message)
              return res
                .status(500)
                .json({ message: "Erro interno do servidor." })
            }
            res.status(200).json({ message: "Termos atualizados com sucesso!" })
          }
        )
      } else {
        // Insere novos termos se não existirem
        db.run(
          `INSERT INTO terms (content, company_id, last_updated) VALUES (?, ?, ?)`,
          [content, companyId, last_updated],
          function (err) {
            if (err) {
              console.error("Erro ao inserir termos:", err.message)
              return res
                .status(500)
                .json({ message: "Erro interno do servidor." })
            }
            res.status(201).json({
              message: "Termos adicionados com sucesso!",
              termId: this.lastID,
            })
          }
        )
      }
    }
  )
})

// Servir arquivos estáticos do diretório raiz do projeto (movido para o final)
app.use(express.static(path.join(__dirname, "..")))

// Health check para provedores (Render)
app.get("/", (_req, res) => {
  res.status(200).send("OK")
})

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`)
})
