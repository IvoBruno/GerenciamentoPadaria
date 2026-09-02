// Bakery Management Simulation Logic

// Game State Class
class BakeryGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.week = 1;
    this.maxWeeks = 50;

    // Initial State (Equilibrium)
    this.estoque = 10;
    this.processo = 10; // Arriving next week
    this.transito = 10; // Arriving in 2 weeks

    this.backorders = 0; // Cumulative backlog
    this.totalCost = 0;

    // Last week's stats (for UI)
    this.lastDemanda = 10;
    this.lastNaoAtendidos = 0;
    this.lastConsumidores = 10; // Fulfilled

    this.gameOver = false;
    this.stableWeeks = 0;
    this.stabilityAchieved = false;

    // History for charts starts with Week 1 initial equilibrium
    this.history = [
      {
        week: 1,
        estoque: 10,
        processo: 10,
        transito: 10,
        backorders: 0,
        cost: 0,
        demanda: 10,
        nao_atendidos: 0,
        consumidores: 10,
        pedido: 10,
        stableWeeks: 0,
      },
    ];
  }

  getDemand(week) {
    return week <= 1 ? 10 : 15;
  }

  processTurn(pedido) {
    if (this.gameOver) return this.getState();
    if (pedido < 0) pedido = 0;

    // 1. Determinar demanda da nova semana (Semana 1 = 10, Semana 2+ = 15)
    const demanda = this.getDemand(this.week);
    this.lastDemanda = demanda;

    // 2. Avançar semana
    this.week++;

    // 3. Calcular demanda total a ser atendida (demanda da nova semana + backorders anteriores)
    let totalDemand = demanda + this.backorders;

    // 4. Atender demanda a partir do estoque existente em mãos (antes da chegada da nova produção)
    let atendidos = 0;
    if (this.estoque >= totalDemand) {
      atendidos = totalDemand;
      this.estoque -= totalDemand;
      this.backorders = 0;
      this.lastNaoAtendidos = 0;
    } else {
      atendidos = this.estoque;
      this.lastNaoAtendidos = totalDemand - this.estoque;
      this.backorders = this.lastNaoAtendidos;
      this.estoque = 0;
    }

    this.lastConsumidores = atendidos;

    // 5. Receber a produção finalizada do forno no estoque
    this.estoque += this.processo;

    // 6. Avançar lote em trânsito para a produção
    this.processo = this.transito;

    // 7. Efetuar novo pedido de matéria-prima (entra em trânsito)
    this.transito = pedido;

    // 8. Calcular custos da semana
    // Custo de manutenção de estoque: R$ 1.00 / unidade
    // Custo de falta / atraso (backorders): R$ 1.50 / unidade
    const custoEstoque = this.estoque * 1.0;
    const custoFalta = this.backorders * 1.5;
    this.totalCost += custoEstoque + custoFalta;

    // 9. Verificar condição de estabilidade:
    // Novos pedidos não atendidos = 0, sem backorders e estoque igual à demanda
    const isStable =
      this.week >= 2 &&
      this.lastNaoAtendidos === 0 &&
      this.backorders === 0 &&
      this.estoque === demanda;

    if (isStable) {
      this.stableWeeks++;
    } else {
      this.stableWeeks = 0;
    }

    // 10. Salvar no histórico da simulação a rodada jogada
    this.history.push({
      week: this.week,
      estoque: this.estoque,
      processo: this.processo,
      transito: this.transito,
      backorders: this.backorders,
      cost: this.totalCost,
      demanda: demanda,
      nao_atendidos: this.lastNaoAtendidos,
      consumidores: atendidos,
      pedido: pedido,
      stableWeeks: this.stableWeeks,
    });

    // 11. Verificar encerramento da simulação:
    // Se manteve a estabilidade por 3 semanas consecutivas após atingir o equilíbrio (total de 4 semanas estáveis)
    // ou se atingiu o limite de 50 semanas
    if (this.stableWeeks >= 4) {
      this.stabilityAchieved = true;
      this.gameOver = true;
    } else if (this.week >= this.maxWeeks) {
      this.gameOver = true;
    }

    return this.getState();
  }

  getState() {
    const currentWeek = this.week > this.maxWeeks ? this.maxWeeks : this.week;
    const currentDemanda = this.getDemand(currentWeek);
    const totalPedidos = currentDemanda + this.backorders;

    return {
      semana: currentWeek,
      transito: this.transito,
      processo: this.processo,
      estoque: this.estoque,
      nao_atendidos: this.lastNaoAtendidos,
      consumidores: this.lastConsumidores,
      demanda: currentDemanda,
      backorders: this.backorders,
      totalPedidos: totalPedidos,
      totalCost: this.totalCost.toFixed(2),
      total: totalPedidos,
      game_over: this.gameOver,
      stableWeeks: this.stableWeeks,
      stabilityAchieved: this.stabilityAchieved,
      history: this.history,
    };
  }
}

