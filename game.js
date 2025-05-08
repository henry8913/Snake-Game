document.addEventListener('DOMContentLoaded', () => {
    // Game canvas setup
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    // Make canvas responsive
    function resizeCanvas() {
        // Maintain aspect ratio
        const container = document.querySelector('.game-container');
        const containerWidth = container.clientWidth - 30; // Accounting for padding
        const maxWidth = 400;
        
        if (containerWidth < maxWidth) {
            const scale = containerWidth / canvas.width;
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = (canvas.height * scale) + 'px';
        } else {
            canvas.style.width = '';
            canvas.style.height = '';
        }
    }
    
    // Initial resize and add event listener for window resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Game constants
    const gridSize = 20;
    const gridWidth = canvas.width / gridSize;
    const gridHeight = canvas.height / gridSize;
    
    // Game variables
    let snake = [
        {x: 10, y: 10}
    ];
    let food = generateFood();
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let gameSpeed = 150; // milliseconds
    let gameInterval;
    let gameRunning = false;
    let particles = [];
    let powerUp = null;
    let powerUpActive = false;
    let powerUpTimer = 0;
    let powerUpType = null;
    let lastFoodPos = null;
    let gameTheme = 'classic'; // classic, neon, retro
    let highScores = loadHighScores();
    
    // DOM elements
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('start-btn');
    const resetButton = document.getElementById('reset-btn');
    const themeSelector = document.getElementById('theme-selector');
    const highScoresList = document.getElementById('high-scores-list');
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', resetGame);
    document.addEventListener('keydown', handleKeyPress);
    
    // Touch controls
    const touchUp = document.getElementById('touch-up');
    const touchDown = document.getElementById('touch-down');
    const touchLeft = document.getElementById('touch-left');
    const touchRight = document.getElementById('touch-right');
    
    // Add touch event listeners
    if (touchUp) touchUp.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'down') nextDirection = 'up';
    });
    
    if (touchDown) touchDown.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'up') nextDirection = 'down';
    });
    
    if (touchLeft) touchLeft.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'right') nextDirection = 'left';
    });
    
    if (touchRight) touchRight.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'left') nextDirection = 'right';
    });
    
    // Swipe controls
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    canvas.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, false);
    
    function handleSwipe(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        
        // Determine if the swipe was horizontal or vertical
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0 && direction !== 'left') {
                nextDirection = 'right';
            } else if (dx < 0 && direction !== 'right') {
                nextDirection = 'left';
            }
        } else {
            // Vertical swipe
            if (dy > 0 && direction !== 'up') {
                nextDirection = 'down';
            } else if (dy < 0 && direction !== 'down') {
                nextDirection = 'up';
            }
        }
    }
    
    // Theme selector event listener
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            gameTheme = e.target.value;
            drawGame();
        });
    }
    
    // Initialize game display
    drawGame();
    updateHighScoresDisplay();
    
    // Game functions
    function startGame() {
        if (!gameRunning) {
            gameRunning = true;
            startButton.textContent = 'Pause';
            gameInterval = setInterval(gameLoop, gameSpeed);
        } else {
            gameRunning = false;
            startButton.textContent = 'Resume';
            clearInterval(gameInterval);
        }
    }
    
    function resetGame() {
        clearInterval(gameInterval);
        snake = [{x: 10, y: 10}];
        direction = 'right';
        nextDirection = 'right';
        score = 0;
        scoreElement.textContent = score;
        food = generateFood();
        gameRunning = false;
        startButton.textContent = 'Start Game';
        particles = [];
        powerUp = null;
        powerUpActive = false;
        powerUpTimer = 0;
        powerUpType = null;
        drawGame();
    }
    
    function handleKeyPress(e) {
        // Prevent default action for arrow keys
        if ([37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
        }
        
        // Update direction based on key press
        switch (e.keyCode) {
            case 37: // Left arrow
                if (direction !== 'right') nextDirection = 'left';
                break;
            case 38: // Up arrow
                if (direction !== 'down') nextDirection = 'up';
                break;
            case 39: // Right arrow
                if (direction !== 'left') nextDirection = 'right';
                break;
            case 40: // Down arrow
                if (direction !== 'up') nextDirection = 'down';
                break;
        }
    }
    
    function gameLoop() {
        moveSnake();
        if (checkCollision()) {
            gameOver();
            return;
        }
        checkFoodCollision();
        updateParticles();
        updatePowerUp();
        drawGame();
    }
    
    function moveSnake() {
        // Update direction
        direction = nextDirection;
        
        // Create new head based on direction
        const head = Object.assign({}, snake[0]);
        
        switch (direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }
        
        // Add new head to beginning of snake array
        snake.unshift(head);
        
        // Remove tail unless food was eaten
        const headPos = snake[0];
        if (headPos.x !== food.x || headPos.y !== food.y) {
            snake.pop();
        }
    }
    
    function checkCollision() {
        const head = snake[0];
        
        // If invincible, no collision with walls or self
        if (powerUpActive && powerUpType === 'invincible') {
            // Wrap around for walls
            if (head.x < 0) head.x = gridWidth - 1;
            if (head.x >= gridWidth) head.x = 0;
            if (head.y < 0) head.y = gridHeight - 1;
            if (head.y >= gridHeight) head.y = 0;
            return false;
        }
        
        // Check wall collision
        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
            return true;
        }
        
        // Check self collision (start from index 1 to avoid checking head against itself)
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        
        return false;
    }
    
    function checkFoodCollision() {
        const head = snake[0];
        
        if (head.x === food.x && head.y === food.y) {
            // Save last food position for particle effect
            lastFoodPos = {x: food.x, y: food.y};
            
            // Create particle effect
            createFoodParticles(food.x, food.y);
            
            // Increase score
            score += 10;
            scoreElement.textContent = score;
            
            // Generate new food
            food = generateFood();
            
            // Chance to spawn power-up
            if (Math.random() < 0.2 && !powerUp && !powerUpActive) {
                spawnPowerUp();
            }
            
            // Increase speed slightly every 50 points
            if (score % 50 === 0 && gameSpeed > 50) {
                gameSpeed -= 10;
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, gameSpeed);
            }
        }
        
        // Check power-up collision
        if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
            activatePowerUp();
        }
    }
    
    function generateFood() {
        let newFood;
        let foodOnSnake;
        
        // Keep generating until food is not on snake
        do {
            foodOnSnake = false;
            newFood = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight)
            };
            
            // Check if food is on snake
            for (let segment of snake) {
                if (segment.x === newFood.x && segment.y === newFood.y) {
                    foodOnSnake = true;
                    break;
                }
            }
        } while (foodOnSnake);
        
        return newFood;
    }
    
    function gameOver() {
        clearInterval(gameInterval);
        gameRunning = false;
        startButton.textContent = 'Start Game';
        
        // Create explosion particles at snake head
        createExplosionParticles(snake[0].x, snake[0].y);
        
        // Check if score is a high score
        const isHighScore = checkHighScore(score);
        
        // Display game over message with animation
        let opacity = 0;
        const fadeIn = setInterval(() => {
            opacity += 0.05;
            if (opacity >= 0.75) {
                clearInterval(fadeIn);
                opacity = 0.75;
            }
            
            // Clear and redraw game
            drawGame();
            
            // Draw particles on top
            drawParticles();
            
            // Draw game over overlay
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = '30px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 15);
            
            ctx.font = '20px Arial';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
            
            // Show high score message if applicable
            if (isHighScore) {
                ctx.fillStyle = '#FFC107'; // Gold color
                ctx.font = '22px Arial';
                ctx.fillText('Nuovo Record!', canvas.width / 2, canvas.height / 2 + 50);
            }
            
            // Show top 3 high scores
            ctx.font = '16px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText('Punteggi Migliori:', canvas.width / 2, canvas.height / 2 + 80);
            
            highScores.slice(0, 3).forEach((highScore, index) => {
                ctx.fillText(`${index + 1}. ${highScore}`, canvas.width / 2, canvas.height / 2 + 105 + (index * 20));
            });
        }, 50);
    }
    
    function drawGame() {
        // Apply theme styles
        let bgColor, headColor, bodyColorFn, foodColor, gridColor;
        
        switch(gameTheme) {
            case 'neon':
                bgColor = '#111';
                headColor = '#00ff00';
                bodyColorFn = (index) => `hsl(${120 - index * 2}, 100%, 50%)`;
                foodColor = '#ff00ff';
                gridColor = 'rgba(255, 255, 255, 0.05)';
                break;
            case 'retro':
                bgColor = '#382800';
                headColor = '#f8b700';
                bodyColorFn = (index) => `hsl(${40 - index * 1}, 90%, ${60 - index}%)`;
                foodColor = '#ff4301';
                gridColor = 'rgba(255, 255, 255, 0.03)';
                break;
            default: // classic
                bgColor = '#222';
                headColor = '#4CAF50';
                bodyColorFn = (index) => {
                    const colorValue = 150 - (index * 3);
                    return `rgb(0, ${Math.max(colorValue, 100)}, 0)`;
                };
                foodColor = '#FF5252';
                gridColor = 'rgba(255, 255, 255, 0.03)';
        }
        
        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw particles
        drawParticles();
        
        // Draw power-up if exists
        if (powerUp) {
            drawPowerUp();
        }
        
        // Draw snake
        snake.forEach((segment, index) => {
            // Apply glow effect for neon theme
            if (gameTheme === 'neon') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = headColor;
            } else {
                ctx.shadowBlur = 0;
            }
            
            // Head is a different color
            if (index === 0) {
                ctx.fillStyle = powerUpActive ? getPowerUpColor() : headColor;
            } else {
                // Create gradient effect for body
                ctx.fillStyle = bodyColorFn(index);
            }
            
            // Draw rounded snake segments
            const x = segment.x * gridSize;
            const y = segment.y * gridSize;
            const size = gridSize - 1; // Slightly smaller for spacing effect
            
            if (gameTheme === 'neon') {
                // For neon theme, draw glowing rectangles
                ctx.fillRect(x, y, size, size);
            } else {
                // For other themes, draw rounded rectangles
                roundRect(ctx, x, y, size, size, 4);
            }
            
            // Add eyes to head
            if (index === 0) {
                ctx.fillStyle = 'white';
                ctx.shadowBlur = 0;
                
                // Position eyes based on direction
                const eyeSize = gridSize / 5;
                const eyeOffset = gridSize / 3;
                
                if (direction === 'right' || direction === 'left') {
                    // Eyes on top for horizontal movement
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + eyeOffset + (eyeSize/2), 
                           (segment.y * gridSize) + eyeOffset + (eyeSize/2), 
                           eyeSize/2, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + eyeOffset + (eyeSize/2), 
                           (segment.y * gridSize) + (2 * eyeOffset) + (eyeSize/2), 
                           eyeSize/2, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Add pupils
                    ctx.fillStyle = 'black';
                    const pupilOffset = direction === 'right' ? eyeSize/4 : -eyeSize/4;
                    
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + eyeOffset + (eyeSize/2) + pupilOffset, 
                           (segment.y * gridSize) + eyeOffset + (eyeSize/2), 
                           eyeSize/4, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + eyeOffset + (eyeSize/2) + pupilOffset, 
                           (segment.y * gridSize) + (2 * eyeOffset) + (eyeSize/2), 
                           eyeSize/4, 0, 2 * Math.PI);
                    ctx.fill();
                } else {
                    // Eyes on sides for vertical movement
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + eyeOffset + (eyeSize/2), 
                           (segment.y * gridSize) + eyeOffset + (eyeSize/2), 
                           eyeSize/2, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + (2 * eyeOffset) + (eyeSize/2), 
                           (segment.y * gridSize) + eyeOffset + (eyeSize/2), 
                           eyeSize/2, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Add pupils
                    ctx.fillStyle = 'black';
                    const pupilOffset = direction === 'down' ? eyeSize/4 : -eyeSize/4;
                    
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + eyeOffset + (eyeSize/2), 
                           (segment.y * gridSize) + eyeOffset + (eyeSize/2) + pupilOffset, 
                           eyeSize/4, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc((segment.x * gridSize) + (2 * eyeOffset) + (eyeSize/2), 
                           (segment.y * gridSize) + eyeOffset + (eyeSize/2) + pupilOffset, 
                           eyeSize/4, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        });
        
        // Reset shadow for other elements
        ctx.shadowBlur = 0;
        
        // Draw food with pulsating effect
        const pulseSize = Math.sin(Date.now() / 200) * 2;
        ctx.fillStyle = foodColor;
        
        if (gameTheme === 'neon') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = foodColor;
        }
        
        ctx.beginPath();
        const centerX = (food.x * gridSize) + (gridSize / 2);
        const centerY = (food.y * gridSize) + (gridSize / 2);
        const radius = (gridSize / 2) - 2 + pulseSize;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add shine to food
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(centerX - radius/3, centerY - radius/3, radius/4, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Helper function for rounded rectangles
    function roundRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fill();
    }
    
    // Particle system
    function createFoodParticles(x, y) {
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: (x * gridSize) + (gridSize / 2),
                y: (y * gridSize) + (gridSize / 2),
                size: Math.random() * 4 + 2,
                color: gameTheme === 'neon' ? '#ff00ff' : '#FF5252',
                speedX: (Math.random() - 0.5) * 3,
                speedY: (Math.random() - 0.5) * 3,
                life: 20
            });
        }
    }
    
    function createExplosionParticles(x, y) {
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: (x * gridSize) + (gridSize / 2),
                y: (y * gridSize) + (gridSize / 2),
                size: Math.random() * 5 + 3,
                color: i % 2 === 0 ? '#FF5252' : '#FFC107',
                speedX: (Math.random() - 0.5) * 6,
                speedY: (Math.random() - 0.5) * 6,
                life: 30
            });
        }
    }
    
    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].x += particles[i].speedX;
            particles[i].y += particles[i].speedY;
            particles[i].life--;
            
            // Remove dead particles
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }
    }
    
    function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
    
    // Power-up system
    function spawnPowerUp() {
        let newPowerUp;
        let powerUpOnSnake;
        
        // Keep generating until power-up is not on snake
        do {
            powerUpOnSnake = false;
            newPowerUp = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight),
                type: getRandomPowerUpType()
            };
            
            // Check if power-up is on snake or food
            for (let segment of snake) {
                if ((segment.x === newPowerUp.x && segment.y === newPowerUp.y) ||
                    (food.x === newPowerUp.x && food.y === newPowerUp.y)) {
                    powerUpOnSnake = true;
                    break;
                }
            }
        } while (powerUpOnSnake);
        
        powerUp = newPowerUp;
    }
    
    function getRandomPowerUpType() {
        const types = ['speed', 'slow', 'invincible'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    function drawPowerUp() {
        const x = powerUp.x * gridSize;
        const y = powerUp.y * gridSize;
        const pulseSize = Math.sin(Date.now() / 150) * 2;
        
        // Different colors for different power-up types
        switch(powerUp.type) {
            case 'speed':
                ctx.fillStyle = '#FFC107'; // Yellow
                break;
            case 'slow':
                ctx.fillStyle = '#2196F3'; // Blue
                break;
            case 'invincible':
                ctx.fillStyle = '#9C27B0'; // Purple
                break;
        }
        
        if (gameTheme === 'neon') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.fillStyle;
        }
        
        // Draw star shape
        const centerX = x + gridSize / 2;
        const centerY = y + gridSize / 2;
        const spikes = 5;
        const outerRadius = gridSize / 2 - 2 + pulseSize;
        const innerRadius = outerRadius / 2;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes - Math.PI / 2;
            const pointX = centerX + radius * Math.cos(angle);
            const pointY = centerY + radius * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(pointX, pointY);
            } else {
                ctx.lineTo(pointX, pointY);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    function activatePowerUp() {
        powerUpActive = true;
        powerUpType = powerUp.type;
        powerUpTimer = 200; // Duration in game ticks
        
        // Apply power-up effect
        const originalSpeed = gameSpeed;
        
        switch(powerUpType) {
            case 'speed':
                gameSpeed = Math.max(50, gameSpeed - 50);
                break;
            case 'slow':
                gameSpeed = gameSpeed + 50;
                break;
            case 'invincible':
                // Invincibility is handled in checkCollision
                break;
        }
        
        // Update game interval with new speed
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
        
        // Remove power-up from board
        powerUp = null;
    }
    
    function updatePowerUp() {
        if (powerUpActive) {
            powerUpTimer--;
            
            if (powerUpTimer <= 0) {
                // Reset power-up effects
                powerUpActive = false;
                
                // Reset speed if it was a speed power-up
                if (powerUpType === 'speed' || powerUpType === 'slow') {
                    // Calculate what the speed should be based on current score
                    const scoreBasedSpeed = 150 - (Math.floor(score / 50) * 10);
                    gameSpeed = Math.max(50, scoreBasedSpeed);
                    
                    clearInterval(gameInterval);
                    gameInterval = setInterval(gameLoop, gameSpeed);
                }
                
                powerUpType = null;
            }
        }
    }
    
    function getPowerUpColor() {
        switch(powerUpType) {
            case 'speed':
                return '#FFC107';
            case 'slow':
                return '#2196F3';
            case 'invincible':
                return '#9C27B0';
            default:
                return '#4CAF50';
        }
    }
    
    // High scores functions
    function loadHighScores() {
        const scores = localStorage.getItem('snakeHighScores');
        return scores ? JSON.parse(scores) : [0, 0, 0, 0, 0];
    }
    
    function saveHighScores() {
        localStorage.setItem('snakeHighScores', JSON.stringify(highScores));
    }
    
    function checkHighScore(score) {
        // Check if current score is higher than any existing high score
        const lowestHighScore = Math.min(...highScores);
        if (score > lowestHighScore || highScores.length < 5) {
            // Add new score to high scores array
            highScores.push(score);
            // Sort in descending order
            highScores.sort((a, b) => b - a);
            // Keep only top 5 scores
            if (highScores.length > 5) {
                highScores = highScores.slice(0, 5);
            }
            // Save to localStorage
            saveHighScores();
            // Update display
            updateHighScoresDisplay();
            return true;
        }
        return false;
    }
    
    function updateHighScoresDisplay() {
        // Update high scores in the sidebar if the element exists
        if (highScoresList) {
            highScoresList.innerHTML = '';
            highScores.slice(0, 5).forEach((score, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}. ${score}`;
                highScoresList.appendChild(li);
            });
        }
    }
});