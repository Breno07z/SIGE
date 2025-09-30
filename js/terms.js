import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage } from "./ui.js"
import { attachEditTermsFormListener } from "./auth.js" // Importa o listener de auth.js

// Termos
export async function loadTermos() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-6">📜 Termos do Sistema</h2>
            <div class="bg-white p-6 rounded-lg shadow">
                <form id="editTermsForm" class="space-y-4">
                    <div>
                        <label for="termsContent" class="block text-sm font-medium text-gray-700">Conteúdo dos Termos:</label>
                        <textarea
                          id="termsContent"
                          name="termsContent"
                          rows="15"
                          class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        ></textarea>
                    </div>
                    <div class="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          type="submit"
                          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 btn-animated"
                        >
                          Salvar Termos
                        </button>
                        <button
                          type="button"
                          onclick="printTerms()"
                          class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 btn-animated"
                        >
                          Imprimir Termos
                        </button>
                    </div>
                </form>
                <div class="mt-6 p-4 bg-blue-50 rounded">
                    <p class="text-sm text-blue-800">
                        <strong>Última atualização:</strong> <span id="termsLastUpdated">N/A</span>
                    </p>
                </div>
            </div>
        </div>
    `
  await fetchTerms()
  attachEditTermsFormListener() // Anexa o listener após o HTML ser carregado
}

async function fetchTerms() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const response = await fetch(`${BACKEND_URL}/terms/${companyId}`)
    const data = await response.json()

    const termsContent = document.getElementById("termsContent")
    const termsLastUpdated = document.getElementById("termsLastUpdated")

    if (response.ok) {
      const actualTerms = data.terms || data // Adapta para a estrutura da resposta
      termsContent.value = actualTerms.content
      termsLastUpdated.textContent = actualTerms.last_updated
        ? new Date(actualTerms.last_updated).toLocaleString("pt-BR")
        : "N/A"
    } else {
      console.error("Erro ao carregar termos:", data.message)
      showCustomMessage("Erro ao carregar os termos. Tente novamente.", "error")
    }
  } catch (error) {
    console.error("Erro ao buscar termos:", error)
    showCustomMessage("Erro ao conectar com o servidor para termos.", "error")
  }
}

export async function handleEditTerms(event) {
  event.preventDefault()

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para editar os termos.",
      "warning"
    )
    loadPage("login")
    return
  }

  const companyId = systemData.loggedInUser.companyId
  const content = document.getElementById("termsContent").value

  try {
    const response = await fetch(`${BACKEND_URL}/terms/${companyId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      await fetchTerms() // Recarrega os termos para exibir a data de atualização
    } else {
      showCustomMessage(`Erro ao atualizar termos: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao atualizar termos:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export function printTerms() {
  const termsContent = document.getElementById("termsContent").value
  const printWindow = window.open("", "_blank")
  printWindow.document.write("<html><head><title>Termos do Sistema</title>")
  printWindow.document.write(
    "<style>body { font-family: Arial, sans-serif; margin: 20px; } pre { white-space: pre-wrap; word-wrap: break-word; }</style>"
  )
  printWindow.document.write("</head><body>")
  printWindow.document.write("<h1>Termos de Uso - MsTech Controladoria</h1>")
  printWindow.document.write(`<pre>${termsContent}</pre>`)
  printWindow.document.write("</body></html>")
  printWindow.document.close()
  printWindow.print()
}
