let x = 1;
let y = 2;
let tablePot = 0;
let casino = 0;
let defaultChips = 100;

function getPriceFromProbability(probability) {
    const z = probability * 8;
    let price = x * y ** z;
    price = Math.floor(price);
    return price;
}

let sequenceLength = 3;
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const suitsObj = Object.fromEntries(suits.map(s => [s, s]));
const ranksObj = Object.fromEntries(ranks.map(r => [r, r]));

const methodActions = {
    "center": {
        "color": { "red": ["Hearts", "Diamonds"], "black": ["Clubs", "Spades"] },
        "suits": suitsObj
    },
    "corner": {
        "specific": ranksObj,
        "generic": {
            "letters": ["A", "J", "Q", "K"],
            "numbers": {
                "all numbers": ["2", "3", "4", "5", "6", "7", "8", "9", "10"],
                "high numbers": ["8", "9", "10", "J", "Q", "K"],
                "low numbers": ["2", "3", "4", "5", "6", "7"],
                "even numbers": ["2", "4", "6", "8", "10"],
                "odd numbers": ["3", "5", "7", "9"],
                "prime numbers": ["2", "3", "5", "7"]
            }
        }
    }
};
const cardMethods = generateCardMethods();

function generateCardMethods(obj = methodActions, path = [], results = []) {
    // Collect all terminal methods at this level
    let terminals = [];
    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            terminals.push({ path: [...path, key], options: value });
        } else if (typeof value === 'object' && value !== null) {
            // Recurse into nested object
            const nested = generateCardMethods(value, [...path, key], []);
            terminals = terminals.concat(nested);
        }
    }
    // Add all single methods
    results.push(...terminals);

    // If at the top level, generate all combinations of 2+ methods from different categories
    if (path.length === 0 && terminals.length > 1) {
        // Only combine methods from different top-level keys
        const byCategory = {};
        for (const t of terminals) {
            const cat = t.path[0];
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(t);
        }
        const cats = Object.keys(byCategory);
        // Generate all combinations of one method from each category (2+ categories)
        for (let i = 2; i <= cats.length; i++) {
            combineCategories(cats, i).forEach(catCombo => {
                // For each combination of categories, combine one method from each
                const methodCombos = cartesianProduct(catCombo.map(cat => byCategory[cat]));
                for (const combo of methodCombos) {
                    // Merge paths and options
                    results.push({
                        path: combo.map(m => m.path),
                        options: combo.map(m => m.options)
                    });
                }
            });
        }
    }

    // After all methods are collected, attach probability to each
    if (path.length === 0) {
        for (const method of results) {
            method.probability = getMethodProbability(method);
            method.price = getPriceFromProbability(method.probability);
        }
    }

    return results;
}

// Returns probability (0..1) that a random card matches the method constraints
function getMethodProbability(method) {
    // Build a deck
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }

    // If this is a combination method (multiple paths/options)
    if (Array.isArray(method.path) && Array.isArray(method.options) && Array.isArray(method.path[0])) {
        // All constraints must be satisfied (AND)
        return (
            deck.filter(card =>
                method.path.every((p, i) => matches(card, { path: p, options: method.options[i] }))
            ).length / deck.length
        );
    } else {
        // Single method
        return deck.filter(card => matches(card, method)).length / deck.length;
    }
}

function matches(card, m) {
    let match = true;
    const options = m.options.flat();

    if (options.some(opt => suits.includes(opt)) && !options.includes(card.suit)) match = false;
    if (options.some(opt => ranks.includes(opt)) && !options.includes(card.rank)) match = false;

    return match;
}

// Helper: get all combinations of n elements from arr
function combineCategories(arr, n, start = 0, prefix = [], out = []) {
    if (prefix.length === n) {
        out.push(prefix);
        return out;
    }
    for (let i = start; i < arr.length; i++) {
        combineCategories(arr, n, i + 1, [...prefix, arr[i]], out);
    }
    return out;
}

// Helper: cartesian product of arrays
function cartesianProduct(arrays) {
    return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [].concat(d, e))));
}

class Player {
    constructor(name, sequence = [], chips = 1000, enabled = true) {
        this.name = name;
        this.sequence = sequence;
        this.chips = chips;
        this.enabled = enabled; // new property
        this.id = Date.now() + Math.random(); // unique id
    }

