import { systemData, BACKEND_URL } from "./utils.js"
import { loadPage, showCustomMessage } from "./ui.js"

// Financeiro
export async function loadFinanceiro() {
  const content = document.getElementById("content")
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="text-2xl font-bold mb-6">💰 Controle Financeiro</h2>
            
            <!-- Resumo Financeiro -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6" id="financeiroStats">
                <!-- Conteúdo será preenchido pelo JS -->
            </div>
            
            <!-- Filtro por Mês/Ano e Histórico de Transações -->
            <div class="bg-white p-4 rounded-2xl shadow mb-6">
                <h3 class="font-semibold mb-4">Filtrar por Mês/Ano</h3>
                <div class="flex flex-col sm:flex-row gap-4">
                    <input type="month" id="monthFilter" class="p-2 border rounded" />
                    <button id="filterFinancialBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Filtrar</button>
                    <button id="resetFinancialBtn" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Mostrar Todos</button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Entradas -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-4 border-b bg-green-50">
                        <h3 class="font-semibold text-green-800">Entradas</h3>
                    </div>
                    <div class="p-4" id="financialEntriesList">
                        <!-- Entradas serão carregadas aqui -->
                    </div>
                </div>
                
                <!-- Saídas -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-4 border-b bg-red-50">
                        <h3 class="font-semibold text-red-800">Saídas</h3>
                    </div>
                    <div class="p-4" id="financialExitsList">
                        <!-- Saídas serão carregadas aqui -->
                    </div>
                </div>
            </div>
        </div>
    `

  // Define o filtro para o mês atual ao carregar
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`
  document.getElementById("monthFilter").value = currentMonth

  await fetchFinancialData(currentMonth) // Carrega dados do mês atual por padrão

  // Anexa event listeners para os botões de filtro após o HTML ser carregado
  document
    .getElementById("filterFinancialBtn")
    .addEventListener("click", filterFinancialData)
  document
    .getElementById("resetFinancialBtn")
    .addEventListener("click", resetFinancialFilter)
}

