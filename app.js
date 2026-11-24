const API = "https://api.wowdb.assemblee-defias.fr/v1/wotlk/items";
const PAGE_SIZE = 25;
let currentItems = [];
let currentPage = 1;
let cursorHistory = [null];
let nextCursor = null;
let hasMore = false;
let totalCount = 0;
let requestToken = 0;
let suggestionToken = 0;
let suggestionTimer = null;
let suggestionItems = [];
let activeSuggestion = -1;
let toastTimer;
const $ = id => document.getElementById(id);
const searchInput = $("searchInput");
const resultsBody = $("resultsBody");
const suggestionsBox = $("suggestions");

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showToast(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
}
function mapItem(item) {
  return {
    id: Number(item.id),
    name: item.name || "Nome não informado",
    category: item.slot_name || item.type_name || "Outros",
    type: item.type_name || item.slot_name || "—"
  };
}
function setLoading(message) {
  $("notice").textContent = message;
  $("searchButton").disabled = true;
  $("searchButton").textContent = "BUSCANDO...";
}
function finishLoading() {
  $("searchButton").disabled = false;
  $("searchButton").innerHTML = 'BUSCAR <span>→</span>';
}
async function fetchList({query = "", cursor = null, token}) {
  const url = new URL(API);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("include_total", "true");
  if (query) url.searchParams.set("q", query);
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url.toString(), {headers: {"Accept":"application/json"}});
  if (!response.ok) throw new Error(`A API respondeu com status ${response.status}`);
  const payload = await response.json();
  if (token !== requestToken) return;
  currentItems = (payload.data || []).map(mapItem);
  nextCursor = payload.next_cursor || null;
  hasMore = Boolean(payload.has_more);
  totalCount = Number(payload.total_count ?? currentItems.length);
  currentPage = cursorHistory.length;
  render();
  $("totalCount").textContent = totalCount.toLocaleString("pt-BR");
  $("notice").textContent = `Catálogo WotLK 3.3.5a conectado • ${totalCount.toLocaleString("pt-BR")} itens disponíveis na base.`;
}
async function searchItems(reset = true) {
  const query = searchInput.value.trim();
  const token = ++requestToken;
  if (reset) cursorHistory = [null];
  currentPage = cursorHistory.length;
  setLoading("Consultando o catálogo completo de itens WotLK...");
  try {
    if (/^\d+$/.test(query)) {
      const response = await fetch(`${API}/${encodeURIComponent(query)}`, {headers:{"Accept":"application/json"}});
      if (token !== requestToken) return;
      if (response.status === 404) {
        currentItems = []; totalCount = 0; nextCursor = null; hasMore = false;
      } else if (!response.ok) throw new Error(`A API respondeu com status ${response.status}`);
      else {
        const item = await response.json();
        currentItems = [mapItem(item)]; totalCount = 1; nextCursor = null; hasMore = false;
      }
      $("totalCount").textContent = totalCount.toLocaleString("pt-BR");
      $("notice").textContent = "Busca por ID no catálogo WotLK 3.3.5a.";
      render();
    } else {
      await fetchList({query, cursor: null, token});
    }
  } catch (error) {
    if (token === requestToken) {
      currentItems = []; totalCount = 0; nextCursor = null; hasMore = false; render();
      $("notice").textContent = "Não foi possível conectar ao banco de itens. Verifique sua conexão e tente novamente.";
      console.error(error);
    }
  } finally { if (token === requestToken) finishLoading(); }
}
function render() {
  resultsBody.innerHTML = currentItems.map(item => `<tr>
    <td><span class="item-id">${item.id}</span></td>
    <td><span class="item-name">${safeText(item.name)}</span></td>
    <td><span class="category">${safeText(item.category)}</span></td>
    <td>${safeText(item.type)}</td>
    <td><button class="copy-btn" data-id="${item.id}">Copiar .add</button></td>
  </tr>`).join("");
  $("resultCount").textContent = currentItems.length.toLocaleString("pt-BR");
  $("emptyState").hidden = currentItems.length !== 0;
  $("pageInfo").textContent = currentItems.length
    ? `Página ${currentPage} • ${currentItems.length} itens exibidos${totalCount ? ` de ${totalCount.toLocaleString("pt-BR")}` : ""}`
    : "Nenhum item encontrado";
  $("prevPage").disabled = currentPage <= 1;
  $("nextPage").disabled = !hasMore;
}
async function goNext() {
  if (!hasMore || !nextCursor) return;
  const query = searchInput.value.trim();
  cursorHistory.push(nextCursor);
  const token = ++requestToken;
  setLoading("Carregando próxima página...");
  try { await fetchList({query, cursor: nextCursor, token}); }
  catch (error) { cursorHistory.pop(); $("notice").textContent = "Erro ao carregar a próxima página. Tente novamente."; console.error(error); }
  finally { if (token === requestToken) finishLoading(); }
}
async function goPrevious() {
  if (currentPage <= 1) return;
  cursorHistory.pop();
  const cursor = cursorHistory[cursorHistory.length - 1];
  const token = ++requestToken;
  setLoading("Voltando uma página...");
  try { await fetchList({query: searchInput.value.trim(), cursor, token}); }
  catch (error) { $("notice").textContent = "Erro ao voltar a página. Tente novamente."; console.error(error); }
  finally { if (token === requestToken) finishLoading(); }
}
async function copyCommand(id) {
  const command = `.add ${id}`;
  try { await navigator.clipboard.writeText(command); showToast(`Comando copiado: ${command}`); }
  catch {
    const area = document.createElement("textarea"); area.value = command; document.body.appendChild(area);
    area.select(); document.execCommand("copy"); area.remove(); showToast(`Comando copiado: ${command}`);
  }
}
function hideSuggestions() {
  suggestionsBox.hidden = true;
  suggestionsBox.innerHTML = "";
  suggestionItems = [];
  activeSuggestion = -1;
}
function renderSuggestions(items) {
  suggestionItems = items;
  activeSuggestion = -1;
  if (!items.length) { hideSuggestions(); return; }
  suggestionsBox.innerHTML = items.map((item, index) => `
    <button type="button" class="suggestion${index === activeSuggestion ? " active" : ""}" role="option" aria-selected="false" data-index="${index}">
      <span class="suggestion-name">${safeText(item.name)}</span>
      <span class="suggestion-id">ID ${item.id}</span>
    </button>`).join("");
  suggestionsBox.hidden = false;
}
async function loadSuggestions() {
  const query = searchInput.value.trim();
  const token = ++suggestionToken;
  if (query.length < 2 || /^\d+$/.test(query)) { hideSuggestions(); return; }
  try {
    const url = new URL(API);
    url.searchParams.set("limit", "8");
    url.searchParams.set("q", query);
    const response = await fetch(url.toString(), {headers: {"Accept":"application/json"}});
    if (!response.ok) throw new Error(`Sugestões indisponíveis (${response.status})`);
    const payload = await response.json();
    if (token !== suggestionToken || query !== searchInput.value.trim()) return;
    const items = (payload.data || []).map(mapItem);
    renderSuggestions(items);
  } catch (error) {
    if (token === suggestionToken) hideSuggestions();
    console.debug("Autocomplete indisponível:", error);
  }
}
function chooseSuggestion(index) {
  const item = suggestionItems[index];
  if (!item) return;
  searchInput.value = item.name;
  hideSuggestions();
  searchItems(true);
}
suggestionsBox.addEventListener("pointerdown", e => {
  const button = e.target.closest("[data-index]");
  if (button) { e.preventDefault(); chooseSuggestion(Number(button.dataset.index)); }
});
searchInput.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(loadSuggestions, 260);
});
$("searchButton").addEventListener("click", () => { hideSuggestions(); searchItems(true); });
searchInput.addEventListener("keydown", e => {
  if (!suggestionsBox.hidden && suggestionItems.length) {
    if (e.key === "ArrowDown") { e.preventDefault(); activeSuggestion = (activeSuggestion + 1) % suggestionItems.length; updateActiveSuggestion(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); activeSuggestion = (activeSuggestion - 1 + suggestionItems.length) % suggestionItems.length; updateActiveSuggestion(); return; }
    if (e.key === "Escape") { hideSuggestions(); return; }
    if (e.key === "Enter" && activeSuggestion >= 0) { e.preventDefault(); chooseSuggestion(activeSuggestion); return; }
  }
  if (e.key === "Enter") { hideSuggestions(); searchItems(true); }
});
function updateActiveSuggestion() {
  [...suggestionsBox.querySelectorAll(".suggestion")].forEach((el, index) => {
    const active = index === activeSuggestion;
    el.classList.toggle("active", active);
    el.setAttribute("aria-selected", String(active));
  });
}
document.addEventListener("click", e => {
  if (!e.target.closest(".search-panel-wrap")) hideSuggestions();
});
$("prevPage").addEventListener("click", goPrevious);
$("nextPage").addEventListener("click", goNext);
resultsBody.addEventListener("click", e => { const button = e.target.closest("[data-id]"); if (button) copyCommand(button.dataset.id); });
document.querySelectorAll(".chip").forEach(button => button.addEventListener("click", () => { searchInput.value = button.dataset.query; searchItems(true); }));
searchItems(true);