// Global Variables
let game = null;
let playerInfo = {};
let resultsChartInstance = null;

// Document Ready Function
document.addEventListener("DOMContentLoaded", () => {
  setupRegistrationScreen();
  setupModals();
  setupGameControls();
  setupCookieNotice();
  setupNavigation();

  // Board scaling responsive listener
  window.addEventListener("resize", adjustBoardScale);
});

// Setup Cookie notice
function setupCookieNotice() {
  const notice = document.getElementById("cookie-notice");
  const btn = document.getElementById("fecharAlertaCookies");

  if (localStorage.getItem("cookieAccepted") === "true") {
    notice.style.display = "none";
  }

  btn.addEventListener("click", () => {
    notice.style.display = "none";
    localStorage.setItem("cookieAccepted", "true");
  });
}

// Setup Navigation items
function setupNavigation() {
  const menuHome = document.getElementById("menuHome");
  const menuRegras = document.getElementById("menuRegras");
  const menuNovoJogo = document.getElementById("menuNovoJogo");

  menuHome.addEventListener("click", (e) => {
    e.preventDefault();
    if (game) {
      showScreen("game-screen");
    } else {
      showScreen("registration-screen");
    }
  });

  menuRegras.addEventListener("click", (e) => {
    e.preventDefault();
    openModal("instructions-modal");
    showStep(1);
  });

  menuNovoJogo.addEventListener("click", (e) => {
    e.preventDefault();
    if (
      confirm(
        "Deseja iniciar um novo jogo? Todo o progresso atual será perdido.",
      )
    ) {
      resetToRegistration();
    }
  });
}

// Show registration form screen
function setupRegistrationScreen() {
  const form = document.getElementById("start-game-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    playerInfo = {
      name: document.getElementById("player-name").value,
      nick: document.getElementById("player-nick").value,
      email: document.getElementById("player-email").value,
      type: document.getElementById("player-type").value,
      acceptRanking: document.getElementById("accept-ranking").checked,
    };

    document.getElementById("display-player-nick").textContent =
      playerInfo.nick;

    // Initialize Game
    game = new BakeryGame();
    updateUI(game.getState());

    // Shift Screens
    showScreen("game-screen");

    // Show Modal rules
    openModal("instructions-modal");
    showStep(1);

    // Adjust Board scaling
    setTimeout(adjustBoardScale, 100);
  });
}

// Modals transitions
function setupModals() {
  // Navigation inside instructions modal
  const nextBtns = document.querySelectorAll(
    ".beergame-modal-conteudo-btn.-proximo",
  );
  const prevBtns = document.querySelectorAll(
    ".beergame-modal-conteudo-btn.-voltar",
  );
  const closeInstBtn = document.getElementById("btnFecharInstrucoes");
  const btnRegras = document.getElementById("btnRegras");

  nextBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentStep = parseInt(btn.getAttribute("data-step"), 10);
      showStep(currentStep + 1);
    });
  });

  prevBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentStep = parseInt(btn.getAttribute("data-step"), 10);
      showStep(currentStep);
    });
  });

  closeInstBtn.addEventListener("click", () => {
    closeModal("instructions-modal");
  });

  btnRegras.addEventListener("click", () => {
    openModal("instructions-modal");
    showStep(1);
  });
}

