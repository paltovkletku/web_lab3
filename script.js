const SIZE = 4;
const STORAGE_KEY = 'game2048_state';
const UNDO_KEY = 'game2048_undo';
const LEADERS_KEY = 'game2048_leaders';

// элементы со страницы
const gameContainer = document.getElementById('gameContainer');
const gridEl = gameContainer.querySelector('.grid');
const tilesLayer = gameContainer.querySelector('.tiles-layer');
const scoreEl = document.getElementById('score');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const leaderBtn = document.getElementById('leaderBtn');

// управление на телефонах
const mobileControls = document.getElementById('mobileControls');
const upBtn = document.getElementById('upBtn');
const leftBtn = document.getElementById('leftBtn');
const downBtn = document.getElementById('downBtn');
const rightBtn = document.getElementById('rightBtn');

// модалки
const gameOverModal = document.getElementById('gameOverModal');
const modalMessage = document.getElementById('modalMessage');
const saveRow = document.getElementById('saveRow');
const playerNameInput = document.getElementById('playerName');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const modalRestartBtn = document.getElementById('modalRestartBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

const leaderboardModal = document.getElementById('leaderboardModal');
const leadersTableBody = document.querySelector('#leadersTable tbody');
const closeLeadersBtn = document.getElementById('closeLeadersBtn');
const clearLeadersBtn = document.getElementById('clearLeadersBtn');

// состояние игры
let grid = [];
let score = 0;
let gameOver = false;
let undoState = null;
let tileIdCounter = 1;
let isMobileDevice = false;

// тип устройства 
function checkDeviceType() {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  
  isMobileDevice = (isMobileUA && hasTouch) || hasCoarsePointer;
  return isMobileDevice;
}

function updateMobileControls() {
  const modalsOpen = !gameOverModal.classList.contains('hidden') || 
                     !leaderboardModal.classList.contains('hidden');
  
  if (isMobileDevice && !modalsOpen) {
    mobileControls.classList.add('visible');
    mobileControls.classList.remove('hidden');
  } else {
    mobileControls.classList.remove('visible');
    mobileControls.classList.add('hidden');
  }
}

function createEmptyGrid() {
  const newGrid = [];
  for (let i = 0; i < SIZE; i++) {
    newGrid.push(new Array(SIZE).fill(0));
  }
  return newGrid;
}

function copyGrid(originalGrid) {
  return originalGrid.map(row => row.slice());
}

function saveGame() {
  const state = { grid, score, gameOver };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('Не удалось сохранить игру');
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    
    const state = JSON.parse(saved);
    grid = state.grid;
    score = state.score || 0;
    gameOver = !!state.gameOver;
    return true;
  } catch (e) {
    return false;
  }
}

function saveForUndo() {
  undoState = { grid: copyGrid(grid), score, gameOver };
  try {
    localStorage.setItem(UNDO_KEY, JSON.stringify(undoState));
  } catch (e) {}
}

