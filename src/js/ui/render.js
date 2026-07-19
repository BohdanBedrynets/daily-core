import { formatHistoryDate, getDateKey } from "../services/date.service.js";
import { buildDaySummary, getTasksForDate } from "../services/day.service.js";
import { getGoalPercentage } from "../services/goals.service.js";
import { formatDuration } from "../services/time.service.js";

function taskRow(task, checked, onChange) {
  const label=document.createElement("label"); label.className="task-row";
  const input=document.createElement("input"); input.type="checkbox"; input.checked=checked; input.addEventListener("change",()=>onChange(task.id,input.checked));
  const text=document.createElement("span"); text.textContent=task.label; label.append(input,text); return label;
}
export function renderTaskList(container,tasks,checks,onChange){container.innerHTML="";tasks.forEach(t=>container.append(taskRow(t,Boolean(checks[t.id]),onChange)));}
export function renderBonusGroups(container,groups,checks,onChange){container.innerHTML="";groups.forEach(g=>{const card=document.createElement("article");card.className="bonus-card";const h=document.createElement("h3");h.textContent=g.title;card.append(h);g.tasks.forEach(t=>card.append(taskRow(t,Boolean(checks[t.id]),onChange)));container.append(card);});}
export function renderStatistics(container,categories){container.innerHTML="";categories.forEach(item=>{const w=document.createElement("div");w.className="category-stat";w.innerHTML=`<div class="category-stat__top"><span class="category-stat__name">${item.category}</span><span class="category-stat__value">${item.percentage}% · ${item.completed}/${item.total}</span></div><div class="progress-track"><div class="progress-bar" style="width:${item.percentage}%"></div></div>`;container.append(w);});}
export function renderHistory(container,state,onOpen){container.innerHTML="";const days=Object.values(state.days).filter(d=>d.date<getDateKey()).sort((a,b)=>b.date.localeCompare(a.date));if(!days.length){container.innerHTML='<div class="empty-state">Історія поки порожня.</div>';return;}days.forEach(day=>{const s=day.finalized&&day.summary?day.summary:buildDaySummary(day,state.bonusGroups);const card=document.createElement("button");card.className="history-card history-card--button";card.innerHTML=`<div class="history-card__top"><p class="history-card__date">${formatHistoryDate(day.date)}</p><span class="history-card__result ${s.closed?'history-card__result--done':'history-card__result--missed'}">${s.closed?'День закритий':'День не закритий'}</span></div><div class="history-card__meta"><span class="history-chip">Ядро: ${s.completedRequired}/${s.totalRequired}</span><span class="history-chip">Бонусів: ${s.bonusCount}</span>${day.note?'<span class="history-chip">Є нотатка</span>':''}</div>`;card.addEventListener("click",()=>onOpen(day.date));container.append(card);});}
export function renderDayDetails(container,day,state){container.innerHTML="";const timeSection=document.createElement("section");timeSection.className="detail-section";timeSection.innerHTML=`<h3>Облік часу</h3><div class="detail-time-grid"><div class="detail-time-item"><span>Кар’єра</span><strong>${formatDuration(day.time?.career||0)}</strong></div><div class="detail-time-item"><span>Німецька</span><strong>${formatDuration(day.time?.german||0)}</strong></div></div>`;container.append(timeSection);const tasks=getTasksForDate(day.date,state.bonusGroups);const sections=[['Кар’єра',tasks.career],['Німецька',tasks.german],['Тіло',tasks.body],['Гігієна — ранок',tasks.hygiene.morning],['Гігієна — вечір',tasks.hygiene.evening],['Бонуси',tasks.bonusTasks.filter(t=>day.checks[t.id])]];sections.forEach(([title,list])=>{const section=document.createElement("section");section.className="detail-section";section.innerHTML=`<h3>${title}</h3>`;if(!list.length)section.insertAdjacentHTML('beforeend','<p class="muted">Нічого не виконано.</p>');list.forEach(t=>section.insertAdjacentHTML('beforeend',`<p class="detail-task ${day.checks[t.id]?'done':'missed'}">${day.checks[t.id]?'✓':'×'} ${t.label}</p>`));container.append(section);});const note=document.createElement("section");note.className="detail-section";note.innerHTML=`<h3>Нотатка</h3><p class="detail-note">${day.note?.trim()||'Нотатки немає.'}</p>`;container.append(note);}
export function renderGoals(container,goals,onUpdate,onDelete){container.innerHTML="";if(!goals.length){container.innerHTML='<div class="empty-state">Цілей поки немає.</div>';return;}goals.forEach(goal=>{const p=getGoalPercentage(goal);const card=document.createElement("article");card.className="goal-card";card.innerHTML=`<div class="goal-head"><h3>${goal.title}</h3><button class="icon-button goal-delete" title="Видалити">×</button></div><div class="goal-values"><strong>${goal.current} / ${goal.target}</strong><span>${p}%</span></div><div class="progress-track"><div class="progress-bar" style="width:${p}%"></div></div><div class="goal-controls"><button class="button button--secondary goal-minus">−1</button><input class="goal-current-input" type="number" min="0" value="${goal.current}"><button class="button button--secondary goal-plus">+1</button></div>`;card.querySelector('.goal-delete').onclick=()=>onDelete(goal.id);card.querySelector('.goal-minus').onclick=()=>onUpdate(goal.id,Math.max(0,Number(goal.current)-1));card.querySelector('.goal-plus').onclick=()=>onUpdate(goal.id,Number(goal.current)+1);card.querySelector('.goal-current-input').onchange=e=>onUpdate(goal.id,Math.max(0,Number(e.target.value)||0));container.append(card);});}
export function renderBonusEditor(container,groups,handlers){container.innerHTML="";groups.forEach(group=>{const card=document.createElement("div");card.className="bonus-editor-group";card.innerHTML=`<div class="bonus-editor-head"><input class="group-title-input" value="${group.title}"><button class="icon-button delete-group" title="Видалити категорію">×</button></div><div class="bonus-editor-tasks"></div><form class="inline-form"><input maxlength="120" placeholder="Нове бонусне завдання" required><button class="button button--secondary">Додати</button></form>`;card.querySelector('.group-title-input').onchange=e=>handlers.renameGroup(group.id,e.target.value);card.querySelector('.delete-group').onclick=()=>handlers.deleteGroup(group.id);const list=card.querySelector('.bonus-editor-tasks');group.tasks.forEach(task=>{const row=document.createElement('div');row.className='editor-task-row';row.innerHTML=`<input value="${task.label}"><button class="icon-button">×</button>`;row.querySelector('input').onchange=e=>handlers.renameTask(group.id,task.id,e.target.value);row.querySelector('button').onclick=()=>handlers.deleteTask(group.id,task.id);list.append(row);});card.querySelector('form').onsubmit=e=>{e.preventDefault();const input=e.currentTarget.querySelector('input');handlers.addTask(group.id,input.value);input.value='';};container.append(card);});}

