import {
  BACKEND_URL,
  systemData,
  saveUserData,
  clearUserData,
} from "./utils.js"
import { loadPage, showCustomMessage, showLoading, hideLoading } from "./ui.js"
import { loadDashboard } from "./dashboard.js" 
import { loadProfilePage } from "./profile.js"
import { handleEditTerms } from "./terms.js" 

// Função para anexar o listener do formulário de cadastro
export function attachRegisterFormListener() {
  const registerForm = document.getElementById("registerForm")
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister)
  }
  const loginLink = document.getElementById("loginLink")
  if (loginLink) {
    loginLink.addEventListener("click", (event) => {
      event.preventDefault()
      loadPage("login")
    })
  }
}

// Função para anexar o listener do formulário de login
export function attachLoginFormListener() {
  const loginForm = document.getElementById("loginForm")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }
  const registerLink = document.getElementById("registerLink")
  if (registerLink) {
    registerLink.addEventListener("click", (event) => {
      event.preventDefault()
      loadPage("register")
    })
  }
  const forgotPasswordLink = document.getElementById("forgotPasswordLink")
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (event) => {
      event.preventDefault()
      loadPage("forgot-password")
    })
  }
}

// Função para anexar o listener do formulário de edição da empresa
export function attachEditCompanyFormListener() {
  const editCompanyForm = document.getElementById("editCompanyForm")
  if (editCompanyForm) {
    editCompanyForm.addEventListener("submit", handleEditCompany)
  }
}

// Função para anexar o listener do formulário de edição de termos
export function attachEditTermsFormListener() {
  const editTermsForm = document.getElementById("editTermsForm")
  if (editTermsForm) {
    editTermsForm.addEventListener("submit", handleEditTerms)
  }
}

// Lidar com o cadastro
export async function handleRegister(event) {
  event.preventDefault()

  const companyName = document.getElementById("companyName").value.trim()
  const cnpj = document.getElementById("cnpj").value.trim()
  const companyEmail = document.getElementById("companyEmail").value.trim()
  const userEmail = document.getElementById("userEmail").value.trim()
  const password = document.getElementById("password").value.trim()
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim()

  // Validação de campos obrigatórios
  if (
    !companyName ||
    !cnpj ||
    !companyEmail ||
    !userEmail ||
    !password ||
    !confirmPassword
  ) {
    showCustomMessage(
      "Por favor, preencha todos os campos do formulário.",
      "error"
    )
    return
  }

  // Validação de formato de e-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(companyEmail)) {
    showCustomMessage("Por favor, insira um e-mail de empresa válido.", "error")
    return
  }
  if (!emailRegex.test(userEmail)) {
    showCustomMessage("Por favor, insira um e-mail de usuário válido.", "error")
    return
  }

  // Validação de força da senha
  if (password.length < 8) {
    showCustomMessage("A senha deve ter pelo menos 8 caracteres.", "error")
    return
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    showCustomMessage(
      "A senha deve conter pelo menos um caractere especial.",
      "error"
    )
    return
  }
  if (!/[A-Z]/.test(password)) {
    showCustomMessage(
      "A senha deve conter pelo menos uma letra maiúscula.",
      "error"
    )
    return
  }
  if (!/[a-z]/.test(password)) {
    showCustomMessage(
      "A senha deve conter pelo menos uma letra minúscula.",
      "error"
    )
    return
  }
  if (!/[0-9]/.test(password)) {
    showCustomMessage("A senha deve conter pelo menos um número.", "error")
    return
  }

  // Validação de confirmação de senha
  if (password !== confirmPassword) {
    showCustomMessage("As senhas não coincidem!", "error")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: companyName,
        cnpj,
        email: companyEmail,
        userEmail,
        password,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadPage("login") // Redireciona para a página de login após o cadastro
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao cadastrar:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

// Lidar com o login
export async function handleLogin(event) {
  event.preventDefault()

  const email = document.getElementById("loginEmail").value.trim()
  const password = document.getElementById("loginPassword").value.trim()

  // Validação de campos obrigatórios
  if (!email || !password) {
    hideLoading()
    showCustomMessage("Por favor, insira seu e-mail e senha.", "error")
    return
  }

  // Validação de formato de e-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    hideLoading()
    showCustomMessage("Por favor, insira um e-mail válido.", "error")
    return
  }

  showLoading("Verificando seu login...")

  try {
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (response.ok) {
      // Buscar informações completas da empresa após o login
      const companyResponse = await fetch(
        `${BACKEND_URL}/company/profile/${data.companyId}`
      )
      const companyData = await companyResponse.json()

      if (companyResponse.ok) {
        saveUserData(
          { id: data.userId, companyId: data.companyId, email: email },
          companyData.company
        )
        hideLoading() // Esconde a animação de loading
        showCustomMessage("Login realizado com sucesso!", "success")
        await new Promise((resolve) => setTimeout(resolve, 1500)) // Pequeno delay para a mensagem ser lida
        loadPage("dashboard") // Redireciona para o dashboard após o login
      } else {
        hideLoading() // Esconde a animação de loading
        showCustomMessage(
          `Erro ao buscar informações da empresa: ${companyData.message}`,
          "error"
        )
        await new Promise((resolve) => setTimeout(resolve, 1500)) // Pequeno delay para a mensagem ser lida
        clearUserData()
      }
    } else {
      hideLoading() // Esconde a animação de loading
      showCustomMessage(`Erro: ${data.message}`, "error")
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Pequeno delay para a mensagem ser lida
    }
  } catch (error) {
    hideLoading() // Esconde a animação de loading em caso de erro de rede
    console.error("Erro ao fazer login:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Pequeno delay para a mensagem ser lida
  } finally {
    // hideLoading(); // Removido daqui, pois é chamado antes das mensagens finais
  }
}

// Função de Logout
export function logout() {
  clearUserData()
  loadPage("login")
  showCustomMessage("Você foi desconectado.", "info")
}

// Lidar com a edição de dados da empresa
export async function handleEditCompany(event) {
  event.preventDefault()

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para editar informações da empresa.",
      "warning"
    )
    loadPage("login")
    return
  }

  const companyId = systemData.loggedInUser.companyId
  const name = document.getElementById("editCompanyName").value
  const email = document.getElementById("editCompanyEmail").value
  const cnpj = document.getElementById("editCNPJ").value

  try {
    const response = await fetch(
      `${BACKEND_URL}/company/profile/${companyId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, cnpj }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      // Atualizar companyInfo no localStorage e no sistema
      systemData.companyInfo = { ...systemData.companyInfo, name, email, cnpj }
      localStorage.setItem(
        "companyInfo",
        JSON.stringify(systemData.companyInfo)
      )
      loadProfilePage() // Recarrega a página de perfil para mostrar os dados atualizados
    } else {
      showCustomMessage(`Erro ao atualizar perfil: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao atualizar perfil da empresa:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
