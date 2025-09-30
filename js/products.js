import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, closeModal } from "./ui.js"

// Produtos
export async function loadProdutos() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-4">📦 Produtos</h2>
            <button id="addProdutoBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">Adicionar Produto</button>
            
            <div class="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                <table class="w-full whitespace-nowrap">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left">Nome</th>
                            <th class="px-4 py-2 text-left">Categoria</th>
                            <th class="px-4 py-2 text-left">Preço</th>
                            <th class="px-4 py-2 text-left">Estoque</th>
                            <th class="px-4 py-2 text-left">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="produtosTableBody">
                        <!-- Produtos serão carregados aqui -->
                    </tbody>
                </table>
                <p id="noProductsMessage" class="p-4 text-gray-500 hidden">Nenhum produto cadastrado</p>
            </div>
        </div>
    `
  await fetchProducts()

  // Anexa event listener ao botão "Adicionar Produto" após o HTML ser carregado
  document
    .getElementById("addProdutoBtn")
    .addEventListener("click", openProdutoModal)
}

async function fetchProducts() {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const response = await fetch(`${BACKEND_URL}/products/${companyId}`)
    const data = await response.json()

    const produtosTableBody = document.getElementById("produtosTableBody")
    const noProductsMessage = document.getElementById("noProductsMessage")

    if (response.ok && data.products.length > 0) {
      produtosTableBody.innerHTML = data.products
        .map(
          (product) => `
                <tr class="border-t">
                    <td class="px-4 py-2">${product.name}</td>
                    <td class="px-4 py-2">${product.category || "N/A"}</td>
                    <td class="px-4 py-2">R$ ${product.price.toFixed(2)}</td>
                    <td class="px-4 py-2">${product.stock}</td>
                    <td class="px-4 py-2">
                        <button id="removeProdutoBtn-${
                          product.id
                        }" data-product-id="${
            product.id
          }" class="text-red-600 hover:text-red-800">🗑️</button>
                    </td>
                </tr>
            `
        )
        .join("")
      noProductsMessage.classList.add("hidden")
    } else {
      produtosTableBody.innerHTML = ""
      noProductsMessage.classList.remove("hidden")
    }

    // Adiciona event listener para os botões de remover produtos via delegação
    produtosTableBody.addEventListener("click", (event) => {
      if (event.target.id.startsWith("removeProdutoBtn-")) {
        const productId = event.target.dataset.productId
        removeProduto(productId)
      }
    })
  } catch (error) {
    console.error("Erro ao buscar produtos:", error)
    showCustomMessage("Erro ao carregar produtos.", "error")
  }
}

export function openProdutoModal() {
  const modalContent = document.getElementById("modalContent")
  modalContent.innerHTML = `
        <div class="slide-in">
            <h3 class="text-lg font-bold mb-4">Adicionar Produto</h3>
            <form id="addProdutoForm">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Nome:</label>
                    <input type="text" id="produtoNome" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Categoria:</label>
                    <input type="text" id="produtoCategoria" class="w-full p-2 border rounded">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Preço:</label>
                    <input type="number" step="0.01" id="produtoPreco" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Estoque:</label>
                    <input type="number" id="produtoEstoque" class="w-full p-2 border rounded" required>
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
    .getElementById("addProdutoForm")
    .addEventListener("submit", addProduto)
}

async function addProduto(event) {
  event.preventDefault()
  const name = document.getElementById("produtoNome").value
  const category = document.getElementById("produtoCategoria").value
  const price = parseFloat(document.getElementById("produtoPreco").value)
  const stock = parseInt(document.getElementById("produtoEstoque").value)

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para adicionar produtos.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        price,
        stock,
        company_id: systemData.loggedInUser.companyId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      closeModal()
      loadProdutos() // Recarrega a lista de produtos
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao adicionar produto:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export async function removeProduto(productId) {
  if (!confirm("Tem certeza que deseja remover este produto?")) return

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para remover produtos.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/products/${productId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: systemData.loggedInUser.companyId }), // Passa company_id no body
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadProdutos() // Recarrega a lista de produtos
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao remover produto:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}
