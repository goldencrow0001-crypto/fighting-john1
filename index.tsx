import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// --- Constants ---
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 576;
const GRAVITY = 0.8;
const GAME_DURATION = 99;

// --- Types ---
type Position = { x: number; y: number };
type Velocity = { x: number; y: number };

interface AttackBox {
  position: Position;
  width: number;
  height: number;
  offset: Position;
}

interface Projectile {
  position: Position;
  velocity: Velocity;
  radius: number;
  color: string;
  owner: 'SAKURA' | 'KENJI';
  active: boolean;
  damage: number;
}

// --- Game Classes ---

class Sprite {
  position: Position;
  height: number;
  width: number;
  color: string;
  velocity: Velocity;
  lastKey: string;
  attackBox: AttackBox;
  isAttacking: boolean;
  isBlocking: boolean;
  health: number;
  maxHealth: number;
  dead: boolean;
  onGround: boolean;
  facingRight: boolean;
  attackCooldown: number;
  specialCooldown: number;
  attackFrame: number; 
  hitStun: number;
  comboCount: number; 
  comboTimer: number; 
  name: string;
  type: 'SAKURA' | 'KENJI';

  constructor({
    position,
    velocity,
    color = 'red',
    offset = { x: 0, y: 0 },
    name = 'Fighter',
    type = 'SAKURA'
  }: {
    position: Position;
    velocity: Velocity;
    color?: string;
    offset?: Position;
    name?: string;
    type?: 'SAKURA' | 'KENJI'
  }) {
    this.position = position;
    this.velocity = velocity;
    this.width = 50;
    this.height = 150;
    this.lastKey = '';
    this.color = color;
    this.isAttacking = false;
    this.isBlocking = false;
    this.health = 100;
    this.maxHealth = 100;
    this.dead = false;
    this.onGround = false;
    this.facingRight = true;
    this.attackCooldown = 0;
    this.specialCooldown = 0;
    this.attackFrame = 0;
    this.hitStun = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.name = name;
    this.type = type;

    this.attackBox = {
      position: { x: this.position.x, y: this.position.y },
      offset: offset,
      width: 140, 
      height: 100,
    };
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    
    // Hit flash
    if (this.hitStun > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'white';
    }

    if (this.type === 'SAKURA') {
        this.drawSakura(c);
    } else {
        this.drawKenji(c);
    }
    
    // Draw Block Shield
    if (this.isBlocking) {
        c.fillStyle = this.type === 'SAKURA' ? 'rgba(0, 191, 255, 0.5)' : 'rgba(75, 0, 130, 0.5)';
        c.strokeStyle = 'white';
        c.lineWidth = 2;
        c.beginPath();
        const shieldX = this.facingRight ? this.position.x + this.width + 10 : this.position.x - 10;
        const shieldY = this.position.y + this.height / 2;
        c.arc(shieldX, shieldY, 60, -Math.PI/2, Math.PI/2, !this.facingRight);
        c.fill();
        c.stroke();
    }

    c.restore();
  }