function loadForUndo() {
  try {
    const saved = localStorage.getItem(UNDO_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

function getLeaders() {
  try {
    const saved = localStorage.getItem(LEADERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveLeadersList(leaders) {
  try {
    localStorage.setItem(LEADERS_KEY, JSON.stringify(leaders));
  } catch (e) {}
}

function addToLeaders(name, playerScore) {
  const leaders = getLeaders();
  leaders.push({ 
    name: name || 'Игрок', 
    score: playerScore, 
    date: new Date().toISOString() 
  });
  
  leaders.sort((a, b) => b.score - a.score);
  const topLeaders = leaders.slice(0, 10);
  
  saveLeadersList(topLeaders);
}

function createGrid() {
  gridEl.replaceChildren();
  
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;
      gridEl.appendChild(cell);
    }
  }
}

function rotateGameGrid(gameGrid) {
  const rotated = createEmptyGrid();
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      rotated[col][SIZE - 1 - row] = gameGrid[row][col];
    }
  }
  return rotated;
}

function processRow(row) {
  const originalRow = row.slice();
  const nonZero = row.filter(cell => cell !== 0);
  const newRow = [];
  let pointsGained = 0;
  let hasMoved = false;
  let skipNext = false;
  
  for (let i = 0; i < nonZero.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const mergedValue = nonZero[i] * 2;
      newRow.push(mergedValue);
      pointsGained += mergedValue;
      skipNext = true;
      hasMoved = true;
    } else {
      newRow.push(nonZero[i]);
    }
  }
  
  while (newRow.length < SIZE) {
    newRow.push(0);
  }
  
  for (let i = 0; i < SIZE; i++) {
    if (newRow[i] !== originalRow[i]) {
      hasMoved = true;
      break;
    }
  }
  
  return { newRow, pointsGained, hasMoved };
}

function moveLeft(gameGrid) {
  let totalMoved = false;
  let totalPoints = 0;
  const newGrid = createEmptyGrid();
  
  for (let row = 0; row < SIZE; row++) {
    const result = processRow(gameGrid[row]);
    totalPoints += result.pointsGained;
    if (result.hasMoved) totalMoved = true;
    newGrid[row] = result.newRow;
  }
  
  return { grid: newGrid, moved: totalMoved, gained: totalPoints };
}

function moveRight(gameGrid) {
  const reversed = gameGrid.map(row => row.slice().reverse());
  const result = moveLeft(reversed);
  const restored = result.grid.map(row => row.slice().reverse());
  return { grid: restored, moved: result.moved, gained: result.gained };
}

function moveUp(gameGrid) {
  const rotated = rotateGameGrid(rotateGameGrid(rotateGameGrid(gameGrid)));
  const result = moveLeft(rotated);
  const restored = rotateGameGrid(result.grid);
  return { grid: restored, moved: result.moved, gained: result.gained };
}

function moveDown(gameGrid) {
  const rotated = rotateGameGrid(gameGrid);
  const result = moveLeft(rotated);
  const restored = rotateGameGrid(rotateGameGrid(rotateGameGrid(result.grid)));
  return { grid: restored, moved: result.moved, gained: result.gained };
}

function canMove(gameGrid) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (gameGrid[row][col] === 0) return true;
    }
  }
  
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE - 1; col++) {
      if (gameGrid[row][col] === gameGrid[row][col + 1]) return true;
    }
  }
  
  for (let col = 0; col < SIZE; col++) {
    for (let row = 0; row < SIZE - 1; row++) {
      if (gameGrid[row][col] === gameGrid[row + 1][col]) return true;
    }
  }
  
  return false;
}

function addNewTiles(gameGrid, count = 1) {
  const emptyCells = [];
  
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (gameGrid[row][col] === 0) {
        emptyCells.push({ row, col });
      }
    }
  }
  
  if (emptyCells.length === 0) return gameGrid;
  
  const tilesToAdd = Math.min(count, emptyCells.length);
  const usedIndexes = [];
  
  while (usedIndexes.length < tilesToAdd) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    if (!usedIndexes.includes(randomIndex)) {
      usedIndexes.push(randomIndex);
      const position = emptyCells[randomIndex];
      const value = Math.random() < 0.9 ? 2 : 4;
      gameGrid[position.row][position.col] = value;
    }
  }
  
  return gameGrid;
}

function getTileSize() {
  const gridRect = gridEl.getBoundingClientRect();
  const gap = 12;
  const cellSize = (gridRect.width - gap * (SIZE + 1)) / SIZE;
  return { cellSize, gap };
}

function getFontSize(value, cellSize) {
  let size = cellSize * 0.4;
  if (value >= 1024) size = cellSize * 0.3;
  else if (value >= 128) size = cellSize * 0.35;
  return Math.max(12, Math.min(32, size));
}

function drawGrid(previousGrid = null) {
  scoreEl.textContent = String(score);
  tilesLayer.replaceChildren();
  const { cellSize, gap } = getTileSize();

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = grid[row][col];
      if (value === 0) continue;
      
      const tile = document.createElement('div');
      tile.classList.add('tile', 'v' + value);
      tile.textContent = String(value);
      tile.style.width = `${cellSize}px`;
      tile.style.height = `${cellSize}px`;
      tile.style.left = `${gap + col * (cellSize + gap)}px`;
      tile.style.top = `${gap + row * (cellSize + gap)}px`;
      tile.style.fontSize = `${getFontSize(value, cellSize)}px`;
      tile.style.lineHeight = `${cellSize}px`;
      tile.dataset.row = row;
      tile.dataset.col = col;
      tile.dataset.val = value;
      tile.dataset.key = `${row}-${col}-${value}-${tileIdCounter++}`;

      if (previousGrid) {
        const wasEmpty = (previousGrid[row][col] === 0);
        const wasMerged = (previousGrid[row][col] !== 0 && value === previousGrid[row][col] * 2);
        if (wasEmpty) tile.classList.add('new');
        else if (wasMerged) tile.classList.add('merge');
      } else {
        tile.classList.add('new');
      }

      tilesLayer.appendChild(tile);
    }
  }
}

function startNewGame() {
  grid = createEmptyGrid();
  score = 0;
  gameOver = false;
  const initialTiles = Math.floor(Math.random() * 2) + 2;
  addNewTiles(grid, initialTiles);
  saveForUndo();
  saveGame();
  drawGrid();
  hideGameOverModal();
  updateMobileControls();
}

