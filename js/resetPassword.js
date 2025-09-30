import { BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, showLoading, hideLoading } from "./ui.js"

export function attachResetPasswordFormListener() {
  const resetPasswordForm = document.getElementById("resetPasswordForm")
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", handleResetPassword)
  }
}

async function handleResetPassword(event) {
  event.preventDefault()

  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get("token")

  if (!token) {
    showCustomMessage("Token de redefinição de senha não encontrado.", "error")
    loadPage("login")
    return
  }

  const newPassword = document.getElementById("newPassword").value.trim()
  const confirmNewPassword = document
    .getElementById("confirmNewPassword")
    .value.trim()

  // Validação de força da senha (similar ao cadastro)
  if (newPassword.length < 8) {
    showCustomMessage("A nova senha deve ter pelo menos 8 caracteres.", "error")
    return
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    showCustomMessage(
      "A nova senha deve conter pelo menos um caractere especial.",
      "error"
    )
    return
  }
  if (!/[A-Z]/.test(newPassword)) {
    showCustomMessage(
      "A nova senha deve conter pelo menos uma letra maiúscula.",
      "error"
    )
    return
  }
  if (!/[a-z]/.test(newPassword)) {
    showCustomMessage(
      "A nova senha deve conter pelo menos uma letra minúscula.",
      "error"
    )
    return
  }
  if (!/[0-9]/.test(newPassword)) {
    showCustomMessage("A nova senha deve conter pelo menos um número.", "error")
    return
  }

  if (newPassword !== confirmNewPassword) {
    showCustomMessage("A nova senha e a confirmação não coincidem!", "error")
    return
  }

  showLoading("Redefinindo sua senha...")

  try {
    const response = await fetch(`${BACKEND_URL}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, newPassword }),
    })

    const data = await response.json()
    hideLoading()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadPage("login")
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    hideLoading()
    console.error("Erro ao redefinir senha:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
