<template>
  <q-page class="flex flex-center bg-grey-10 text-white q-pa-md">
    <div class="column items-center">
      <div class="row items-center justify-between q-mb-sm" style="width: 440px; margin-top: -20px">
        <div class="text-subtitle2 text-grey-4">Modo de jogo:</div>
        <q-toggle
          v-model="isPvPMode"
          :disable="gameStarted"
          color="purple"
          checked-icon="people"
          unchecked-icon="smart_toy"
          :label="isPvPMode ? 'Humano vs humano' : 'Jogador vs IA'"
          left-label
          @update:model-value="updateGameMode"
        />
      </div>

      <div
        v-if="!isPvPMode"
        class="row items-center justify-between q-mb-sm"
        style="width: 440px; margin-top: -20px"
      >
        <div class="text-subtitle2 text-grey-4">Dificuldade da IA:</div>
        <q-toggle
          v-model="isHardMode"
          :disable="gameStarted"
          color="red"
          checked-icon="whatshot"
          unchecked-icon="sentiment_satisfied"
          :label="isHardMode ? 'Difícil' : 'Fácil'"
          left-label
          @update:model-value="updateDifficulty"
        />
      </div>

      <div
        v-if="isPvPMode"
        class="row q-mb-sm q-gutter-xs justify-center items-center"
        style="
          width: 440px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px;
          border-radius: 8px;
        "
      >
        <span class="text-xs text-red-400 q-mr-sm">P2 (W,A,S,D,F):</span>
        <q-btn
          color="purple-700"
          icon="arrow_back"
          size="sm"
          dense
          @mousedown="setP2Move(-1, 0)"
          @mouseup="setP2Move(0, 0)"
          @touchstart.prevent="setP2Move(-1, 0)"
          @touchend.prevent="setP2Move(0, 0)"
        />
        <q-btn
          color="purple-700"
          icon="arrow_upward"
          size="sm"
          dense
          @mousedown="setP2Move(0, -1)"
          @mouseup="setP2Move(0, 0)"
          @touchstart.prevent="setP2Move(0, -1)"
          @touchend.prevent="setP2Move(0, 0)"
        />
        <q-btn
          color="purple-700"
          icon="arrow_downward"
          size="sm"
          dense
          @mousedown="setP2Move(0, 1)"
          @mouseup="setP2Move(0, 0)"
          @touchstart.prevent="setP2Move(0, 1)"
          @touchend.prevent="setP2Move(0, 0)"
        />
        <q-btn
          color="purple-700"
          icon="arrow_forward"
          size="sm"
          dense
          @mousedown="setP2Move(1, 0)"
          @mouseup="setP2Move(0, 0)"
          @touchstart.prevent="setP2Move(1, 0)"
          @touchend.prevent="setP2Move(0, 0)"
        />
        <q-btn
          color="red-800"
          icon="flash_on"
          label="Smash P2"
          size="sm"
          no-caps
          dense
          @mousedown="startP2Charge"
          @mouseup="releaseP2Charge"
          @touchstart.prevent="startP2Charge"
          @touchend.prevent="releaseP2Charge"
        />
      </div>

      <div
        style="margin-top: -5px"
        class="relative-position shadow-20 rounded-borders overflow-hidden"
      >
        <canvas
          ref="canvasRef"
          :width="CANVAS_WIDTH"
          :height="CANVAS_HEIGHT"
          style="display: block; background: #0f172a"
        ></canvas>
      </div>

      <div class="row items-center justify-center q-mt-sm" style="min-height: 40px; width: 440px">
        <div
          class="text-subtitle1 text-yellow-500 text-center q-mr-md"
          style="text-transform: none"
        >
          {{ engine.message }}
        </div>
        <q-btn
          v-if="!gameStarted"
          color="primary"
          icon="play_arrow"
          no-caps
          label="Iniciar jogo"
          dense
          @click="startGame"
        />
        <q-btn
          v-if="engine.isGameOver"
          color="green"
          no-caps
          label="Nova partida"
          dense
          @click="restartGameFlow"
        />
      </div>

      <div class="row q-mt-md justify-center items-center" style="width: 440px">
        <span v-if="isPvPMode" class="text-xs text-blue-400 q-mr-md">P1:</span>

        <!-- Bloco de Direções em Cruz -->
        <div
          style="
            display: grid;
            grid-template-columns: repeat(3, 50px);
            grid-template-rows: repeat(2, 50px);
            gap: 6px;
            justify-items: center;
            align-items: center;
          "
        >
          <!-- Cima -->
          <div style="grid-column: 2; grid-row: 1">
            <q-btn
              color="orange"
              icon="arrow_upward"
              size="md"
              style="width: 45px; height: 45px"
              @mousedown="setMove(0, -1)"
              @mouseup="setMove(0, 0)"
              @touchstart.prevent="setMove(0, -1)"
              @touchend.prevent="setMove(0, 0)"
            />
          </div>
          <div style="grid-column: 1; grid-row: 2; margin-top: -15px; margin-left: 15px">
            <q-btn
              color="orange"
              icon="arrow_back"
              size="md"
              style="width: 45px; height: 45px"
              @mousedown="setMove(-1, 0)"
              @mouseup="setMove(0, 0)"
              @touchstart.prevent="setMove(-1, 0)"
              @touchend.prevent="setMove(0, 0)"
            />
          </div>
          <!-- Baixo -->
          <div style="grid-column: 2; grid-row: 2; margin-top: -15px">
            <q-btn
              color="orange"
              icon="arrow_downward"
              size="md"
              style="width: 45px; height: 45px"
              @mousedown="setMove(0, 1)"
              @mouseup="setMove(0, 0)"
              @touchstart.prevent="setMove(0, 1)"
              @touchend.prevent="setMove(0, 0)"
            />
          </div>
          <div style="grid-column: 3; grid-row: 2; margin-top: -15px; margin-left: -15px">
            <q-btn
              color="orange"
              icon="arrow_forward"
              size="md"
              style="width: 45px; height: 45px"
              @mousedown="setMove(1, 0)"
              @mouseup="setMove(0, 0)"
              @touchstart.prevent="setMove(1, 0)"
              @touchend.prevent="setMove(0, 0)"
            />
          </div>
        </div>

        <div class="q-ml-lg">
          <q-btn
            style="margin-left: -25px"
            color="red-5"
            icon="flash_on"
            label="Smash"
            size="md"
            no-caps
            class="action-btn q-px-sm"
            @mousedown="startCharge"
            @mouseup="releaseCharge"
            @touchstart.prevent="startCharge"
            @touchend.prevent="releaseCharge"
          />
          <q-btn
            style="margin-left: 25px"
            color="green-8"
            text-color="white"
            label="Reiniciar"
            dense
            unelevated
            class="action-btn q-px-sm"
            @click="restartGameFlow"
          />

          <q-btn
            style="margin-left: 5px"
            color="deep-orange-9"
            text-color="white"
            label="Sair"
            dense
            unelevated
            class="action-btn q-px-sm"
            @click="exitGame"
          />
        </div>
      </div>
    </div>

    <q-dialog v-model="engine.isGameOver" @hide="onDialogHide">
      <q-card
        class="text-white q-pa-lg relative-position shadow-24"
        style="
          width: 340px;
          text-align: center;
          background: linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%);
          border: 2px solid rgba(250, 204, 21, 0.4);
          border-radius: 20px;
        "
      >
        <q-btn
          icon="close"
          flat
          dense
          round
          class="absolute-top-right q-m-sm text-yellow-400"
          style="background: rgba(255, 255, 255, 0.08)"
          v-close-popup
        />

        <q-card-section class="q-pt-md">
          <div class="q-mb-md">
            <q-icon name="emoji_events" size="54px" class="text-yellow-400 animate-bounce" />
          </div>
          <div
            class="text-h5 text-yellow-400 text-weight-bold q-mb-sm"
            style="text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5)"
          >
            Fim de partida! 🎾
          </div>
          <div
            class="text-subtitle1 text-grey-2 q-px-sm"
            style="line-height: 1.4; text-transform: none"
          >
            {{ engine.message }}
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { TennisEngine } from '../game/TennisEngine';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/tennisConstants';
import { useRouter } from 'vue-router';
const router = useRouter();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const engine = reactive(new TennisEngine()) as TennisEngine;
const gameStarted = ref(false);
const isHardMode = ref(false);
const isPvPMode = ref(false);

