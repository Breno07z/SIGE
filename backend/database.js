const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database("./mstech.db", (err) => {
  if (err) {
    console.error("Erro ao abrir o banco de dados:", err.message)
  } else {
    console.log("Conectado ao banco de dados SQLite.")
    db.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cnpj TEXT UNIQUE,
        email TEXT UNIQUE
      )
    `)
    db.run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_id INTEGER,
        reset_password_token TEXT,
        reset_password_expires TEXT,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `,
      (err) => {
        if (err) {
          console.error("Erro ao criar a tabela users:", err.message)
        } else {
          console.log("Tabela users criada ou já existente.")
        }
      }
    )

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        city TEXT,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        value REAL NOT NULL,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pendente',
        value REAL NOT NULL,
        company_id INTEGER,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS financial_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        value REAL NOT NULL,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS financial_exits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        value REAL NOT NULL,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `)

    db.run(
      `
      CREATE TABLE IF NOT EXISTS terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        company_id INTEGER UNIQUE NOT NULL,
        last_updated TEXT,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `,
      (err) => {
        if (err) {
          console.error("Erro ao criar a tabela terms:", err.message)
        } else {
          console.log("Tabela terms criada ou já existente.")
        }
      }
    )
  }
})

module.exports = db
