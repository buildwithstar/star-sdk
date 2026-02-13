/**
 * Fallback UI for leaderboard display when running outside the Star platform.
 * Renders a DOM-based modal that closely matches the native LeaderboardDisplay.
 */

import type { LeaderboardData, LeaderboardScore } from './index';

// CSS styles as a string - matches the Star platform design
const STYLES = `
  .star-lb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: star-lb-fade-in 0.3s ease-out forwards;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .star-lb-modal {
    position: relative;
    background: rgba(17, 24, 39, 0.95);
    color: white;
    padding: 24px;
    border-radius: 12px;
    width: 100%;
    max-width: 480px;
    margin: 16px;
    border: 1px solid rgba(55, 65, 81, 0.6);
    box-shadow: 0 0 40px rgba(59, 130, 246, 0.15);
    animation: star-lb-scale-in 0.2s ease-out forwards;
    overflow: hidden;
  }

  .star-lb-gradient-tl {
    position: absolute;
    top: -40px;
    left: -40px;
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .star-lb-gradient-br {
    position: absolute;
    bottom: -40px;
    right: -40px;
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .star-lb-header {
    text-align: center;
    margin-bottom: 20px;
    position: relative;
  }

  .star-lb-title {
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(to right, #3b82f6, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 8px 0;
  }

  .star-lb-subtitle {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9ca3af;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .star-lb-subtitle-star {
    color: #60a5fa;
  }

  .star-lb-divider {
    margin: 12px auto 0;
    height: 4px;
    width: 80px;
    border-radius: 2px;
    background: linear-gradient(to right, #2563eb, #9333ea);
  }

  .star-lb-preview-banner {
    background: linear-gradient(to right, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .star-lb-preview-icon {
    font-size: 16px;
  }

  .star-lb-preview-text {
    font-size: 12px;
    color: #93c5fd;
  }

  .star-lb-preview-text a {
    color: #60a5fa;
    text-decoration: underline;
  }

  .star-lb-tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .star-lb-tab {
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid #374151;
    background: rgba(17, 24, 39, 0.8);
    color: #9ca3af;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .star-lb-tab:hover {
    border-color: rgba(59, 130, 246, 0.6);
    color: white;
  }

  .star-lb-tab.active {
    background: linear-gradient(to right, #2563eb, #9333ea);
    border-color: #3b82f6;
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .star-lb-table {
    border: 1px solid rgba(55, 65, 81, 0.6);
    border-radius: 8px;
    overflow: hidden;
  }

  .star-lb-table-header {
    display: grid;
    grid-template-columns: 60px 1fr 80px;
    padding: 10px 12px;
    background: rgba(31, 41, 55, 0.5);
    font-size: 13px;
    font-weight: 500;
    color: #9ca3af;
  }

  .star-lb-table-header > div:last-child {
    text-align: right;
  }

  .star-lb-scores {
    max-height: 280px;
    overflow-y: auto;
  }

  .star-lb-row {
    display: grid;
    grid-template-columns: 60px 1fr 80px;
    padding: 12px;
    border-top: 1px solid rgba(55, 65, 81, 0.3);
    align-items: center;
    transition: background 0.2s;
  }

  .star-lb-row:hover {
    background: rgba(31, 41, 55, 0.3);
  }

  .star-lb-row.you {
    background: linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(139, 92, 246, 0.1));
    border-color: rgba(59, 130, 246, 0.3);
  }

  .star-lb-row.you .star-lb-player::after {
    content: ' (You)';
    color: #60a5fa;
    font-size: 12px;
  }

  .star-lb-rank {
    display: flex;
    align-items: center;
    padding-left: 6px;
  }

  .star-lb-medal {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .star-lb-medal.gold {
    background: linear-gradient(135deg, #fbbf24, #d97706);
    color: #1f2937;
  }

  .star-lb-medal.silver {
    background: linear-gradient(135deg, #d1d5db, #6b7280);
    color: #1f2937;
  }

  .star-lb-medal.bronze {
    background: linear-gradient(135deg, #b45309, #78350f);
    color: #fef3c7;
  }

  .star-lb-rank-num {
    color: #9ca3af;
    font-weight: 500;
    width: 28px;
    text-align: center;
  }

  .star-lb-player {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .star-lb-crown {
    color: #eab308;
    font-size: 14px;
  }

  .star-lb-score {
    text-align: right;
    font-weight: 700;
  }

  .star-lb-empty {
    padding: 40px 20px;
    text-align: center;
    color: #9ca3af;
  }

  .star-lb-empty-title {
    margin-bottom: 8px;
  }

  .star-lb-empty-subtitle {
    font-size: 14px;
  }

  .star-lb-loading {
    padding: 48px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .star-lb-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: star-lb-spin 1s linear infinite;
  }

  .star-lb-loading-text {
    color: #9ca3af;
  }

  .star-lb-error {
    background: rgba(127, 29, 29, 0.2);
    border: 1px solid rgba(153, 27, 27, 0.5);
    color: #fca5a5;
    padding: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .star-lb-buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    gap: 12px;
  }

  .star-lb-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .star-lb-btn-close {
    background: transparent;
    border: 1px solid #374151;
    color: #d1d5db;
  }

  .star-lb-btn-close:hover {
    background: rgba(55, 65, 81, 0.5);
    border-color: #4b5563;
  }

  .star-lb-btn-share {
    background: linear-gradient(to right, #2563eb, #7c3aed);
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .star-lb-btn-share:hover {
    filter: brightness(1.1);
  }

  .star-lb-btn-share.copied {
    background: #16a34a;
  }

  @keyframes star-lb-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes star-lb-scale-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes star-lb-spin {
    to { transform: rotate(360deg); }
  }
`;