function makeMove(direction) {
  if (gameOver) return false;
  const oldGrid = copyGrid(grid);
  saveForUndo();
  let result;
  if (direction === 'left') result = moveLeft(grid);
  else if (direction === 'right') result = moveRight(grid);
  else if (direction === 'up') result = moveUp(grid);
  else if (direction === 'down') result = moveDown(grid);
  else return false;
  if (!result.moved) return false;
  grid = result.grid;
  score += result.gained;
  addNewTiles(grid, Math.random() < 0.25 ? 2 : 1);
  if (!canMove(grid)) {
    gameOver = true;
    showGameOverModal();
  }
  saveGame();
  drawGrid(oldGrid);
  updateMobileControls();
  return true;
}

function undoMove() {
  if (gameOver) return;
  const previousState = loadForUndo();
  if (!previousState) {
    return;
  }
  grid = previousState.grid;
  score = previousState.score;
  gameOver = previousState.gameOver;
  saveGame();
  drawGrid();
  updateMobileControls();
}

function showGameOverModal() {
  modalMessage.textContent = `Игра окончена — ваш счёт: ${score}`;
  saveRow.classList.remove('hidden');
  playerNameInput.value = '';
  playerNameInput.style.display = '';
  saveScoreBtn.style.display = '';
  gameOverModal.classList.remove('hidden');
  updateMobileControls();
}

function hideGameOverModal() {
  gameOverModal.classList.add('hidden');
  updateMobileControls();
}

function showLeaderboard() {
  const leaders = getLeaders();
  leadersTableBody.replaceChildren();
  leaders.forEach((player, index) => {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td'); 
    numberCell.textContent = String(index + 1);
    const nameCell = document.createElement('td'); 
    nameCell.textContent = player.name;
    const scoreCell = document.createElement('td'); 
    scoreCell.textContent = String(player.score);
    const dateCell = document.createElement('td'); 
    dateCell.textContent = new Date(player.date).toLocaleString();
    row.appendChild(numberCell); row.appendChild(nameCell); 
    row.appendChild(scoreCell); row.appendChild(dateCell);
    leadersTableBody.appendChild(row);
  });
  leaderboardModal.classList.remove('hidden');
  updateMobileControls();
}

function hideLeaderboard() {
  leaderboardModal.classList.add('hidden');
  updateMobileControls();
}

function initializeGame() {
  checkDeviceType();
  createGrid();
  const loaded = loadGame();
  if (!loaded) startNewGame();
  else {
    if (!grid || grid.length !== SIZE) startNewGame();
    else drawGrid();
  }
  undoState = loadForUndo();
  updateMobileControls();
}

saveScoreBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Игрок';
  addToLeaders(name, score);
  playerNameInput.style.display = 'none';
  saveScoreBtn.style.display = 'none';
  modalMessage.textContent = 'Ваш рекорд сохранён';
});

modalRestartBtn.addEventListener('click', () => {
  hideGameOverModal();
  startNewGame();
});

modalCloseBtn.addEventListener('click', hideGameOverModal);

leaderBtn.addEventListener('click', showLeaderboard);
closeLeadersBtn.addEventListener('click', hideLeaderboard);

clearLeadersBtn.addEventListener('click', () => {
  saveLeadersList([]);
  showLeaderboard();
});

newGameBtn.addEventListener('click', startNewGame);
undoBtn.addEventListener('click', undoMove);

upBtn.addEventListener('click', () => makeMove('up'));
leftBtn.addEventListener('click', () => makeMove('left'));
downBtn.addEventListener('click', () => makeMove('down'));
rightBtn.addEventListener('click', () => makeMove('right'));

window.addEventListener('keydown', (event) => {
  if (!leaderboardModal.classList.contains('hidden')) return;
  if (gameOver && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
  if (event.key === 'ArrowLeft') { makeMove('left'); event.preventDefault(); }
  else if (event.key === 'ArrowRight') { makeMove('right'); event.preventDefault(); }
  else if (event.key === 'ArrowUp') { makeMove('up'); event.preventDefault(); }
  else if (event.key === 'ArrowDown') { makeMove('down'); event.preventDefault(); }
});

window.addEventListener('resize', () => { drawGrid(); });
window.addEventListener('orientationchange', () => { setTimeout(() => { drawGrid(); }, 300); });
window.addEventListener('beforeunload', () => { saveGame(); try { localStorage.setItem(UNDO_KEY, JSON.stringify(undoState)); } catch(e){} });

document.addEventListener('DOMContentLoaded', initializeGame);
