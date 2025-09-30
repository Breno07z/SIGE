import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, closeModal } from "./ui.js"

// Ordens de Serviço
export async function loadOrdens() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-4">📑 Ordens de Serviço</h2>
            <button onclick="openOrdemModal()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">Nova Ordem</button>
            
            <div class="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                <table class="w-full whitespace-nowrap">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left">Nº</th>
                            <th class="px-4 py-2 text-left">Cliente</th>
                            <th class="px-4 py-2 text-left">Serviço</th>
                            <th class="px-4 py-2 text-left">Status</th>
                            <th class="px-4 py-2 text-left">Valor</th>
                            <th class="px-4 py-2 text-left">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="ordensTableBody">
                        <!-- Ordens serão carregadas aqui -->
                    </tbody>
                </table>
                <p id="noOrdersMessage" class="p-4 text-gray-500 hidden">Nenhuma ordem de serviço cadastrada</p>
            </div>
        </div>
    `
  await fetchOrders()
}

async function fetchOrders() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const response = await fetch(`${BACKEND_URL}/orders/${companyId}`)
    const data = await response.json()

    const ordensTableBody = document.getElementById("ordensTableBody")
    const noOrdersMessage = document.getElementById("noOrdersMessage")

    if (response.ok && data.orders.length > 0) {
      ordensTableBody.innerHTML = data.orders
        .map(
          (order) => `
                <tr class="border-t">
                    <td class="px-4 py-2">#${String(order.id).padStart(
                      3,
                      "0"
                    )}</td>
                    <td class="px-4 py-2">${order.client_name}</td>
                    <td class="px-4 py-2">${order.service_name}</td>
                    <td class="px-4 py-2">
                        <span class="px-2 py-1 rounded text-sm ${
                          order.status === "Concluído"
                            ? "bg-green-100 text-green-800"
                            : order.status === "Em Andamento"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }">
                            ${order.status}
                        </span>
                    </td>
                    <td class="px-4 py-2">R$ ${order.value.toFixed(2)}</td>
                    <td class="px-4 py-2">
                        <button id="removeOrdemBtn-${
                          order.id
                        }" data-order-id="${
            order.id
          }" class="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                </tr>
            `
        )
        .join("")
      noOrdersMessage.classList.add("hidden")
    } else {
      ordensTableBody.innerHTML = ""
      noOrdersMessage.classList.remove("hidden")
    }

    // Adiciona event listener para os botões de remover ordens de serviço via delegação
    ordensTableBody.addEventListener("click", (event) => {
      if (event.target.id.startsWith("removeOrdemBtn-")) {
        const orderId = event.target.dataset.orderId
        removeOrdem(orderId)
      }
    })
  } catch (error) {
    console.error("Erro ao buscar ordens de serviço:", error)
    showCustomMessage("Erro ao carregar ordens de serviço.", "error")
  }
}

export async function openOrdemModal() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para criar ordens de serviço.",
      "warning"
    )
    loadPage("login")
    return
  }

  const companyId = systemData.loggedInUser.companyId

  try {
    const [clientsRes, servicesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/clients/${companyId}`),
      fetch(`${BACKEND_URL}/services/${companyId}`),
    ])

    const [clientsData, servicesData] = await Promise.all([
      clientsRes.json(),
      servicesRes.json(),
    ])

    const clientsOptions = clientsData.clients
      .map((client) => `<option value="${client.id}">${client.name}</option>`)
      .join("")
    const servicesOptions = servicesData.services
      .map(
        (service) =>
          `<option value="${service.id}" data-valor="${service.value}">${
            service.name
          } - R$ ${service.value.toFixed(2)}</option>`
      )
      .join("")

    const modalContent = document.getElementById("modalContent")
    modalContent.innerHTML = `
            <div class="slide-in">
                <h3 class="text-lg font-bold mb-4">Nova Ordem de Serviço</h3>
                <form id="addOrdemForm">
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">Cliente:</label>
                        <select id="ordemCliente" class="w-full p-2 border rounded" required>
                            <option value="">Selecione um cliente</option>
                            ${clientsOptions}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">Serviço:</label>
                        <select id="ordemServico" class="w-full p-2 border rounded" required>
                            <option value="">Selecione um serviço</option>
                            ${servicesOptions}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">Status:</label>
                        <select id="ordemStatus" class="w-full p-2 border rounded" required>
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">Valor:</label>
                        <input type="number" step="0.01" id="ordemValor" class="w-full p-2 border rounded" required>
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
    document.getElementById("addOrdemForm").addEventListener("submit", addOrdem)

    // Auto-preencher valor quando selecionar serviço
    document
      .getElementById("ordemServico")
      .addEventListener("change", function () {
        const selectedOption = this.options[this.selectedIndex]
        const valor = selectedOption.getAttribute("data-valor")
        if (valor) {
          document.getElementById("ordemValor").value = valor
        }
      })
  } catch (error) {
    console.error(
      "Erro ao carregar dados para o modal de ordem de serviço:",
      error
    )
    showCustomMessage("Erro ao carregar clientes e serviços.", "error")
  }
}

async function addOrdem(event) {
  event.preventDefault()
  const client_id = document.getElementById("ordemCliente").value
  const service_id = document.getElementById("ordemServico").value
  const status = document.getElementById("ordemStatus").value
  const value = parseFloat(document.getElementById("ordemValor").value)

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para adicionar ordens de serviço.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id,
        service_id,
        status,
        value,
        company_id: systemData.loggedInUser.companyId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      closeModal()
      loadOrdens() // Recarrega a lista de ordens de serviço
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao adicionar ordem de serviço:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export async function removeOrdem(orderId) {
  if (!confirm("Tem certeza que deseja remover esta ordem de serviço?")) return

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para remover ordens de serviço.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/orders/${orderId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: systemData.loggedInUser.companyId }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadOrdens() // Recarrega a lista de ordens de serviço
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao remover ordem de serviço:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