let styleInjected = false;
let currentOverlay: HTMLElement | null = null;

function injectStyles(): void {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.id = 'star-leaderboard-fallback-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
  styleInjected = true;
}

function formatScore(score: number): string {
  if (score >= 1_000_000) {
    return (score / 1_000_000).toFixed(1) + 'M';
  }
  if (score >= 1_000) {
    return (score / 1_000).toFixed(1) + 'K';
  }
  return score.toLocaleString();
}

function createScoreRow(score: LeaderboardScore, index: number, isYou: boolean = false): HTMLElement {
  const row = document.createElement('div');
  row.className = `star-lb-row${isYou ? ' you' : ''}`;

  // Rank
  const rankCell = document.createElement('div');
  rankCell.className = 'star-lb-rank';

  const rank = score.rank ?? index + 1;
  if (rank <= 3) {
    const medal = document.createElement('div');
    medal.className = `star-lb-medal ${rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'}`;
    medal.textContent = String(rank);
    rankCell.appendChild(medal);
  } else {
    const rankNum = document.createElement('span');
    rankNum.className = 'star-lb-rank-num';
    rankNum.textContent = String(rank);
    rankCell.appendChild(rankNum);
  }
  row.appendChild(rankCell);

  // Player name
  const playerCell = document.createElement('div');
  playerCell.className = 'star-lb-player';

  if (rank === 1) {
    const crown = document.createElement('span');
    crown.className = 'star-lb-crown';
    crown.textContent = '👑';
    playerCell.appendChild(crown);
  }

  const name = document.createElement('span');
  name.textContent = score.playerName || 'Anonymous';
  playerCell.appendChild(name);
  row.appendChild(playerCell);

  // Score
  const scoreCell = document.createElement('div');
  scoreCell.className = 'star-lb-score';
  scoreCell.textContent = formatScore(score.score);
  row.appendChild(scoreCell);

  return row;
}

export interface FallbackUIOptions {
  gameId: string | null;
  getScores: (opts?: { timeframe?: 'weekly' | 'all_time' }) => Promise<LeaderboardData>;
  share?: (opts?: { score?: number }) => Promise<{ success: boolean; shareUrl?: string }>;
}

