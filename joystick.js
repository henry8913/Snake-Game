document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi del joystick
    const joystickBase = document.querySelector('.joystick-base');
    const joystickThumb = document.querySelector('.joystick-thumb');

    // Variabili per il joystick
    let isDragging = false;
    let centerX, centerY;
    let limitRadius;
    let currentDirection = null;

    // Riferimento alla variabile nextDirection dal gioco principale
    // Questa variabile è definita in game.js

    // Inizializza il joystick
    function initJoystick() {
        if (!joystickBase || !joystickThumb) return;

        // Calcola il centro del joystick
        const rect = joystickBase.getBoundingClientRect();
        centerX = rect.width / 2;
        centerY = rect.height / 2;

        // Imposta il raggio limite (80% del raggio della base)
        limitRadius = (Math.min(rect.width, rect.height) / 2) * 0.8;

        // Posiziona il thumb al centro
        resetThumbPosition();

        // Aggiungi eventi touch
        joystickBase.addEventListener('touchstart', handleTouchStart);
        joystickBase.addEventListener('touchmove', handleTouchMove);
        joystickBase.addEventListener('touchend', handleTouchEnd);

        // Aggiungi eventi mouse per il debug su desktop
        joystickBase.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // Resetta la posizione del thumb al centro
    function resetThumbPosition() {
        joystickThumb.style.transform = `translate(-50%, -50%)`;
        joystickThumb.style.left = '50%';
        joystickThumb.style.top = '50%';
    }

    // Gestione eventi touch
    function handleTouchStart(e) {
        e.preventDefault();
        isDragging = true;
    }

    function handleTouchMove(e) {
        if (!isDragging) return;
        e.preventDefault();

        const touch = e.touches[0];
        const rect = joystickBase.getBoundingClientRect();

        // Calcola la posizione relativa al centro
        const relX = touch.clientX - rect.left - centerX;
        const relY = touch.clientY - rect.top - centerY;

        moveJoystick(relX, relY);
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        isDragging = false;
        resetThumbPosition();
        currentDirection = null;
    }

    // Gestione eventi mouse (per debug)
    function handleMouseDown(e) {
        isDragging = true;
    }

    function handleMouseMove(e) {
        if (!isDragging) return;

        const rect = joystickBase.getBoundingClientRect();
        const relX = e.clientX - rect.left - centerX;
        const relY = e.clientY - rect.top - centerY;

        moveJoystick(relX, relY);
    }

    function handleMouseUp() {
        isDragging = false;
        resetThumbPosition();
        currentDirection = null;
    }

    // Muove il joystick e calcola la direzione
    function moveJoystick(relX, relY) {
        // Calcola la distanza dal centro
        const distance = Math.sqrt(relX * relX + relY * relY);

        // Limita la distanza al raggio massimo
        const limitedDistance = Math.min(distance, limitRadius);

        // Calcola l'angolo
        const angle = Math.atan2(relY, relX);

        // Calcola la nuova posizione limitata
        const limitedX = limitedDistance * Math.cos(angle);
        const limitedY = limitedDistance * Math.sin(angle);

        // Aggiorna la posizione del thumb
        joystickThumb.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;

        // Determina la direzione in base all'angolo
        determineDirection(angle, limitedDistance);
    }

    // Determina la direzione in base all'angolo
    function determineDirection(angle, distance) {
        // Converti l'angolo in gradi
        const degrees = angle * (180 / Math.PI);

        // Ignora movimenti piccoli (zona morta)
        if (distance < limitRadius * 0.3) {
            return;
        }

        // Determina la direzione in base all'angolo
        let newDirection;
        if (degrees > -45 && degrees <= 45) {
            newDirection = 'right';
        } else if (degrees > 45 && degrees <= 135) {
            newDirection = 'down';
        } else if (degrees > 135 || degrees <= -135) {
            newDirection = 'left';
        } else {
            newDirection = 'up';
        }

        // Aggiorna la direzione solo se è cambiata
        if (newDirection !== currentDirection) {
            currentDirection = newDirection;

            // Aggiorna la direzione nel gioco principale
            updateGameDirection(newDirection);
        }
    }

    // Aggiorna la direzione nel gioco principale
    function updateGameDirection(dir) {
        // Verifica che non stiamo andando nella direzione opposta
        const oppositeDirections = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };

        // Aggiorna la direzione nel gioco principale
        let currentDir = window.gameDirection || 'right';
        if (currentDir !== oppositeDirections[dir]) {
            window.gameNextDirection = dir;
        }
    }

    // Inizializza il joystick quando il DOM è caricato
    initJoystick();
});