async function fetchFinancialData(monthYear = null) {
  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) return
  const companyId = systemData.loggedInUser.companyId

  try {
    const entriesResponse = await fetch(
      `${BACKEND_URL}/financial-entries/${companyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    const exitsResponse = await fetch(
      `${BACKEND_URL}/financial-exits/${companyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    const entriesData = await entriesResponse.json()
    const exitsData = await exitsResponse.json()

    let filteredEntries = entriesData.entries
    let filteredExits = exitsData.exits

    if (monthYear) {
      filteredEntries = entriesData.entries.filter((entry) =>
        entry.date.startsWith(monthYear)
      )
      filteredExits = exitsData.exits.filter((exit) =>
        exit.date.startsWith(monthYear)
      )
    }

    const totalEntradas = filteredEntries.reduce(
      (sum, entry) => sum + entry.value,
      0
    )
    const totalSaidas = filteredExits.reduce((sum, exit) => sum + exit.value, 0)
    const saldo = totalEntradas - totalSaidas

    const financeiroStats = document.getElementById("financeiroStats")
    if (financeiroStats) {
      financeiroStats.innerHTML = `
                <div class="bg-gradient-to-r from-green-400 to-green-600 text-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold">Total de Entradas</h3>
                    <p class="text-2xl font-bold">R$ ${totalEntradas.toLocaleString(
                      "pt-BR",
                      { minimumFractionDigits: 2 }
                    )}</p>
                    <p class="text-sm opacity-90">${
                      filteredEntries.length
                    } transações</p>
                </div>
                <div class="bg-gradient-to-r from-red-400 to-red-600 text-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold">Total de Saídas</h3>
                    <p class="text-2xl font-bold">R$ ${totalSaidas.toLocaleString(
                      "pt-BR",
                      { minimumFractionDigits: 2 }
                    )}</p>
                    <p class="text-sm opacity-90">${
                      filteredExits.length
                    } transações</p>
                </div>
                <div class="bg-gradient-to-r ${
                  saldo >= 0
                    ? "from-blue-400 to-blue-600"
                    : "from-gray-400 to-gray-600"
                } text-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold">Saldo Atual</h3>
                    <p class="text-2xl font-bold">R$ ${saldo.toLocaleString(
                      "pt-BR",
                      { minimumFractionDigits: 2 }
                    )}</p>
                    <p class="text-sm opacity-90">${
                      saldo >= 0 ? "Positivo" : "Negativo"
                    }</p>
                </div>
            `
    }

    const financialEntriesList = document.getElementById("financialEntriesList")
    if (financialEntriesList) {
      if (filteredEntries.length === 0) {
        financialEntriesList.innerHTML =
          '<p class="text-gray-500">Nenhuma entrada registrada para este período.</p>'
      } else {
        financialEntriesList.innerHTML = filteredEntries
          .map(
            (entry) => `
                    <div class="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                            <p class="font-medium">${entry.description}</p>
                            <p class="text-sm text-gray-600">${new Date(
                              entry.date
                            ).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <span class="text-green-600 font-semibold">+R$ ${entry.value.toFixed(
                          2
                        )}</span>
                        <button id="removeEntryBtn-${
                          entry.id
                        }" data-entry-id="${
              entry.id
            }" class="text-red-600 hover:text-red-800 ml-2">🗑️</button>
                    </div>
                `
          )
          .join("")
      }

      // Adiciona event listener para os botões de remover entradas via delegação
      financialEntriesList.addEventListener("click", (event) => {
        if (event.target.id.startsWith("removeEntryBtn-")) {
          const entryId = event.target.dataset.entryId
          removeFinancialEntry(entryId)
        }
      })
    }

    const financialExitsList = document.getElementById("financialExitsList")
    if (financialExitsList) {
      if (filteredExits.length === 0) {
        financialExitsList.innerHTML =
          '<p class="text-gray-500">Nenhuma saída registrada para este período.</p>'
      } else {
        financialExitsList.innerHTML = filteredExits
          .map(
            (exit) => `
                    <div class="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                            <p class="font-medium">${exit.description}</p>
                            <p class="text-sm text-gray-600">${new Date(
                              exit.date
                            ).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <span class="text-red-600 font-semibold">-R$ ${exit.value.toFixed(
                          2
                        )}</span>
                        <button id="removeExitBtn-${exit.id}" data-exit-id="${
              exit.id
            }" class="text-red-600 hover:text-red-800 ml-2">🗑️</button>
                    </div>
                `
          )
          .join("")
      }

      // Adiciona event listener para os botões de remover saídas via delegação
      financialExitsList.addEventListener("click", (event) => {
        if (event.target.id.startsWith("removeExitBtn-")) {
          const exitId = event.target.dataset.exitId
          removeFinancialExit(exitId)
        }
      })
    }
  } catch (error) {
    console.error("Erro ao buscar dados financeiros:", error)
    showCustomMessage("Erro ao carregar dados financeiros.", "error")
  }
}

export function filterFinancialData() {
  const monthFilter = document.getElementById("monthFilter").value
  fetchFinancialData(monthFilter)
}

export function resetFinancialFilter() {
  document.getElementById("monthFilter").value = "" // Limpa o filtro
  fetchFinancialData() // Recarrega todos os dados
}

export async function removeFinancialEntry(entryId) {
  if (!confirm("Tem certeza que deseja remover esta entrada financeira?"))
    return

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para remover entradas financeiras.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/financial-entries/${entryId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company_id: systemData.loggedInUser.companyId }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadFinanceiro() // Recarrega a página financeira
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao remover entrada financeira:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export async function removeFinancialExit(exitId) {
  if (!confirm("Tem certeza que deseja remover esta saída financeira?")) return

  if (!systemData.loggedInUser || !systemData.loggedInUser.companyId) {
    showCustomMessage(
      "Você precisa estar logado para remover saídas financeiras.",
      "warning"
    )
    loadPage("login")
    return
  }

  try {
    const response = await fetch(`${BACKEND_URL}/financial-exits/${exitId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: systemData.loggedInUser.companyId }),
    })

    const data = await response.json()

    if (response.ok) {
      showCustomMessage(data.message, "success")
      loadFinanceiro() // Recarrega a página financeira
    } else {
      showCustomMessage(`Erro: ${data.message}`, "error")
    }
  } catch (error) {
    console.error("Erro ao remover saída financeira:", error)
    showCustomMessage(
      "Erro ao conectar com o servidor. Tente novamente mais tarde.",
      "error"
    )
  }
}

export let salesChartInstance = null

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