export function showFallbackUI(options: FallbackUIOptions): void {
  // Close any existing overlay
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }

  injectStyles();

  let activeTab: 'weekly' | 'all_time' = 'weekly';
  let isLoading = true;
  let error: string | null = null;
  let scores: LeaderboardScore[] = [];
  let youEntry: LeaderboardScore | null = null;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'star-lb-overlay';
  currentOverlay = overlay;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeFallbackUI();
    }
  });

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'star-lb-modal';
  modal.addEventListener('click', (e) => e.stopPropagation());

  // Gradient decorations
  const gradientTL = document.createElement('div');
  gradientTL.className = 'star-lb-gradient-tl';
  modal.appendChild(gradientTL);

  const gradientBR = document.createElement('div');
  gradientBR.className = 'star-lb-gradient-br';
  modal.appendChild(gradientBR);

  // Header
  const header = document.createElement('div');
  header.className = 'star-lb-header';
  header.innerHTML = `
    <h2 class="star-lb-title">Leaderboard</h2>
    <div class="star-lb-subtitle">
      <span class="star-lb-subtitle-star">★</span>
      <span>High Scores</span>
      <span class="star-lb-subtitle-star">★</span>
    </div>
    <div class="star-lb-divider"></div>
  `;
  modal.appendChild(header);

  // No banner for external SDK - it's a production-ready leaderboard

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'star-lb-tabs';

  const weeklyTab = document.createElement('button');
  weeklyTab.className = 'star-lb-tab active';
  weeklyTab.textContent = 'Weekly';
  weeklyTab.addEventListener('click', () => switchTab('weekly'));

  const allTimeTab = document.createElement('button');
  allTimeTab.className = 'star-lb-tab';
  allTimeTab.textContent = 'All-Time';
  allTimeTab.addEventListener('click', () => switchTab('all_time'));

  tabs.appendChild(weeklyTab);
  tabs.appendChild(allTimeTab);
  modal.appendChild(tabs);

  // Content container
  const content = document.createElement('div');
  content.className = 'star-lb-content';
  modal.appendChild(content);

  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'star-lb-buttons';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'star-lb-btn star-lb-btn-close';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeFallbackUI);
  buttons.appendChild(closeBtn);

  const shareBtn = document.createElement('button');
  shareBtn.className = 'star-lb-btn star-lb-btn-share';
  shareBtn.innerHTML = '📤 Share';
  shareBtn.addEventListener('click', handleShare);
  buttons.appendChild(shareBtn);

  modal.appendChild(buttons);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Functions
  function switchTab(tab: 'weekly' | 'all_time') {
    activeTab = tab;
    weeklyTab.className = `star-lb-tab ${tab === 'weekly' ? 'active' : ''}`;
    allTimeTab.className = `star-lb-tab ${tab === 'all_time' ? 'active' : ''}`;
    loadScores();
  }

  function renderContent() {
    content.innerHTML = '';

    if (isLoading) {
      content.innerHTML = `
        <div class="star-lb-loading">
          <div class="star-lb-spinner"></div>
          <span class="star-lb-loading-text">Loading high scores...</span>
        </div>
      `;
      return;
    }

    if (error) {
      content.innerHTML = `
        <div class="star-lb-error">
          <span>⚠️</span>
          <span>${error}</span>
        </div>
      `;
      return;
    }

    const table = document.createElement('div');
    table.className = 'star-lb-table';

    const tableHeader = document.createElement('div');
    tableHeader.className = 'star-lb-table-header';
    tableHeader.innerHTML = `
      <div>Rank</div>
      <div>Player</div>
      <div>Score</div>
    `;
    table.appendChild(tableHeader);

    const scoresContainer = document.createElement('div');
    scoresContainer.className = 'star-lb-scores';

    if (scores.length === 0) {
      scoresContainer.innerHTML = `
        <div class="star-lb-empty">
          <p class="star-lb-empty-title">No scores yet</p>
          <p class="star-lb-empty-subtitle">Be the first to make the leaderboard!</p>
        </div>
      `;
    } else {
      // Highlight "you" using the API's youEntry (matched by playerName for guests)
      scores.forEach((score, index) => {
        const isYou = youEntry !== null && score.id === youEntry.id;
        scoresContainer.appendChild(createScoreRow(score, index, isYou));
      });
    }

    table.appendChild(scoresContainer);
    content.appendChild(table);
  }

  async function loadScores() {
    isLoading = true;
    error = null;
    renderContent();

    try {
      const data = await options.getScores({ timeframe: activeTab });
      scores = data.scores || [];
      youEntry = data.you || null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load scores';
      scores = [];
      youEntry = null;
    } finally {
      isLoading = false;
      renderContent();
    }
  }

  async function handleShare() {
    if (!options.share) {
      // Fallback: copy game URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        shareBtn.innerHTML = '✓ Copied!';
        shareBtn.classList.add('copied');
        setTimeout(() => {
          shareBtn.innerHTML = '📤 Share';
          shareBtn.classList.remove('copied');
        }, 2000);
      } catch {
        // Ignore clipboard errors
      }
      return;
    }

    try {
      const result = await options.share();
      if (result.success && result.shareUrl) {
        await navigator.clipboard.writeText(result.shareUrl);
        shareBtn.innerHTML = '✓ Copied!';
        shareBtn.classList.add('copied');
        setTimeout(() => {
          shareBtn.innerHTML = '📤 Share';
          shareBtn.classList.remove('copied');
        }, 2000);
      }
    } catch {
      // Ignore errors
    }
  }

  // Initial load
  loadScores();
}

export function closeFallbackUI(): void {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

export function isFallbackUIOpen(): boolean {
  return currentOverlay !== null;
}
