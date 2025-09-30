import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage, closeModal } from "./ui.js"

let salesChartInstance = null

// Dashboard
export async function loadDashboard() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-6">📊 Dashboard</h2>
            
            <!-- Botões Animados -->
            <div class="flex flex-wrap gap-4 mb-6">
                <button id="openEntradaBtn" class="btn-animated bg-green-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                    <span class="text-xl">💰</span> Entrada
                </button>
                <button id="openSaidaBtn" class="btn-animated bg-red-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                    <span class="text-xl">💸</span> Saída
                </button>
            </div>
            
            <!-- Cards de informações -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="dashboardStats">
                <!-- Conteúdo será preenchido pelo JS -->
            </div>
            
            <!-- Gráfico -->
            <div class="bg-white p-4 rounded-2xl shadow">
                <h3 class="font-semibold mb-4">Gráfico Financeiro</h3>
                <canvas id="salesChart"></canvas>
            </div>
        </div>
    `
  await fetchDashboardData()

  // Anexa event listeners aos botões após o HTML ser carregado
  document
    .getElementById("openEntradaBtn")
    .addEventListener("click", openEntradaModal)
  document
    .getElementById("openSaidaBtn")
    .addEventListener("click", openSaidaModal)
}

async function fetchDashboardData() {
  if (!systemData.loggedInUser) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const [entriesRes, exitsRes, clientsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/financial-entries/${companyId}`),
      fetch(`${BACKEND_URL}/financial-exits/${companyId}`),
      fetch(`${BACKEND_URL}/clients/${companyId}`),
    ])

    const [entriesData, exitsData, clientsData] = await Promise.all([
      entriesRes.json(),
      exitsRes.json(),
      clientsRes.json(),
    ])

    const totalEntradas = entriesData.entries.reduce(
      (sum, entry) => sum + entry.value,
      0
    )
    const totalSaidas = exitsData.exits.reduce(
      (sum, exit) => sum + exit.value,
      0
    )
    const saldo = totalEntradas - totalSaidas

    const dashboardStats = document.getElementById("dashboardStats")
    if (dashboardStats) {
      dashboardStats.innerHTML = `
                <div class="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-shadow">
                    <h3 class="font-semibold text-gray-600">Total Entradas</h3>
                    <p class="text-2xl font-bold text-green-600">R$ ${totalEntradas.toLocaleString(
                      "pt-BR",
                      { minimumFractionDigits: 2 }
                    )}</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-shadow">
                    <h3 class="font-semibold text-gray-600">Total Saídas</h3>
                    <p class="text-2xl font-bold text-red-600">R$ ${totalSaidas.toLocaleString(
                      "pt-BR",
                      { minimumFractionDigits: 2 }
                    )}</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-shadow">
                    <h3 class="font-semibold text-gray-600">Saldo</h3>
                    <p class="text-2xl font-bold ${
                      saldo >= 0 ? "text-green-600" : "text-red-600"
                    }">
                        R$ ${saldo.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                    </p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow hover:shadow-lg transition-shadow">
                    <h3 class="font-semibold text-gray-600">Clientes</h3>
                    <p class="text-2xl font-bold text-blue-600">${
                      clientsData.clients.length
                    }</p>
                </div>
            `
    }

    renderChart(entriesData.entries, exitsData.exits)
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error)
    showCustomMessage("Erro ao carregar dados do dashboard.", "error")
  }
}

// Modal para entrada
export function openEntradaModal() {
  const modalContent = document.getElementById("modalContent")
  modalContent.innerHTML = `
        <div class="slide-in">
            <h3 class="text-lg font-bold mb-4 text-green-600">💰 Nova Entrada</h3>
            <form id="addEntradaForm">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Descrição:</label>
                    <input type="text" id="entradaDescricao" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Data:</label>
                    <input type="date" id="entradaData" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Valor:</label>
                    <input type="number" step="0.01" id="entradaValor" class="w-full p-2 border rounded" required>
                </div>
                <div class="flex gap-2">
                    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Salvar</button>
                    <button type="button" onclick="closeModal()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
                </div>
            </form>
        </div>
    `
  document.getElementById("modal").classList.remove("hidden")
  document.getElementById("modal").classList.add("flex")
  document
    .getElementById("addEntradaForm")
    .addEventListener("submit", addEntrada)
}

// Adicionar entrada
async function addEntrada(event) {
  event.preventDefault()
  const description = document.getElementById("entradaDescricao").value
  const date = document.getElementById("entradaData").value
  const value = parseFloat(document.getElementById("entradaValor").value)

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para adicionar entradas financeiras.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/financial-entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        date,
        value,
        company_id: systemData.loggedInUser.companyId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      closeModal()
      loadDashboard() // Recarrega o dashboard para exibir os novos dados
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao adicionar entrada financeira:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

// Modal para saída
export function openSaidaModal() {
  const modalContent = document.getElementById("modalContent")
  modalContent.innerHTML = `
        <div class="slide-in">
            <h3 class="text-lg font-bold mb-4 text-red-600">💸 Nova Saída</h3>
            <form id="addSaidaForm">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Descrição:</label>
                    <input type="text" id="saidaDescricao" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Data:</label>
                    <input type="date" id="saidaData" class="w-full p-2 border rounded" required>
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">Valor:</label>
                    <input type="number" step="0.01" id="saidaValor" class="w-full p-2 border rounded" required>
                </div>
                <div class="flex gap-2">
                    <button type="submit" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Salvar</button>
                    <button type="button" onclick="closeModal()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
                </div>
            </form>
        </div>
    `
  document.getElementById("modal").classList.remove("hidden")
  document.getElementById("modal").classList.add("flex")
  document.getElementById("addSaidaForm").addEventListener("submit", addSaida)
}

// Adicionar saída
async function addSaida(event) {
  event.preventDefault()
  const description = document.getElementById("saidaDescricao").value
  const date = document.getElementById("saidaData").value
  const value = parseFloat(document.getElementById("saidaValor").value)

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para adicionar saídas financeiras.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/financial-exits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        date,
        value,
        company_id: systemData.loggedInUser.companyId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      closeModal()
      loadDashboard() // Recarrega o dashboard para exibir os novos dados
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao adicionar saída financeira:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export function renderChart(entries, exits) {
  const ctx = document.getElementById("salesChart")
  if (!ctx) return

  if (salesChartInstance) {
    salesChartInstance.destroy() // Destrói a instância anterior do gráfico
  }

  // Processar dados para o gráfico
  const monthlyData = {}

  entries.forEach((entry) => {
    const month = entry.date.substring(0, 7) // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = { entries: 0, exits: 0 }
    monthlyData[month].entries += entry.value
  })

  exits.forEach((exit) => {
    const month = exit.date.substring(0, 7) // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = { entries: 0, exits: 0 }
    monthlyData[month].exits += exit.value
  })
  const sortedMonths = Object.keys(monthlyData).sort()
  const chartLabels = sortedMonths.map((month) => {
    const [year, mon] = month.split("-")
    return `${mon}/${year}`
  })
  const chartEntries = sortedMonths.map((month) => monthlyData[month].entries)
  const chartExits = sortedMonths.map((month) => monthlyData[month].exits)

  salesChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Entradas",
          data: chartEntries,
          backgroundColor: "#10b981",
          borderRadius: 4,
        },
        {
          label: "Saídas",
          data: chartExits,
          backgroundColor: "#ef4444",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "R$ " + value.toLocaleString("pt-BR")
            },
          },
        },
      },
    },
  })
}
