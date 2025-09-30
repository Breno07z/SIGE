import { systemData, BACKEND_URL } from "./utils.js"
import { showCustomMessage, loadPage, showLoading, hideLoading } from "./ui.js"
import { attachEditCompanyFormListener } from "./auth.js"

export async function loadProfilePage() {
  const content = document.getElementById("content")
  // Carrega o HTML do perfil
  const htmlContent = await fetch("profile.html").then((response) =>
    response.text()
  )
  content.innerHTML = htmlContent

  await fetchProfileData() // Carrega os dados do perfil após o HTML

  // Anexa os listeners dos formulários
  attachEditCompanyFormListener()

  const profilePictureUpload = document.getElementById("profilePictureUpload")
  const profileImagePreview = document.getElementById("profileImagePreview")

  if (profilePictureUpload && profileImagePreview) {
    profilePictureUpload.addEventListener("change", function (event) {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = function (e) {
          profileImagePreview.src = e.target.result
        }
        reader.readAsDataURL(file)
      }
    })
  }

  // Listener para o botão de excluir conta
  const deleteAccountBtn = document.getElementById("deleteAccountBtn")
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", handleDeleteAccount)
  }
}

async function fetchProfileData() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage("Você precisa estar logado para ver o perfil.", "warning")
    loadPage("login")
    return
  }

  const companyId = systemData.loggedInUser.companyId

  try {
    const response = await fetch(`${BACKEND_URL}/company/profile/${companyId}`)
    const data = await response.json()

    if (response.ok) {
      document.getElementById("profileCompanyName").textContent =
        data.company.name
      document.getElementById("profileCNPJ").textContent =
        data.company.cnpj || "N/A"
      document.getElementById("profileCompanyEmail").textContent =
        data.company.email

      // Preencher formulário de edição da empresa
      document.getElementById("editCompanyName").value = data.company.name
      document.getElementById("editCompanyEmail").value = data.company.email
      document.getElementById("editCNPJ").value = data.company.cnpj
    } else {
      showCustomMessage(`Erro ao carregar perfil: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao buscar dados do perfil:", error)
    showCustomMessage("Erro ao conectar com o servidor para o perfil.", "error")
  }
}

async function handleDeleteAccount() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para excluir a conta.",
      "warning"
    )
    loadPage("login")
    return
  }

  const confirmDeletion = confirm(
    "Tem certeza que deseja excluir sua conta? Esta ação é irreversível e excluirá todos os dados da sua empresa."
  )

  if (!confirmDeletion) {
    return
  }

  showLoading("Excluindo conta...")

  const userId = systemData.loggedInUser.id
  const companyId = systemData.loggedInUser.companyId

  try {
    // Primeiro, excluir o usuário
    const userResponse = await fetch(`${BACKEND_URL}/user/${userId}`, {
      method: "DELETE",
    })

    if (!userResponse.ok) {
      const errorData = await userResponse.json()
      showCustomMessage(
        `Erro ao excluir usuário: ${errorData.message}`,
        "error"
      )
      return
    }

    // Em seguida, excluir a empresa (e todos os dados associados a ela no backend)
    const companyResponse = await fetch(`${BACKEND_URL}/company/${companyId}`, {
      method: "DELETE",
    })

    if (!companyResponse.ok) {
      const errorData = await companyResponse.json()
      showCustomMessage(
        `Erro ao excluir empresa: ${errorData.message}`,
        "error"
      )
      return
    }

    showCustomMessage(
      "Conta excluída com sucesso! Redirecionando para o login.",
      "success",
      true,
      3000
    )
    // Limpar dados do usuário e redirecionar
    clearUserData()
    setTimeout(() => loadPage("login"), 3000)
  } catch (error) {
    console.error("Erro ao excluir conta:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor para excluir conta.",
      "error"
    )
  } finally {
    hideLoading()
  }
}
