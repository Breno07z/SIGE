import { BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, showLoading, hideLoading } from "./ui.js"

export function attachForgotPasswordFormListener() {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm")
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPassword)
  }

  const loginLinkFromForgot = document.getElementById("loginLinkFromForgot")
  if (loginLinkFromForgot) {
    loginLinkFromForgot.addEventListener("click", (event) => {
      event.preventDefault()
      loadPage("login")
    })
  }
}

async function handleForgotPassword(event) {
  event.preventDefault()

  const email = document.getElementById("forgotEmail").value.trim()

  if (!email) {
    showCustomMessage("Por favor, insira seu e-mail.", "error")
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    showCustomMessage("Por favor, insira um e-mail válido.", "error")
    return
  }

  showLoading("Enviando link de redefinição...")

  try {
    const response = await fetch(`${BACKEND_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
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
    console.error("Erro ao solicitar redefinição de senha:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
