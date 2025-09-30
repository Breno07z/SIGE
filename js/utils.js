export const BACKEND_URL = "http://localhost:3000" // URL do seu backend Node.js

export let systemData = {
  loggedInUser: JSON.parse(localStorage.getItem("loggedInUser")) || null,
  companyInfo: JSON.parse(localStorage.getItem("companyInfo")) || null,
}

// Função para salvar dados do usuário no localStorage
export function saveUserData(user, company) {
  systemData.loggedInUser = user
  systemData.companyInfo = company
  localStorage.setItem("loggedInUser", JSON.stringify(user))
  localStorage.setItem("companyInfo", JSON.stringify(company))
}

// Função para limpar dados do usuário do localStorage (logout)
export function clearUserData() {
  systemData.loggedInUser = null
  systemData.companyInfo = null
  localStorage.removeItem("loggedInUser")
  localStorage.removeItem("companyInfo")
}
