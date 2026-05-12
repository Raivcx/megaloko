const SpriteFactory = (() => {
    const cache = {};

    function createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function drawPixels(ctx, pixels, palette, scale = 1) {
        pixels.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                const colorIdx = row[x];
                if (colorIdx === 0) continue;
                ctx.fillStyle = palette[colorIdx];
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        });
    }

    function getSprite(name) {
        if (cache[name]) return cache[name];
        const data = SPRITE_DATA[name];
        if (!data) return null;
        const scale = data.scale || 1;
        const c = createCanvas(data.pixels[0].length * scale, data.pixels.length * scale);
        const ctx = c.getContext('2d');
        drawPixels(ctx, data.pixels, data.palette, scale);
        cache[name] = c;
        return c;
    }

    const SPRITE_DATA = {
        player: {
            scale: 2,
            palette: {
                1: '#22DD22',
                2: '#66FF66',
                3: '#AAFFAA',
                4: '#FF4444',
                5: '#FFFF44'
            },
            pixels: [
                [0,0,0,0,0,1,0,0,0,0,0],
                [0,0,0,0,1,2,1,0,0,0,0],
                [0,0,0,0,1,3,1,0,0,0,0],
                [0,0,0,1,1,2,1,1,0,0,0],
                [0,0,1,1,1,2,1,1,1,0,0],
                [0,1,1,1,1,2,1,1,1,1,0],
                [1,1,5,1,1,2,1,1,5,1,1],
                [1,4,4,1,1,1,1,1,4,4,1],
                [0,0,4,1,1,1,1,1,4,0,0],
            ]
        },
        bullet: {
            scale: 2,
            palette: { 1: '#FFFF00', 2: '#FFFFFF' },
            pixels: [
                [0,2,0],
                [0,1,0],
                [0,1,0],
                [0,1,0],
            ]
        },
        enemyBullet: {
            scale: 2,
            palette: { 1: '#FF4444', 2: '#FF8888' },
            pixels: [
                [0,1,0],
                [0,2,0],
                [0,1,0],
                [0,2,0],
            ]
        },
        hamburger: {
            scale: 2,
            palette: {
                1: '#CC8833',
                2: '#FFAA44',
                3: '#44BB44',
                4: '#FF3333',
                5: '#FFDD44',
                6: '#884411'
            },
            pixels: [
                [0,0,1,1,1,1,1,1,1,0,0],
                [0,1,2,5,2,5,2,5,2,1,0],
                [1,2,2,2,2,2,2,2,2,2,1],
                [0,3,3,3,3,3,3,3,3,3,0],
                [0,4,4,6,4,4,4,6,4,4,0],
                [0,5,5,5,5,5,5,5,5,5,0],
                [1,6,6,6,6,6,6,6,6,6,1],
                [0,1,1,1,1,1,1,1,1,1,0],
            ]
        },
        cookie: {
            scale: 2,
            palette: {
                1: '#CC9944',
                2: '#DDAA55',
                3: '#885522',
                4: '#442211'
            },
            pixels: [
                [0,0,1,1,1,1,1,0,0],
                [0,1,2,2,4,2,2,1,0],
                [1,2,2,2,2,2,4,2,1],
                [1,2,4,2,2,2,2,2,1],
                [1,2,2,2,4,2,2,2,1],
                [1,2,2,2,2,2,4,2,1],
                [0,1,2,4,2,2,2,1,0],
                [0,0,1,1,1,1,1,0,0],
            ]
        },
        bug: {
            scale: 2,
            palette: {
                1: '#228822',
                2: '#44CC44',
                3: '#66FF66',
                4: '#FFFF00',
                5: '#115511'
            },
            pixels: [
                [0,1,0,0,0,0,0,1,0],
                [0,0,1,0,0,0,1,0,0],
                [0,0,1,1,1,1,1,0,0],
                [0,1,2,3,2,3,2,1,0],
                [1,1,2,4,2,4,2,1,1],
                [0,1,2,2,2,2,2,1,0],
                [0,5,1,1,1,1,1,5,0],
                [0,0,5,0,0,0,5,0,0],
            ]
        },
        tire: {
            scale: 2,
            palette: {
                1: '#444444',
                2: '#666666',
                3: '#888888',
                4: '#AAAAAA',
                5: '#333333'
            },
            pixels: [
                [0,0,1,1,1,1,1,0,0],
                [0,1,2,2,2,2,2,1,0],
                [1,2,5,3,4,3,5,2,1],
                [1,2,3,5,5,5,3,2,1],
                [1,2,4,5,4,5,4,2,1],
                [1,2,3,5,5,5,3,2,1],
                [1,2,5,3,4,3,5,2,1],
                [0,1,2,2,2,2,2,1,0],
                [0,0,1,1,1,1,1,0,0],
            ]
        },
        diamond: {
            scale: 2,
            palette: {
                1: '#4488FF',
                2: '#66BBFF',
                3: '#AADDFF',
                4: '#FFFFFF',
                5: '#2244AA'
            },
            pixels: [
                [0,0,0,0,1,0,0,0,0],
                [0,0,0,1,2,1,0,0,0],
                [0,0,1,2,3,2,1,0,0],
                [0,1,2,3,4,3,2,1,0],
                [0,0,5,2,3,2,5,0,0],
                [0,0,0,5,2,5,0,0,0],
                [0,0,0,0,5,0,0,0,0],
            ]
        },
        iron: {
            scale: 2,
            palette: {
                1: '#888899',
                2: '#AAAACC',
                3: '#CCCCEE',
                4: '#FF4444',
                5: '#666677'
            },
            pixels: [
                [0,0,0,0,0,1,0,0,0,0,0],
                [0,0,0,0,1,3,1,0,0,0,0],
                [0,0,0,1,2,2,2,1,0,0,0],
                [0,0,1,2,3,3,3,2,1,0,0],
                [0,1,2,2,2,2,2,2,2,1,0],
                [1,2,2,2,2,2,2,2,2,2,1],
                [1,5,5,5,5,5,5,5,5,5,1],
                [0,0,0,0,4,4,4,0,0,0,0],
            ]
        },
        bowtie: {
            scale: 2,
            palette: {
                1: '#DD2222',
                2: '#FF4444',
                3: '#FF8888',
                4: '#FFCC00'
            },
            pixels: [
                [1,1,0,0,0,0,0,1,1],
                [1,2,1,0,0,0,1,2,1],
                [0,1,2,1,0,1,2,1,0],
                [0,0,1,3,4,3,1,0,0],
                [0,1,2,1,0,1,2,1,0],
                [1,2,1,0,0,0,1,2,1],
                [1,1,0,0,0,0,0,1,1],
            ]
        },
        dice: {
            scale: 2,
            palette: {
                1: '#CCCCCC',
                2: '#EEEEEE',
                3: '#FFFFFF',
                4: '#222222',
                5: '#999999'
            },
            pixels: [
                [0,0,1,1,1,1,1,1,0,0],
                [0,1,2,2,2,2,2,2,1,0],
                [1,2,4,2,2,2,2,4,2,1],
                [1,2,2,2,2,2,2,2,2,1],
                [1,2,2,2,4,2,2,2,2,1],
                [1,2,2,2,2,2,2,2,2,1],
                [1,2,4,2,2,2,2,4,2,1],
                [0,1,2,2,2,2,2,2,1,0],
                [0,0,5,5,5,5,5,5,0,0],
            ]
        },
        explosion: {
            scale: 2,
            palette: {
                1: '#FF4400',
                2: '#FFAA00',
                3: '#FFFF44',
                4: '#FFFFFF'
            },
            pixels: [
                [0,0,1,0,0,1,0,0],
                [0,1,2,0,1,2,1,0],
                [1,2,3,2,2,3,2,1],
                [0,2,3,4,4,3,2,0],
                [1,2,3,4,4,3,2,1],
                [1,2,3,2,2,3,2,1],
                [0,1,2,0,1,2,1,0],
                [0,0,1,0,0,1,0,0],
            ]
        }
    };

    // 8 ondas na ordem original do Atari
    const ENEMY_TYPES = [
        'hamburger', 'cookie', 'bug', 'tire',
        'diamond', 'iron', 'bowtie', 'dice'
    ];

    // Pontuação por tipo (1º ciclo)
    const ENEMY_SCORES = {
        hamburger: 20, cookie: 30, bug: 40, tire: 50,
        diamond: 60, iron: 70, bowtie: 80, dice: 90
    };

    function getEnemyType(level) {
        return ENEMY_TYPES[(level - 1) % ENEMY_TYPES.length];
    }

    function getEnemyScore(type, cycle) {
        return cycle > 1 ? 90 : ENEMY_SCORES[type];
    }

    function getCycle(level) {
        return Math.floor((level - 1) / ENEMY_TYPES.length) + 1;
    }

    function getEnemyName(type) {
        const names = {
            hamburger: 'HAMBURGUERES',
            cookie: 'BISCOITOS',
            bug: 'INSETOS',
            tire: 'PNEUS RADIAIS',
            diamond: 'DIAMANTES',
            iron: 'FERROS DE PASSAR',
            bowtie: 'GRAVATAS BORBOLETA',
            dice: 'DADOS ESPACIAIS'
        };
        return names[type] || type.toUpperCase();
    }

    return {
        getSprite, getEnemyType, getEnemyName,
        getEnemyScore, getCycle, ENEMY_TYPES
    };
})();
