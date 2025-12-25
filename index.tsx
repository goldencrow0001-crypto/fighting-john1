import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// --- Constants ---
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 576;
const GRAVITY = 0.7;
const JUMP_FORCE = -20; // Slightly lower gravity/higher jump for floaty anime feel
const SPEED = 5;
const GROUND_HEIGHT = 96;

// --- Assets/Styles ---
const COLORS = [
  '#ff0055', // Player (Pink/Red)
  '#00ccff', // Cyan
  '#ccff00', // Lime
  '#aa00ff', // Violet
  '#ffaa00', // Orange
  '#ffffff'  // White
];

// --- Types ---
type Position = { x: number; y: number };
type Velocity = { x: number; y: number };

interface AttackBox {
  position: Position;
  width: number;
  height: number;
  offset: Position;
}

// --- Fighter Class ---
class Fighter {
  id: number;
  position: Position;
  velocity: Velocity;
  width: number;
  height: number;
  color: string;
  isAi: boolean;
  name: string;
  
  health: number;
  maxHealth: number;
  dead: boolean;
  
  attackBox: AttackBox;
  isAttacking: boolean;
  attackCooldown: number;
  attackFrame: number;
  
  facingRight: boolean;
  onGround: boolean;
  hitStun: number;
  
  // AI Logic
  target: Fighter | null;
  aiChangeDirTimer: number;

  constructor({
    id,
    position, 
    color, 
    isAi = false,
    name
  }: {
    id: number,
    position: Position, 
    color: string, 
    isAi?: boolean,
    name: string
  }) {
    this.id = id;
    this.position = position;
    this.velocity = { x: 0, y: 0 };
    this.width = 40;
    this.height = 100;
    this.color = color;
    this.isAi = isAi;
    this.name = name;
    
    this.health = 100;
    this.maxHealth = 100;
    this.dead = false;
    
    this.attackBox = {
      position: { x: this.position.x, y: this.position.y },
      offset: { x: 0, y: 0 },
      width: 100,
      height: 60
    };
    
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackFrame = 0;
    
    this.facingRight = id % 2 === 0; // Randomize start direction
    this.onGround = false;
    this.hitStun = 0;
    
    this.target = null;
    this.aiChangeDirTimer = 0;
  }

  update(
    c: CanvasRenderingContext2D, 
    fighters: Fighter[], 
    stormLeft: number, 
    stormRight: number
  ) {
    if (this.dead) return;

    this.draw(c);
    this.drawHealthBar(c);
    
    // Physics
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Gravity
    if (this.position.y + this.height + this.velocity.y >= CANVAS_HEIGHT - GROUND_HEIGHT) {
      this.velocity.y = 0;
      this.position.y = CANVAS_HEIGHT - GROUND_HEIGHT - this.height;
      this.onGround = true;
    } else {
      this.velocity.y += GRAVITY;
      this.onGround = false;
    }
    
    // Friction
    this.velocity.x *= 0.9;

    // Storm Damage
    if (this.position.x < stormLeft || this.position.x + this.width > stormRight) {
        if (Math.floor(Date.now() / 500) % 2 === 0) { // Tick damage
            this.takeDamage(0.5);
            // Push back into zone slightly
            if (this.position.x < stormLeft) this.velocity.x += 2;
            else this.velocity.x -= 2;
        }
    }

    // Cooldowns
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hitStun > 0) this.hitStun--;
    
    // Attack Frame
    if (this.isAttacking) {
        this.attackFrame--;
        if (this.attackFrame <= 0) {
            this.isAttacking = false;
        }
    }
    
    // Update Attack Box Position
    if (this.facingRight) {
        this.attackBox.position.x = this.position.x + this.width;
    } else {
        this.attackBox.position.x = this.position.x - this.attackBox.width;
    }
    this.attackBox.position.y = this.position.y + 20;