// Show specific instruction slide step
function showStep(stepNumber) {
  const steps = document.querySelectorAll(
    "#instructions-modal .beergame-modal-step",
  );
  const stepImages = document.querySelectorAll(
    "#instructions-modal .beergame-modal-conteudo-titulo img",
  );

  steps.forEach((step) => {
    step.style.display = "none";
  });

  stepImages.forEach((img) => {
    img.style.display = "none";
  });

  const activeStepClass = `beergame-modal-step-${stepNumber}`;
  const activeStepElements = document.querySelectorAll(
    `#instructions-modal .${activeStepClass}`,
  );

  activeStepElements.forEach((el) => {
    el.style.display = "block";
  });
}

// Game board logic controls
function setupGameControls() {
  const input = document.getElementById("quantidade-pedido");
  const submitBtn = document.getElementById("btnEnviarPedido");
  const resetBtn = document.getElementById("btnResetarJogo");
  const playAgainBtn = document.getElementById("btnJogarNovamente");
  const closeResultsBtn = document.getElementById("btnFecharResultados");

  submitBtn.addEventListener("click", () => {
    if (!game || game.gameOver) return;

    const value = parseInt(input.value, 10);
    if (isNaN(value) || value < 0 || value > 99) {
      alert(
        "Por favor, insira uma quantidade de pedido válida (entre 0 e 99).",
      );
      return;
    }

    // Disable submit to prevent multiple clicks
    submitBtn.classList.add("-disabled");

    // Process Turn
    const state = game.processTurn(value);

    // Simulate short network delay for transition immersion
    setTimeout(() => {
      updateUI(state);
      submitBtn.classList.remove("-disabled");
      input.value = "";
      input.focus();

      if (state.game_over) {
        showGameOver(state);
      }
    }, 400);
  });

  // Submit with Enter key
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitBtn.click();
    }
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("Deseja reiniciar a simulação atual?")) {
      game.reset();
      updateUI(game.getState());
      input.value = "";
    }
  });

  playAgainBtn.addEventListener("click", () => {
    closeModal("game-over-modal");
    game.reset();
    updateUI(game.getState());
    input.value = "";
    input.focus();
  });

  closeResultsBtn.addEventListener("click", () => {
    closeModal("game-over-modal");
  });
}

// Update DOM elements on game board
function updateUI(state) {
  document.getElementById("val-semana").textContent = String(
    state.semana,
  ).padStart(2, "0");
  document.getElementById("val-transito").textContent = state.transito;
  document.getElementById("val-processo").textContent = state.processo;
  document.getElementById("val-estoque").textContent = state.estoque;
  document.getElementById("val-nao-atendidos").textContent =
    state.nao_atendidos;
  document.getElementById("val-consumidores").textContent = state.consumidores;

  document.getElementById("val-demanda").textContent = state.demanda;
  document.getElementById("val-backorders").textContent = state.backorders;
  document.getElementById("val-total").textContent = state.total;

  // Disable input/buttons on game over
  const input = document.getElementById("quantidade-pedido");
  const submitBtn = document.getElementById("btnEnviarPedido");

  if (state.game_over) {
    input.disabled = true;
    submitBtn.classList.add("-disabled");
  } else {
    input.disabled = false;
    submitBtn.classList.remove("-disabled");
  }
}

