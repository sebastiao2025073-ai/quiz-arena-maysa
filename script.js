/* QUIZ ARENA - MAYSA | script.js */

const SUPABASE_URL = "https://jomtbcybcokwzwhyjcwa.supabase.co";
const SUPABASE_KEY = "sb_publishable_gNFJGSj1KMWAryfXKUnM-g_DDGpV_9-";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

const connectionStatus = $("connectionStatus");
const quizCount = $("quizCount");
const participantCount = $("participantCount");
const answerCount = $("answerCount");
const libraryCount = $("libraryCount");
const quizList = $("quizList");
const newQuizBtn = $("newQuizBtn");
const emptyCreateBtn = $("emptyCreateBtn");
const quizModal = $("quizModal");
const closeModal = $("closeModal");
const cancelModal = $("cancelModal");
const quizForm = $("quizForm");
const quizTitle = $("quizTitle");
const quizDescription = $("quizDescription");
const formMessage = $("formMessage");
const toast = $("toast");

let quizzes = [];
let toastTimeout;

function showToast(message, type = "success") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.className = "toast", 3500);
}

function showFormMessage(message, type = "error") {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

function openModal() {
    quizModal.classList.add("active");
    quizModal.setAttribute("aria-hidden", "false");
    quizTitle.focus();
}

function hideModal() {
    quizModal.classList.remove("active");
    quizModal.setAttribute("aria-hidden", "true");
    quizForm.reset();
    showFormMessage("");
}

newQuizBtn.addEventListener("click", openModal);
emptyCreateBtn.addEventListener("click", openModal);
closeModal.addEventListener("click", hideModal);
cancelModal.addEventListener("click", hideModal);

quizModal.addEventListener("click", (event) => {
    if (event.target === quizModal) hideModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideModal();
});

async function testConnection() {
    connectionStatus.textContent = "Conectando...";
    try {
        const { error } = await supabaseClient
            .from("quizzes")
            .select("id")
            .limit(1);
        if (error) throw error;
        connectionStatus.textContent = "Supabase conectado";
    } catch (error) {
        console.error("Erro na conexão:", error);
        connectionStatus.textContent = "Erro de conexão";
    }
}

async function createQuiz(event) {
    event.preventDefault();

    const title = quizTitle.value.trim();
    const description = quizDescription.value.trim();

    if (!title) {
        showFormMessage("Digite o nome do quiz.");
        return;
    }

    const submitButton = quizForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";

    try {
        const { data, error } = await supabaseClient
            .from("quizzes")
            .insert([{ title, description: description || null }])
            .select()
            .single();

        if (error) throw error;

        quizzes.unshift(data);
        hideModal();
        renderQuizzes();
        showToast("Quiz criado com sucesso!");
    } catch (error) {
        console.error("Erro ao criar quiz:", error);
        showFormMessage("Não foi possível criar o quiz. Verifique a conexão e as permissões do banco.");
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Criar quiz <span>→</span>';
    }
}

quizForm.addEventListener("submit", createQuiz);

async function loadQuizzes() {
    quizList.innerHTML = `<div class="empty-state"><h3>Carregando seus quizzes...</h3></div>`;

    try {
        const { data, error } = await supabaseClient
            .from("quizzes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        quizzes = data || [];
        renderQuizzes();
    } catch (error) {
        console.error("Erro ao carregar quizzes:", error);
        quizList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>
                <h3>Não foi possível carregar</h3>
                <p>Confira se a tabela quizzes existe no Supabase e se as permissões estão configuradas.</p>
                <button class="text-button" id="retryBtn">Tentar novamente</button>
            </div>`;
        $("retryBtn")?.addEventListener("click", loadQuizzes);
    }
}

function renderQuizzes() {
    const total = quizzes.length;
    quizCount.textContent = total;
    libraryCount.textContent = `${total} ${total === 1 ? "quiz" : "quizzes"}`;

    if (!total) {
        quizList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✧</div>
                <h3>Seu primeiro quiz começa aqui</h3>
                <p>Crie perguntas, compartilhe o QR Code e acompanhe a disputa em tempo real.</p>
                <button class="text-button" id="emptyCreateBtn">＋ Criar meu primeiro quiz</button>
            </div>`;
        $("emptyCreateBtn").addEventListener("click", openModal);
        return;
    }

    quizList.innerHTML = quizzes.map((quiz) => `
        <article class="quiz-card">
            <div class="quiz-card-icon">▤</div>
            <div class="quiz-card-content">
                <h3>${escapeHTML(quiz.title)}</h3>
                <p>${escapeHTML(quiz.description || "Sem descrição")}</p>
                <small>Criado em ${formatDate(quiz.created_at)}</small>
            </div>
            <div class="quiz-card-actions">
                <button class="secondary-button" data-action="delete" data-id="${quiz.id}">Excluir</button>
            </div>
        </article>`).join("");

    quizList.querySelectorAll('[data-action="delete"]').forEach((button) => {
        button.addEventListener("click", () => deleteQuiz(button.dataset.id));
    });
}

async function deleteQuiz(id) {
    if (!confirm("Tem certeza de que deseja excluir este quiz?")) return;

    try {
        const { error } = await supabaseClient
            .from("quizzes")
            .delete()
            .eq("id", id);
        if (error) throw error;

        quizzes = quizzes.filter((quiz) => quiz.id !== id);
        renderQuizzes();
        showToast("Quiz excluído.");
    } catch (error) {
        console.error("Erro ao excluir:", error);
        showToast("Não foi possível excluir o quiz.", "error");
    }
}

function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[character]);
}

async function initializeQuizArena() {
    if (!window.supabase) {
        connectionStatus.textContent = "Biblioteca Supabase não carregada";
        showToast("Não foi possível carregar o Supabase.", "error");
        return;
    }

    await testConnection();
    await loadQuizzes();
    participantCount.textContent = "0";
    answerCount.textContent = "0";
}

document.addEventListener("DOMContentLoaded", initializeQuizArena);
