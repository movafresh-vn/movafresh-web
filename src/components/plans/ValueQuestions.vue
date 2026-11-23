<template>
  <section class="vq" aria-label="Gợi ý cho nhà bạn">
    <h3 class="vq-h">Gợi ý riêng cho nhà bạn</h3>

    <ul v-if="answered.length" class="done">
      <li v-for="q in answered" :key="q.id">
        <span class="mark" :class="{ no: !q.answer }">{{ q.answer ? '✓' : '–' }}</span>
        <span class="txt">
          {{ q.question }}
          <b>{{ q.answer ? 'Có' : 'Không' }}</b>
          <small v-if="q.answer" class="num"> · {{ deltaText(q) }}</small>
        </span>
        <button type="button" class="redo" @click="$emit('answer', q.id, null)">Đổi ý</button>
      </li>
    </ul>

    <div v-if="current" class="ask">
      <p class="ask-q">{{ current.question }}</p>
      <p class="ask-note">{{ current.note }}</p>
      <p class="ask-delta num">{{ deltaText(current) }}</p>
      <div class="ask-btns">
        <button type="button" class="pl-btn primary sm" @click="$emit('answer', current.id, true)">Có, thêm vào</button>
        <button type="button" class="pl-btn sm" @click="$emit('answer', current.id, false)">Không cần</button>
      </div>
    </div>
    <p v-else class="all-done">Thực đơn đã hợp với nhà bạn. Bạn vẫn đổi được từng món ở bên dưới.</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { fmt } from '../../shared/utils/formatters';

const props = defineProps({ questions: { type: Array, required: true } });
defineEmits(['answer']);

const answered = computed(() => props.questions.filter((q) => q.answer !== null));
// Hiện lần lượt: mỗi lần một câu chưa trả lời
const current = computed(() => props.questions.find((q) => q.answer === null) || null);

function deltaText(q) {
  const v = q.delta_per_meal_vnd;
  const sign = v < 0 ? '−' : '+';
  if (q.id === 'western_meal') return `${sign}${fmt(Math.abs(q.delta_week_vnd))} cho 1 bữa Tây`;
  if (!v) return 'Giá gần như không đổi';
  return `${sign}${fmt(Math.abs(v))} mỗi bữa`;
}
</script>

<style scoped>
.vq { background: var(--butter); border: 1px solid var(--amber-line); border-radius: 18px; padding: 16px 18px; display: grid; gap: 12px; }
.vq-h { font-size: 17px; font-weight: 800; }
.done { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.done li { display: grid; grid-template-columns: 24px 1fr auto; gap: 8px; align-items: center; min-height: 44px; font-size: 16px; }
.mark { width: 24px; height: 24px; border-radius: 50%; background: var(--green-d); color: var(--white); display: grid; place-items: center; font-size: 14px; font-weight: 800; }
.mark.no { background: var(--line); color: var(--muted); }
.txt small { font-size: 15px; color: var(--green-d); font-weight: 600; }
.redo { min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--green-d); font-size: 15px; font-weight: 700; text-decoration: underline; }
.ask { background: var(--card); border-radius: 14px; padding: 14px; display: grid; gap: 6px; }
.ask-q { font-size: 19px; font-weight: 800; line-height: 1.3; }
.ask-note { font-size: 15px; color: var(--muted); }
.ask-delta { font-size: 18px; font-weight: 800; color: var(--orange-ink); }
.ask-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.all-done { font-size: 15px; color: var(--green-d); }
</style>