  drawSakura(c: CanvasRenderingContext2D) {
      // Skirt
      c.fillStyle = '#003366'; // Navy Blue
      c.fillRect(this.position.x, this.position.y + 80, this.width, 40);
      
      // Shirt (White Sailor Top)
      c.fillStyle = '#fff';
      c.fillRect(this.position.x, this.position.y, this.width, 80);
      
      // Collar (Blue)
      c.fillStyle = '#003366';
      c.fillRect(this.position.x + 10, this.position.y, 30, 20);

      // Red Bow
      c.fillStyle = '#ff0000';
      c.beginPath();
      c.arc(this.position.x + 25, this.position.y + 25, 5, 0, Math.PI * 2);
      c.fill();
      
      // Legs (Socks)
      c.fillStyle = '#1a1a1a'; // High socks
      c.fillRect(this.position.x + 5, this.position.y + 120, 15, 30);
      c.fillRect(this.position.x + 30, this.position.y + 120, 15, 30);

      // Head
      c.fillStyle = '#ffe0bd';
      c.fillRect(this.position.x + 10, this.position.y - 25, 30, 25);

      // Hair (Pink Anime Hair)
      c.fillStyle = '#ff69b4';
      // Bangs
      c.fillRect(this.position.x + 8, this.position.y - 30, 34, 10);
      // Long hair back
      if (this.facingRight) {
         c.beginPath();
         c.moveTo(this.position.x + 10, this.position.y - 30);
         c.lineTo(this.position.x - 20 - (Math.sin(Date.now()/200)*5), this.position.y + 60);
         c.lineTo(this.position.x + 20, this.position.y - 10);
         c.fill();
      } else {
         c.beginPath();
         c.moveTo(this.position.x + 40, this.position.y - 30);
         c.lineTo(this.position.x + 70 + (Math.sin(Date.now()/200)*5), this.position.y + 60);
         c.lineTo(this.position.x + 30, this.position.y - 10);
         c.fill();
      }

      // Eyes
      c.fillStyle = '#000';
      const eyeOffset = this.facingRight ? 25 : 15;
      c.fillRect(this.position.x + eyeOffset, this.position.y - 18, 4, 6);

      // Attack Effect (Magical Girl Beam/Slash)
      if (this.isAttacking && this.attackFrame > 0) {
          c.fillStyle = 'rgba(255, 105, 180, 0.7)';
          c.shadowBlur = 20;
          c.shadowColor = 'pink';
          const atkX = this.attackBox.position.x;
          const atkY = this.attackBox.position.y + 25;
          c.beginPath();
          if (this.facingRight) {
              c.arc(atkX + 50, atkY, 60, -0.5, 0.5);
          } else {
              c.arc(atkX + 50, atkY, 60, Math.PI - 0.5, Math.PI + 0.5);
          }
          c.fill();
          c.shadowBlur = 0;
      }
  }

  drawKenji(c: CanvasRenderingContext2D) {
      // Long Coat (Gakuran) - Black/Dark Blue
      c.fillStyle = '#111';
      c.fillRect(this.position.x - 5, this.position.y, this.width + 10, 110); // Long coat
      
      // Pants
      c.fillStyle = '#222';
      c.fillRect(this.position.x + 5, this.position.y + 110, 15, 40);
      c.fillRect(this.position.x + 30, this.position.y + 110, 15, 40);
      
      // Gold Buttons
      c.fillStyle = 'gold';
      c.fillRect(this.position.x + 22, this.position.y + 10, 6, 6);
      c.fillRect(this.position.x + 22, this.position.y + 30, 6, 6);
      c.fillRect(this.position.x + 22, this.position.y + 50, 6, 6);

      // Head
      c.fillStyle = '#e0ac69';
      c.fillRect(this.position.x + 10, this.position.y - 25, 30, 25);

      // Pompadour (Massive)
      c.fillStyle = '#000';
      c.fillRect(this.position.x + 5, this.position.y - 30, 40, 10); // Base hair
      // Pomp sticking out
      if (this.facingRight) {
          c.fillRect(this.position.x + 35, this.position.y - 35, 20, 15); 
      } else {
          c.fillRect(this.position.x - 5, this.position.y - 35, 20, 15);
      }

      // Eyes (Angry)
      c.fillStyle = 'white';
      const eyeOffset = this.facingRight ? 30 : 12;
      c.beginPath();
      c.moveTo(this.position.x + eyeOffset, this.position.y - 15);
      c.lineTo(this.position.x + eyeOffset + 8, this.position.y - 12);
      c.lineTo(this.position.x + eyeOffset, this.position.y - 12);
      c.fill();

      // Attack Effect (Dark Aura Punch)
      if (this.isAttacking && this.attackFrame > 0) {
          c.fillStyle = 'rgba(75, 0, 130, 0.8)'; // Indigo
          c.shadowBlur = 15;
          c.shadowColor = 'purple';
          const atkX = this.attackBox.position.x + (this.facingRight ? 20 : 0);
          c.beginPath();
          c.arc(atkX + 50, this.position.y + 50, 40 + Math.random()*10, 0, Math.PI*2);
          c.fill();
          // Speed lines
          c.strokeStyle = 'white';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(atkX, this.position.y + 50);
          c.lineTo(atkX + 100, this.position.y + 30);
          c.stroke();
          c.shadowBlur = 0;
      }
  }

