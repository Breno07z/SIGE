import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, closeModal } from "./ui.js"

// Serviços
export async function loadServicos() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-4">🛠️ Serviços</h2>
            <button id="addServicoBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">Adicionar Serviço</button>
            
            <div class="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                <table class="w-full whitespace-nowrap">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left">Nome</th>
                            <th class="px-4 py-2 text-left">Descrição</th>
                            <th class="px-4 py-2 text-left">Valor</th>
                            <th class="px-4 py-2 text-left">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="servicosTableBody">
                        <!-- Serviços serão carregados aqui -->
                    </tbody>
                </table>
                <p id="noServicesMessage" class="p-4 text-gray-500 hidden">Nenhum serviço cadastrado</p>
            </div>
        </div>
    `
  await fetchServices()

  // Anexa event listener ao botão "Adicionar Serviço" após o HTML ser carregado
  document
    .getElementById("addServicoBtn")
    .addEventListener("click", openServicoModal)
}

async function fetchServices() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const response = await fetch(`${BACKEND_URL}/services/${companyId}`)
    const data = await response.json()

    const servicosTableBody = document.getElementById("servicosTableBody")
    const noServicesMessage = document.getElementById("noServicesMessage")

    if (response.ok && data.services.length > 0) {
      servicosTableBody.innerHTML = data.services
        .map(
          (service) => `
                <tr class="border-t">
                    <td class="px-4 py-2">${service.name}</td>
                    <td class="px-4 py-2">${service.description || "N/A"}</td>
                    <td class="px-4 py-2">R$ ${service.value.toFixed(2)}</td>
                    <td class="px-4 py-2">
                        <button id="removeServicoBtn-${
                          service.id
                        }" data-service-id="${
            service.id
          }" class="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                </tr>
            `
        )
        .join("")
      noServicesMessage.classList.add("hidden")
    } else {
      servicosTableBody.innerHTML = ""
      noServicesMessage.classList.remove("hidden")
    }

    // Adiciona event listener para os botões de remover serviços via delegação
    servicosTableBody.addEventListener("click", (event) => {
      if (event.target.id.startsWith("removeServicoBtn-")) {
        const serviceId = event.target.dataset.serviceId
        removeServico(serviceId)
      }
    })
  } catch (error) {
    console.error("Erro ao buscar serviços:", error)
    showCustomMessage("Erro ao carregar serviços.", "error")
  }
}

export function openServicoModal() {
  const modalContent = document.getElementById("modalContent")
  modalContent.innerHTML = `
        <div class="slide-in">
            <h3 class="text-lg font-bold mb-4">Adicionar Serviço</h3>
            <form id="addServicoForm">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Nome:</label>
                    <input type="text" id="servicoNome" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Descrição:</label>
                    <textarea id="servicoDescricao" class="w-full p-2 border rounded"></textarea>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Valor:</label>
                    <input type="number" step="0.01" id="servicoValor" class="w-full p-2 border rounded" required>
                </div>
                <div class="flex gap-2">
                    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Salvar</button>
                    <button type="button" onclick="closeModal()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
                </div>
            </form>
        </div>
    `
  document.getElementById("modal").classList.remove("hidden")
  document.getElementById("modal").classList.add("flex")
  document
    .getElementById("addServicoForm")
    .addEventListener("submit", addServico)
}

async function addServico(event) {
  event.preventDefault()
  const name = document.getElementById("servicoNome").value
  const description = document.getElementById("servicoDescricao").value
  const value = parseFloat(document.getElementById("servicoValor").value)

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para adicionar serviços.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/services`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        value,
        company_id: systemData.loggedInUser.companyId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      closeModal()
      loadServicos() // Recarrega a lista de serviços
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao adicionar serviço:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export async function removeServico(serviceId) {
  if (!confirm("Tem certeza que deseja remover este serviço?")) return

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para remover serviços.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/services/${serviceId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: systemData.loggedInUser.companyId }), // Passa company_id no body
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadServicos() // Recarrega a lista de serviços
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao remover serviço:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
