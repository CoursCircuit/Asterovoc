/* © CoursCircuit. Tableau des équipes et choix des bonus. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const node = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  class TeamsUI {
    constructor(callbacks) { this.callbacks = callbacks; this.cards = new Map(); this.ticketId = null; this.kind = 'freeze'; }
    configure(model) {
      this.cards.clear(); const board = $('teamScoreboard'); board.replaceChildren(); board.hidden = !model.teams.length;
      board.style.setProperty('--team-count', String(model.teams.length));
      model.teams.forEach(team => {
        const card = node('div', 'team-card'); card.style.setProperty('--team-color', team.color); card.dataset.teamId = String(team.id);
        const identity = node('div', 'team-identity'), name = node('span', 'team-name', team.name); name.title = team.name; identity.append(node('b', 'team-number', String(team.id)), name);
        const score = node('strong', 'team-score', '0'), status = node('span', 'team-status');
        card.append(identity, score, status); board.append(card); this.cards.set(team.id, { card, score, status });
      });
    }
    render(model) {
      model.teams.forEach(team => {
        const ui = this.cards.get(team.id); if (!ui) return;
        if (ui.score.textContent !== String(team.score)) ui.score.textContent = String(team.score);
        const frozen = team.frozenUntil > model.clock, fast = team.acceleratedUntil > model.clock;
        const remaining = frozen ? Math.ceil(team.frozenUntil - model.clock) : fast ? Math.ceil(team.acceleratedUntil - model.clock) : 0;
        ui.card.classList.toggle('frozen', frozen); ui.card.classList.toggle('accelerated', fast && !frozen);
        const toBonus = model.settings.bonusEvery - team.correct % model.settings.bonusEvery;
        const status = frozen ? `Gelée · ${remaining} s` : fast ? `Accélérée · ${remaining} s` : model.settings.teamBonuses ? `Bonus dans ${toBonus} réussite${toBonus > 1 ? 's' : ''}` : `${team.correct} validé${team.correct > 1 ? 's' : ''} · ${team.missed} manqué${team.missed > 1 ? 's' : ''}`;
        if (ui.status.textContent !== status) ui.status.textContent = status;
        ui.card.setAttribute('aria-label', `${team.name}, équipe ${team.id}, ${team.score} point${Math.abs(team.score) === 1 ? '' : 's'}. ${status}`);
      });
    }
    choose(model) {
      const ticket = model.nextBonus; if (!ticket) return;
      if (this.ticketId !== ticket.id) { this.ticketId = ticket.id; this.kind = 'freeze'; }
      const actor = model.team(ticket.actorId), dialog = $('bonusDialog');
      $('bonusTitle').textContent = `Bonus pour ${actor.name}`; $('bonusIntro').textContent = `${actor.correct} astéroïdes validés ! Choisissez un bonus, puis l’équipe adverse.`;
      dialog.style.setProperty('--team-color', actor.color);
      dialog.dataset.teamId = String(actor.id);
      const choices = $('bonusChoices'); choices.replaceChildren();
      const acceleration = window.AsterovocMission.BONUS_TYPES.accelerate;
      const definitions = [['freeze', 'Geler', '5 secondes · mots et commandes figés', 'snow'], ['steal', 'Voler des points', 'Jusqu’à 3 points disponibles', 'steal'], ['accelerate', 'Accélérer', `${acceleration.duration} secondes · chute × ${String(acceleration.factor).replace('.', ',')}`, 'fast']];
      definitions.forEach(([kind, title, detail, symbol]) => {
        const b = node('button', 'bonus-choice' + (kind === this.kind ? ' active' : '')); b.type = 'button'; b.dataset.bonus = kind;
        b.setAttribute('aria-pressed', String(kind === this.kind)); b.append(node('span', 'bonus-symbol ' + symbol, kind === 'freeze' ? '❄' : kind === 'steal' ? '⇄' : '»'), node('strong', '', title), node('small', '', detail));
        b.disabled = kind === 'steal' && !model.teams.some(t => t.id !== actor.id && t.score > 0);
        b.addEventListener('click', () => { this.kind = kind; this.choose(model); choices.querySelector(`[data-bonus="${kind}"]`)?.focus(); }); choices.append(b);
      });
      const targets = $('bonusTargets'); targets.replaceChildren();
      model.teams.filter(t => t.id !== actor.id).forEach(team => {
        const b = node('button', 'bonus-target'); b.type = 'button'; b.style.setProperty('--target-color', team.color); b.dataset.targetTeam = String(team.id);
        b.append(node('b', 'team-number', String(team.id)), node('span', '', team.name), node('small', '', `${team.score} point${Math.abs(team.score) === 1 ? '' : 's'}`));
        b.disabled = this.kind === 'steal' && team.score <= 0;
        b.setAttribute('aria-label', `${this.kind === 'freeze' ? 'Geler' : this.kind === 'steal' ? 'Voler des points à' : 'Accélérer'} ${team.name}`);
        b.addEventListener('click', () => this.callbacks.apply(actor.id, this.kind, team.id)); targets.append(b);
      });
      if (!dialog.open) { dialog.showModal(); choices.querySelector('button:not(:disabled)')?.focus(); }
    }
    close() { if ($('bonusDialog').open) $('bonusDialog').close(); this.ticketId = null; }
  }
  window.AsterovocTeams = { TeamsUI };
})();