  update(c: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, groundHeight: number) {
    this.draw(c);

    if (this.dead) return;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Gravity
    if (this.position.y + this.height + this.velocity.y >= canvasHeight - groundHeight) {
      this.velocity.y = 0;
      this.position.y = canvasHeight - this.height - groundHeight;
      this.onGround = true;
    } else {
      this.velocity.y += GRAVITY;
      this.onGround = false;
    }

    // Screen Boundaries
    if (this.position.x < 0) this.position.x = 0;
    if (this.position.x + this.width > canvasWidth) this.position.x = canvasWidth - this.width;

    // Attack Box Update
    if (this.facingRight) {
       this.attackBox.position.x = this.position.x + this.width - 20;
    } else {
       this.attackBox.position.x = this.position.x - this.attackBox.width + 20;
    }
    this.attackBox.position.y = this.position.y + 20;

    // Cooldown management
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;
    if (this.hitStun > 0) this.hitStun--;
    
    // Combo Logic: Decrement timer
    if (this.comboTimer > 0) {
        this.comboTimer--;
        if (this.comboTimer <= 0) {
            this.comboCount = 0; // Reset combo if time runs out
        }
    }
    
    if (this.isAttacking) {
        this.attackFrame--;
        if (this.attackFrame <= 0) {
            this.isAttacking = false;
        }
    }
  }
  
  takeDamage(amount: number) {
      // Getting hit breaks your own combo
      this.comboCount = 0; 
      
      if (this.isBlocking) {
          this.health -= amount * 0.1; // 90% damage reduction
          // No hitstun, no knockback
      } else {
          this.health -= amount;
          this.hitStun = 15;
      }
      if (this.health < 0) this.health = 0;
  }
  
  attack() {
    if (this.attackCooldown === 0 && !this.dead && this.hitStun === 0 && !this.isBlocking) {
      this.isAttacking = true;
      this.attackFrame = 20; 
      this.attackCooldown = 35; 
    }
  }
  
  shoot(): Projectile | null {
      if (this.specialCooldown === 0 && !this.dead && this.hitStun === 0 && !this.isBlocking) {
          this.specialCooldown = 120; // 2 seconds cooldown
          const velX = this.facingRight ? 15 : -15;
          return {
              position: { 
                  x: this.facingRight ? this.position.x + this.width : this.position.x, 
                  y: this.position.y + 50 
              },
              velocity: { x: velX, y: 0 },
              radius: 20,
              color: this.type === 'SAKURA' ? '#ff69b4' : '#4b0082',
              owner: this.type,
              active: true,
              damage: 15
          };
      }
      return null;
  }
  
  block(active: boolean) {
      if (!this.dead && this.hitStun === 0 && !this.isAttacking) {
          this.isBlocking = active;
          if (active) this.velocity.x = 0; // Stop moving when blocking
      } else {
          this.isBlocking = false;
      }
  }

  jump() {
      if (this.onGround && this.hitStun === 0 && !this.dead && !this.isBlocking) {
          this.velocity.y = -22; // Higher anime jump
      }
  }
}

