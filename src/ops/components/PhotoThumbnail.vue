<template>
  <div v-if="photo" class="photo-thumb-container">
    <template v-if="src && !failed">
      <img
        :src="src"
        :alt="alt"
        :class="cls"
        loading="lazy"
        title="Bấm để xem ảnh phóng to"
        @error="failed = true"
        @click="showModal = true"
      />
      <Teleport to="body">
        <div v-if="showModal" class="ops-lightbox-backdrop" role="dialog" aria-modal="true" @click.self="showModal = false">
          <div class="ops-lightbox-box">
            <button type="button" class="ops-lightbox-close" aria-label="Đóng" @click="showModal = false">✕</button>
            <img :src="src" :alt="alt" class="ops-lightbox-img" />
          </div>
        </div>
      </Teleport>
    </template>
    <span v-else class="ops-pill">Đã lưu ảnh</span>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { api } from '../../shared/api';
import { photoSrc, resolvePhotoUrl } from '../../shared/api/uploads';
import { ctx } from '../session';

const props = defineProps({
  photo: { type: String, default: '' },
  alt: { type: String, default: 'Ảnh' },
  cls: { type: String, default: 'receipt-photo' }
});

const src = ref(photoSrc(props.photo));
const failed = ref(false);
const showModal = ref(false);

async function load() {
  failed.value = false;
  const direct = photoSrc(props.photo);
  if (direct) {
    src.value = direct;
    return;
  }
  if (!props.photo || !ctx.value) {
    src.value = null;
    return;
  }
  try {
    const url = await resolvePhotoUrl(props.photo, (p) => api.ops.uploads.signedUrl(ctx.value, p));
    if (url) {
      src.value = url;
    } else {
      failed.value = true;
    }
  } catch {
    failed.value = true;
  }
}

watch(() => props.photo, load);
onMounted(load);
</script>

<style scoped>
.photo-thumb-container {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.photo-thumb-container img {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.photo-thumb-container img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}
.ops-lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 24px;
  cursor: zoom-out;
}
.ops-lightbox-box {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}
.ops-lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  background: var(--ink);
}
.ops-lightbox-close {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--white);
  color: var(--ink);
  border: 1px solid rgba(0, 0, 0, 0.2);
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  transition: background 0.15s ease, transform 0.15s ease;
}
.ops-lightbox-close:hover {
  background: var(--surface);
  transform: scale(1.08);
}
</style>
