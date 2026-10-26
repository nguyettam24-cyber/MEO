/**
 * GAME BẮN SÚNG - HTML5 Canvas
 * Điều khiển: ← ↑ ↓ → hoặc W A S D
 * Bắn: Phím cách (SPACE) hoặc nhấn chuột
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Kích thước game
canvas.width = 800;
canvas.height = 600;

// Trạng thái game
const GAME_STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER'
};

let gameState = GAME_STATE.MENU;

// Điểm số & mạng
let score = 0;
let highScore = 0;
let lives = 3;

// Thời gian
let lastTime = 0;
let enemySpawnTimer = 0;
const ENEMY_SPAWN_INTERVAL = 900; // ms

// Danh sách đối tượng
let bullets = [];
let enemies = [];
let particles = [];

// Input
const keys = {};
const mouse = { x: 0, y: 0, isDown: false };

// DOM elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');
const highScoreEl = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud = document.getElementById('hud');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Load high score từ localStorage
if (localStorage.getItem('shootingGameHighScore')) {
    highScore = parseInt(localStorage.getItem('shootingGameHighScore'), 10);
}

// ==================== CLASSES ====================

class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 70;
        this.speed = 6;
        this.lives = 3;
        this.invulnerable = 0;
        this.shootCooldown = 0;
    }

    update() {
        if ((keys['ArrowLeft'] || keys['a'] || keys['A']) && this.x > 0) {
            this.x -= this.speed;
        }
        if ((keys['ArrowRight'] || keys['d'] || keys['D']) && this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
        if ((keys['ArrowUp'] || keys['w'] || keys['W']) && this.y > 0) {
            this.y -= this.speed;
        }
        if ((keys['ArrowDown'] || keys['s'] || keys['S']) && this.y < canvas.height - this.height) {
            this.y += this.speed;
        }

        if (mouse.isDown && this.shootCooldown <= 0) {
            this.shoot();
        }

        if (keys[' '] && this.shootCooldown <= 0) {
            this.shoot();
            keys[' '] = false;
        }

        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
    }

    shoot() {
        bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y, -10, '#00ffff', 'player'));
        this.shootCooldown = 15;
    }

    draw() {
        if (this.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }

        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    getCenter() {
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }
}

class Bullet {
    constructor(x, y, speedY, color, type) {
        this.x = x;
        this.y = y;
        this.speedY = speedY;
        this.color = color;
        this.type = type;
        this.width = 4;
        this.height = 12;
        this.active = true;
    }

    update() {
        this.y += this.speedY;
        if (this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

const player = new Player();

class Enemy {
    constructor() {
        this.width = 40;
        this.height = 30;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = 2 + Math.random() * 3;
        this.color = '#ff4444';
        this.active = true;
        this.shootTimer = 60 + Math.random() * 120;
    }

    update() {
        this.y += this.speed;

        if (this.y > canvas.height) {
            this.active = false;
            lives--;
            updateHUD();
            if (lives <= 0) {
                gameOver();
            }
        }

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            bullets.push(new Bullet(
                this.x + this.width / 2 - 2,
                this.y + this.height,
                5,
                '#ff4444',
                'enemy'
            ));
            this.shootTimer = 80 + Math.random() * 100;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        this.active = true;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        if (this.life <= 0) this.active = false;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function spawnEnemy() {
    enemies.push(new Enemy());
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function updateHUD() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
}

function startGame() {
    score = 0;
    lives = 3;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 70;
    player.invulnerable = 60;
    bullets = [];
    enemies = [];
    particles = [];
    enemySpawnTimer = 0;
    gameState = GAME_STATE.PLAYING;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    updateHUD();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = GAME_STATE.GAMEOVER;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('shootingGameHighScore', highScore);
    }
    finalScoreEl.textContent = 'Điểm: ' + score;
    highScoreEl.textContent = 'Cao nhất: ' + highScore;

    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function resetInput() {
    for (let key in keys) keys[key] = false;
    mouse.isDown = false;
}

// ==================== INPUT ====================

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.code === 'Space') {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousedown', () => {
    mouse.isDown = true;
});

canvas.addEventListener('mouseup', () => {
    mouse.isDown = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Ngăn cuộn trang khi nhấn phím
window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
    }
});

// ==================== GAME LOOP ====================

function gameLoop(timestamp) {
    if (gameState !== GAME_STATE.PLAYING) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }

    player.update();

    bullets.forEach(b => b.update());
    bullets = bullets.filter(b => b.active);

    enemies.forEach(e => e.update());
    enemies = enemies.filter(e => e.active);

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.active);

    // Va chạm: đạn.player vs địch
    bullets.forEach(b => {
        if (b.type !== 'player') return;
        enemies.forEach(e => {
            if (!e.active) return;
            if (checkCollision({x:b.x, y:b.y, width:b.width, height:b.height}, e)) {
                b.active = false;
                e.active = false;
                score += 10;
                createExplosion(e.x + e.width/2, e.y + e.height/2, e.color);
                updateHUD();
            }
        });
    });

    // Va chạm: đạn.enemy vs player
    bullets.forEach(b => {
        if (b.type !== 'enemy') return;
        if (player.invulnerable > 0) return;
        if (checkCollision({x:b.x, y:b.y, width:b.width, height:b.height},
                           {x:player.x, y:player.y, width:player.width, height:player.height})) {
            b.active = false;
            lives--;
            player.invulnerable = 120;
            createExplosion(player.x + player.width/2, player.y + player.height/2, '#ffffff');
            updateHUD();
            if (lives <= 0) {
                gameOver();
            }
        }
    });

    // Va chạm: địch va trực tiếp vào player
    enemies.forEach(e => {
        if (player.invulnerable > 0) return;
        if (checkCollision({x:e.x, y:e.y, width:e.width, height:e.height},
                           {x:player.x, y:player.y, width:player.width, height:player.height})) {
            e.active = false;
            lives--;
            player.invulnerable = 120;
            createExplosion(player.x + player.width/2, player.y + player.height/2, '#ffffff');
            updateHUD();
            if (lives <= 0) {
                gameOver();
            }
        }
    });

    // Vẽ
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) {
        const x = (i * 97) % canvas.width;
        const y = (i * 131) % canvas.height;
        ctx.fillRect(x, y, 1.5, 1.5);
    }

    player.draw();
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    particles.forEach(p => p.draw());

    requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {});
