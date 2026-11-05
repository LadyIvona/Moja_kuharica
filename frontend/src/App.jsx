import React, { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const categories = ['Zajtrk', 'Glavna jed', 'Sladica', 'Priloga', 'Prigrizek', 'Juha', 'Pijača'];
const emptyForm = {
  title: '', description: '', ingredients: '', instructions: '', category: '', caloriesPer100g: '',
  proteinPer100g: '', fatPer100g: '', fiberPer100g: '',
};


function recipePayload(values) {
  return {
    ...values,
    category: values.category || null,
    caloriesPer100g: values.caloriesPer100g === '' ? null : Number(values.caloriesPer100g),
    proteinPer100g: values.proteinPer100g === '' ? null : Number(values.proteinPer100g),
    fatPer100g: values.fatPer100g === '' ? null : Number(values.fatPer100g),
    fiberPer100g: values.fiberPer100g === '' ? null : Number(values.fiberPer100g),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Zahteva ni uspela (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function splitLines(value) {
  return (value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function RecipeApp() {
  const [recipes, setRecipes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadRecipes() {
    setLoading(true);
    try {
      setRecipes(await request('/api/recipes'));
      setError('');
    } catch (err) {
      setError(`Povezava z zaledjem ni uspela. Preveri, ali delujeta PostgreSQL in Spring Boot. (${err.message})`);
    } finally {
      setLoading(false);
    }
  }

  async function showRecipe(id, updateAddress = true) {
    setError('');
    setNotice('');
    if (updateAddress && window.location.hash !== `#recipe/${id}`) {
      window.history.pushState({}, '', `#recipe/${id}`);
    }
    try {
      setSelected(await request(`/api/recipes/${id}`));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSelected(null);
      setError(`Recepta ni bilo mogoče odpreti. ${err.message}`);
    }
  }

  function goHome() {
    if (window.location.hash !== '#top') window.history.pushState({}, '', '#top');
    setSelected(null);
    setEditingId(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    loadRecipes();
    function syncAddress() {
      const match = window.location.hash.match(/^#recipe\/(\d+)$/);
      if (match) showRecipe(match[1], false);
      else setSelected(null);
    }
    syncAddress();
    window.addEventListener('popstate', syncAddress);
    window.addEventListener('hashchange', syncAddress);
    return () => {
      window.removeEventListener('popstate', syncAddress);
      window.removeEventListener('hashchange', syncAddress);
    };
  }, []);

  const availableCategories = useMemo(() => {
    const existing = recipes.map((recipe) => recipe.category).filter(Boolean);
    return [...new Set([...categories, ...existing])];
  }, [recipes]);

  const visibleRecipes = useMemo(() => {
    const filtered = recipes.filter((recipe) => {
      const matchesCategory = !categoryFilter || (categoryFilter === 'Nerazvrščeno' ? !recipe.category : recipe.category === categoryFilter);
      return matchesCategory;
    });
    const byName = (a, b) => a.title.localeCompare(b.title, 'sl');
    return filtered.sort((a, b) => {
      if (sortBy === 'name-desc') return byName(b, a);
      if (sortBy === 'calories-asc' || sortBy === 'calories-desc') {
        const direction = sortBy === 'calories-asc' ? 1 : -1;
        const aValue = a.caloriesPer100g;
        const bValue = b.caloriesPer100g;
        if (aValue == null && bValue == null) return byName(a, b);
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return direction * (aValue - bValue) || byName(a, b);
      }
      return byName(a, b);
    });
  }, [recipes, categoryFilter, sortBy]);

  function startEdit(recipe) {
    setEditingId(recipe.id);
    setEditForm({
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || '',
      instructions: recipe.instructions || '',
      category: recipe.category || '',
      caloriesPer100g: recipe.caloriesPer100g ?? '',
      proteinPer100g: recipe.proteinPer100g ?? '',
      fatPer100g: recipe.fatPer100g ?? '',
      fiberPer100g: recipe.fiberPer100g ?? '',
    });
    setNotice('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
    setError('');
  }

  useEffect(() => {
    if (editingId === null) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !busy) cancelEdit();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editingId, busy]);

  async function saveRecipe(event) {
    event.preventDefault();
    const wasEditing = editingId !== null;
    const recipeForm = wasEditing ? editForm : form;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await request(editingId ? `/api/recipes/${editingId}` : '/api/recipes', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(recipePayload(recipeForm)),
      });
      await loadRecipes();
      setNotice(wasEditing ? 'Recept je posodobljen.' : 'Recept je dodan v tvojo kuharico.');
      setSelected(saved);
      if (window.location.hash !== `#recipe/${saved.id}`) window.history.pushState({}, '', `#recipe/${saved.id}`);
      if (wasEditing) setEditForm(emptyForm);
      else setForm(emptyForm);
      setEditingId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(`Shranjevanje ni uspelo. ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecipe(recipe) {
    if (!window.confirm(`Res želiš izbrisati recept »${recipe.title}«?`)) return;
    setError('');
    setNotice('');
    try {
      await request(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
      setRecipes((current) => current.filter((item) => item.id !== recipe.id));
      if (selected?.id === recipe.id) goHome();
      if (editingId === recipe.id) cancelEdit();
      setNotice('Recept je izbrisan.');
    } catch (err) {
      setError(`Brisanje ni uspelo. ${err.message}`);
    }
  }

  const nutritionValues = selected && [
    { label: 'Kalorije', value: selected.caloriesPer100g, unit: 'kcal' },
    { label: 'Beljakovine', value: selected.proteinPer100g, unit: 'g' },
    { label: 'Maščobe', value: selected.fatPer100g, unit: 'g' },
    { label: 'Prehranske vlaknine', value: selected.fiberPer100g, unit: 'g' },
  ];

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" onClick={(event) => { event.preventDefault(); goHome(); }} aria-label="Moja kuharica – domov"><span className="brand-mark">✳</span> moja kuharica</a>
        <span className="topbar-note">Domače je vedno najboljše</span>
        <a className="api-link" href={`${API}/swagger-ui.html`} target="_blank" rel="noreferrer">Dokumentacija API ↗</a>
      </header>

      {selected ? (
        <section className="recipe-page">
          <button className="back-link" type="button" onClick={goHome}>← Vsi recepti</button>
          <div className="recipe-page-heading">
            <p className="eyebrow">IZ TVOJE KUHARIČNE ZBIRKE</p>
            <h1>{selected.title}</h1>
            <p className="recipe-page-description">{selected.description || 'Preprost recept, vreden ponovitve.'}</p>
            <span className="category-chip">{selected.category || 'Nerazvrščeno'}</span>
            <button className="primary-button detail-edit-button" type="button" onClick={() => startEdit(selected)}>Uredi recept <span>✎</span></button>
          </div>

          <div className="recipe-page-grid">
            <section className="detail-panel ingredients-panel">
              <p className="eyebrow">KAJ POTREBUJEŠ</p>
              <h2>Sestavine</h2>
              <ul className="detail-list">{splitLines(selected.ingredients).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
            </section>
            <section className="detail-panel nutrition-panel">
              <p className="eyebrow">PODATKI O HRANI</p>
              <h2>Hranilne vrednosti</h2>
              <p className="detail-unit">Na 100 g</p>
              {nutritionValues.some((item) => item.value != null) ? <dl className="nutrition-list">{nutritionValues.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value ?? '—'} {item.unit}</dd></div>)}</dl> : <p className="detail-empty">Hranilne vrednosti še niso vnesene. Klikni »Uredi recept«, da jih dodaš.</p>}
            </section>
            <section className="detail-panel instructions-panel">
              <p className="eyebrow">KORAK ZA KORAKOM</p>
              <h2>Postopek priprave</h2>
              {splitLines(selected.instructions).length ? <ol className="instructions-list">{splitLines(selected.instructions).map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol> : <p className="detail-empty">Postopek še ni vnesen. Klikni »Uredi recept« in ga dopiši.</p>}
            </section>
          </div>
        </section>
      ) : (
        <>
          <section className="hero" id="top">
            <div className="hero-copy">
              <p className="eyebrow">TVOJA ZBIRKA DOBRIH OKUSOV</p>
              <h1>Kaj bo danes<br /><em>dišalo iz kuhinje?</em></h1>
              <p className="hero-text">Shrani najljubše recepte, poišči navdih in ohrani družinske klasike na enem mestu.</p>
              <div className="hero-count"><span className="count-number">{recipes.length}</span><span>shranjenih<br />receptov</span><span className="count-divider" /><span className="count-sprout">✿</span></div>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="plate"><span>✿</span><i>♥</i></div><span className="art-leaf leaf-one">✦</span><span className="art-leaf leaf-two">✿</span><span className="art-caption">dobro · domače · preprosto</span></div>
          </section>

          {(error || notice) && editingId === null && <div className={`message ${error ? 'error' : 'success'}`} role="status">{error || notice}</div>}

          <section className="workspace">
            <aside className="form-panel">
              <div className="panel-heading"><div><p className="eyebrow">DODAJ V ZBIRKO</p><h2>Nov recept</h2></div><span className="heading-icon">+</span></div>
              <p className="panel-intro">Zapiši recept, da ga boš vedno našla.</p>
              <form onSubmit={saveRecipe} className="recipe-form">
                <label htmlFor="title">Ime jedi</label>
                <input id="title" required maxLength="120" placeholder="npr. Jabolčni zavitek" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <label htmlFor="description">Kratek opis</label>
                <textarea id="description" rows="3" maxLength="500" placeholder="Kaj naredi to jed posebno?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <label htmlFor="category">Kategorija</label>
                <select id="category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">-- izberi kategorijo --</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                <label htmlFor="ingredients">Sestavine</label>
                <textarea id="ingredients" required rows="5" placeholder={'Napiši vsako sestavino v svojo vrstico\n2 jajci\n250 g moke'} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} />
                <label htmlFor="instructions">Postopek priprave</label>
                <textarea id="instructions" rows="6" placeholder={'Vsak korak napiši v svojo vrstico\n1. Segrej pečico.\n2. Zmešaj sestavine.'} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
                <div className="nutrition-fields">
                  <div><label htmlFor="caloriesPer100g">Kalorije (kcal / 100 g)</label><input id="caloriesPer100g" type="number" min="0" step="1" placeholder="npr. 180" value={form.caloriesPer100g} onChange={(e) => setForm({ ...form, caloriesPer100g: e.target.value })} /></div>
                  <div><label htmlFor="proteinPer100g">Beljakovine (g / 100 g)</label><input id="proteinPer100g" type="number" min="0" step="0.1" placeholder="npr. 5,2" value={form.proteinPer100g} onChange={(e) => setForm({ ...form, proteinPer100g: e.target.value })} /></div>
                  <div><label htmlFor="fatPer100g">Maščobe (g / 100 g)</label><input id="fatPer100g" type="number" min="0" step="0.1" placeholder="npr. 8,4" value={form.fatPer100g} onChange={(e) => setForm({ ...form, fatPer100g: e.target.value })} /></div>
                  <div><label htmlFor="fiberPer100g">Prehranske vlaknine (g / 100 g)</label><input id="fiberPer100g" type="number" min="0" step="0.1" placeholder="npr. 3,1" value={form.fiberPer100g} onChange={(e) => setForm({ ...form, fiberPer100g: e.target.value })} /></div>
                </div>
                <button className="primary-button" type="submit" disabled={busy}>{busy && !editingId ? 'Shranjujem …' : 'Dodaj recept'} <span>↗</span></button>
              </form>
              <div className="form-tip"><span>✦</span> Sestavine in korake napiši vsakega v svojo vrstico.</div>
            </aside>

            <section className="collection">
              <div className="collection-heading"><div><p className="eyebrow">IZ TVOJE KUHINJE</p><h2>Recepti <span>({recipes.length})</span></h2></div><div className="recipe-tools"><label className="tool-select-label"><span>Kategorija</span><select aria-label="Filtriraj po kategoriji" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">Vse kategorije</option>{recipes.some((recipe) => !recipe.category) && <option value="Nerazvrščeno">Nerazvrščeno</option>}{availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>{categoryFilter && <button type="button" className="text-button clear-filters" onClick={() => setCategoryFilter('')}>Počisti filter</button>}<label className="tool-select-label"><span>Razvrsti</span><select aria-label="Razvrsti recepte" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name-asc">Ime: A–Ž</option><option value="name-desc">Ime: Ž–A</option><option value="calories-asc">Kalorije: od najmanj</option><option value="calories-desc">Kalorije: od največ</option></select></label></div></div>
              {loading ? <div className="empty-state">Nalagam tvoje recepte …</div> : visibleRecipes.length === 0 ? <div className="empty-state"><span>♡</span><h3>{categoryFilter ? 'Ni zadetkov' : 'Tvoja kuharica še čaka'}</h3><p>{categoryFilter ? 'Spremeni izbrano kategorijo.' : 'Dodaj prvi recept v obrazec in začni svojo zbirko.'}</p></div> : <div className="recipe-grid">{visibleRecipes.map((recipe, index) => <article className="recipe-card" key={recipe.id}>
                <button type="button" className={`card-art art-${index % 4} card-open-button`} onClick={() => showRecipe(recipe.id)} aria-label={`Odpri recept ${recipe.title}`}><span className="card-number">RECEPT {String(index + 1).padStart(2, '0')}</span><span className="food-mark">{['✿', '❋', '✽', '❀'][index % 4]}</span><span className="card-spark">✦</span></button>
                <div className="card-content"><h3><button type="button" className="card-title-button" onClick={() => showRecipe(recipe.id)}>{recipe.title}</button></h3><span className="category-chip card-category">{recipe.category || 'Nerazvrščeno'}</span><p className="card-description">{recipe.description || 'Domač recept iz tvoje zbirke.'}</p>{recipe.caloriesPer100g != null && <p className="card-calories">{recipe.caloriesPer100g} kcal / 100 g</p>}<div className="card-bottom"><span className="ingredient-count">▤ &nbsp;{splitLines(recipe.ingredients).length} sestavin</span><div className="card-actions"><button type="button" className="text-button" onClick={() => showRecipe(recipe.id)}>Odpri recept <span>→</span></button><button type="button" className="icon-button" aria-label={`Uredi ${recipe.title}`} onClick={() => startEdit(recipe)}>✎</button><button type="button" className="icon-button delete-button" aria-label={`Izbriši ${recipe.title}`} onClick={() => deleteRecipe(recipe)}>×</button></div></div></div>
              </article>)}</div>}
            </section>
          </section>
        </>
      )}

      {editingId !== null && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) cancelEdit(); }}><section className="recipe-modal recipe-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title"><button className="modal-close" type="button" onClick={cancelEdit} aria-label="Zapri urejanje" disabled={busy}>×</button><p className="eyebrow">UREJANJE RECEPTA</p><h2 id="edit-modal-title">Uredi recept</h2><p className="modal-description">Spremeni podatke in shrani posodobljen recept.</p>{error && <div className="message error modal-error" role="alert">{error}</div>}<form onSubmit={saveRecipe} className="recipe-form recipe-edit-form"><label htmlFor="edit-title">Ime jedi</label><input id="edit-title" autoFocus required maxLength="120" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /><label htmlFor="edit-description">Kratek opis</label><textarea id="edit-description" rows="3" maxLength="500" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /><label htmlFor="edit-category">Kategorija</label><select id="edit-category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}><option value="">Izberi kategorijo</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><label htmlFor="edit-ingredients">Sestavine</label><textarea id="edit-ingredients" required rows="5" value={editForm.ingredients} onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })} /><label htmlFor="edit-instructions">Postopek priprave</label><textarea id="edit-instructions" rows="6" placeholder="Vsak korak napiši v svojo vrstico." value={editForm.instructions} onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })} /><div className="nutrition-fields"><div><label htmlFor="edit-caloriesPer100g">Kalorije (kcal / 100 g)</label><input id="edit-caloriesPer100g" type="number" min="0" step="1" value={editForm.caloriesPer100g} onChange={(e) => setEditForm({ ...editForm, caloriesPer100g: e.target.value })} /></div><div><label htmlFor="edit-proteinPer100g">Beljakovine (g / 100 g)</label><input id="edit-proteinPer100g" type="number" min="0" step="0.1" value={editForm.proteinPer100g} onChange={(e) => setEditForm({ ...editForm, proteinPer100g: e.target.value })} /></div><div><label htmlFor="edit-fatPer100g">Maščobe (g / 100 g)</label><input id="edit-fatPer100g" type="number" min="0" step="0.1" value={editForm.fatPer100g} onChange={(e) => setEditForm({ ...editForm, fatPer100g: e.target.value })} /></div><div><label htmlFor="edit-fiberPer100g">Prehranske vlaknine (g / 100 g)</label><input id="edit-fiberPer100g" type="number" min="0" step="0.1" value={editForm.fiberPer100g} onChange={(e) => setEditForm({ ...editForm, fiberPer100g: e.target.value })} /></div></div><div className="edit-modal-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Shranjujem …' : 'Shrani spremembe'} <span>↗</span></button><button className="quiet-button" type="button" onClick={cancelEdit} disabled={busy}>Prekliči</button></div></form></section></div>}

      <footer><span>✳ moja kuharica</span><span>Recepti, ki jih je vredno deliti.</span></footer>
    </main>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <main className="page-shell"><section className="recipe-page"><p className="eyebrow">TEŽAVA PRI ODPIRANJU RECEPTA</p><h1>Te strani ni bilo mogoče prikazati.</h1><p className="detail-empty">{this.state.error.message}</p><a className="back-link" href="/">Nazaj na recepte</a></section></main>;
    }
    return this.props.children;
  }
}

export default function App() {
  return <AppErrorBoundary><RecipeApp /></AppErrorBoundary>;
}
