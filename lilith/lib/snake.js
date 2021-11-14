export class Snake {

    coords = {
        NORTH: { x: 0, y:-1 },
        SOUTH: { x: 0, y: 1 },
        WEST:  { x:-1, y: 0 },
        EAST:  { x: 1, y: 0 }
    };

    MAX_LEVEL = 10;

    data = {};

    constructor(rows, cols) {
        this.tile = { rows, cols }
        this.reset();
    }

    reset = async () => {
        this.data = {
            rows: this.tile.rows,
            cols: this.tile.cols
        };
        await this.__setup();
    }

    __setup = async() => {
        this.data = {
            ...this.data,
            score: 0,
            apples: 0,
            level: 0,
            running: false,
            dots: [{ x: Math.floor(this.tile.cols/2 - 1), y: Math.floor(this.tile.rows/2 - 1) }],
            direction: false,
            processing: false,
            updates: {},
            edibles: {}
        };
        this.data.edibles = {
            "apple": await this.__getNewEdible(),
            "virus": await this.__getNewEdible(),
        };
    }

    getModHead = (x, y) =>
        ((y % x) + x) % x

    hasSameCoords = (item1, item2) =>
        item1 && item2 && item1.x === item2.x && item1.y === item2.y

    hasHitWall = ({ x , y }) =>
        (x >= this.data.cols || x < 0) || (y >= this.data.rows || y < 0)

    hasHitBody = (pos) =>
        this.data.dots.filter(dot => this.hasSameCoords(dot, pos)).length >= 1

    hasDiffDirection = ({ x , y })  =>
        this.data.direction.x + x != 0 || this.data.direction.y + y != 0

    getNextHead = ({ x, y }) =>
        ({ x: this.data.canCross ? this.getModHead(this.data.cols, x + this.data.direction.x) :  x + this.data.direction.x,
           y: this.data.canCross ? this.getModHead(this.data.rows, y + this.data.direction.y) :  y + this.data.direction.y })

    __getNewEdible() {
        const randish = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
        const edible = { x: randish(0, this.data.cols - 1), y: randish(0, this.data.rows - 1) };

        return new Promise(resolve => {
            const isInSnake = this.data.dots.filter((item) => this.hasSameCoords(item, edible));
            const isInEdible = Object.keys(this.data.edibles).filter(key => this.hasSameCoords(this.data.edibles[key], edible)) || [];
            if (isInSnake.length === 0 && isInEdible.length === 0)
                resolve(edible);
            else
                resolve(this.__getNewEdible());
        })
    }

    queue(move) {
        if (!this.hasSameCoords(move, this.data.direction) && this.hasDiffDirection(move) && !this.data.processing) {
            this.data.direction = move;
            this.data.processing = true;
        }
    }

    start() {
        this.data.running = true;
    }

    end(reason) {
        console.error("GAME OVER", reason)
        return {
            ...this.data,
            endReason: reason,
            running: false
        };
    }

    score() {
        this.data.apples++;
        this.data.score += Math.floor(this.data.dots.length/2);
        this.data.level += this.data.dots.length % 10 === 0 && this.data.level < this.MAX_LEVEL ? 1 : 0;
    }

    next = async () => {
        const { dots, edibles } = this.data;
        const curHead = {...dots[0]},
              curTail = {...dots[dots.length - 1]},
              nextHead = this.getNextHead(curHead);

        if (this.hasHitWall(nextHead))
            return this.end("wall");

        if (this.hasHitBody(nextHead))
            return this.end("body");

        this.data.dots.unshift(nextHead);
        this.data.updates.head = nextHead;

        if (this.hasSameCoords(nextHead, edibles.apple)) {
            this.data.edibles.apple = await this.__getNewEdible();
            this.score();
        } else {
            if (this.hasSameCoords(nextHead, edibles.virus)) {
                this.data.edibles.virus = false;
                this.data.canCross = true;
                setTimeout(async () => {
                    this.data.edibles.virus = await this.__getNewEdible();
                    setTimeout(() => this.data.canCross = false, 100);
                }, 10000)
            }
            this.data.updates.tail = curTail;
            this.data.dots.pop();
        }

        this.data.processing = false;

        return this.data;
    }
}