const updateDifficulty = (val: boolean) => {
  if (!gameStarted.value && typeof (engine as any).setDifficulty === 'function') {
    (engine as any).setDifficulty(val ? 'hard' : 'easy');
  }
};

const updateGameMode = (val: boolean) => {
  if (!gameStarted.value && typeof (engine as any).setGameMode === 'function') {
    (engine as any).setGameMode(val ? 'pvp' : 'pve');
  }
};

const exitGame = () => {
  window.close();
  setTimeout(() => {
    router.push('/');
  }, 100);
};

const startGame = () => {
  gameStarted.value = true;
  engine.isGameStarted = true;

  if (typeof (engine as any).setGameMode === 'function') {
    (engine as any).setGameMode(isPvPMode.value ? 'pvp' : 'pve');
  }
  if (!isPvPMode.value && typeof (engine as any).setDifficulty === 'function') {
    (engine as any).setDifficulty(isHardMode.value ? 'hard' : 'easy');
  }
  engine.restartMatch();
};

const onDialogHide = () => {
  gameStarted.value = false;
  engine.isGameStarted = false;
  engine.isGameOver = false;
  engine.resetPoint(true);
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.message = 'Clique em "Iniciar jogo"';
};

const restartGameFlow = () => {
  gameStarted.value = false;
  engine.isGameStarted = false;
  engine.restartMatch();
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.message = 'Clique em "Iniciar jogo"';
};