    toJSON() {
        return {
            name: this.name,
            sequence: this.sequence,
            chips: this.chips,
            enabled: this.enabled, // save enabled state
            id: this.id
        };
    }

    static fromJSON(obj) {
        const player = new Player(obj.name, obj.sequence, obj.chips, obj.enabled !== false);
        player.id = obj.id;
        return player;
    }
}

function savePlayers(players) {
    localStorage.setItem('gambling_players', JSON.stringify(players.map(p => p.toJSON())));
}

function loadPlayers() {
    const data = localStorage.getItem('gambling_players');
    if (!data) return [];
    try {
        const arr = JSON.parse(data);
        return arr.map(Player.fromJSON);
    } catch {
        return [];
    }
}

let players = loadPlayers();

function renderPlayers(gameStarted = false) {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    players.forEach((player, idx) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.marginBottom = '8px';
        li.style.width = '100%';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${player.name} (${player.chips}$)`;
        nameSpan.style.flex = '1';
        if (!player.enabled) {
            nameSpan.style.opacity = '0.5';
            nameSpan.style.textDecoration = 'line-through';
        }

        // Sequence visualization
        const seqDiv = document.createElement('div');
        seqDiv.style.display = 'flex';
        seqDiv.style.gap = '8px';
        seqDiv.style.marginRight = '12px';
        if (Array.isArray(player.sequence)) {
            player.sequence.forEach(method => {
                let label;
                if (Array.isArray(method.path[0])) {
                    label = method.path.map(p => Array.isArray(p) ? p[p.length - 1] : p).join(' & ');
                } else {
                    label = method.path[method.path.length - 1];
                }
                const methodSpan = document.createElement('span');
                methodSpan.textContent = label;
                methodSpan.style.padding = '2px 8px';
                methodSpan.style.border = '1px solid #aaa';
                methodSpan.style.borderRadius = '6px';
                methodSpan.style.background = '#f8f8f8';
                seqDiv.appendChild(methodSpan);
            });
        }

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = player.enabled ? 'Disable' : 'Enable';
        toggleBtn.style.marginRight = '8px';
        toggleBtn.onclick = () => {
            player.enabled = !player.enabled;
            savePlayers(players);
            renderPlayers(gameStarted);
        };
        if (gameStarted) toggleBtn.disabled = true;

        const updateBtn = document.createElement('button');
        updateBtn.textContent = 'Update Sequence';
        updateBtn.style.marginRight = '8px';
        updateBtn.onclick = () => {
            let sequence = getSequence();
            if (sequence) {
                player.sequence = sequence;
                savePlayers(players);
                renderPlayers(gameStarted);
            }
        };
        if (gameStarted) updateBtn.disabled = true;
        li.appendChild(updateBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => {
            players = players.filter(p => p.id !== player.id);
            savePlayers(players);
            renderPlayers(gameStarted);
        };
        if (gameStarted) removeBtn.disabled = true;

        li.appendChild(nameSpan);
        li.appendChild(seqDiv);
        li.appendChild(toggleBtn);
        li.appendChild(removeBtn);
        list.appendChild(li);
    });
}

function addPlayer() {
    const name = prompt('Enter player name:');
    if (!name) return;
    let chips = defaultChips;
    const player = new Player(name.trim(), undefined, chips);
    players.push(player);
    savePlayers(players);
    renderPlayers();
}

/**
 * Returns an array of card drawing methods the user picks.
 * The length of this should be exactly `sequenceLength`.
 * @returns {Array} Array of card drawing methods.
 */
function getSequence(player = null) {
    const sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        const cardMethod = getCardMethod(player.name);
        if (player) {
            player.chips -= cardMethod.price;
            tablePot += cardMethod.price;
            updatePotDisplay();
        }
        sequence.push(cardMethod);
    }
    return sequence;
}

/**
 * Prompts the user to select a card drawing method and returns the chosen method.
 * This function is intended to be used as part of a player's sequence of card drawing methods.
 * @returns {Array} The selected card drawing method as an Array [method, probability].
 */
function getCardMethod(name = null) {
    // Sort cardMethods by ascending probability
    const sortedMethods = [...cardMethods].sort((a, b) => a.probability - b.probability);

    // Build a prompt string listing all methods with their probability
    let promptStr = `Select a card drawing method${name ? ` for ${name}` : ''}:\n`;
    sortedMethods.forEach((method, idx) => {
        // Build a readable label for the method
        let label;
        if (Array.isArray(method.path[0])) {
            // Combination method
            label = method.path.map(p => Array.isArray(p) ? p[p.length - 1] : p).join(' & ');
        } else {
            label = method.path[method.path.length - 1];
        }
        promptStr += `${idx + 1}. ${label} (${(method.price)}$)\n`;
    });
    promptStr += 'Enter number:';

    let choice;
    while (true) {
        choice = prompt(promptStr);
        if (choice === null) return null;
        const idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < sortedMethods.length) {
            const method = sortedMethods[idx];
            // Return [method, probability] as specified
            return method;
        }
        alert('Invalid choice. Please enter a valid number.');
    }
}

// Add a variable to track game state
let gameStarted = false;

function setupUI() {
    const mainContainer = document.createElement('div');
    mainContainer.id = 'main-container';
    mainContainer.style.cssText = 'width:100%;min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;background:#f4f4f4;';

    // Pot display
    const potBar = document.createElement('div');
    potBar.id = 'pot-bar';
    potBar.style.cssText = 'width:100%;text-align:center;font-size:2em;font-weight:bold;padding:12px 0 0 0;';
    potBar.innerHTML = `<span id="table-pot-display">Pot: ${tablePot}$</span>`;

    const topBar = document.createElement('div');
    topBar.id = 'top-bar';
    topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:24px 32px 0 32px;';

    const addPlayerBtn = document.createElement('button');
    addPlayerBtn.id = 'add-player-btn';
    addPlayerBtn.textContent = '+ Add New Player';
    addPlayerBtn.style.cssText = 'font-size:2em;padding:20px 40px;margin-bottom:24px;';

    const startGameBtn = document.createElement('button');
    startGameBtn.id = 'start-game-btn';
    startGameBtn.textContent = 'Start Game';
    startGameBtn.style.cssText = 'font-size:2em;padding:20px 40px;margin-bottom:24px;';

    topBar.appendChild(addPlayerBtn);
    topBar.appendChild(startGameBtn);

    const playersArea = document.createElement('div');
    playersArea.id = 'players-area';
    playersArea.style.cssText = 'flex:1;display:flex;transition:all 0.5s;';

    const playersList = document.createElement('ul');
    playersList.id = 'players-list';
    playersList.style.cssText = 'list-style:none;padding:32px 0 0 32px;margin:0;width:100%;transition:all 0.5s;';

    playersArea.appendChild(playersList);

    mainContainer.appendChild(potBar);
    mainContainer.appendChild(topBar);
    mainContainer.appendChild(playersArea);

    document.body.innerHTML = '';
    document.body.appendChild(mainContainer);
    document.getElementById('add-player-btn').onclick = addPlayer;
    document.getElementById('start-game-btn').onclick = startGameUI;
    renderPlayers();
    updatePotDisplay();
}

function updatePotDisplay() {
    const potEl = document.getElementById('table-pot-display');
    if (potEl) potEl.textContent = `Pot: ${tablePot}$`;
}

function startGameUI() {
    players.forEach(player => {
        if (player.sequence.length === 0) { player.sequence = getSequence(player); }
    });
    gameStarted = true;
    // Hide add player button
    document.getElementById('add-player-btn').style.display = 'none';
    document.getElementById('start-game-btn').style.display = 'none';
    // Move player list to the left, span half the screen
    const playersArea = document.getElementById('players-area');
    const playersList = document.getElementById('players-list');
    playersArea.style.justifyContent = 'flex-start';
    playersArea.style.width = '50%';
    playersList.style.maxWidth = '600px';
    playersList.style.minWidth = '320px';
    playersList.style.transition = 'all 0.5s';
    // Optionally, disable update/remove/toggle buttons here if needed
    renderPlayers(true);
    startSimulation();
}

function startSimulation() {
    const tableArea = document.createElement('div');
    tableArea.id = 'table-area';
    tableArea.style.cssText = 'flex:1;display:flex;align-items:flex-start;justify-content:center;padding:32px;';
    document.getElementById('players-area').appendChild(tableArea);

    // Create table
    const table = document.createElement('table');
    table.id = 'card-table';
    table.style.cssText = 'border-collapse:collapse;background:#fff;box-shadow:0 2px 12px #0002;font-size:2em;';
    tableArea.appendChild(table);

    // Helper to create empty table
    function renderTable(rows, cols) {
        table.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const td = document.createElement('td');
                td.style.cssText = 'width:80px;height:120px;border:1px solid #ccc;text-align:center;vertical-align:middle;background:#fafafa;';
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
    }
    renderTable(sequenceLength + 1, sequenceLength);

    // Card queue
    let cardGrid = Array.from({ length: sequenceLength + 1 }, () => Array(sequenceLength).fill(null));
    let currentRow = 0, currentCol = 0;

    // Helper to get a random card
    function getRandomCard() {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        return { suit, rank };
    }

    // Helper to render cardGrid into table
    function updateTable() {
        for (let r = 0; r < cardGrid.length; r++) {
            for (let c = 0; c < cardGrid[0].length; c++) {
                const td = table.rows[r].cells[c];
                const card = cardGrid[r][c];
                if (card) {
                    // Map suit names to symbols
                    const suitSymbols = {
                        "Hearts": "♥",
                        "Diamonds": "♦",
                        "Clubs": "♣",
                        "Spades": "♠"
                    };
                    td.innerHTML = `<span style="font-size:1.2em;">${card.rank}</span><br><span style="font-size:1.5em;color:${card.suit === 'Hearts' || card.suit === 'Diamonds' ? 'red' : 'black'}">${suitSymbols[card.suit]}</span>`;
                } else {
                    td.innerHTML = '';
                }
            }
        }
    }

    // Place cards every second
    function placeNextCard() {
        // Place card
        const card = getRandomCard();
        cardGrid[currentRow][currentCol] = card;
        checkWin(cardGrid, currentRow, currentCol);
        updateTable();

        // Move to next cell
        currentCol++;
        if (currentCol >= sequenceLength) {
            currentCol = 0;
            currentRow++;
        }
        // If table is full, shift up and clear last row
        if (currentRow >= sequenceLength + 1) {
            cardGrid.shift();
            cardGrid.push(Array(sequenceLength).fill(null));
            currentRow = sequenceLength;
            updateTable();
        }

        if (running) { setTimeout(placeNextCard, 1000); }
    }

    function checkWin(grid, row, col) {
        // Check if the current card matches any player's sequence
        const currentCard = grid[row][col];
        // Helper to get card at (r, c) with wrapping columns, but only if row >= 0
        function getCard(r, c) {
            if (r < 0) return null;
            c = ((c % sequenceLength) + sequenceLength) % sequenceLength;
            return grid[r][c];
        }

        const patterns = {
            "left-right": [getCard(row, col - 2), getCard(row, col - 1), currentCard].every(card => card)
                ? [getCard(row, col - 2), getCard(row, col - 1), currentCard]
                : [],
            "top-bottom": [getCard(row - 2, col), getCard(row - 1, col), currentCard].every(card => card)
                ? [getCard(row - 2, col), getCard(row - 1, col), currentCard]
                : [],
            "bottom-top": [currentCard, getCard(row - 1, col), getCard(row - 2, col)].every(card => card)
                ? [currentCard, getCard(row - 1, col), getCard(row - 2, col)]
                : [],
            "right-left": [currentCard, getCard(row, col - 1), getCard(row, col - 2)].every(card => card)
                ? [currentCard, getCard(row, col - 1), getCard(row, col - 2)]
                : [],
        };

        players.forEach(player => {
            if (!player.enabled) return; // Skip disabled players
            const sequence = player.sequence;
            Object.values(patterns).filter(list => list.length !== 0).forEach(list => {
                if (list.every((card, i) => matches(card, sequence[i]))) {
                    player.chips += Math.floor(tablePot / 2);
                    casino += Math.floor(tablePot / 2);
                    tablePot = 0;
                    players.forEach(p => {
                        p.sequence = [];
                    })
                    updatePotDisplay();
                    updateTable();
                    savePlayers(players);
                    renderPlayers(true);
                    running = false; // Stop the game
                    setTimeout(() => {
                        alert(`${player.name} wins with sequence: ${list.map(c => `${c.rank} of ${c.suit}`).join(', ')}`);
                        window.location.reload(); // Reload the page to reset the game
                    }, 0);
                }
            })
        });
    }

    updateTable();
    let running = true;
    placeNextCard();
}

window.onload = setupUI;