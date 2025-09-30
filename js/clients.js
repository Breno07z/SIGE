import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, closeModal } from "./ui.js"

// Clientes
export async function loadClientes() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-4">👥 Clientes</h2>
            <button id="addClienteBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">Adicionar Cliente</button>
            
            <div class="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                <table class="w-full whitespace-nowrap">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left">Nome</th>
                            <th class="px-4 py-2 text-left">Email</th>
                            <th class="px-4 py-2 text-left">Telefone</th>
                            <th class="px-4 py-2 text-left">Cidade</th>
                            <th class="px-4 py-2 text-left">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="clientesTableBody">
                        <!-- Clientes serão carregados aqui -->
                    </tbody>
                </table>
                <p id="noClientsMessage" class="p-4 text-gray-500 hidden">Nenhum cliente cadastrado</p>
            </div>
        </div>
    `
  await fetchClients()

  // Anexa event listener ao botão "Adicionar Cliente" após o HTML ser carregado
  document
    .getElementById("addClienteBtn")
    .addEventListener("click", openClienteModal)
}

async function fetchClients() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const response = await fetch(`${BACKEND_URL}/clients/${companyId}`)
    const data = await response.json()

    const clientesTableBody = document.getElementById("clientesTableBody")
    const noClientsMessage = document.getElementById("noClientsMessage")

    if (response.ok && data.clients.length > 0) {
      clientesTableBody.innerHTML = data.clients
        .map(
          (client) => `
                <tr class="border-t">
                    <td class="px-4 py-2">${client.name}</td>
                    <td class="px-4 py-2">${client.email}</td>
                    <td class="px-4 py-2">${client.phone || "N/A"}</td>
                    <td class="px-4 py-2">${client.city || "N/A"}</td>
                    <td class="px-4 py-2">
                        <button id="removeClienteBtn-${
                          client.id
                        }" data-client-id="${
            client.id
          }" class="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                </tr>
            `
        )
        .join("")
      noClientsMessage.classList.add("hidden")
    } else {
      clientesTableBody.innerHTML = ""
      noClientsMessage.classList.remove("hidden")
    }

    // Adiciona event listener para os botões de remover clientes via delegação
    clientesTableBody.addEventListener("click", (event) => {
      if (event.target.id.startsWith("removeClienteBtn-")) {
        const clientId = event.target.dataset.clientId
        removeCliente(clientId)
      }
    })
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    showCustomMessage("Erro ao carregar clientes.", "error")
  }
}

export function openClienteModal() {
  const modalContent = document.getElementById("modalContent")
  modalContent.innerHTML = `
        <div class="slide-in">
            <h3 class="text-lg font-bold mb-4">Adicionar Cliente</h3>
            <form id="addClienteForm">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Nome:</label>
                    <input type="text" id="clienteNome" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Email:</label>
                    <input type="email" id="clienteEmail" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Telefone:</label>
                    <input type="tel" id="clienteTelefone" class="w-full p-2 border rounded">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Cidade:</label>
                    <input type="text" id="clienteCidade" class="w-full p-2 border rounded">
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
    .getElementById("addClienteForm")
    .addEventListener("submit", addCliente)
}

async function addCliente(event) {
  event.preventDefault()
  const name = document.getElementById("clienteNome").value
  const email = document.getElementById("clienteEmail").value
  const phone = document.getElementById("clienteTelefone").value
  const city = document.getElementById("clienteCidade").value

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para adicionar clientes.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        city,
        company_id: systemData.loggedInUser.companyId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      closeModal()
      loadClientes() // Recarrega a lista de clientes
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao adicionar cliente:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export async function removeCliente(clientId) {
  if (!confirm("Tem certeza que deseja remover este cliente?")) return

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para remover clientes.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/clients/${clientId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: systemData.loggedInUser.companyId }), // Passa company_id no body
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadClientes() // Recarrega a lista de clientes
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao remover cliente:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