// --- Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStatus, setGameStatus] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [winner, setWinner] = useState<string>('');
  const [timer, setTimer] = useState(GAME_DURATION);
  
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);

  // Combo State
  const [playerCombo, setPlayerCombo] = useState(0);
  const [enemyCombo, setEnemyCombo] = useState(0);
  const lastPlayerCombo = useRef(0);
  const lastEnemyCombo = useRef(0);

  const playerRef = useRef<Sprite | null>(null);
  const enemyRef = useRef<Sprite | null>(null);
  const timerRef = useRef<number>(GAME_DURATION);
  const gameLoopId = useRef<number>(0);
  const timerId = useRef<number | null>(null);

  // Particles & Projectiles
  const particlesRef = useRef<any[]>([]);
  const sakuraRef = useRef<any[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);

  const keys = useRef({
    a: { pressed: false },
    d: { pressed: false },
    w: { pressed: false },
    s: { pressed: false }, // Block
    e: { pressed: false }, // Special
  });

  const initGame = () => {
    const player = new Sprite({
      position: { x: 150, y: 0 },
      velocity: { x: 0, y: 0 },
      color: 'pink',
      offset: { x: 0, y: 0 },
      name: 'Sakura',
      type: 'SAKURA'
    });

    const enemy = new Sprite({
      position: { x: 800, y: 0 },
      velocity: { x: 0, y: 0 },
      color: 'blue',
      offset: { x: -50, y: 0 },
      name: 'Kenji',
      type: 'KENJI'
    });
    enemy.facingRight = false;

    playerRef.current = player;
    enemyRef.current = enemy;
    
    setPlayerHealth(100);
    setEnemyHealth(100);
    setTimer(GAME_DURATION);
    
    // Reset Combos
    setPlayerCombo(0);
    setEnemyCombo(0);
    lastPlayerCombo.current = 0;
    lastEnemyCombo.current = 0;

    timerRef.current = GAME_DURATION;
    particlesRef.current = [];
    sakuraRef.current = [];
    projectilesRef.current = [];
    
    // Init Sakura petals
    for(let i=0; i<30; i++) {
        sakuraRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 5 + 3,
            speed: Math.random() * 2 + 1,
            sway: Math.random() * Math.PI
        });
    }
    
    setGameStatus('PLAYING');
  };

  const createHitParticles = (x: number, y: number, color: string, isBlock: boolean = false) => {
      for (let i = 0; i < 10; i++) {
          particlesRef.current.push({
              x,
              y,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              life: 1.0,
              color: isBlock ? '#00bfff' : color,
              type: 'HIT'
          });
      }
      // Add text particle
      particlesRef.current.push({
          x: x,
          y: y - 20,
          vx: 0,
          vy: -2,
          life: 1.0,
          text: isBlock ? 'BLOCK!' : 'BAM!',
          type: 'TEXT',
          color: isBlock ? '#00bfff' : 'white'
      });
  };

  const determineWinner = () => {
      const player = playerRef.current;
      const enemy = enemyRef.current;
      if (!player || !enemy) return;

      if (timerId.current) clearInterval(timerId.current);
      setGameStatus('GAMEOVER');

      if (player.health === enemy.health) {
          setWinner('Draw Game');
      } else if (player.health > enemy.health) {
          setWinner('Sakura Wins!');
      } else {
          setWinner('Kenji Wins!');
      }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const c = canvas.getContext('2d');
    if (!c) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Timer Logic
    if (gameStatus === 'PLAYING') {
         if (timerId.current) clearInterval(timerId.current);
         timerId.current = window.setInterval(() => {
            if (timerRef.current > 0) {
                timerRef.current--;
                setTimer(timerRef.current);
            }
         }, 1000);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (gameStatus !== 'PLAYING') return;
        const player = playerRef.current;
        const key = event.key.toLowerCase();
        
        switch (key) {
            case 'd': keys.current.d.pressed = true; if (player) player.lastKey = 'd'; break;
            case 'a': keys.current.a.pressed = true; if (player) player.lastKey = 'a'; break;
            case 'w': if (player) player.jump(); break;
            case ' ': if (player) player.attack(); break;
            case 's': 
                keys.current.s.pressed = true; 
                if (player) player.block(true); 
                break;
            case 'e':
                if (player) {
                   const p = player.shoot();
                   if (p) projectilesRef.current.push(p);
                }
                break;
        }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'd': keys.current.d.pressed = false; break;
            case 'a': keys.current.a.pressed = false; break;
            case 's': 
                keys.current.s.pressed = false; 
                if (playerRef.current) playerRef.current.block(false);
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const animate = () => {
      gameLoopId.current = window.requestAnimationFrame(animate);
      
      // --- Background Drawing ---
      // Sunset Sky Gradient
      const gradient = c.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#2e1a47'); // Deep Purple
      gradient.addColorStop(0.5, '#c74a4a'); // Sunset Red
      gradient.addColorStop(1, '#ffb347'); // Orange
      c.fillStyle = gradient;
      c.fillRect(0, 0, canvas.width, canvas.height);

      // Sun
      c.fillStyle = 'rgba(255, 69, 0, 0.4)';
      c.beginPath();
      c.arc(canvas.width / 2, canvas.height - 150, 100, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ff4500';
      c.beginPath();
      c.arc(canvas.width / 2, canvas.height - 150, 80, 0, Math.PI * 2);
      c.fill();

      // Skyline Silhouette
      c.fillStyle = '#0f0f1a';
      c.fillRect(0, canvas.height - 250, 100, 250);
      c.fillRect(100, canvas.height - 300, 150, 300);
      c.fillRect(300, canvas.height - 180, 200, 180);
      c.fillRect(600, canvas.height - 320, 120, 320);
      c.fillRect(750, canvas.height - 200, 300, 200);

      // Rooftop Floor (Concrete)
      const groundHeight = 110;
      c.fillStyle = '#3a3a3a';
      c.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
      
      // Fence Pattern
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = 2;
      c.beginPath();
      for(let x=0; x<canvas.width; x+=40) {
          c.moveTo(x, canvas.height - groundHeight - 200);
          c.lineTo(x, canvas.height - groundHeight);
      }
      c.stroke();
      // Crosshatch
      c.beginPath();
      for(let y=canvas.height - groundHeight - 200; y < canvas.height - groundHeight; y+=40) {
          c.moveTo(0, y);
          c.lineTo(canvas.width, y);
      }
      c.stroke();

      if (gameStatus === 'START') {
          // Draw slow sakura petals on start screen
          drawSakura(c, canvas.width, canvas.height);
          return;
      }

      const player = playerRef.current;
      const enemy = enemyRef.current;

      if (!player || !enemy) return;

      // Reset velocity
      player.velocity.x = 0;
      enemy.velocity.x = 0;

      // Player Move
      if (!player.isBlocking) {
          if (keys.current.a.pressed && player.lastKey === 'a' && player.hitStun === 0) {
            player.velocity.x = -8;
            player.facingRight = false;
          } else if (keys.current.d.pressed && player.lastKey === 'd' && player.hitStun === 0) {
            player.velocity.x = 8;
            player.facingRight = true;
          }
      }

      // Enemy AI
      if (!enemy.dead && gameStatus === 'PLAYING' && enemy.hitStun === 0) {
          const dx = player.position.x - enemy.position.x;
          const dist = Math.abs(dx);
          
          if (dist > 300) {
               if (enemy.specialCooldown === 0 && Math.random() < 0.02) {
                   const p = enemy.shoot();
                   if (p) projectilesRef.current.push(p);
               } else {
                   enemy.velocity.x = dx > 0 ? 5 : -5;
                   enemy.facingRight = dx > 0;
                   enemy.block(false);
               }
          } else if (dist > 100) {
              enemy.velocity.x = dx > 0 ? 5 : -5;
              enemy.facingRight = dx > 0;
              enemy.block(false);
          } else {
              enemy.facingRight = dx > 0;
              if (player.isAttacking && Math.random() < 0.4) {
                  enemy.block(true);
              } else {
                  enemy.block(false);
                  if (Math.random() < 0.08) enemy.attack();
              }
          }
          if (Math.random() < 0.01) enemy.jump(); 
      }

      player.update(c, canvas.width, canvas.height, 110);
      enemy.update(c, canvas.width, canvas.height, 110);
      
      // Update Combo State
      if (player.comboCount !== lastPlayerCombo.current) {
          setPlayerCombo(player.comboCount);
          lastPlayerCombo.current = player.comboCount;
      }
      if (enemy.comboCount !== lastEnemyCombo.current) {
          setEnemyCombo(enemy.comboCount);
          lastEnemyCombo.current = enemy.comboCount;
      }

      // --- Projectile Logic ---
      for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          p.position.x += p.velocity.x;
          
          // Draw Projectile
          c.fillStyle = p.color;
          c.shadowBlur = 10;
          c.shadowColor = p.color;
          c.beginPath();
          c.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
          c.fill();
          c.shadowBlur = 0;

          if (p.position.x < 0 || p.position.x > canvas.width) {
              projectilesRef.current.splice(i, 1);
              continue;
          }

          const target = p.owner === 'SAKURA' ? enemy : player;
          const shooter = p.owner === 'SAKURA' ? player : enemy;

          if (
              p.position.x + p.radius > target.position.x &&
              p.position.x - p.radius < target.position.x + target.width &&
              p.position.y + p.radius > target.position.y &&
              p.position.y - p.radius < target.position.y + target.height
          ) {
              let damage = p.damage;
              
              if (!target.isBlocking) {
                  shooter.comboCount++;
                  shooter.comboTimer = 90; 
                  damage += (shooter.comboCount * 2);
              }
              
              target.takeDamage(damage);
              createHitParticles(p.position.x, p.position.y, p.color, target.isBlocking);
              if (p.owner === 'SAKURA') setEnemyHealth(target.health);
              else setPlayerHealth(target.health);
              
              projectilesRef.current.splice(i, 1);
          }
      }

      // --- Melee Collision ---
      if (
        player.isAttacking &&
        player.attackFrame === 10 && 
        rectCollision({ rect1: player.attackBox, rect2: enemy }) &&
        !enemy.dead
      ) {
        let dmg = 8;
        if (!enemy.isBlocking) {
             player.comboCount++;
             player.comboTimer = 90;
             dmg += Math.floor(player.comboCount * 1.5); 
        }

        enemy.takeDamage(dmg);
        if (!enemy.isBlocking) {
            enemy.velocity.y = -8; 
            enemy.velocity.x = player.facingRight ? 15 : -15; 
        }
        setEnemyHealth(enemy.health);
        createHitParticles(enemy.position.x + enemy.width/2, enemy.position.y + 40, '#ff00ff', enemy.isBlocking);
      }

      if (
        enemy.isAttacking &&
        enemy.attackFrame === 10 &&
        rectCollision({ rect1: enemy.attackBox, rect2: player }) &&
        !player.dead
      ) {
        let dmg = 12;
        if (!player.isBlocking) {
             enemy.comboCount++;
             enemy.comboTimer = 90;
             dmg += Math.floor(enemy.comboCount * 1.5);
        }
        
        player.takeDamage(dmg);
        if (!player.isBlocking) {
            player.velocity.y = -8;
            player.velocity.x = enemy.facingRight ? 15 : -15;
        }
        setPlayerHealth(player.health);
        createHitParticles(player.position.x + player.width/2, player.position.y + 40, '#ffffff', player.isBlocking);
      }
      
      // --- Particles ---
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
         const p = particlesRef.current[i];
         p.life -= 0.05;
         
         if (p.life <= 0) {
             particlesRef.current.splice(i, 1);
             continue;
         }

         if (p.type === 'HIT') {
             p.x += p.vx;
             p.y += p.vy;
             c.globalAlpha = p.life;
             c.fillStyle = p.color;
             c.fillRect(p.x, p.y, 6, 6);
         } else if (p.type === 'TEXT') {
             p.y += p.vy;
             c.globalAlpha = p.life;
             c.fillStyle = p.color || 'white';
             c.font = '30px Bangers';
             c.strokeStyle = 'black';
             c.lineWidth = 3;
             c.strokeText(p.text, p.x, p.y);
             c.fillText(p.text, p.x, p.y);
         }
         c.globalAlpha = 1.0;
      }

      drawSakura(c, canvas.width, canvas.height);

      if (enemy.health <= 0 || player.health <= 0 || timerRef.current <= 0) {
        determineWinner();
      }
    };

    const drawSakura = (c: CanvasRenderingContext2D, w: number, h: number) => {
        sakuraRef.current.forEach(petal => {
            petal.y += petal.speed;
            petal.x += Math.sin(petal.sway + petal.y/50) * 2;
            petal.sway += 0.02;

            if (petal.y > h) {
                petal.y = -10;
                petal.x = Math.random() * w;
            }

            c.fillStyle = 'pink';
            c.beginPath();
            c.ellipse(petal.x, petal.y, petal.size, petal.size/2, Math.PI/4, 0, Math.PI*2);
            c.fill();
        });
    }

    animate();

    return () => {
      window.cancelAnimationFrame(gameLoopId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timerId.current) clearInterval(timerId.current);
    };
  }, [gameStatus]);

  function rectCollision({ rect1, rect2 }: { rect1: any; rect2: any }) {
    return (
      rect1.position.x + rect1.width >= rect2.position.x &&
      rect1.position.x <= rect2.position.x + rect2.width &&
      rect1.position.y + rect1.height >= rect2.position.y &&
      rect1.position.y <= rect2.position.y + rect2.height
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* HUD */}
      <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white',
          textShadow: '2px 2px 0 #000',
          zIndex: 10,
          fontFamily: '"Bangers", cursive',
          letterSpacing: '2px'
      }}>
          {/* Player Health */}
          <div style={{ position: 'relative', width: '40%' }}>
              <div style={{ height: '30px', backgroundColor: '#330011', border: '3px solid #ff69b4', transform: 'skewX(-20deg)' }}></div>
              <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '30px',
                  width: `${playerHealth}%`,
                  backgroundColor: '#ff69b4', // Pink
                  borderRight: '3px solid white',
                  transform: 'skewX(-20deg)',
                  transition: 'width 0.1s'
              }}></div>
              <div style={{ marginTop: '5px', fontSize: '24px', color: '#ff69b4' }}>SAKURA-CHAN</div>
              {/* Player Combo */}
              {playerCombo > 1 && (
                  <div style={{
                      position: 'absolute',
                      top: '60px',
                      left: '20px',
                      fontSize: '40px',
                      color: '#ffdd00',
                      textShadow: '4px 4px 0px #ff0000',
                      transform: 'skewX(-10deg)',
                      animation: 'pulse 0.2s infinite alternate'
                  }}>
                      {playerCombo} HITS!
                  </div>
              )}
          </div>

          {/* Timer */}
          <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              borderRadius: '50%',
              border: '4px solid gold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'gold'
          }}>
              {timer}
          </div>

          {/* Enemy Health */}
          <div style={{ position: 'relative', width: '40%', textAlign: 'right' }}>
              <div style={{ height: '30px', backgroundColor: '#000022', border: '3px solid #4b0082', transform: 'skewX(20deg)' }}></div>
              <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '30px',
                  width: `${enemyHealth}%`,
                  backgroundColor: '#4b0082', // Indigo
                  borderLeft: '3px solid white',
                  transform: 'skewX(20deg)',
                  transition: 'width 0.1s'
              }}></div>
              <div style={{ marginTop: '5px', fontSize: '24px', color: '#8a2be2' }}>KENJI-KUN</div>
               {/* Enemy Combo */}
               {enemyCombo > 1 && (
                  <div style={{
                      position: 'absolute',
                      top: '60px',
                      right: '20px',
                      fontSize: '40px',
                      color: '#ff00ff',
                      textShadow: '4px 4px 0px #4b0082',
                      transform: 'skewX(10deg)',
                      animation: 'pulse 0.2s infinite alternate'
                  }}>
                      {enemyCombo} HITS!
                  </div>
              )}
          </div>
      </div>
      
      {/* CSS Animation for Combo Pulse */}
      <style>{`
        @keyframes pulse {
            0% { transform: scale(1) skewX(-10deg); }
            100% { transform: scale(1.1) skewX(-10deg); }
        }
      `}</style>

      <canvas 
        ref={canvasRef} 
        style={{ border: '4px solid #fff', boxShadow: '0 0 30px rgba(255, 105, 180, 0.4)' }} 
      />

      {/* Start Screen Overlay */}
      {gameStatus === 'START' && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(20, 10, 30, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              zIndex: 20
          }}>
              <h1 style={{ 
                  fontSize: '60px', 
                  color: '#ff69b4', 
                  fontFamily: '"Bangers", cursive',
                  textShadow: '4px 4px 0 #fff, 8px 8px 0 #4b0082', 
                  marginBottom: '10px',
                  letterSpacing: '4px'
              }}>
                  ANIME CLASH
              </h1>
              <h2 style={{ fontSize: '30px', marginBottom: '50px', color: '#fff', fontStyle: 'italic' }}>SENPAI'S NOTICE</h2>
              <div style={{ marginBottom: '30px', textAlign: 'center', lineHeight: '2', fontSize: '18px' }}>
                  <p><span style={{color:'gold'}}>A / D</span> to Dash</p>
                  <p><span style={{color:'gold'}}>W</span> to Jump</p>
                  <p><span style={{color:'gold'}}>SPACE</span> to Magical Strike</p>
                  <p><span style={{color:'#00bfff'}}>S</span> to Block</p>
                  <p><span style={{color:'#ff69b4'}}>E</span> to Love Beam</p>
              </div>
              <button 
                  onClick={initGame}
                  style={{
                      padding: '15px 50px',
                      fontSize: '30px',
                      fontFamily: '"Bangers", cursive',
                      backgroundColor: '#ff1493',
                      color: 'white',
                      border: '4px solid white',
                      cursor: 'pointer',
                      transform: 'skewX(-10deg)',
                      boxShadow: '5px 5px 0px rgba(0,0,0,0.5)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff69b4'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff1493'}
              >
                  FIGHT!
              </button>
          </div>
      )}

      {/* Game Over Overlay */}
      {gameStatus === 'GAMEOVER' && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              zIndex: 20
          }}>
              <h1 style={{ 
                  fontSize: '70px', 
                  color: winner.includes('Sakura') ? '#ff69b4' : '#8a2be2', 
                  fontFamily: '"Bangers", cursive',
                  textShadow: '3px 3px 0 #fff', 
                  marginBottom: '30px' 
              }}>
                  {winner}
              </h1>
              <button 
                  onClick={initGame}
                  style={{
                      padding: '15px 40px',
                      fontSize: '24px',
                      fontFamily: '"Bangers", cursive',
                      backgroundColor: 'white',
                      color: 'black',
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                  }}
              >
                  REMATCH
              </button>
          </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);