export function renderMonthlyTimeStats(container, byMonth){container.innerHTML="";const entries=Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0]));if(!entries.length){container.innerHTML='<div class="empty-state">Час ще не зафіксовано.</div>';return;}entries.forEach(([month,values])=>{const [year,monthNumber]=month.split("-").map(Number);const title=new Intl.DateTimeFormat("uk-UA",{month:"long",year:"numeric"}).format(new Date(year,monthNumber-1,1));const row=document.createElement("div");row.className="month-time-row";row.innerHTML=`<strong>${title}</strong><span class="month-time-value">Кар’єра: ${formatDuration(values.career||0)}</span><span class="month-time-value">Німецька: ${formatDuration(values.german||0)}</span>`;container.append(row);});}

function formatAchievementValue(value, unit) {
  if (unit === "time") return formatDuration(value);
  return `${Math.floor(value)} ${unit}`;
}

export function renderAchievements(container, groups) {
  container.innerHTML = "";
  groups.forEach(group => {
    const section = document.createElement("section");
    section.className = "achievement-group";
    const title = document.createElement("h3");
    title.textContent = group.title;
    const grid = document.createElement("div");
    grid.className = "achievement-grid";
    group.achievements.forEach(item => {
      const card = document.createElement("article");
      card.className = `achievement-card${item.unlockedAt ? " is-unlocked" : ""}`;
      const date = item.unlockedAt
        ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(item.unlockedAt))
        : null;
      card.innerHTML = `
        <div class="achievement-icon" aria-hidden="true">${item.unlockedAt ? "✓" : "◻"}</div>
        <div>
          <h4 class="achievement-title">${item.title}</h4>
          <p class="achievement-description">${item.description}</p>
          ${item.unlockedAt
            ? `<p class="achievement-meta achievement-unlocked">Отримано ${date}</p>`
            : `<div class="achievement-progress"><div class="achievement-progress__labels"><span>${formatAchievementValue(Math.min(item.current, item.target), item.unit)}</span><strong>${formatAchievementValue(item.target, item.unit)}</strong></div><div class="progress-track"><div class="progress-bar" style="width:${item.percentage}%"></div></div></div>`}
        </div>`;
      grid.append(card);
    });
    section.append(title, grid);
    container.append(section);
  });
}


function annualFormatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return hours ? `${hours} год ${minutes} хв` : `${minutes} хв`;
}

export function renderAnnualReport(container, report) {
  const maxClosed = Math.max(1, ...report.months.map(month => month.closedDays));
  const maxTime = Math.max(1, ...report.months.map(month => month.career + month.german));
  const bestMonthText = report.bestMonth
    ? `${report.bestMonth.name}: ${report.bestMonth.closedDays} закритих днів`
    : "Ще немає даних";

  container.innerHTML = `
    <article class="annual-cover card">
      <p class="eyebrow">Ядро дня · особистий підсумок</p>
      <h2>${report.year}</h2>
      <p>${report.totalDays ? `Зафіксовано ${report.totalDays} днів. Це звіт про фактичну траєкторію, а не про ідеальний план.` : "За цей рік даних поки немає."}</p>
    </article>

    <section class="annual-kpi-grid">
      <article class="annual-kpi"><span>Закрито днів</span><strong>${report.closedDays}</strong><small>${report.completionRate}% від зафіксованих</small></article>
      <article class="annual-kpi"><span>Найдовша серія</span><strong>${report.longestStreak}</strong><small>днів поспіль</small></article>
      <article class="annual-kpi"><span>Фокусний час</span><strong>${annualFormatDuration(report.totalFocusedTime)}</strong><small>Кар’єра + Німецька</small></article>
      <article class="annual-kpi"><span>Бонусні справи</span><strong>${report.totalBonuses}</strong><small>виконано за рік</small></article>
    </section>

    <section class="annual-split-grid">
      <article class="card annual-highlight"><p class="annual-label">Кар’єра</p><strong>${annualFormatDuration(report.totalTime.career)}</strong><p>Час, вкладений у програмування, проєкти та професійний розвиток.</p></article>
      <article class="card annual-highlight"><p class="annual-label">Німецька</p><strong>${annualFormatDuration(report.totalTime.german)}</strong><p>Час, вкладений у навчання, читання, відео та практику мови.</p></article>
      <article class="card annual-highlight"><p class="annual-label">Найкращий місяць</p><strong>${bestMonthText}</strong><p>Визначається спочатку за закритими днями, потім за часом і бонусами.</p></article>
    </section>

    <article class="card annual-chart-card">
      <div class="section-heading"><div><h2>Ритм року</h2><p>Закриті дні та загальний фокусний час за місяцями.</p></div></div>
      <div class="annual-month-chart">
        ${report.months.map(month => `
          <div class="annual-month-row">
            <strong>${month.name}</strong>
            <div class="annual-month-bars">
              <div class="annual-bar-line"><span>Дні</span><div class="annual-bar-track"><i style="width:${Math.round(month.closedDays / maxClosed * 100)}%"></i></div><b>${month.closedDays}</b></div>
              <div class="annual-bar-line annual-bar-line--time"><span>Час</span><div class="annual-bar-track"><i style="width:${Math.round((month.career + month.german) / maxTime * 100)}%"></i></div><b>${annualFormatDuration(month.career + month.german)}</b></div>
            </div>
          </div>`).join("")}
      </div>
    </article>

    <section class="annual-bottom-grid">
      <article class="card"><h2>Виконання ядра</h2><p class="card-note">Частка виконаних обов’язкових завдань за напрямами.</p>
        <div class="category-stats">${report.categoryStats.map(item => `<div class="category-stat"><div class="category-stat__top"><span class="category-stat__name">${item.category}</span><span class="category-stat__value">${item.percentage}% · ${item.completed}/${item.total}</span></div><div class="progress-track"><div class="progress-bar" style="width:${item.percentage}%"></div></div></div>`).join("")}</div>
      </article>
      <article class="card"><h2>Додатковий підсумок</h2><div class="annual-facts">
        <p><span>Досягнень отримано цього року</span><strong>${report.unlockedAchievements}</strong></p>
        <p><span>Цілей завершено зараз</span><strong>${report.completedGoals}</strong></p>
        <p><span>Днів із нотатками</span><strong>${report.notesCount}</strong></p>
      </div></article>
    </section>

    <p class="annual-generated">Звіт сформовано ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(report.generatedAt)}</p>`;
}