// Game Over Summary and Chart
function showGameOver(state) {
  // Update banner message and label if stability was achieved
  const bannerTitle = document.querySelector(".finish-banner h2");
  const bannerText = document.querySelector(".finish-banner p");
  const labelWeeks = document.getElementById("res-label-weeks");

  if (state.stabilityAchieved) {
    if (bannerTitle) {
      bannerTitle.textContent = "Estabilidade Atingida com Sucesso! 🏆";
    }
    if (bannerText) {
      bannerText.textContent = `Parabéns! Você estabilizou o estoque em ${state.demanda} fornadas e manteve o equilíbrio por 3 semanas consecutivas.`;
    }
    if (labelWeeks) {
      labelWeeks.textContent = "Semanas até Estabilização";
    }
  } else {
    if (bannerTitle) bannerTitle.textContent = "Simulação Concluída!";
    if (bannerText) {
      bannerText.textContent =
        "Limite de 50 semanas atingido. Veja seus resultados no gerenciamento da padaria.";
    }
    if (labelWeeks) {
      labelWeeks.textContent = "Semanas Simuladas";
    }
  }

  // Fill summary stats
  document.getElementById("res-total-cost").textContent =
    `R$ ${state.totalCost}`;
  const totalWeeksEl = document.getElementById("res-total-weeks");
  if (totalWeeksEl) {
    totalWeeksEl.textContent = state.semana;
  }

  // Calculations
  const history = state.history;
  const totalStock = history.reduce((sum, item) => sum + item.estoque, 0);
  const avgStock = (totalStock / history.length).toFixed(1);
  const totalBacklog = history.reduce(
    (sum, item) => sum + item.nao_atendidos,
    0,
  );

  document.getElementById("res-avg-stock").textContent = avgStock;
  document.getElementById("res-total-backlog").textContent = totalBacklog;

  // Open modal
  openModal("game-over-modal");

  // Build Chart
  setTimeout(() => {
    renderResultsChart(history);
  }, 300);
}

// Render Line Chart using Chart.js
function renderResultsChart(history) {
  const ctx = document.getElementById("resultsChart").getContext("2d");

  // Destroy old instance if it exists to prevent overlap glitches
  if (resultsChartInstance) {
    resultsChartInstance.destroy();
  }

  const labels = history.map((item) => `Sem ${item.week}`);
  const stockData = history.map((item) => item.estoque);
  const backlogData = history.map((item) => item.nao_atendidos);
  const orderData = history.map((item) => item.pedido);

  resultsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Estoque",
          data: stockData,
          borderColor: "#d97706", // primary warm color
          backgroundColor: "rgba(217, 119, 6, 0.1)",
          borderWidth: 2,
          tension: 0.2,
          fill: true,
        },
        {
          label: "Atrasos (Falta)",
          data: backlogData,
          borderColor: "#ef4444", // red
          backgroundColor: "rgba(239, 68, 68, 0.05)",
          borderWidth: 2,
          tension: 0.2,
        },
        {
          label: "Seus Pedidos",
          data: orderData,
          borderColor: "#3b82f6", // blue
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "Poppins",
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "#f3f4f6",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

// Adjust scale of the absolute-positioned game board to fit screen width
function adjustBoardScale() {
  const container = document.querySelector(".board-container");
  const board = document.querySelector(".beergame-game-play-tabuleiro");
  if (!container || !board) return;

  const containerWidth = container.clientWidth;
  const boardWidth = 1100; // Fixed board width

  if (containerWidth < boardWidth) {
    const scale = containerWidth / boardWidth;
    board.style.transform = `scale(${scale}) translateX(-50%)`;
    board.style.left = "50%";
    container.style.height = `${600 * scale}px`;
  } else {
    board.style.transform = "translateX(-50%)";
    board.style.left = "50%";
    container.style.height = "600px";
  }
}

// Navigation helpers
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.add("hide");
  });
  document.getElementById(screenId).classList.remove("hide");
}

function resetToRegistration() {
  game = null;
  showScreen("registration-screen");
  document.getElementById("start-game-form").reset();
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("show-modal");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show-modal");
}