let animationFrameId: number;
const keysPressed: Record<string, boolean> = {};
let touchDx = 0;
let touchDy = 0;
let touchP2Dx = 0;
let touchP2Dy = 0;

const setMove = (dx: number, dy: number) => {
  touchDx = dx;
  touchDy = dy;
};

const setP2Move = (dx: number, dy: number) => {
  touchP2Dx = dx;
  touchP2Dy = dy;
};

const startCharge = () => {
  if (gameStarted.value && typeof (engine as any).startPowerCharge === 'function') {
    (engine as any).startPowerCharge();
  }
};

const releaseCharge = () => {
  if (gameStarted.value && typeof (engine as any).releasePowerCharge === 'function') {
    (engine as any).releasePowerCharge();
  }
};

const startP2Charge = () => {
  if (gameStarted.value && typeof (engine as any).startP2PowerCharge === 'function') {
    (engine as any).startP2PowerCharge();
  }
};

const releaseP2Charge = () => {
  if (gameStarted.value && typeof (engine as any).releaseP2PowerCharge === 'function') {
    (engine as any).releaseP2PowerCharge();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  keysPressed[e.key] = true;

  if (e.code === 'Enter' && !gameStarted.value) {
    e.preventDefault();
    startGame();
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    startCharge();
  }

  if (e.key.toLowerCase() === 'f') {
    e.preventDefault();
    startP2Charge();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  keysPressed[e.key] = false;
  if (e.code === 'Space') {
    e.preventDefault();
    releaseCharge();
  }

  if (e.key.toLowerCase() === 'f') {
    e.preventDefault();
    releaseP2Charge();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  if (typeof (engine as any).setDifficulty === 'function') {
    (engine as any).setDifficulty('easy');
  }
  if (typeof (engine as any).setGameMode === 'function') {
    (engine as any).setGameMode('pve');
  }
  engine.resetPoint(true);
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.message = 'Clique em "Iniciar jogo"';

  const exitGame = () => {
    window.close();
    setTimeout(() => {
      router.push('/');
    }, 100);
  };

  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gameLoop = () => {
    let dx = touchDx;
    let dy = touchDy;
    let p2Dx = touchP2Dx;
    let p2Dy = touchP2Dy;

    if (keysPressed['ArrowLeft']) dx = -1;
    if (keysPressed['ArrowRight']) dx = 1;
    if (keysPressed['ArrowUp']) dy = -1;
    if (keysPressed['ArrowDown']) dy = 1;

    if (keysPressed['a'] || keysPressed['A']) p2Dx = -1;
    if (keysPressed['d'] || keysPressed['D']) p2Dx = 1;
    if (keysPressed['w'] || keysPressed['W']) p2Dy = -1;
    if (keysPressed['s'] || keysPressed['S'] || keysPressed['z'] || keysPressed['Z']) p2Dy = 1;

    if (gameStarted.value && !engine.isGameOver) {
      engine.update(dx, dy, p2Dx, p2Dy);
    } else {
      engine.ball.vx = 0;
      engine.ball.vy = 0;
    }

    engine.render(ctx);
    animationFrameId = requestAnimationFrame(gameLoop);
  };

  gameLoop();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  cancelAnimationFrame(animationFrameId);
});
</script>
<style scoped>
.action-btn {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: bold;
}
</style>