    // AI Behavior
    if (this.isAi) {
        this.runAi(fighters);
    }
  }

  draw(c: CanvasRenderingContext2D) {
      c.save();
      c.globalAlpha = this.dead ? 0 : 1;
      
      // Hit flash
      if (this.hitStun > 0) {
          c.fillStyle = 'white';
      } else {
          c.fillStyle = this.color;
      }

      // Body
      c.fillRect(this.position.x, this.position.y, this.width, this.height);
      
      // Eyes (Direction)
      c.fillStyle = 'black';
      if (this.facingRight) {
          c.fillRect(this.position.x + 25, this.position.y + 10, 10, 10);
      } else {
          c.fillRect(this.position.x + 5, this.position.y + 10, 10, 10);
      }
      
      // Bandana / Headband
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(this.position.x, this.position.y + 15, this.width, 5);
      // Bandana Tail
      c.beginPath();
      if (this.facingRight) {
          c.moveTo(this.position.x, this.position.y + 15);
          c.lineTo(this.position.x - 20, this.position.y + 25 + Math.sin(Date.now()/100)*5);
          c.lineTo(this.position.x, this.position.y + 20);
      } else {
          c.moveTo(this.position.x + this.width, this.position.y + 15);
          c.lineTo(this.position.x + this.width + 20, this.position.y + 25 + Math.sin(Date.now()/100)*5);
          c.lineTo(this.position.x + this.width, this.position.y + 20);
      }
      c.fill();
      
      // Weapon / Fist
      if (this.isAttacking) {
          c.fillStyle = this.color;
          // Attack Swipe visual
          c.globalAlpha = 0.6;
          c.beginPath();
          c.arc(
            this.attackBox.position.x + this.attackBox.width/2, 
            this.attackBox.position.y + this.attackBox.height/2, 
            40, 
            0, Math.PI * 2
          );
          c.fill();
      }

      c.restore();
  }
  
  drawHealthBar(c: CanvasRenderingContext2D) {
      const barWidth = 60;
      const barHeight = 8;
      const x = this.position.x + this.width/2 - barWidth/2;
      const y = this.position.y - 20;
      
      // Background
      c.fillStyle = '#330000';
      c.fillRect(x, y, barWidth, barHeight);
      
      // Health
      const healthPercent = Math.max(0, this.health / this.maxHealth);
      c.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
      c.fillRect(x, y, barWidth * healthPercent, barHeight);
      
      // Name
      c.fillStyle = 'white';
      c.font = '10px Arial';
      c.textAlign = 'center';
      c.fillText(this.name, this.position.x + this.width/2, y - 5);
  }

  takeDamage(amount: number) {
      if (this.dead) return;
      this.health -= amount;
      this.hitStun = 10;
      if (this.health <= 0) {
          this.health = 0;
          this.dead = true;
          // Death particle effect or logic handled in main loop
      }
  }

  attack() {
      if (this.attackCooldown === 0 && !this.dead && this.hitStun === 0) {
          this.isAttacking = true;
          this.attackFrame = 15; // Active frames
          this.attackCooldown = 40;
      }
  }

  jump() {
      if (this.onGround && !this.dead && this.hitStun === 0) {
          this.velocity.y = JUMP_FORCE;
      }
  }

  // --- AI Brain ---
  runAi(fighters: Fighter[]) {
      if (this.hitStun > 0) return; // Stunned

      // 1. Find Closest Living Target that is NOT me
      let closestDist = Infinity;
      let target: Fighter | null = null;
      
      for (const f of fighters) {
          if (f.id !== this.id && !f.dead) {
              const dx = f.position.x - this.position.x;
              const dy = f.position.y - this.position.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < closestDist) {
                  closestDist = dist;
                  target = f;
              }
          }
      }
      this.target = target;

      // 2. Move towards target
      if (this.target) {
          const dx = this.target.position.x - this.position.x;
          
          if (Math.abs(dx) > 60) {
              // Move closer
              this.velocity.x = dx > 0 ? SPEED * 0.8 : -SPEED * 0.8;
              this.facingRight = dx > 0;
          } else {
              // In range, maybe attack
              this.facingRight = dx > 0;
              if (Math.random() < 0.05) {
                  this.attack();
              }
          }
          
          // Jump if target is higher or random
          if ((this.target.position.y < this.position.y - 50 || Math.random() < 0.01) && this.onGround) {
              this.jump();
          }
      } else {
          // No targets? Idle / Celebrate
          this.velocity.x = 0;
      }
  }
}

