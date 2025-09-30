import { loadPage, closeModal, toggleProfileIconVisibility } from "./ui.js"
import { systemData, clearUserData } from "./utils.js" // Importa clearUserData

// Função para anexar os listeners de navegação
function attachNavListeners() {
  const navButtons = [
    { id: "dashboardBtn", page: "dashboard" },
    { id: "productsBtn", page: "produtos" },
    { id: "clientsBtn", page: "clientes" },
    { id: "servicesBtn", page: "servicos" },
    { id: "ordersBtn", page: "ordem" },
    { id: "termsBtn", page: "termos" },
    { id: "financialBtn", page: "financeiro" },
    { id: "profileBtn", page: "profile" },
  ]

  navButtons.forEach((btn) => {
    const buttonElement = document.getElementById(btn.id)
    if (buttonElement) {
      buttonElement.addEventListener("click", () => loadPage(btn.page))
    }
  })

  // Adiciona listener para o novo ícone de perfil no canto superior direito
  const profileIconContainer = document.getElementById("profileIconContainer")
  if (profileIconContainer) {
    profileIconContainer.addEventListener("click", () => loadPage("profile"))
  }

  // Listeners para os links de login/cadastro que são carregados dinamicamente
  // Estes devem ser anexados após o carregamento da respectiva página (login.html ou register.html)
  // e o melhor lugar para isso é dentro do loadPage em ui.js, no switch case.
}

// Event listener para fechar o modal ao clicar fora dele
document.getElementById("modal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeModal()
  }
})

// Inicializar sistema
document.addEventListener("DOMContentLoaded", function () {
  attachNavListeners() // Anexa os listeners de navegação ao carregar o DOM
  clearUserData() // Limpa os dados do usuário ao carregar a página para garantir a segurança
  // Sempre carrega a página de login ao iniciar
  loadPage("login")
  toggleProfileIconVisibility() // Define a visibilidade inicial do ícone de perfil
})
