import { regular as C } from './constants.js';
import { Snake } from './snake.js';

class SnakeGame {

    // Graphic Elements
    canvas;
    canvasElem;
    // Flag to show instructions
    isFirstGame = true;
    // Default settings, you can change them on start
    defaultSettings = {
        cols: 18,
        rows: 10,
        size: 20
    };
    // Init State and Settings
    state = {};
    settings = {};

    constructor(htmlId, settings) {

        // Establishing settings
        Object.keys(this.defaultSettings)
        .forEach((key) => {
            this.settings[key] = settings[key] || this.defaultSettings[key];
        });
        this.snake = new Snake(this.settings.rows, this.settings.cols);

        // Getting Canvas Element and adjusting it to the approppriate size
        this.canvasElem = document.getElementById(htmlId);
        this.canvas = this.canvasElem.getContext('2d');
        this.__adjustGrid(this.canvasElem);
        this.__addListeners();

        // Prepare board for new game
        this.new();
    }

    __adjustGrid(elem) {
        const { cols, rows, size } = this.settings;
        elem.width = `${cols*size}`;
        elem.height = `${rows*size}`;
    }

    __addListeners() {
        const { snake } = this;
        document.addEventListener('keydown', (ev) => {
            let move = false;
            switch (ev.key) {
                case 'ArrowUp':   case 'W': case 'w': move = snake.coords.NORTH; break;
                case 'ArrowDown': case 'S': case 's': move = snake.coords.SOUTH; break;
                case 'ArrowLeft': case 'A': case 'a': move = snake.coords.WEST;  break;
                case 'ArrowRight':case 'D': case 'd': move = snake.coords.EAST;  break;
                                  case 'N': case 'n': this.new(); break;
                                             default: break;
            }
            if (move && this.state.snake) {
                ev.preventDefault();
                if (!this.state.snake.running && !this.state.snake.lost)
                    this.start();
                this.snake.queue(move);
            }
        });
    }

    /**
     * HELPERS FOR GFX
     **/
    __updateScore() {
        const getElem = (id) => document.getElementById(id)
        const level = getElem('level'),
              points = getElem('points'),
              apples = getElem('apples');

        level.innerHTML = this.state.snake.level;
        points.innerHTML = this.state.snake.score;
        apples.innerHTML = this.state.snake.apples;
    }

    __drawCircle(x, y, color) {
        const { canvas, settings } = this;
        canvas.fillStyle = color;
        canvas.beginPath();
        canvas.arc((x*settings.size)+(settings.size/2), (y*settings.size)+(settings.size/2), settings.size/2, 0, 2*Math.PI);
        canvas.fill();
    }

    __drawSquare( x, y, color) {
        const { canvas, settings } = this;
        canvas.fillStyle = color
        canvas.fillRect(x*settings.size, y*settings.size, settings.size, settings.size)
    }

    __drawTextRectangle() {
        const { canvas, settings, canvasElem: elem } = this;
        canvas.fillStyle = C.colors.gray;
        canvas.globalAlpha = 0.75;
        canvas.fillRect(settings.size*4, settings.size*4, elem.width - settings.size*8, elem.height - settings.size*8);
        canvas.globalAlpha = 1;
    }

    __drawText(sentence, x, y, font, color) {
        const { canvas, settings, canvasElem: elem } = this;
        canvas.font = font;
        canvas.textAlign = "start";
        canvas.fillStyle = color;
        canvas.fillText(sentence, settings.size*x, settings.size*y);
    }

    drawInstructions() {
        this.__drawTextRectangle();
        this.__drawText(C.sentences.howto.title, 8, 6.5, C.fonts.title, C.colors.red);
        this.__drawText(C.sentences.howto.line1, 6, 8.5, C.fonts.line, C.colors.lite);
        this.__drawText(C.sentences.howto.line2, 6, 10, C.fonts.line, C.colors.lite);
    }

    drawGameOver(reason) {
        this.__drawTextRectangle();
        this.__drawText(C.sentences.over.title, 8.5, 6.5, C.fonts.title, C.colors.red);
        this.__drawText(C.sentences.over.line1, 7, 8.5, C.fonts.line2, C.colors.lite);
        this.__drawText(`${C.sentences.over.line2}${reason}`, 6.8, 10, C.fonts.line2, C.colors.lite);
    }

    /**
     * GAME INTERNALS
     **/
    __reset() {
        this.state = {};
    }

    new() {
        this.snake.reset();
        this.state = {
            ...this.state,
            snake: this.snake.data
        };
        window.requestAnimationFrame(this.clear.bind(this));
        window.requestAnimationFrame(this.update.bind(this));
        if (this.isFirstGame) {
            // Give time to load the font
            setTimeout(() => window.requestAnimationFrame(this.drawInstructions.bind(this)), 200)
        }
    }

    start() {
        this.isFirstGame = this.isFirstGame ? !this.isFirstGame : !!this.isFirstGame;
        this.snake.start();
        window.requestAnimationFrame(this.clear.bind(this));
        window.requestAnimationFrame(this.step.call(this, 0));
    }

    clear() {
        this.canvas.fillStyle = C.colors.black;
        this.canvas.fillRect(0, 0, this.canvasElem.width, this.canvasElem.height);
    }

    end(reason) {
        this.drawGameOver(reason);
        this.__reset();
    }

    /**
     * UPDATE AND STEP - WHERE THE MAGIC HAPPENS
     **/

    update() {
        const { snake } = this.state;
        const edibles = snake && snake.edibles || {};
        let head = snake && snake.updates.head || false,
            tail = snake && snake.updates.tail || false;

        if (!head && !tail && snake?.dots.length >= 1)
            snake.dots.forEach((dot) => this.__drawSquare(dot.x, dot.y, C.colors.green))

        if (edibles.apple)
            this.__drawCircle(edibles.apple.x, edibles.apple.y, C.colors.red);

        if (edibles.virus)
            this.__drawSquare(edibles.virus.x, edibles.virus.y, C.colors.blue)

        if (head)
            this.__drawSquare(head.x, head.y, C.colors.green)
        if (tail)
            this.__drawSquare(tail.x, tail.y, C.colors.black)

        this.__updateScore();
    }

    step = (then) => async (now) => {
        if (this.state.snake.running) {
            if (now - then > (250 - this.snake.data.level*20) || this.snake.data.processing) {
                const data = await this.snake.next();
                this.state = {
                    ...this.state,
                    snake: data
                };
                this.update();
                window.requestAnimationFrame(this.step(now));
            } else {
                window.requestAnimationFrame(this.step(then))
            }
        } else {
            this.end(this.state.snake.endReason)
            window.cancelAnimationFrame(null);
        }
    }
}

const game = new SnakeGame("game", { rows: 16, cols: 30, size: 15 });