// --- React Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [winnerName, setWinnerName] = useState('');
  const [aliveCount, setAliveCount] = useState(0);
  const [stormPhase, setStormPhase] = useState(0);
  
  // Refs for Game Loop
  const fightersRef = useRef<Fighter[]>([]);
  const particlesRef = useRef<any[]>([]);
  const requestRef = useRef<number>(0);
  const keys = useRef({
      a: false,
      d: false,
      w: false,
      space: false
  });
  
  const stormRef = useRef({ left: -200, right: CANVAS_WIDTH + 200, targetLeft: 0, targetRight: CANVAS_WIDTH });
  
  const initGame = () => {
    const fighters: Fighter[] = [];
    
    // Player
    fighters.push(new Fighter({
        id: 0,
        position: { x: 100, y: 0 },
        color: COLORS[0],
        isAi: false,
        name: 'YOU'
    }));
    
    // Bots
    const names = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Bot Omega'];
    for (let i = 0; i < 5; i++) {
        fighters.push(new Fighter({
            id: i + 1,
            position: { 
                x: 200 + (i * 150) + (Math.random() * 50), 
                y: -100 
            },
            color: COLORS[(i + 1) % COLORS.length],
            isAi: true,
            name: names[i]
        }));
    }
    
    fightersRef.current = fighters;
    particlesRef.current = [];
    stormRef.current = { left: -500, right: CANVAS_WIDTH + 500, targetLeft: 0, targetRight: CANVAS_WIDTH };
    
    setAliveCount(fighters.length);
    setStormPhase(1);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const handleKeyDown = (e: KeyboardEvent) => {
        switch(e.key.toLowerCase()) {
            case 'a': keys.current.a = true; break;
            case 'd': keys.current.d = true; break;
            case 'w': keys.current.w = true; break;
            case ' ': keys.current.space = true; break;
        }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
        switch(e.key.toLowerCase()) {
            case 'a': keys.current.a = false; break;
            case 'd': keys.current.d = false; break;
            case 'w': keys.current.w = false; break;
            case ' ': keys.current.space = false; break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // --- STORM LOGIC ---
    const stormInterval = setInterval(() => {
        if (gameState !== 'PLAYING') return;
        
        // Shrink zone every 10 seconds
        const currentTargetL = stormRef.current.targetLeft;
        const currentTargetR = stormRef.current.targetRight;
        
        stormRef.current.targetLeft = currentTargetL + 80;
        stormRef.current.targetRight = currentTargetR - 80;
        
        // Clamp min size
        if (stormRef.current.targetRight - stormRef.current.targetLeft < 200) {
            const center = (stormRef.current.targetLeft + stormRef.current.targetRight) / 2;
            stormRef.current.targetLeft = center - 100;
            stormRef.current.targetRight = center + 100;
        }
        
        setStormPhase(p => p + 1);
    }, 10000);

    const gameLoop = () => {
        if (gameState === 'PLAYING') {
            update(c);
        } else if (gameState === 'MENU' || gameState === 'GAMEOVER') {
            drawMenu(c);
        }
        requestRef.current = requestAnimationFrame(gameLoop);
    };
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
        cancelAnimationFrame(requestRef.current);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        clearInterval(stormInterval);
    };
  }, [gameState]); // Re-bind if game state changes fundamentally, but mostly handled by refs

  const update = (c: CanvasRenderingContext2D) => {
      // Background
      c.fillStyle = '#1a1a2e';
      c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Moon
      c.fillStyle = '#e0e0e0';
      c.beginPath();
      c.arc(CANVAS_WIDTH - 150, 100, 60, 0, Math.PI * 2);
      c.fill();
      
      // Buildings/City
      c.fillStyle = '#0f0f1a';
      c.fillRect(50, CANVAS_HEIGHT - 300, 100, 300);
      c.fillRect(200, CANVAS_HEIGHT - 200, 150, 200);
      c.fillRect(400, CANVAS_HEIGHT - 350, 120, 350);
      c.fillRect(600, CANVAS_HEIGHT - 250, 180, 250);
      c.fillRect(850, CANVAS_HEIGHT - 180, 150, 180);

      // Floor
      c.fillStyle = '#333';
      c.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
      // Floor details
      c.fillStyle = '#222';
      c.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 10);
      
      // --- STORM UPDATE ---
      // Linearly interpolate current storm pos to target pos
      stormRef.current.left += (stormRef.current.targetLeft - stormRef.current.left) * 0.01;
      stormRef.current.right += (stormRef.current.targetRight - stormRef.current.right) * 0.01;
      
      const sLeft = stormRef.current.left;
      const sRight = stormRef.current.right;

      // Draw Storm (Blue Zone)
      c.fillStyle = 'rgba(0, 100, 255, 0.3)';
      // Left side storm
      if (sLeft > 0) c.fillRect(0, 0, sLeft, CANVAS_HEIGHT);
      // Right side storm
      if (sRight < CANVAS_WIDTH) c.fillRect(sRight, 0, CANVAS_WIDTH - sRight, CANVAS_HEIGHT);
      
      // Storm Wall Lines
      c.strokeStyle = '#00ffff';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(sLeft, 0); c.lineTo(sLeft, CANVAS_HEIGHT);
      c.moveTo(sRight, 0); c.lineTo(sRight, CANVAS_HEIGHT);
      c.stroke();

      // --- PLAYER INPUT ---
      const player = fightersRef.current[0];
      if (player && !player.dead) {
          player.velocity.x = 0;
          if (keys.current.a) {
              player.velocity.x = -SPEED;
              player.facingRight = false;
          }
          if (keys.current.d) {
              player.velocity.x = SPEED;
              player.facingRight = true;
          }
          if (keys.current.w && player.onGround) {
              player.jump();
          }
          if (keys.current.space) {
              player.attack();
          }
      }

      // --- FIGHTER UPDATES ---
      let alive = 0;
      let lastSurvivor: Fighter | null = null;
      
      fightersRef.current.forEach(f => {
          f.update(c, fightersRef.current, sLeft, sRight);
          if (!f.dead) {
              alive++;
              lastSurvivor = f;
          }

          // Attack Collision Checks
          if (f.isAttacking && f.attackFrame === 10) { // Active frame
              fightersRef.current.forEach(target => {
                  if (target.id !== f.id && !target.dead) {
                      if (
                          f.attackBox.position.x < target.position.x + target.width &&
                          f.attackBox.position.x + f.attackBox.width > target.position.x &&
                          f.attackBox.position.y < target.position.y + target.height &&
                          f.attackBox.position.y + f.attackBox.height > target.position.y
                      ) {
                          // HIT!
                          target.takeDamage(10);
                          
                          // Knockback
                          const dir = f.facingRight ? 1 : -1;
                          target.velocity.x = dir * 10;
                          target.velocity.y = -5;
                          
                          // Particles
                          createParticles(target.position.x + target.width/2, target.position.y + target.height/2, 'white');
                      }
                  }
              });
          }
      });
      
      // Update Alive Count for UI
      if (alive !== aliveCount) setAliveCount(alive);

      // Win Condition
      if (alive <= 1) {
          if (alive === 1 && lastSurvivor) {
              setWinnerName(lastSurvivor.name === 'YOU' ? 'VICTORY ROYALE' : `${lastSurvivor.name} WINS`);
          } else {
              setWinnerName('DRAW');
          }
          setGameState('GAMEOVER');
      }

      // --- PARTICLES ---
      particlesRef.current.forEach((p, i) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.05;
          c.fillStyle = p.color;
          c.globalAlpha = p.life;
          c.fillRect(p.x, p.y, p.size, p.size);
          c.globalAlpha = 1;
          if (p.life <= 0) particlesRef.current.splice(i, 1);
      });
  };

  const drawMenu = (c: CanvasRenderingContext2D) => {
      // Clear
      c.fillStyle = '#111';
      c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Grid effect
      c.strokeStyle = '#333';
      c.lineWidth = 1;
      for (let i = 0; i < CANVAS_WIDTH; i += 50) {
          c.beginPath(); c.moveTo(i, 0); c.lineTo(i, CANVAS_HEIGHT); c.stroke();
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
          c.beginPath(); c.moveTo(0, i); c.lineTo(CANVAS_WIDTH, i); c.stroke();
      }
  };

  const createParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
              x, y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1.0,
              size: Math.random() * 5 + 2,
              color: color
          });
      }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* HUD (Only visible when Playing) */}
      {gameState === 'PLAYING' && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: '"Bangers", cursive',
              fontSize: '32px',
              color: 'white',
              textShadow: '2px 2px 0 #000',
              pointerEvents: 'none',
              zIndex: 10
          }}>
              <div style={{ color: '#ff0055' }}>ALIVE: {aliveCount}</div>
              <div style={{ color: '#00ccff' }}>ZONE PHASE: {stormPhase}</div>
          </div>
      )}

      <canvas 
        ref={canvasRef} 
        style={{ 
            border: '4px solid #333', 
            boxShadow: '0 0 50px rgba(0,0,0,0.5)',
            background: '#000'
        }} 
      />
      
      {/* MENUS */}
      {gameState === 'MENU' && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              fontFamily: '"Bangers", cursive'
          }}>
              <h1 style={{ fontSize: '80px', color: '#ffdd00', textShadow: '4px 4px #ff0055', margin: 0 }}>BATTLE ROYALE</h1>
              <h2 style={{ fontSize: '40px', color: '#fff', marginBottom: '40px' }}>ROOFTOP RUMBLE</h2>
              
              <div style={{ marginBottom: '30px', textAlign: 'center', fontFamily: 'Arial', fontSize: '18px', color: '#ccc' }}>
                  <p>WASD to Move/Jump</p>
                  <p>SPACE to Attack</p>
                  <p>Last one standing wins!</p>
                  <p style={{color: '#00ccff'}}>Beware the blue zone!</p>
              </div>

              <button 
                  onClick={initGame}
                  style={{
                      padding: '20px 60px',
                      fontSize: '30px',
                      fontFamily: 'inherit',
                      background: '#ff0055',
                      color: 'white',
                      border: '4px solid white',
                      cursor: 'pointer',
                      transform: 'skewX(-10deg)',
                      transition: 'transform 0.1s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'skewX(-10deg) scale(1.1)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'skewX(-10deg) scale(1.0)'}
              >
                  DROP IN
              </button>
          </div>
      )}

      {gameState === 'GAMEOVER' && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.9)',
              color: 'white',
              fontFamily: '"Bangers", cursive'
          }}>
              <h1 style={{ 
                  fontSize: '90px', 
                  color: winnerName === 'VICTORY ROYALE' ? '#ffdd00' : '#ff0055', 
                  textShadow: '5px 5px #000',
                  margin: '0 0 20px 0'
              }}>
                  {winnerName}
              </h1>
              
              <button 
                  onClick={initGame}
                  style={{
                      padding: '15px 40px',
                      fontSize: '24px',
                      fontFamily: 'inherit',
                      background: 'white',
                      color: 'black',
                      border: 'none',
                      cursor: 'pointer'
                  }}
              >
                  PLAY AGAIN
              </button>
          </div>
      )}
    </div>
  );
}
