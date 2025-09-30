import {
  systemData,
  BACKEND_URL,
  saveUserData,
  clearUserData,
} from "./utils.js"
import { loadDashboard } from "./dashboard.js"
import { loadProdutos } from "./products.js"
import { loadClientes } from "./clients.js"
import { loadServicos } from "./services.js"
import { loadOrdens } from "./orders.js"
import { loadTermos } from "./terms.js"
import { loadFinanceiro } from "./financial.js"
import { loadProfilePage } from "./profile.js"
import { attachRegisterFormListener, attachLoginFormListener } from "./auth.js"
import { attachForgotPasswordFormListener } from "./forgotPassword.js" // Importa o listener de forgotPassword.js
import { attachResetPasswordFormListener } from "./resetPassword.js" // Importa o listener de resetPassword.js

// Elementos do modal de mensagem personalizada
const customMessageModal = document.getElementById("customMessageModal")
const customMessageContent = document.getElementById("customMessageContent")
const messageIcon = document.getElementById("messageIcon")
const messageText = document.getElementById("messageText")
const closeMessageButton = document.getElementById("closeMessageButton")

// Elementos da sidebar responsiva
const hamburgerButton = document.getElementById("hamburgerButton")
const sidebar = document.getElementById("sidebar")
const sidebarOverlay = document.getElementById("sidebarOverlay")
const profileIconContainer = document.getElementById("profileIconContainer")
const profilePictureElement = document.getElementById("profilePicture")

// Função para alternar a visibilidade da sidebar em mobile
export function toggleSidebar() {
  sidebar.classList.toggle("-translate-x-full")
  sidebarOverlay.classList.toggle("hidden")
}

// Função para exibir/ocultar o ícone de perfil e carregar a imagem
export function toggleProfileIconVisibility() {
  if (systemData.loggedInUser) {
    profileIconContainer.classList.remove("hidden")
    // TODO: Carregar a imagem de perfil real do usuário aqui
    // Por enquanto, usaremos um placeholder ou o valor salvo.
    // if (systemData.loggedInUser.profilePictureUrl) {
    //   profilePictureElement.src = systemData.loggedInUser.profilePictureUrl;
    // } else {
    //   profilePictureElement.src = "https://via.placeholder.com/40";
    // }
  } else {
    profileIconContainer.classList.add("hidden")
  }
}

// Adicionar event listeners para o menu hambúrguer e overlay
if (hamburgerButton) {
  hamburgerButton.addEventListener("click", toggleSidebar)
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", toggleSidebar)
}

// Função para exibir mensagens personalizadas
export function showCustomMessage(
  message,
  type = "info",
  autoClose = true,
  timeout = 3000
) {
  messageText.textContent = message
  customMessageContent.className =
    "bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 flex flex-col items-center justify-center"
  closeMessageButton.classList.add("hidden")

  let iconHtml = ""
  switch (type) {
    case "success":
      iconHtml = '<span class="text-green-500">✅</span>'
      customMessageContent.classList.add("border-t-4", "border-green-500")
      break
    case "error":
      iconHtml = '<span class="text-red-500">❌</span>'
      customMessageContent.classList.add("border-t-4", "border-red-500")
      closeMessageButton.classList.remove("hidden") // Mostrar botão de fechar para erros
      break
    case "warning":
      iconHtml = '<span class="text-yellow-500">⚠️</span>'
      customMessageContent.classList.add("border-t-4", "border-yellow-500")
      break
    case "loading":
      iconHtml = '<span class="animate-spin text-blue-500">🔄</span>'
      customMessageContent.classList.add("border-t-4", "border-blue-500")
      autoClose = false // Mensagens de loading não fecham automaticamente
      break
    default: // info
      iconHtml = '<span class="text-blue-500">ℹ️</span>'
      customMessageContent.classList.add("border-t-4", "border-blue-500")
      break
  }
  messageIcon.innerHTML = iconHtml
  customMessageModal.classList.remove("hidden")
  customMessageModal.classList.add("flex")

  if (autoClose) {
    setTimeout(hideCustomMessage, timeout)
  }
}

// Função para esconder o modal de mensagem personalizada
export function hideCustomMessage() {
  customMessageModal.classList.add("hidden")
  customMessageModal.classList.remove("flex")
}

// Funções de atalho para loading
export function showLoading(message = "Carregando...") {
  showCustomMessage(message, "loading", false)
}

export function hideLoading() {
  hideCustomMessage()
}

// Event listener para o botão de fechar do modal de mensagem personalizada
closeMessageButton.addEventListener("click", hideCustomMessage)

// Função para carregar páginas
export async function loadPage(page) {
  const content = document.getElementById("content")
  const modal = document.getElementById("modal")
  modal.classList.add("hidden") // Esconde o modal ao carregar uma nova página principal
  modal.classList.remove("flex")

  // Fecha a sidebar em telas pequenas ao carregar uma nova página
  if (window.innerWidth < 768) {
    // md breakpoint is 768px in Tailwind by default
    sidebar.classList.add("-translate-x-full")
    sidebarOverlay.classList.add("hidden")
  }

  // Redireciona para login se não estiver logado e tentar acessar uma página protegida
  const protectedPages = [
    "dashboard",
    "produtos",
    "clientes",
    "servicos",
    "ordem",
    "termos",
    "financeiro",
    "profile",
  ]
  if (protectedPages.includes(page) && !systemData.loggedInUser) {
    showCustomMessage(
      "Você precisa estar logado para acessar esta página.",
      "warning"
    )
    page = "login"
  }

  // Atualiza a visibilidade do ícone de perfil
  toggleProfileIconVisibility()

  let htmlContent = ""
  switch (page) {
    case "dashboard":
      await loadDashboard()
      break
    case "produtos":
      await loadProdutos()
      break
    case "clientes":
      await loadClientes()
      break
    case "servicos":
      await loadServicos()
      break
    case "ordem":
      await loadOrdens()
      break
    case "termos":
      await loadTermos()
      break
    case "financeiro":
      await loadFinanceiro()
      break
    case "register":
      htmlContent = await fetch("register.html").then((response) =>
        response.text()
      )
      content.innerHTML = htmlContent
      attachRegisterFormListener() // Anexa o listener após o HTML ser carregado
      break
    case "login":
      htmlContent = await fetch("login.html").then((response) =>
        response.text()
      )
      content.innerHTML = htmlContent
      attachLoginFormListener() // Anexa o listener após o HTML ser carregado
      break
    case "forgot-password":
      htmlContent = await fetch("forgot-password.html").then((response) =>
        response.text()
      )
      content.innerHTML = htmlContent
      attachForgotPasswordFormListener() // Anexa o listener após o HTML ser carregado
      break
    case "reset-password":
      htmlContent = await fetch("reset-password.html").then((response) =>
        response.text()
      )
      content.innerHTML = htmlContent
      attachResetPasswordFormListener() // Anexa o listener após o HTML ser carregado
      break
    case "profile":
      await loadProfilePage()
      break
    default:
      content.innerHTML = `<h2>Selecione uma opção</h2>`
  }
}

// Funções auxiliares
export function closeModal() {
  document.getElementById("modal").classList.add("hidden")
  document.getElementById("modal").classList.remove("flex")
}

// Inicializar sistema
document.addEventListener("DOMContentLoaded", function () {
  // Verificar se há um usuário logado no localStorage
  if (systemData.loggedInUser) {
    loadPage("dashboard")
  } else {
    loadPage("login") // Carrega a página de login se não houver usuário logado
  }
})
