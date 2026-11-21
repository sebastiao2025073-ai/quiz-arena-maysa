/*
  QUIZ ARENA — Maysa
  Conexão com Supabase configurada para teste.
  A chave sb_publishable é própria para uso no navegador.
  Nunca coloque sb_secret/service_role neste arquivo.
*/

const SUPABASE_URL = "https://jomtbcybcokwzwhyjcwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gNFJGSj1KMWAryfXKUnM-g_DDGpV_9-";

const $ = (selector) => document.querySelector(selector);
const modal = $("#quizModal");
const form = $("#quizForm");
const quizList = $("#quizList");
const toast = $("#toast");

let quizzes = [];
let supabaseClient = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setConnectionStatus(message, connected = false) {
  const status = $("#connectionStatus");
  if (!status) return;
  status.textContent = message;
  const dot = status.previousElementSibling;
  if (dot) dot.style.background = connected ? "#50d6a0" : "#e6a23c";
}

function openModal() {
  $("#formMessage").textContent = "";
  form.reset();
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  $("#quizTitle").focus();
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function renderQuizzes() {
  $("#quizCount").textContent = quizzes.length;
  $("#libraryCount").textContent =
    `${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"}`;

  if (!quizzes.length) {
    quizList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✧</div>
        <h3>Seu primeiro quiz começa aqui</h3>
        <p>Crie perguntas, compartilhe o QR Code e acompanhe a disputa em tempo real.</p>
        <button class="text-button" id="emptyCreateBtn">＋ Criar meu primeiro quiz</button>
      </div>`;
    $("#emptyCreateBtn").addEventListener("click", openModal);
    return;
  }

  quizList.innerHTML = quizzes.map((quiz) => `
    <article class="quiz-item">
      <div class="quiz-symbol">✧</div>
      <div class="quiz-info">
        <strong>${escapeHTML(quiz.title)}</strong>
        <small>${escapeHTML(quiz.description || "Quiz criado por Maysa")} ·
          ${quiz.created_at ? new Date(quiz.created_at).toLocaleDateString("pt-BR") : ""}
        </small>
      </div>
      <button class="quiz-action" data-id="${escapeHTML(quiz.id)}">Abrir</button>
    </article>`).join("");

  quizList.querySelectorAll(".quiz-action").forEach((button) => {
    button.addEventListener("click", () =>
      showToast("Próxima etapa: cadastro de perguntas e QR Code.")
    );
  });
}

async function loadQuizzes() {
  if (!window.supabase) {
    setConnectionStatus("Biblioteca Supabase não carregada");
    showToast("Não foi possível carregar a biblioteca do Supabase.");
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  setConnectionStatus("Testando conexão...");

  // Teste real: consulta a tabela quizzes.
  // Se retornar sem erro, URL, chave, tabela e permissão de leitura estão funcionando.
  const { data, error } = await supabaseClient
    .from("quizzes")
    .select("id,title,description,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    setConnectionStatus("Falha na conexão ou configuração do banco");
    console.error("Teste de conexão Supabase:", error);
    showToast(`Erro no Supabase: ${error.message}`);
    return;
  }

  setConnectionStatus("Supabase conectado", true);
  quizzes = data || [];
  renderQuizzes();
  console.info("Supabase conectado com sucesso. Quizzes encontrados:", quizzes.length);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = $("#quizTitle").value.trim();
  const description = $("#quizDescription").value.trim();
  if (!title) return;

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Criando...";

  if (!supabaseClient) {
    $("#formMessage").textContent = "Sem conexão com o Supabase.";
  } else {
    const { data, error } = await supabaseClient
      .from("quizzes")
      .insert({ title, description })
      .select("id,title,description,created_at")
      .single();

    if (error) {
      $("#formMessage").textContent = `Não foi possível salvar: ${error.message}`;
      console.error("Erro ao criar quiz:", error);
    } else {
      quizzes.unshift(data);
      renderQuizzes();
      closeModal();
      showToast("Quiz salvo no Supabase!");
    }
  }

  submitButton.disabled = false;
  submitButton.innerHTML = 'Criar quiz <span>→</span>';
});

$("#newQuizBtn").addEventListener("click", openModal);
$("#emptyCreateBtn")?.addEventListener("click", openModal);
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

loadQuizzes();
